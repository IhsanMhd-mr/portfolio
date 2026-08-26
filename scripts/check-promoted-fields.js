/**
 * check-promoted-fields — guards the DRAFT → PUBLISHED promotion contract.
 *
 * Why this exists: `PROMOTED_FIELDS` in src/services/publish-diff.service.ts is
 * the single list driving BOTH the promotion (POST /api/publish) and the change
 * detection (GET /api/publish, DashboardService). A column missing from it is
 * invisible to both halves at once — publishing silently never updates it, and
 * the UI truthfully reports "nothing to publish".
 *
 * That is not hypothetical. `status`, `featured` and `showOnResume` were absent
 * from the project list, so editing a project's status in admin left the live
 * page showing the old value permanently. A comment saying "remember to update
 * this list" is exactly what failed the first time, so this makes it mechanical.
 *
 * Run: npm run check:promoted
 */

const { Prisma } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

/** Version model → the PROMOTED_FIELDS key that should cover it. */
const MODELS = {
  ProjectVersion: "project",
  TechnologyVersion: "technology",
  TimelineEntryVersion: "timelineEntry",
  EducationVersion: "education",
  ExperienceVersion: "experience",
};

/**
 * Columns that legitimately are not promoted content.
 *
 * `publishedAt` is here because POST /api/publish stamps it with the publish
 * time rather than copying the draft's value — promoting it would make every
 * entity compare unequal on every check.
 */
const IGNORED = new Set([
  "id",
  "state",
  "createdAt",
  "updatedAt",
  "publishedAt",
  // parent foreign keys
  "projectId",
  "technologyId",
  "timelineEntryId",
  "educationId",
  "experienceId",
]);

/**
 * Read the field lists straight out of the TypeScript source.
 *
 * Deliberately parsed rather than imported: this is a plain CommonJS script and
 * the service is TS with `@/` path aliases, so importing it would drag in a
 * transpiler and the Prisma client singleton for what is a static question.
 */
function readPromotedFields() {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "src", "services", "publish-diff.service.ts"),
    "utf8"
  );
  const block = src.match(/export const PROMOTED_FIELDS = \{([\s\S]*?)\n\} as const;/);
  if (!block) {
    throw new Error("Could not locate `export const PROMOTED_FIELDS = { ... } as const;`");
  }

  const out = {};
  const entry = /(\w+):\s*\[([\s\S]*?)\],/g;
  let m;
  while ((m = entry.exec(block[1])) !== null) {
    const body = m[2].replace(/\/\/[^\n]*/g, ""); // strip comments before reading strings
    out[m[1]] = [...body.matchAll(/"([^"]+)"/g)].map((s) => s[1]);
  }
  return out;
}

function main() {
  const promoted = readPromotedFields();
  const problems = [];

  for (const [model, key] of Object.entries(MODELS)) {
    const meta = Prisma.dmmf.datamodel.models.find((x) => x.name === model);
    if (!meta) {
      problems.push(`${model}: not found in the Prisma schema`);
      continue;
    }
    const listed = promoted[key];
    if (!listed) {
      problems.push(`PROMOTED_FIELDS.${key}: missing entirely`);
      continue;
    }

    const covered = new Set(listed);
    const scalars = meta.fields
      .filter((f) => f.kind === "scalar" || f.kind === "enum")
      .map((f) => f.name);

    const missing = scalars.filter((f) => !IGNORED.has(f) && !covered.has(f));
    if (missing.length) {
      problems.push(
        `PROMOTED_FIELDS.${key} is missing ${missing.length} column(s) of ${model}:\n` +
          missing.map((f) => `      - ${f}`).join("\n")
      );
    }

    // Catch the reverse too: a listed field that no longer exists would make
    // pickPromoted write undefined and the diff compare undefined to undefined.
    const stale = listed.filter((f) => !scalars.includes(f));
    if (stale.length) {
      problems.push(
        `PROMOTED_FIELDS.${key} lists ${stale.length} column(s) not on ${model}: ${stale.join(", ")}`
      );
    }
  }

  if (problems.length) {
    console.error("\n  Promotion contract is out of sync with the schema:\n");
    for (const p of problems) console.error(`  ✗ ${p}\n`);
    console.error(
      "  Add each column to PROMOTED_FIELDS in src/services/publish-diff.service.ts,\n" +
        "  or to IGNORED in this script if it genuinely is not promoted content.\n" +
        "  A column in neither place is silently never published.\n"
    );
    process.exit(1);
  }

  const total = Object.values(promoted).reduce((n, l) => n + l.length, 0);
  console.log(
    `  Promotion contract OK — ${Object.keys(MODELS).length} models, ${total} promoted columns, no drift.`
  );
}

main();
