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
 * Direction matters. Local PostgreSQL is 17.x and Neon is 18.x. pg_dump 17
 * can dump an older-or-equal server and restore into a newer one, so
 * local -> cloud is supported. The reverse is NOT: pg_dump 17 refuses to dump
 * from an 18.x server, which is why the safety backup above goes through
 * Prisma (portable, version-independent) rather than pg_dump.
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

const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
const dumpFile = path.resolve(projectRoot, "..", `local-to-cloud-${stamp}.sql`);

// 1. Dump local. --clean --if-exists is what actually drops the cloud objects
//    on restore; --no-owner --no-acl avoids Neon role errors (neondb_owner).
console.log("\n[1/2] Dumping local...");
const dump = spawnSync(
  pgDump,
  ["--clean", "--if-exists", "--no-owner", "--no-acl", "--file", dumpFile, local],
  { stdio: "inherit" }
);
if (dump.status !== 0) fail("pg_dump failed — cloud has NOT been touched.");
console.log(`      wrote ${dumpFile}`);

// 2. Restore into cloud, aborting on the first error rather than half-applying.
console.log("[2/2] Restoring into cloud...");
const restore = spawnSync(psql, [cloud, "-v", "ON_ERROR_STOP=1", "-f", dumpFile], {
  stdio: "inherit",
});
if (restore.status !== 0) {
  fail(
    `psql failed. Cloud may be PARTIALLY updated — inspect it before using it.\n` +
      `The dump is kept at ${dumpFile}.`
  );
}

console.log(`
Done. Cloud is now a copy of local.

Next:
  - Cloud logins are the LOCAL passwords now. Update privateReadme.md.
  - Verify: npm run db:verify
`);
