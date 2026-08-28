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
 *   npm run initialize -- --reset Replace the owner password from the protected
 *                                 INITIAL_PASSWORD environment variable
 *
 * Rules:
 *   - Running repeatedly creates NO duplicates and never overwrites
 *     owner-edited data (existing records are preserved, only missing
 *     records are created).
 *   - No plaintext password is generated, printed, or written to disk.
 *   - Multiple owner records → hard failure, nothing deleted.
 *   - Exit code 0 on success, non-zero on any failure.
 */

const crypto = require("crypto");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

// 10s, not 5s: a cold Neon compute can take 5-14s just to accept a connection,
// which made `npm run dev` fail with "Connection terminated due to connection timeout".
const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 10000 });
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

function requiredInitialPassword() {
  const password = (process.env.INITIAL_PASSWORD || "").trim();
  if (!password) throw new Error("initial-password-required");
  const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((rule) =>
    rule.test(password)
  ).length;
  if (password.length < 12 || classes < 3) throw new Error("initial-password-policy");
  return password;
}

function printCredentialConfigured(username) {
  console.log("==================================================");
  console.log("PORTFOLIO INITIALIZATION COMPLETE");
  console.log("==================================================\n");
  console.log("Initial username:");
  console.log(`${username}\n`);
  console.log("Password: configured from INITIAL_PASSWORD (not displayed)\n");
  console.log("Login page:");
  console.log("http://localhost:3000/admin/login\n");
  console.log("You must change the password after first login.");
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
  // Only the canonical ADMIN owner belongs to this lifecycle. Normal USER
  // accounts and the credentials-only SUPERADMIN are managed separately.
  const users = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, username: true, email: true, passwordHash: true },
  });

  if (users.length > 1) {
    console.error("Initialization failed.\n");
    console.error("Multiple owner records were found.");
    console.error("The records must be reviewed before initialization can continue.\n");
    throw new Error("multiple-owners");
  }

  if (users.length === 1) {
    const owner = users[0];
    
    // Confirm owner is valid
    if (!owner.username || !owner.email || !owner.passwordHash) {
      console.error("Initialization failed.\n");
      console.error("The existing owner record is invalid (missing username, email, or password hash).\n");
      throw new Error("invalid-owner");
    }

    if (!reset) {
      console.log("Owner account: OK (existing owner preserved, no credentials regenerated)");
      return { created: false };
    }

    // --reset: regenerate a temporary password for the existing owner
    const temporaryPassword = requiredInitialPassword();
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
          summary: "Owner password replaced from protected initialization input. All sessions revoked.",
        },
      }),
    ]);

    console.log("Owner password replaced from INITIAL_PASSWORD.\n");
    printCredentialConfigured(owner.username);
    return { created: false, reset: true };
  }

  // No user — create the canonical owner
  const username = (process.env.INITIAL_OWNER_USERNAME_PREFIX || "ihsan-admin").trim();
  const email = (process.env.INITIAL_OWNER_EMAIL || `${username}@local.invalid`).trim();
  const emailNormalized = email.toLowerCase();
  const temporaryPassword = requiredInitialPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const owner = await db.user.create({
    data: {
      username,
      email,
      emailNormalized,
      emailVerified: new Date(),
      name: username,
      passwordHash,
      mustChangePassword: true,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  await audit("OWNER_INITIALIZED", "User", owner.id, "Canonical owner created by initialize.js");
  printCredentialConfigured(username);
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

  // Bootstrap an EMPTY profile. These five columns are NOT NULL so they must be
  // written, but "" is what the public site treats as absent — it renders
  // nothing rather than publishing an invented identity, an unowned email
  // address, or a tagline the owner never wrote. The nullable fields are simply
  // omitted. Same rule as src/app/admin/settings/page.tsx and admin/profile.
  await db.siteProfile.create({
    data: {
      fullName: "",
      logoText: "",
      title: "",
      aboutBio: "",
      contactEmail: "",
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
  { type: "EDUCATION", internalLabel: "Education and Experience", order: 6 },
  { type: "PROJECT_GRID", internalLabel: "Other Projects", order: 7 },
  { type: "STACK_GAME", internalLabel: "3D Technology Interaction", order: 8 },
  { type: "CONTACT", internalLabel: "Contact Call to Action", order: 9 },
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

  await db.$transaction(async (tx) => {
    if (page.sections.length === 0) {
      for (const sec of DEFAULT_SECTIONS) {
        await tx.pageSection.create({
          data: { pageId: page.id, ...sec, visible: true, settings: {} },
        });
      }
      repaired.push("default sections");
    }

    if (!page.draftTemplateId) {
      await tx.page.update({ where: { id: page.id }, data: { draftTemplateId: minimal.id } });
      repaired.push("draft template pointer");
    }

    if (page.versions.length === 0) {
      const sections = await tx.pageSection.findMany({
        where: { pageId: page.id },
        orderBy: { order: "asc" },
      });
      const last = await tx.pageVersion.findFirst({
        where: { pageId: page.id },
        orderBy: { versionNumber: "desc" },
      });
      const draftTemplate = page.draftTemplateId
        ? await tx.template.findUnique({ where: { id: page.draftTemplateId } })
        : minimal;
      await tx.pageVersion.create({
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
  });

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
    if (e.message === "initial-password-required") {
      console.error("Initialization requires INITIAL_PASSWORD for owner creation or --reset.\n");
    } else if (e.message === "initial-password-policy") {
      console.error("INITIAL_PASSWORD must be at least 12 characters with 3 character classes.\n");
    }
    if (e.message !== "schema-not-ready" && e.message !== "multiple-owners" && e.message !== "invalid-owner") {
      if (e.message !== "initial-password-required" && e.message !== "initial-password-policy") {
        console.error("Initialization failed:", (e && e.message) || e);
      }
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
