/**
 * scripts/push-content-to-cloud.js — Replaces the CLOUD database with an exact
 * copy of LOCAL.
 *
 *   npm run content:push-cloud            (dry run — reports what it would do)
 *   npm run content:push-cloud -- --yes   (actually does it)
 *
 * ─── READ THIS BEFORE RUNNING ───────────────────────────────────────────────
 *
 * This REPLACES CLOUD WHOLESALE, users included. It is not a merge and not a
 * content-only sync. Consequences:
 *
 *   - Everything currently in cloud is dropped, schema and data alike.
 *   - Cloud logins become the LOCAL passwords. The cloud `admin` and
 *     `superadmin` rows are replaced by local's. Update privateReadme.md after.
 *   - It supersedes whatever `npm run db:reset` / initialize.js put there.
 *
 * A JSON snapshot of cloud is written to ../cloud-backup-<timestamp>.json
 * before anything is dropped. Keep it until you have confirmed the result.
 *
 * ─── WHY IT WORKS THIS WAY ──────────────────────────────────────────────────
 *
 * Server versions matter, because pg_dump refuses to dump from a server whose
 * major version is newer than its own. As of 2026-08-26 local is 17.6 and the
 * Neon database is 17.11 — same major, so pg_dump 17 handles both directions
 * and the safety backup could in principle use it.
 *
 * It deliberately does not. The previous Neon database was 18.6, where
 * pg_dump 17 could restore *into* cloud but could not dump *from* it, and a
 * cloud upgrade would silently reintroduce that. The Prisma-based snapshot is
 * version-independent, so the backup keeps working whatever Neon runs next.
 * If you ever point this at a cloud database on a newer major than your local
 * client, the restore direction still works; only pg_dump-from-cloud breaks.
 *
 * Prisma's `?schema=public` parameter is not valid libpq syntax and makes psql
 * and pg_dump fail with "invalid URI query parameter", so it is stripped from
 * both URLs before use.
 */

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");
const confirmed = process.argv.includes("--yes");

// pg_dump/psql must be the LOCAL major version (17) to dump the local server.
// Allow an override for machines with a different install path.
const PG_BIN = process.env.PG_BIN || "C:/PROGRA~1/PostgreSQL/17/bin";
const pgDump = path.join(PG_BIN, "pg_dump.exe");
const psql = path.join(PG_BIN, "psql.exe");

/** libpq rejects Prisma's ?schema=... — strip it from any connection URL. */
function toLibpqUrl(url) {
  return (url || "").replace(/[?&]schema=[^&]*/, "");
}

function redact(url) {
  return url.replace(/\/\/[^@]*@/, "//***@").split("?")[0];
}

function fail(msg) {
  console.error(`\n${msg}\n`);
  process.exit(1);
}

const local = toLibpqUrl(process.env.DATABASE_URL_LOCAL);
const cloud = toLibpqUrl(process.env.DATABASE_URL);

if (!local) fail("DATABASE_URL_LOCAL is not set in .env");
if (!cloud) fail("DATABASE_URL is not set in .env");
if (local === cloud) fail("DATABASE_URL and DATABASE_URL_LOCAL are identical — refusing to run.");
for (const exe of [pgDump, psql]) {
  if (!fs.existsSync(exe)) fail(`Not found: ${exe}\nSet PG_BIN to your PostgreSQL bin directory.`);
}

console.log("\nPush local content to cloud");
console.log(`  from LOCAL : ${redact(local)}`);
console.log(`  to   CLOUD : ${redact(cloud)}`);

if (!confirmed) {
  console.log(`
DRY RUN — nothing has been changed.

This would DROP EVERYTHING in the cloud database above and replace it with an
exact copy of local, including the user accounts and their passwords.

If that is what you want:

  npm run content:push-cloud -- --yes
`);
  process.exit(0);
}

// YYYYMMDDHHMMSS. Stop at 14 chars: the stripped ISO string continues
// ".sssZ", so slicing 15 kept the separating dot and produced "...010..json".
const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const dumpFile = path.resolve(projectRoot, "..", `local-to-cloud-${stamp}.sql`);
const backupFile = path.resolve(projectRoot, "..", `cloud-backup-${stamp}.json`);

/**
 * Snapshot every table in cloud to JSON before anything is dropped.
 *
 * Uses Prisma rather than pg_dump on purpose: pg_dump refuses to read a server
 * whose major version is newer than its own, so a cloud upgrade would silently
 * disable the backup exactly when it matters. Models are enumerated from the
 * DMMF so this cannot go stale when the schema gains a table.
 */
async function backupCloud() {
  const { Pool } = require("pg");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const { PrismaClient, Prisma } = require("@prisma/client");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 30000,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const out = {};
    let total = 0;
    for (const model of Prisma.dmmf.datamodel.models) {
      const key = model.name.charAt(0).toLowerCase() + model.name.slice(1);
      if (typeof db[key]?.findMany !== "function") continue;
      const rows = await db[key].findMany();
      out[key] = rows;
      total += rows.length;
    }
    // Dates serialise natively; BigInt does not.
    fs.writeFileSync(
      backupFile,
      JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? String(v) : v), 1)
    );
    return total;
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

(async () => {
  // 1. Back up cloud FIRST — the next step drops it.
  console.log("\n[1/3] Backing up cloud...");
  let backedUp;
  try {
    backedUp = await backupCloud();
  } catch (e) {
    fail(`Cloud backup failed, so nothing was dropped: ${e.message}`);
  }
  console.log(`      ${backedUp} row(s) -> ${backupFile}`);

  // 2. Dump local. --clean --if-exists is what actually drops the cloud objects
  //    on restore; --no-owner --no-acl avoids Neon role errors (neondb_owner).
  console.log("[2/3] Dumping local...");
  const dump = spawnSync(
    pgDump,
    ["--clean", "--if-exists", "--no-owner", "--no-acl", "--file", dumpFile, local],
    { stdio: "inherit" }
  );
  if (dump.status !== 0) fail("pg_dump failed — cloud has NOT been touched.");
  console.log(`      wrote ${dumpFile}`);

  // 3. Restore into cloud, aborting on the first error rather than half-applying.
  console.log("[3/3] Restoring into cloud...");
  const restore = spawnSync(psql, [cloud, "-v", "ON_ERROR_STOP=1", "-f", dumpFile], {
    stdio: "inherit",
  });
  if (restore.status !== 0) {
    fail(
      `psql failed. Cloud may be PARTIALLY updated — inspect it before using it.\n` +
        `Cloud's previous contents: ${backupFile}\n` +
        `The dump is kept at ${dumpFile}.`
    );
  }

  console.log(`
Done. Cloud is now a copy of local.

  cloud backup : ${backupFile}
  dump used    : ${dumpFile}

Next:
  - Cloud logins are the LOCAL passwords now. Update privateReadme.md.
  - Verify: npm run db:verify
`);
})();
