import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Deterministic fixture for the test database.
 *
 * Every row here exists to make one invariant observable. In particular the
 * education/experience rows are seeded so that `order` and `startDate`
 * DISAGREE — sorting by one produces a different sequence than sorting by the
 * other. A fixture where they agree would pass whichever sort the code used,
 * which is precisely the bug (B2) these tests need to catch.
 *
 * No PageVersion snapshot is created, so `resolveSections` exercises its
 * documented live-fallback path (the state a fresh install is in).
 */

export const FIXTURE = {
  visibleProjectSlug: "visible-project",
  hiddenProjectSlug: "hidden-project",
  draftOnlyProjectSlug: "draft-only-project",

  // order ASC  → "Older Institution" first  (order 0, startDate 2010)
  // date DESC  → "Newer Institution" first  (order 1, startDate 2020)
  olderInstitution: "Older Institution",
  newerInstitution: "Newer Institution",

  olderOrganization: "Older Organization",
  newerOrganization: "Newer Organization",

  ownerUsername: "test-owner",

  visibleGroupTitle: "Visible Group",
  hiddenGroupTitle: "Hidden Group",
} as const;

function client() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  return new PrismaClient({ adapter: new PrismaPg(pool), log: ["error"] });
}

export async function seedTestData() {
  const db = client();
  try {
    // Audit logging runs inside the service operations under test, and
    // AuditLog.actorId is a real foreign key to users. Without an actual owner
    // row every audited mutation fails on the FK constraint rather than on
    // anything it was meant to prove.
    await db.user.create({
      data: {
        username: FIXTURE.ownerUsername,
        email: "owner@example.test",
        name: "Test Owner",
      },
    });

    const template = await db.template.create({
      data: {
        key: "MODERN_GLASS",
        name: "Modern Glass",
        isActiveLive: true,
      },
    });

    await db.siteProfile.create({
      data: {
        fullName: "Test Owner",
        logoText: "TO",
        title: "Test Engineer",
        aboutBio: "Fixture bio.",
        contactEmail: "owner@example.test",
      },
    });

    await seedProjects(db);
    await seedEducation(db);
    await seedExperience(db);
    await seedPage(db, template.id);
  } finally {
    await db.$disconnect();
  }
}

async function seedProjects(db: PrismaClient) {
  // Renders publicly.
  await db.project.create({
    data: {
      slug: FIXTURE.visibleProjectSlug,
      versions: {
        create: {
          state: "PUBLISHED",
          title: "Visible Project",
          summary: "A published, visible project.",
          visible: true,
          featured: true,
        },
      },
    },
  });

  // PUBLISHED but hidden. Must not appear on ANY public surface — including
  // its own detail URL. This is the row that exposes B1.
  await db.project.create({
    data: {
      slug: FIXTURE.hiddenProjectSlug,
      versions: {
        create: {
          state: "PUBLISHED",
          title: "Hidden Project",
          summary: "Published but marked not-visible.",
          visible: false,
        },
      },
    },
  });

  // Never published. Must not appear anywhere.
  await db.project.create({
    data: {
      slug: FIXTURE.draftOnlyProjectSlug,
      versions: {
        create: {
          state: "DRAFT",
          title: "Draft Only Project",
          summary: "Never published.",
          visible: true,
        },
      },
    },
  });
}

async function seedEducation(db: PrismaClient) {
  await db.education.create({
    data: {
      versions: {
        create: {
          state: "PUBLISHED",
          institution: FIXTURE.olderInstitution,
          qualification: "BSc",
          startDate: new Date("2010-01-01"),
          order: 0,
          visible: true,
        },
      },
    },
  });
  await db.education.create({
    data: {
      versions: {
        create: {
          state: "PUBLISHED",
          institution: FIXTURE.newerInstitution,
          qualification: "MSc",
          startDate: new Date("2020-01-01"),
          order: 1,
          visible: true,
        },
      },
    },
  });
  // Hidden — must never surface.
  await db.education.create({
    data: {
      versions: {
        create: {
          state: "PUBLISHED",
          institution: "Hidden Institution",
          qualification: "PhD",
          startDate: new Date("2015-01-01"),
          order: 2,
          visible: false,
        },
      },
    },
  });
}

async function seedExperience(db: PrismaClient) {
  await db.experience.create({
    data: {
      versions: {
        create: {
          state: "PUBLISHED",
          organization: FIXTURE.olderOrganization,
          role: "Engineer",
          startDate: new Date("2011-01-01"),
          order: 0,
          visible: true,
        },
      },
    },
  });
  await db.experience.create({
    data: {
      versions: {
        create: {
          state: "PUBLISHED",
          organization: FIXTURE.newerOrganization,
          role: "Senior Engineer",
          startDate: new Date("2021-01-01"),
          order: 1,
          visible: true,
        },
      },
    },
  });
}

async function seedPage(db: PrismaClient, templateId: string) {
  const page = await db.page.create({
    data: { key: "home", title: "Home", draftTemplateId: templateId },
  });

  const visibleGroup = await db.sectionGroup.create({
    data: { pageId: page.id, title: FIXTURE.visibleGroupTitle, order: 0, visible: true },
  });
  const hiddenGroup = await db.sectionGroup.create({
    data: { pageId: page.id, title: FIXTURE.hiddenGroupTitle, order: 1, visible: false },
  });

  // `order` is CONTAINER-scoped, not page-scoped: each container restarts at 0.
  // Render order is the sequence flattenOrdered produces, never a global sort
  // on this column. The duplicated zeros below are deliberate — they make a
  // stray global `.sort((a,b) => a.order - b.order)` produce a visibly wrong
  // sequence rather than an accidentally-correct one.
  await db.pageSection.createMany({
    data: [
      { pageId: page.id, groupId: visibleGroup.id, type: "HERO", internalLabel: "Hero", order: 0 },
      { pageId: page.id, groupId: visibleGroup.id, type: "ABOUT", internalLabel: "About", order: 1 },
      { pageId: page.id, groupId: visibleGroup.id, type: "EDUCATION", internalLabel: "Education", order: 2 },
      { pageId: page.id, groupId: visibleGroup.id, type: "EXPERIENCE", internalLabel: "Experience", order: 3 },
      { pageId: page.id, groupId: visibleGroup.id, type: "CONTACT", internalLabel: "Contact", order: 4 },
      { pageId: page.id, groupId: visibleGroup.id, type: "CALL_TO_ACTION", internalLabel: "CTA", order: 5 },
      // Hidden at the section level — group is visible, this row is not.
      { pageId: page.id, groupId: visibleGroup.id, type: "TECH_STACK", internalLabel: "Hidden Section", order: 6, visible: false },
      // Inside a hidden group — the whole group must vanish.
      { pageId: page.id, groupId: hiddenGroup.id, type: "PROJECT_GRID", internalLabel: "In Hidden Group", order: 0 },
      // Ungrouped — must render after every group.
      { pageId: page.id, groupId: null, type: "CERTIFICATIONS", internalLabel: "Ungrouped", order: 0 },
    ],
  });
}
