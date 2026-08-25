/**
 * scripts/verify-initialization.js — Verifies the database holds every record
 * the application requires. Runs automatically after initialize.js in the
 * db:* workflows; can be run manually with `npm run db:verify`.
 *
 * Exit code 0 when everything passes, 1 with a list of failures otherwise.
 */

const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/portfolio?schema=public";

// 10s: a cold Neon compute can take 5-14s just to accept a connection.
const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 10000 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const VALID_TEMPLATE_KEYS = ["PROFESSIONAL_MINIMAL", "MODERN_GLASS", "INTERACTIVE_3D"];

async function main() {
  const missing = [];

  // Exactly one owner with a valid password hash. Password-locked accounts
  // (the permanent superadmin) are excluded — they're managed separately by
  // scripts/initialise_admin.js and must not trip the single-owner check.
  const users = await db.user.findMany({
    where: { passwordLocked: false },
    select: { passwordHash: true },
  });
  if (users.length === 0) missing.push("Owner account");
  if (users.length > 1) missing.push("Single owner (found " + users.length + " user records — duplicates)");
  if (users.length === 1) {
    const hash = users[0].passwordHash || "";
    const validHash = /^pbkdf2(sha256|sha512)?:\d+:[0-9a-f]+:[0-9a-f]+$/.test(hash) || hash.split(":").length === 4 || hash.split(":").length === 3;
    if (!hash || !validHash) missing.push("Owner valid password hash");
  }

  // Site profile singleton
  const profiles = await db.siteProfile.count();
  if (profiles === 0) missing.push("Site Settings (SiteProfile)");
  if (profiles > 1) missing.push("Single SiteProfile (found " + profiles + " — duplicates)");

  // Templates
  const templates = await db.template.findMany({ select: { key: true, isActiveLive: true } });
  for (const key of VALID_TEMPLATE_KEYS) {
    if (!templates.some((t) => t.key === key)) missing.push("Template: " + key);
  }
  const live = templates.filter((t) => t.isActiveLive);
  if (live.length === 0) missing.push("Active published template");
  if (live.length > 1) missing.push("Single active template (found " + live.length + ")");
  if (live.length === 1 && !VALID_TEMPLATE_KEYS.includes(live[0].key)) missing.push("Valid published template key");

  // Homepage with draft state and published version
  const page = await db.page.findUnique({
    where: { key: "home" },
    include: {
      sections: { select: { id: true } },
      versions: { where: { isActive: true }, select: { id: true, templateKey: true } },
      draftTemplate: { select: { key: true } },
    },
  });
  if (!page) {
    missing.push("Homepage Page record");
  } else {
    if (page.sections.length === 0) missing.push("Draft page sections (homepage has none)");
    if (!page.draftTemplate) missing.push("Draft template pointer");
    else if (!VALID_TEMPLATE_KEYS.includes(page.draftTemplate.key)) missing.push("Valid draft template key");
    if (page.versions.length === 0) missing.push("Published Page Version");
    if (page.versions.length > 1) missing.push("Single active Page Version (found " + page.versions.length + ")");
  }

  // Game settings singleton
  const gameCount = await db.gameSettings.count();
  if (gameCount === 0) missing.push("Game Settings");
  if (gameCount > 1) missing.push("Single GameSettings row (found " + gameCount + " — duplicates)");

  if (missing.length > 0) {
    console.error("\nDatabase initialization verification failed.\n");
    console.error("Missing:");
    for (const m of missing) console.error("- " + m);
    console.error("\nRun `npm run initialize` to repair, then verify again.\n");
    process.exitCode = 1;
    return;
  }

  console.log("Database initialization verified successfully.");
}

main()
  .catch((e) => {
    console.error("Verification failed to run:", (e && e.message) || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
