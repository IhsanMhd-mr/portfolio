/**
 * scripts/seed-content.js — On-demand content seeder.
 *
 * Unlike scripts/initialize.js (which only creates structural/singleton records —
 * owner, templates, homepage sections, site profile), this populates actual
 * CONTENT: Technologies, Projects, Education, Experience, Timeline entries,
 * Certifications, Nav items, Social links. Tops each category up to a minimum
 * of 3 rows; never duplicates or overwrites existing/owner-edited data, so it's
 * safe to rerun any time (e.g. after `npm run db:reset`).
 *
 * Usage:
 *   npm run seed
 *   node --env-file=.env scripts/seed-content.js
 *
 * Bypasses the service layer (direct db.*.create), matching initialize.js's own
 * pattern — there's no admin session/audit context in a standalone script.
 */

const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

// 10s: a cold Neon compute can take 5-14s just to accept a connection.
const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 10000 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const MIN_PER_CATEGORY = 3;

/** Audit helper that tolerates a missing AuditLog table — matches initialize.js. */
async function audit(action, entityType, entityId, summary) {
  try {
    await db.auditLog.create({ data: { action, entityType, entityId: entityId || null, summary } });
  } catch {
    // AuditLog unavailable — seeding must still succeed.
  }
}

// ─── Step 0: schema availability (same check as initialize.js) ───────────────

async function assertSchemaReady() {
  try {
    await db.project.count();
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

// ─── Step 1: placeholder media (reused for thumbnails/logos) ─────────────────

const MEDIA_POOL = [
  { filename: "seed-globe.svg", url: "/globe.svg", kind: "IMAGE" },
  { filename: "seed-file.svg", url: "/file.svg", kind: "IMAGE" },
  { filename: "seed-window.svg", url: "/window.svg", kind: "IMAGE" },
];

async function ensureMedia() {
  const ids = [];
  for (const m of MEDIA_POOL) {
    let existing = await db.mediaAsset.findFirst({ where: { filename: m.filename } });
    if (!existing) {
      existing = await db.mediaAsset.create({ data: m });
    }
    ids.push(existing.id);
  }
  console.log(`Media: OK (${ids.length} placeholder assets available)`);
  return ids;
}

// ─── Step 2: technologies ──────────────────────────────────────────────────

const TECH_POOL = [
  { slug: "typescript", name: "TypeScript", category: "FRONTEND", experienceLabel: "STRONG", description: "Statically typed superset of JavaScript." },
  { slug: "postgresql", name: "PostgreSQL", category: "DATABASE", experienceLabel: "COMFORTABLE", description: "Relational database used for all persistent app data." },
  { slug: "docker", name: "Docker", category: "DEVOPS", experienceLabel: "WORKING_KNOWLEDGE", description: "Containerization for consistent dev/prod environments." },
  { slug: "nextjs", name: "Next.js", category: "FRONTEND", experienceLabel: "STRONG", description: "React framework used for this very site." },
  { slug: "prisma", name: "Prisma", category: "BACKEND", experienceLabel: "COMFORTABLE", description: "Type-safe ORM for PostgreSQL." },
];

async function ensureTechnologies() {
  const count = await db.technology.count();
  if (count >= MIN_PER_CATEGORY) {
    console.log(`Technologies: OK (${count} existing, minimum already met)`);
  } else {
    let created = 0;
    for (const t of TECH_POOL) {
      if (created + count >= MIN_PER_CATEGORY) break;
      const existing = await db.technology.findUnique({ where: { slug: t.slug } });
      if (existing) continue;
      // Both DRAFT and PUBLISHED versions: admin CRUD pages read the DRAFT
      // version to display/edit content, the public site reads PUBLISHED —
      // seeded content needs both to be visible everywhere immediately.
      const versionFields = {
        name: t.name,
        category: t.category,
        description: t.description,
        experienceLabel: t.experienceLabel,
        showInStack: true,
        visible: true,
      };
      await db.technology.create({
        data: {
          slug: t.slug,
          versions: {
            create: [
              { state: "DRAFT", ...versionFields },
              { state: "PUBLISHED", ...versionFields, publishedAt: new Date() },
            ],
          },
        },
      });
      created++;
    }
    console.log(`Technologies: created ${created} (total now ${count + created})`);
  }

  // Return up to 3 technology ids to link from Projects/Experience/Timeline below.
  const techs = await db.technology.findMany({ take: 3, orderBy: { createdAt: "asc" } });
  return techs.map((t) => t.id);
}

// ─── Step 3: projects ───────────────────────────────────────────────────────

const PROJECT_POOL = [
  {
    slug: "portfolio-cms",
    title: "Portfolio CMS",
    summary: "A full admin-driven portfolio site with a visual page builder and template switching.",
    category: "FULL_STACK",
    status: "COMPLETED",
    featured: true,
  },
  {
    slug: "task-tracker-api",
    title: "Task Tracker API",
    summary: "A REST API for managing tasks and projects with role-based access control.",
    category: "WEB",
    status: "COMPLETED",
    featured: false,
  },
  {
    slug: "image-classifier",
    title: "Image Classifier",
    summary: "A convolutional neural network trained to classify images into custom categories.",
    category: "MACHINE_LEARNING",
    status: "IN_PROGRESS",
    featured: false,
  },
];

async function ensureProjects(mediaIds, techIds) {
  const count = await db.project.count();
  if (count >= MIN_PER_CATEGORY) {
    console.log(`Projects: OK (${count} existing, minimum already met)`);
    return;
  }

  let created = 0;
  for (const [i, p] of PROJECT_POOL.entries()) {
    if (created + count >= MIN_PER_CATEGORY) break;
    const existing = await db.project.findUnique({ where: { slug: p.slug } });
    if (existing) continue;

    const versionFields = {
      title: p.title,
      summary: p.summary,
      category: p.category,
      status: p.status,
      featured: p.featured,
      showOnHomepage: true,
      visible: true,
      thumbnailId: mediaIds[i % mediaIds.length],
    };
    const project = await db.project.create({
      data: {
        slug: p.slug,
        versions: {
          create: [
            { state: "DRAFT", ...versionFields },
            { state: "PUBLISHED", ...versionFields, publishedAt: new Date() },
          ],
        },
      },
    });

    if (techIds.length) {
      await db.projectTechnology.createMany({
        data: techIds.slice(0, 2).map((technologyId, order) => ({ projectId: project.id, technologyId, order })),
        skipDuplicates: true,
      });
    }
    created++;
  }
  console.log(`Projects: created ${created} (total now ${count + created})`);
}

// ─── Step 4: education + experience ────────────────────────────────────────

const EDUCATION_POOL = [
  { institution: "State University", qualification: "B.Sc. in Computer Science", startDate: "2019-09-01", endDate: "2023-06-01", grade: "First Class Honours" },
  { institution: "Online Academy", qualification: "Full-Stack Web Development Certificate", startDate: "2023-07-01", endDate: "2023-12-01" },
  { institution: "Community College", qualification: "A-Levels in Mathematics & Physics", startDate: "2017-09-01", endDate: "2019-06-01" },
];

async function ensureEducation() {
  const count = await db.education.count();
  if (count >= MIN_PER_CATEGORY) {
    console.log(`Education: OK (${count} existing, minimum already met)`);
    return;
  }

  let created = 0;
  for (const e of EDUCATION_POOL) {
    if (created + count >= MIN_PER_CATEGORY) break;
    const dup = await db.education.findFirst({
      where: { versions: { some: { institution: e.institution, qualification: e.qualification } } },
    });
    if (dup) continue;

    const versionFields = {
      institution: e.institution,
      qualification: e.qualification,
      startDate: new Date(e.startDate),
      endDate: e.endDate ? new Date(e.endDate) : null,
      grade: e.grade,
      visible: true,
    };
    await db.education.create({
      data: {
        versions: {
          create: [
            { state: "DRAFT", ...versionFields },
            { state: "PUBLISHED", ...versionFields, publishedAt: new Date() },
          ],
        },
      },
    });
    created++;
  }
  console.log(`Education: created ${created} (total now ${count + created})`);
}

// WorkType enum is FULL_TIME/PART_TIME/INTERNSHIP/FREELANCE/VOLUNTEER — note
// experience.service.ts's createExperience() defaults workType to "ON_SITE",
// which is NOT a valid enum value (a pre-existing bug, out of scope here). This
// seed script supplies explicit valid values to avoid tripping it.
const EXPERIENCE_POOL = [
  { organization: "Acme Software", role: "Backend Engineer Intern", startDate: "2023-06-01", endDate: "2023-08-31", workType: "INTERNSHIP", locationText: "Remote" },
  { organization: "Freelance", role: "Full-Stack Developer", startDate: "2023-09-01", endDate: null, isCurrent: true, workType: "FREELANCE", locationText: "Remote" },
  { organization: "Open Source", role: "Contributor", startDate: "2022-01-01", endDate: null, isCurrent: true, workType: "VOLUNTEER", locationText: "Remote" },
];

async function ensureExperience(techIds) {
  const count = await db.experience.count();
  if (count >= MIN_PER_CATEGORY) {
    console.log(`Experience: OK (${count} existing, minimum already met)`);
    return;
  }

  let created = 0;
  for (const x of EXPERIENCE_POOL) {
    if (created + count >= MIN_PER_CATEGORY) break;
    const dup = await db.experience.findFirst({
      where: { versions: { some: { organization: x.organization, role: x.role } } },
    });
    if (dup) continue;

    const versionFields = {
      organization: x.organization,
      role: x.role,
      startDate: new Date(x.startDate),
      endDate: x.endDate ? new Date(x.endDate) : null,
      isCurrent: !!x.isCurrent,
      workType: x.workType,
      locationText: x.locationText,
      visible: true,
    };
    const exp = await db.experience.create({
      data: {
        versions: {
          create: [
            { state: "DRAFT", ...versionFields },
            { state: "PUBLISHED", ...versionFields, publishedAt: new Date() },
          ],
        },
      },
    });

    if (techIds.length) {
      await db.experienceTechnology.createMany({
        data: techIds.slice(0, 2).map((technologyId) => ({ experienceId: exp.id, technologyId })),
        skipDuplicates: true,
      });
    }
    created++;
  }
  console.log(`Experience: created ${created} (total now ${count + created})`);
}

// ─── Step 5: timeline entries ───────────────────────────────────────────────

async function ensureTimeline(linkedProjectId) {
  const count = await db.timelineEntry.count();
  if (count >= MIN_PER_CATEGORY) {
    console.log(`Timeline: OK (${count} existing, minimum already met)`);
    return;
  }

  const pool = [
    { title: "Started Portfolio CMS", entryType: "PROJECT", startDate: "2024-01-01", description: "Began building a full admin-driven portfolio platform.", linkToProject: true },
    { title: "Graduated University", entryType: "ACADEMIC", startDate: "2023-06-01", description: "Completed B.Sc. in Computer Science." },
    { title: "First Open Source Contribution", entryType: "MILESTONE", startDate: "2022-03-01", description: "Landed first merged PR on a public open-source project." },
  ];

  let created = 0;
  for (const t of pool) {
    if (created + count >= MIN_PER_CATEGORY) break;
    const dup = await db.timelineEntry.findFirst({ where: { versions: { some: { title: t.title } } } });
    if (dup) continue;

    const versionFields = {
      title: t.title,
      entryType: t.entryType,
      startDate: new Date(t.startDate),
      description: t.description,
      visible: true,
    };
    await db.timelineEntry.create({
      data: {
        linkedProjectId: t.linkToProject ? linkedProjectId : null,
        versions: {
          create: [
            { state: "DRAFT", ...versionFields },
            { state: "PUBLISHED", ...versionFields, publishedAt: new Date() },
          ],
        },
      },
    });
    created++;
  }
  console.log(`Timeline: created ${created} (total now ${count + created})`);
}

// ─── Step 6: certifications, nav items, social links (simple, non-versioned) ─

async function ensureCertifications(mediaIds) {
  const count = await db.certification.count();
  if (count >= MIN_PER_CATEGORY) {
    console.log(`Certifications: OK (${count} existing, minimum already met)`);
    return;
  }

  const pool = [
    { title: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services", issueDate: "2024-03-01" },
    { title: "Meta Front-End Developer", issuer: "Meta / Coursera", issueDate: "2023-11-01" },
    { title: "Docker Certified Associate", issuer: "Docker Inc.", issueDate: "2024-06-01" },
  ];

  let created = 0;
  let order = count;
  for (const [i, c] of pool.entries()) {
    if (created + count >= MIN_PER_CATEGORY) break;
    const dup = await db.certification.findFirst({ where: { title: c.title, issuer: c.issuer } });
    if (dup) continue;

    await db.certification.create({
      data: {
        title: c.title,
        issuer: c.issuer,
        issueDate: new Date(c.issueDate),
        mediaId: mediaIds[i % mediaIds.length],
        visible: true,
        order: order++,
      },
    });
    created++;
  }
  console.log(`Certifications: created ${created} (total now ${count + created})`);
}

async function ensureNavItems() {
  const count = await db.navItem.count();
  if (count >= MIN_PER_CATEGORY) {
    console.log(`Nav items: OK (${count} existing, minimum already met)`);
    return;
  }

  const pool = [
    { label: "Projects", target: "/projects" },
    { label: "Timeline", target: "/timeline" },
    { label: "About", target: "/about" },
    { label: "Contact", target: "/contact" },
  ];

  let created = 0;
  let order = count;
  for (const n of pool) {
    if (created + count >= MIN_PER_CATEGORY) break;
    const dup = await db.navItem.findFirst({ where: { label: n.label, target: n.target } });
    if (dup) continue;

    await db.navItem.create({ data: { label: n.label, target: n.target, enabled: true, order: order++ } });
    created++;
  }
  console.log(`Nav items: created ${created} (total now ${count + created})`);
}

async function ensureSocialLinks() {
  const count = await db.socialLink.count();
  if (count >= MIN_PER_CATEGORY) {
    console.log(`Social links: OK (${count} existing, minimum already met)`);
    return;
  }

  const pool = [
    { platform: "GitHub", url: "https://github.com/octocat", showInHeader: true, showInFooter: true },
    { platform: "LinkedIn", url: "https://linkedin.com/in/example", showInHeader: true, showInFooter: true },
    { platform: "Twitter", url: "https://twitter.com/example", showInHeader: false, showInFooter: true },
  ];

  let created = 0;
  let order = count;
  for (const s of pool) {
    if (created + count >= MIN_PER_CATEGORY) break;
    // social-link.service.ts enforces one-per-platform (unless "custom") — mirror that here.
    const dup = await db.socialLink.findFirst({ where: { platform: s.platform } });
    if (dup) continue;

    await db.socialLink.create({
      data: {
        platform: s.platform,
        url: s.url,
        showInHeader: s.showInHeader,
        showInFooter: s.showInFooter,
        visible: true,
        order: order++,
      },
    });
    created++;
  }
  console.log(`Social links: created ${created} (total now ${count + created})`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nContent seeding (idempotent, minimum ${MIN_PER_CATEGORY} per category)\n`);

  await assertSchemaReady();

  const mediaIds = await ensureMedia();
  const techIds = await ensureTechnologies();
  await ensureProjects(mediaIds, techIds);

  const firstProject = await db.project.findFirst({ orderBy: { createdAt: "asc" } });
  await ensureEducation();
  await ensureExperience(techIds);
  await ensureTimeline(firstProject?.id ?? null);
  await ensureCertifications(mediaIds);
  await ensureNavItems();
  await ensureSocialLinks();

  await audit("SEED_CONTENT_RUN", "System", null, "seed-content.js completed successfully");
  console.log("\nContent seeding finished.\n");
}

main()
  .catch((e) => {
    if (e.message !== "schema-not-ready") {
      console.error("Content seeding failed:", (e && e.message) || e);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
