import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/database";
import { PublishService } from "@/services/publish.service";
import { PublicContentService } from "@/services/public-content.service";
import { EducationService } from "@/services/education.service";
import { PROMOTED_FIELDS } from "@/services/publish-diff.service";
import { PageService } from "@/services/page.service";
import { FIXTURE } from "../fixtures/seed";

/**
 * DRAFT → PUBLISHED promotion.
 *
 * This is the operation with the widest blast radius: it decides what every
 * visitor sees, and its failure mode is silent — a column missing from
 * PROMOTED_FIELDS is skipped by the promotion AND invisible to the change
 * detection, so the admin is told there is nothing to publish while the live
 * site keeps the old value. That has happened once already.
 */
let ctx: { userId: string; actorId: string; loginMethod: string; loginAccountId: string | null };
const CREATED_EDUCATION: string[] = [];

/**
 * PUBLISHED rows that existed before this suite ran.
 *
 * Publishing is inherently global — it promotes every draft in the database,
 * including the fixture's deliberately-unpublished rows. Other suites assert
 * that those stay unpublished, so anything this file promotes has to be undone
 * or the result depends on file order.
 */
const preexistingPublished = {
  project: new Set<string>(),
  technology: new Set<string>(),
  timelineEntry: new Set<string>(),
  education: new Set<string>(),
  experience: new Set<string>(),
};

async function snapshotPublishedIds() {
  const [p, t, tl, e, x] = await Promise.all([
    db.projectVersion.findMany({ where: { state: "PUBLISHED" }, select: { id: true } }),
    db.technologyVersion.findMany({ where: { state: "PUBLISHED" }, select: { id: true } }),
    db.timelineEntryVersion.findMany({ where: { state: "PUBLISHED" }, select: { id: true } }),
    db.educationVersion.findMany({ where: { state: "PUBLISHED" }, select: { id: true } }),
    db.experienceVersion.findMany({ where: { state: "PUBLISHED" }, select: { id: true } }),
  ]);
  p.forEach((r) => preexistingPublished.project.add(r.id));
  t.forEach((r) => preexistingPublished.technology.add(r.id));
  tl.forEach((r) => preexistingPublished.timelineEntry.add(r.id));
  e.forEach((r) => preexistingPublished.education.add(r.id));
  x.forEach((r) => preexistingPublished.experience.add(r.id));
}

/** Removes PUBLISHED rows this suite created, leaving the fixture as it was. */
async function removePublishedCreatedHere() {
  const tables = [
    [db.projectVersion, preexistingPublished.project],
    [db.technologyVersion, preexistingPublished.technology],
    [db.timelineEntryVersion, preexistingPublished.timelineEntry],
    [db.educationVersion, preexistingPublished.education],
    [db.experienceVersion, preexistingPublished.experience],
  ] as const;

  for (const [table, keep] of tables) {
    const rows = await (table as { findMany: (a: unknown) => Promise<{ id: string }[]> }).findMany({
      where: { state: "PUBLISHED" },
      select: { id: true },
    });
    const toDelete = rows.map((r) => r.id).filter((id) => !keep.has(id));
    if (toDelete.length > 0) {
      await (table as { deleteMany: (a: unknown) => Promise<unknown> }).deleteMany({
        where: { id: { in: toDelete } },
      });
    }
  }
}

beforeAll(async () => {
  const owner = await db.user.findUniqueOrThrow({ where: { username: FIXTURE.ownerUsername } });
  ctx = {
    userId: owner.id,
    actorId: owner.id,
    loginMethod: "test",
    loginAccountId: null,
  };
  await snapshotPublishedIds();
});

afterAll(async () => {
  await removePublishedCreatedHere();
  const ids = CREATED_EDUCATION.filter(Boolean);
  if (ids.length > 0) await db.education.deleteMany({ where: { id: { in: ids } } });
});

describe("PublishService.publishHomePage", () => {
  it("promotes a draft so the public site can see it", async () => {
    const created = await EducationService.createEducation(
      {
        institution: "Publish Probe Institution",
        qualification: "MSc",
        startDate: new Date("2018-01-01"),
        order: 99,
      },
      ctx
    );
    CREATED_EDUCATION.push(created.base.id);

    // Before publishing: draft only, invisible publicly.
    const before = await PublicContentService.getAboutPageData();
    expect(before.education.map((e) => e.pub.institution)).not.toContain(
      "Publish Probe Institution"
    );

    const result = await PublishService.publishHomePage(ctx);
    expect(result.ok).toBe(true);

    const published = await db.educationVersion.findFirst({
      where: { educationId: created.base.id, state: "PUBLISHED" },
    });
    expect(published).not.toBeNull();
    expect(published?.institution).toBe("Publish Probe Institution");
    // publishedAt is stamped, not copied from the draft.
    expect(published?.publishedAt).not.toBeNull();
  });

  it("carries EVERY promoted field onto the published row", async () => {
    // The regression that motivated the check:promoted guard. Rather than
    // asserting a hand-picked subset — which is exactly the mistake being
    // guarded against — compare all of them.
    const draft = await db.educationVersion.findFirstOrThrow({
      where: { educationId: CREATED_EDUCATION[0], state: "DRAFT" },
    });
    const published = await db.educationVersion.findFirstOrThrow({
      where: { educationId: CREATED_EDUCATION[0], state: "PUBLISHED" },
    });

    for (const field of PROMOTED_FIELDS.education) {
      expect(
        published[field as keyof typeof published],
        `promoted field "${field}" did not reach the published row`
      ).toEqual(draft[field as keyof typeof draft]);
    }
  });

  it("clears the unpublished-changes flag", async () => {
    await PageService.markDirty();
    await PublishService.publishHomePage(ctx);
    const page = await PageService.getHomePage();
    expect(page?.hasUnpublishedChanges).toBe(false);
  });

  it("increments the version number and activates exactly one snapshot", async () => {
    const first = await PublishService.publishHomePage(ctx);
    const second = await PublishService.publishHomePage(ctx);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.versionNumber).toBe(first.versionNumber + 1);
    }

    const page = await PageService.getHomePage();
    const active = await db.pageVersion.count({
      where: { pageId: page!.id, isActive: true },
    });
    expect(active).toBe(1);
  });

  it("activates exactly one template", async () => {
    await PublishService.publishHomePage(ctx);
    expect(await db.template.count({ where: { isActiveLive: true } })).toBe(1);
  });

  it("does NOT promote soft-deleted content", async () => {
    const created = await EducationService.createEducation(
      {
        institution: "Deleted Probe Institution",
        qualification: "PhD",
        startDate: new Date("2017-01-01"),
      },
      ctx
    );
    CREATED_EDUCATION.push(created.base.id);
    await db.education.update({
      where: { id: created.base.id },
      data: { deletedAt: new Date() },
    });

    await PublishService.publishHomePage(ctx);

    // Publishing must not write to entities the admin deleted.
    const published = await db.educationVersion.findFirst({
      where: { educationId: created.base.id, state: "PUBLISHED" },
    });
    expect(published).toBeNull();
  });

  it("writes a snapshot containing the visible sections", async () => {
    const result = await PublishService.publishHomePage(ctx);
    expect(result.ok).toBe(true);

    const page = await PageService.getHomePage();
    const active = await db.pageVersion.findFirstOrThrow({
      where: { pageId: page!.id, isActive: true },
    });
    const snapshot = typeof active.snapshot === "string" ? JSON.parse(active.snapshot) : active.snapshot;
    expect(Array.isArray(snapshot)).toBe(true);
    expect((snapshot as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("PublishService.getStatus", () => {
  it("reports no pending changes immediately after a publish", async () => {
    await PublishService.publishHomePage(ctx);
    const status = await PublishService.getStatus();
    expect(status).not.toBeNull();
    expect(status!.hasUnpublishedChanges).toBe(false);
  });

  it("self-heals a stuck unpublished-changes latch", async () => {
    // The flag is a sticky latch: set by every write, cleared only on publish.
    // An edit that was reverted left it stuck true forever.
    await PublishService.publishHomePage(ctx);
    await PageService.markDirty();

    const status = await PublishService.getStatus();
    expect(status!.hasUnpublishedChanges).toBe(false);

    const page = await PageService.getHomePage();
    expect(page?.hasUnpublishedChanges).toBe(false);
  });

  it("detects a pending change after an edit", async () => {
    await PublishService.publishHomePage(ctx);
    const created = await EducationService.createEducation(
      {
        institution: "Pending Probe Institution",
        qualification: "BA",
        startDate: new Date("2016-01-01"),
      },
      ctx
    );
    CREATED_EDUCATION.push(created.base.id);

    const status = await PublishService.getStatus();
    expect(status!.hasUnpublishedChanges).toBe(true);
  });

  it("lists sections including hidden groups, since it summarises what exists", async () => {
    const status = await PublishService.getStatus();
    expect(status!.sectionsList.length).toBeGreaterThan(0);
    // The hidden group's module appears here but is excluded from the snapshot.
    expect(status!.sectionsList.map((s) => s.type)).toContain("PROJECT_GRID");
  });
});

describe("revalidation targets", () => {
  it("covers every public route that renders versioned content", () => {
    expect(PublishService.REVALIDATE_PATHS).toContain("/");
    expect(PublishService.REVALIDATE_PATHS).toContain("/projects");
    expect(PublishService.REVALIDATE_PATHS).toContain("/timeline");
    expect(PublishService.REVALIDATE_PATHS).toContain("/resume");
    // /about renders education and experience — both versioned. It was missing.
    expect(PublishService.REVALIDATE_PATHS).toContain("/about");
    // Project detail pages render project versions. Also missing.
    expect(PublishService.REVALIDATE_DYNAMIC_PATHS).toContain("/projects/[slug]");
  });

  it("omits /contact, which renders only unversioned content", () => {
    // Site profile and social links are live at edit time, so a publish cannot
    // change what /contact shows. Asserted so it is not "fixed" by mistake.
    expect(PublishService.REVALIDATE_PATHS).not.toContain("/contact");
  });
});
