/**
 * scripts/initialize.js — Idempotent database initialization for the portfolio.
 *
 * This is the MANDATORY follow-up after every controlled database operation
 * (see scripts/database-setup.js and the db:* package scripts). It guarantees
 * the application always has its required records:
 *
 *   - Canonical owner account (with initial username/password login)
 *   - The three Template rows
 *   - SiteProfile singleton
 *   - Homepage Page record with default sections
 *   - An active published PageVersion (the draft state IS the Page+sections
 *     in this schema; the published state is the active PageVersion snapshot)
 *   - GameSettings singleton
 *
 * Usage:
 *   npm run initialize            Safe idempotent initialization
 *   npm run initialize -- --reset Additionally regenerate a temporary password
 *                                 for the existing single owner (prints once)
 *
 * Rules:
 *   - Running repeatedly creates NO duplicates and never overwrites
 *     owner-edited data (existing records are preserved, only missing
 *     records are created).
 *   - Credentials are generated ONLY when no owner exists (or with --reset).
 *   - Multiple owner records → hard failure, nothing deleted.
 *   - Exit code 0 on success, non-zero on any failure.
 */

const crypto = require("crypto");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/portfolio?schema=public";

const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─── Helpers ────────────────────────────────────────────────────────────────

// Same format as src/lib/password.ts: "pbkdf2sha256:<iterations>:<salt>:<hash>"
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString("hex");
    crypto.pbkdf2(password, salt, 600000, 64, "sha256", (err, key) => {
      if (err) reject(err);
      else resolve(`pbkdf2sha256:600000:${salt}:${key.toString("hex")}`);
    });
  });
}

function generateTemporaryPassword() {
  // Unambiguous alphabet (no 0/O/1/l/I), 3 groups of 5 + "!" → ~90 bits entropy
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const group = () =>
    Array.from(crypto.randomBytes(5))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  return `${group()}-${group()}-${group()}!`;
}

function printCredentials(username, password) {
  console.log("==================================================");
  console.log("PORTFOLIO INITIALIZATION COMPLETE");
  console.log("==================================================\n");
  console.log("Initial username:");
  console.log(`${username}\n`);
  console.log("Temporary password:");
  console.log(`${password}\n`);
  console.log("Login page:");
  console.log("http://localhost:3000/admin/login\n");
  console.log("You must change the password after first login.");
  console.log("These credentials will not be displayed again.");
  console.log("==================================================\n");
}

/** Audit helper that tolerates a missing AuditLog table and never stores secrets. */
async function audit(action, entityType, entityId, summary) {
  try {
    await db.auditLog.create({
      data: { action, entityType, entityId: entityId || null, summary },
    });
  } catch {
    // AuditLog unavailable — initialization must still succeed.
  }
}

// ─── Step 0: schema availability ─────────────────────────────────────────────

async function assertSchemaReady() {
  try {
    await db.user.count();
    await db.page.count();
    await db.template.count();
  } catch (e) {
    if (e && (e.code === "P2021" || /does not exist/i.test(String(e.message)))) {
      console.error("Required tables are missing. Run migrations first:\n");
      console.error("  npm run db:setup    (deploy migrations + initialize)");
      console.error("  npm run db:migrate  (dev migration + initialize)\n");
      throw new Error("schema-not-ready");
    }
    throw e;
  }
}

// ─── Step 1: canonical owner ─────────────────────────────────────────────────

async function ensureOwner(reset) {
  const users = await db.user.findMany({
    select: { id: true, username: true, email: true, passwordHash: true },
  });

  if (users.length > 1) {
    console.error("Initialization failed.\n");
    console.error("Multiple owner records were found.");
    console.error("The records must be reviewed before initialization can continue.\n");
    throw new Error("multiple-owners");
  }

  if (users.length === 1) {
    if (!reset) {
      console.log("Owner account: OK (existing owner preserved, no credentials regenerated)");
      return { created: false };
    }

    // --reset: regenerate a temporary password for the existing owner
    const owner = users[0];
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    await db.$transaction([
      db.user.update({
        where: { id: owner.id },
        data: { passwordHash, mustChangePassword: true },
      }),
      // Revoke every active session — the old password may be compromised
      db.trackedSession.updateMany({
        where: { userId: owner.id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: "PASSWORD_RESET" },
      }),
      db.auditLog.create({
        data: {
          action: "PASSWORD_CHANGED",
          entityType: "User",
          entityId: owner.id,
          summary: "Temporary password regenerated via initialize --reset. All sessions revoked.",
        },
      }),
    ]);

    console.log("Temporary password regenerated for the existing owner.\n");
    printCredentials(owner.username, temporaryPassword);
    return { created: false, reset: true };
  }

  // No user — create the canonical owner
  const username = (process.env.INITIAL_OWNER_USERNAME_PREFIX || "ihsan-admin").trim();
  const email = (process.env.INITIAL_OWNER_EMAIL || `${username}@local.invalid`).trim();
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const owner = await db.user.create({
    data: {
      username,
      email,
      name: username,
      passwordHash,
      mustChangePassword: true,
    },
  });

  await audit("OWNER_INITIALIZED", "User", owner.id, "Canonical owner created by initialize.js");
  printCredentials(username, temporaryPassword);
  return { created: true };
}

// ─── Step 2: templates ───────────────────────────────────────────────────────

async function ensureTemplates() {
  const defs = [
    { key: "PROFESSIONAL_MINIMAL", name: "Professional Minimal", description: "Clean, typography-first design with restrained color." },
    { key: "MODERN_GLASS", name: "Modern Glass", description: "Frosted glass surfaces with aurora accents." },
    { key: "INTERACTIVE_3D", name: "Interactive 3D", description: "Canvas-driven interactive presentation." },
  ];

  let created = 0;
  for (const t of defs) {
    const existing = await db.template.findUnique({ where: { key: t.key } });
    if (!existing) {
      await db.template.create({ data: t });
      created++;
    }
  }

  // Safe default published template: Professional Minimal — but only when no
  // template is currently marked live (never reset a valid selection).
  const liveCount = await db.template.count({ where: { isActiveLive: true } });
  if (liveCount === 0) {
    await db.template.update({
      where: { key: "PROFESSIONAL_MINIMAL" },
      data: { isActiveLive: true },
    });
  }

  console.log(`Templates: OK (${created} created, ${defs.length - created} preserved)`);
}

// ─── Step 3: site profile singleton ─────────────────────────────────────────

async function ensureSiteProfile() {
  const existing = await db.siteProfile.findFirst();
  if (existing) {
    console.log("Site profile: OK (existing values preserved)");
    return;
  }

  await db.siteProfile.create({
    data: {
      fullName: "Portfolio Owner",
      logoText: "PO",
      title: "Software Engineer",
      tagline: "Engineering software as craft with precision and intent.",
      aboutBio: "Edit this bio from Admin → Profile.",
      contactEmail: "owner@example.com",
      availabilityStatus: "Open to work",
    },
  });
  await audit("DEFAULT_SETTINGS_CREATED", "SiteProfile", null, "Default site profile created by initialize.js");
  console.log("Site profile: created with defaults");
}

// ─── Step 4: homepage + sections + published version ────────────────────────

const DEFAULT_SECTIONS = [
  { type: "HERO", internalLabel: "Hero Section", order: 1 },
  { type: "ABOUT", internalLabel: "About Summary", order: 2 },
  { type: "TECH_STACK", internalLabel: "Technology Stack", order: 3 },
  { type: "FEATURED_PROJECTS", internalLabel: "Featured Projects", order: 4 },
  { type: "PROJECT_TIMELINE", internalLabel: "Project Timeline", order: 5 },
  { type: "EDUCATION", internalLabel: "Education Details", order: 6 },
  { type: "EXPERIENCE", internalLabel: "Experience History", order: 7 },
  { type: "STACK_GAME", internalLabel: "3D Technology Interaction", order: 8 },
  { type: "CONTACT", internalLabel: "Contact Call To Action", order: 9 },
];

async function ensureHomepage() {
  const minimal = await db.template.findUnique({ where: { key: "PROFESSIONAL_MINIMAL" } });
  if (!minimal) throw new Error("Template PROFESSIONAL_MINIMAL missing — ensureTemplates must run first");

  let page = await db.page.findUnique({
    where: { key: "home" },
    include: { sections: true, versions: { where: { isActive: true }, take: 1 } },
  });

  // Group homepage creation in one transaction so a failure can't leave a
  // Page without sections or an active version (partial relationships).
  if (!page) {
    await db.$transaction(async (tx) => {
      const created = await tx.page.create({
        data: {
          key: "home",
          title: "Homepage",
          draftTemplateId: minimal.id,
          hasUnpublishedChanges: false,
        },
      });
      for (const sec of DEFAULT_SECTIONS) {
        await tx.pageSection.create({
          data: { pageId: created.id, ...sec, visible: true, settings: {} },
        });
      }
      const sections = await tx.pageSection.findMany({
        where: { pageId: created.id },
        orderBy: { order: "asc" },
      });
      await tx.pageVersion.create({
        data: {
          pageId: created.id,
          versionNumber: 1,
          templateKey: "PROFESSIONAL_MINIMAL",
          snapshot: sections.map(sectionSnapshot),
          isActive: true,
        },
      });
    });
    await audit("DEFAULT_HOMEPAGE_CREATED", "Page", null, "Default homepage, sections, and published version created by initialize.js");
    console.log("Homepage: created (9 default sections, draft + published v1)");
    return;
  }

  // Page exists — repair only what's missing, preserve owner edits.
  let repaired = [];

  if (page.sections.length === 0) {
    for (const sec of DEFAULT_SECTIONS) {
      await db.pageSection.create({
        data: { pageId: page.id, ...sec, visible: true, settings: {} },
      });
    }
    repaired.push("default sections");
  }

  if (!page.draftTemplateId) {
    await db.page.update({ where: { id: page.id }, data: { draftTemplateId: minimal.id } });
    repaired.push("draft template pointer");
  }

  if (page.versions.length === 0) {
    const sections = await db.pageSection.findMany({
      where: { pageId: page.id },
      orderBy: { order: "asc" },
    });
    const last = await db.pageVersion.findFirst({
      where: { pageId: page.id },
      orderBy: { versionNumber: "desc" },
    });
    const draftTemplate = page.draftTemplateId
      ? await db.template.findUnique({ where: { id: page.draftTemplateId } })
      : minimal;
    await db.pageVersion.create({
      data: {
        pageId: page.id,
        versionNumber: (last?.versionNumber ?? 0) + 1,
        templateKey: (draftTemplate || minimal).key,
        snapshot: sections.map(sectionSnapshot),
        isActive: true,
      },
    });
    repaired.push("published version");
  }

  console.log(
    repaired.length
      ? `Homepage: repaired (${repaired.join(", ")})`
      : "Homepage: OK (sections, draft, and published version preserved)"
  );
}

function sectionSnapshot(s) {
  return {
    id: s.id,
    type: s.type,
    internalLabel: s.internalLabel,
    order: s.order,
    visible: s.visible,
    settings: typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings || {},
    animationPresetSlug: s.animationPresetSlug,
    animationDelay: s.animationDelay,
    animationStagger: s.animationStagger,
  };
}

// ─── Step 5: game settings singleton ─────────────────────────────────────────

async function ensureGameSettings() {
  const existing = await db.gameSettings.findFirst();
  if (existing) {
    console.log("Game settings: OK (existing values preserved)");
    return;
  }
  await db.gameSettings.create({ data: { enabled: true, mode: "ROTATING_SPHERE" } });
  console.log("Game settings: created with defaults");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const reset = process.argv.includes("--reset");
  console.log("\nPortfolio initialization (idempotent)\n");

  await assertSchemaReady();

  await ensureOwner(reset);
  await ensureTemplates();
  await ensureSiteProfile();
  await ensureHomepage();
  await ensureGameSettings();

  await audit("SYSTEM_INITIALIZED", "System", null, "initialize.js completed successfully");
  console.log("\nInitialization finished. Run `npm run db:verify` to verify.\n");
}

main()
  .catch((e) => {
    if (e.message !== "schema-not-ready" && e.message !== "multiple-owners") {
      console.error("Initialization failed:", (e && e.message) || e);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
