/**
 * scripts/clear-descriptions.js — Blanks the long-form prose fields across all
 * content, leaving structure intact (titles, summaries, dates, links, media,
 * ordering, visibility and relations are untouched).
 *
 * Idempotent: clearing a column that is already NULL is a no-op, so a second
 * run reports 0 rows affected. Safe to rerun any time. It never writes
 * placeholder text — cleared means empty, not "TODO".
 *
 * Usage:
 *   npm run content:clear                 (targets DATABASE_URL)
 *   npm run content:clear -- --local      (targets DATABASE_URL_LOCAL)
 *
 * DELIBERATELY NOT CLEARED — do not "fix" these:
 *   - ProjectVersion.summary  — one-line label, and the column is NOT NULL.
 *   - AuditLog.summary        — the audit trail is immutable by design.
 *                               Wiping it destroys the record of every change.
 *   - Template.description    — system copy written by initialize.js
 *                               ("Clean, typography-first design…"), not your
 *                               prose. Clearing it blanks the template picker.
 */

const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, Prisma } = require("@prisma/client");

const useLocal = process.argv.includes("--local");
const connectionString = useLocal
  ? process.env.DATABASE_URL_LOCAL
  : process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    useLocal
      ? "DATABASE_URL_LOCAL is not set in .env"
      : "DATABASE_URL is not set in .env"
  );
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 10000 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

/** Nullable prose columns, grouped by Prisma model delegate. */
const NULLABLE = {
  projectVersion: [
    "fullDescription",
    "problem",
    "solution",
    "myRole",
    "mainFeatures",
    "systemArchitecture",
    "developmentProcess",
    "challenges",
    "solutionsDetail",
    "testing",
    "results",
    "lessonsLearned",
  ],
  technologyVersion: ["description"],
  timelineEntryVersion: ["description"],
  educationVersion: ["description", "modules"],
  experienceVersion: ["description"],
  certification: ["description"],
  siteProfile: ["heroIntro", "aboutSummary"],
};

async function clearNullable() {
  let total = 0;
  for (const [model, fields] of Object.entries(NULLABLE)) {
    for (const field of fields) {
      // Only touch rows that still hold a value — this is what makes the
      // reported counts meaningful on a rerun.
      const { count } = await db[model].updateMany({
        where: { NOT: { [field]: null } },
        data: { [field]: null },
      });
      total += count;
      if (count > 0) console.log(`  ${model}.${field}: cleared ${count}`);
    }
  }
  return total;
}

/**
 * ExperienceVersion.responsibilities is `Json?`. Prisma distinguishes a SQL
 * NULL from a JSON `null` literal, so a plain `null` is rejected here — the
 * column has to be set with `Prisma.DbNull`, and filtered with it too.
 */
async function clearJsonFields() {
  const { count } = await db.experienceVersion.updateMany({
    where: { responsibilities: { not: Prisma.DbNull } },
    data: { responsibilities: Prisma.DbNull },
  });
  if (count > 0) console.log(`  experienceVersion.responsibilities: cleared ${count}`);
  return count;
}

/** SiteProfile.aboutBio is NOT NULL, so it can only be emptied, not nulled. */
async function clearNotNull() {
  const { count } = await db.siteProfile.updateMany({
    where: { NOT: { aboutBio: "" } },
    data: { aboutBio: "" },
  });
  if (count > 0) console.log(`  siteProfile.aboutBio: emptied ${count}`);
  return count;
}

async function main() {
  const target = useLocal ? "LOCAL" : "DATABASE_URL";
  const host = connectionString.replace(/\/\/[^@]*@/, "//***@").split("?")[0];
  console.log(`\nClearing long-form prose (${target})`);
  console.log(`  ${host}\n`);

  const cleared =
    (await clearNullable()) + (await clearJsonFields()) + (await clearNotNull());

  console.log(
    cleared === 0
      ? "\nNothing to clear — already empty (idempotent no-op).\n"
      : `\nDone. ${cleared} field value(s) cleared.\n`
  );
}

main()
  .catch((e) => {
    console.error("clear-descriptions failed:", (e && e.message) || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
