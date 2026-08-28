/**
 * scripts/initialise_admin.js — Creates the permanent `superadmin` account.
 *
 * This account is deliberately different from the canonical owner managed by
 * scripts/initialize.js:
 *
 *   - Created ONCE and never touched again. Re-running this script is a no-op,
 *     so the credential is stable from first run onward.
 *   - `mustChangePassword: false` — never forced through the change-password
 *     flow on login.
 *   - `passwordLocked: true` — excluded from `initialize --reset` rotation
 *     (initialize.js and verify-initialization.js filter locked users out, so
 *     this account is invisible to them and can never be reset by them).
 *
 * The SUPERADMIN role is credentials-only. Application routes enforce that
 * its password and linked login methods cannot be changed.
 *
 * Usage:
 *   npm run admin:super
 *
 * Password resolution:
 *   process.env.SUPERADMIN_PASSWORD is required for first creation. There is
 *   deliberately no source-controlled fallback.
 */

const crypto = require("crypto");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const SUPERADMIN_USERNAME = "superadmin";
const SUPERADMIN_EMAIL = "superadmin@local.invalid";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

// 10s, matching initialize.js: a cold Neon compute can take 5-14s just to
// accept a connection.
const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 10000 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─── Helpers ────────────────────────────────────────────────────────────────

// Must stay byte-identical in format to src/lib/password.ts, or login fails:
// "pbkdf2sha256:<iterations>:<salt>:<hash>"
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString("hex");
    crypto.pbkdf2(password, salt, 600000, 64, "sha256", (err, key) => {
      if (err) reject(err);
      else resolve(`pbkdf2sha256:600000:${salt}:${key.toString("hex")}`);
    });
  });
}

/** Audit helper that tolerates a missing AuditLog table and never stores secrets. */
async function audit(action, entityType, entityId, summary) {
  try {
    await db.auditLog.create({
      data: { action, entityType, entityId: entityId || null, summary },
    });
  } catch {
    // AuditLog unavailable — creation must still succeed.
  }
}

async function assertSchemaReady() {
  try {
    await db.user.count();
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

// ─── Main ────────────────────────────────────────────────────────────────────

async function ensureSuperadmin() {
  const existing = await db.user.findUnique({
    where: { username: SUPERADMIN_USERNAME },
    select: { id: true, username: true, passwordLocked: true, role: true, status: true },
  });

  if (existing) {
    console.log(`Superadmin: OK (already exists — credentials unchanged)\n`);
    console.log(`Username:   ${existing.username}`);
    console.log(`Login page: http://localhost:3000/admin/login\n`);
    if (!existing.passwordLocked || existing.role !== "SUPERADMIN" || existing.status !== "ACTIVE") {
      // Self-heal: the account exists but isn't lock-protected, so
      // `initialize --reset` could still rotate it.
      await db.user.update({
        where: { id: existing.id },
        data: {
          passwordLocked: true,
          mustChangePassword: false,
          role: "SUPERADMIN",
          status: "ACTIVE",
        },
      });
      console.log("Note: re-applied the password lock (was unset).\n");
    }
    return { created: false };
  }

  // Guard against a collision that would make login ambiguous: auth.ts resolves
  // credentials with `OR: [{ email }, { username }]` and there is no
  // cross-field uniqueness, so an existing row using our username as its email
  // (or vice versa) would make findFirst pick a nondeterministic user.
  const collision = await db.user.findFirst({
    where: {
      OR: [
        { email: SUPERADMIN_EMAIL },
        { username: SUPERADMIN_EMAIL },
        { email: SUPERADMIN_USERNAME },
      ],
    },
    select: { id: true, username: true, email: true },
  });

  if (collision) {
    console.error("Superadmin creation failed.\n");
    console.error(
      `An existing user (username "${collision.username}", email "${collision.email}") ` +
        `conflicts with the superadmin identifiers.`
    );
    console.error("Resolve the conflict before creating the superadmin.\n");
    throw new Error("identifier-collision");
  }

  const password = (process.env.SUPERADMIN_PASSWORD || "").trim();
  if (!password) {
    console.error("Superadmin creation failed: SUPERADMIN_PASSWORD is required.\n");
    throw new Error("superadmin-password-required");
  }
  const classes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((rule) =>
    rule.test(password)
  ).length;
  if (password.length < 12 || classes < 3) {
    console.error("Superadmin creation failed: SUPERADMIN_PASSWORD does not meet password policy.\n");
    throw new Error("superadmin-password-policy");
  }
  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      username: SUPERADMIN_USERNAME,
      email: SUPERADMIN_EMAIL,
      emailNormalized: SUPERADMIN_EMAIL,
      emailVerified: new Date(),
      name: "Super Admin",
      passwordHash,
      mustChangePassword: false, // never forced to change
      passwordLocked: true, // excluded from initialize --reset
      role: "SUPERADMIN",
      status: "ACTIVE",
    },
  });

  await audit(
    "OWNER_INITIALIZED",
    "User",
    user.id,
    "Permanent superadmin account created by initialise_admin.js (password locked)."
  );

  console.log("==================================================");
  console.log("SUPERADMIN CREATED");
  console.log("==================================================\n");
  console.log("Username:");
  console.log(`${SUPERADMIN_USERNAME}\n`);
  console.log("Password: configured from SUPERADMIN_PASSWORD (not displayed)\n");
  console.log("Login page:");
  console.log("http://localhost:3000/admin/login\n");
  console.log("This password is permanent. It is never rotated by");
  console.log("`initialize --reset` and you are not prompted to change it.");
  console.log("==================================================\n");

  return { created: true };
}

async function main() {
  console.log("\nSuperadmin initialization (idempotent)\n");
  await assertSchemaReady();
  await ensureSuperadmin();
  console.log("Done.\n");
}

main()
  .catch((e) => {
    if (e.message !== "schema-not-ready" && e.message !== "identifier-collision") {
      console.error("Superadmin initialization failed:", (e && e.message) || e);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
