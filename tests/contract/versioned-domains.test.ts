import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/database";
import { EducationService } from "@/services/education.service";
import { ExperienceService } from "@/services/experience.service";
import { TimelineService } from "@/services/timeline.service";
import { TechnologyService } from "@/services/technology.service";
import { PublicContentService } from "@/services/public-content.service";
import { FIXTURE } from "../fixtures/seed";

/**
 * Education and experience are VERSIONED domains.
 *
 * The invariant that matters: an admin edit writes the DRAFT row and the
 * public site keeps rendering the PUBLISHED one until a publish promotes it.
 * Nothing in the type system enforces that separation, and the admin list
 * queries the *Version table directly to paginate on `order`, so it is easy to
 * reach for the wrong state.
 */
let ctx: { actorId: string; loginMethod: string; loginAccountId: string | null };
const CREATED_EDUCATION: string[] = [];
const CREATED_EXPERIENCE: string[] = [];
const CREATED_TIMELINE: string[] = [];
const CREATED_TECHNOLOGY: string[] = [];

beforeAll(async () => {
  const owner = await db.user.findUniqueOrThrow({ where: { username: FIXTURE.ownerUsername } });
  ctx = { actorId: owner.id, loginMethod: "test", loginAccountId: null, ipAddress: undefined, userAgent: undefined } as never;
});

afterAll(async () => {
  // Hard-delete what these tests created; the service does a soft delete, which
  // would leave rows other suites count.
  //
  // The `.filter(Boolean)` and the length guards are not defensive noise. An
  // earlier version of this file pushed `created.id`, which is undefined
  // because the service returns `{ base, draft }` — and Prisma reads an
  // `undefined` filter as "no filter", so `deleteMany({ where: { id:
  // undefined } })` emptied both tables. Never hand Prisma a filter value that
  // might be undefined.
  const educationIds = CREATED_EDUCATION.filter(Boolean);
  const experienceIds = CREATED_EXPERIENCE.filter(Boolean);
  if (educationIds.length > 0) {
    await db.education.deleteMany({ where: { id: { in: educationIds } } });
  }
  if (experienceIds.length > 0) {
    await db.experience.deleteMany({ where: { id: { in: experienceIds } } });
  }
  const timelineIds = CREATED_TIMELINE.filter(Boolean);
  if (timelineIds.length > 0) {
    await db.timelineEntry.deleteMany({ where: { id: { in: timelineIds } } });
  }
  const technologyIds = CREATED_TECHNOLOGY.filter(Boolean);
  if (technologyIds.length > 0) {
    await db.technology.deleteMany({ where: { id: { in: technologyIds } } });
  }
});

describe("education drafts stay out of public content", () => {
  it("a newly created education is DRAFT only and invisible publicly", async () => {
    const created = await EducationService.createEducation(
      {
        institution: "Draft Test Institution",
        qualification: "MSc",
        startDate: new Date("2019-01-01"),
      },
      ctx
    );
    CREATED_EDUCATION.push(created.base.id);

    const versions = await db.educationVersion.findMany({
      where: { educationId: created.base.id },
    });
    expect(versions).toHaveLength(1);
    expect(versions[0].state).toBe("DRAFT");

    // Public reads are pinned to PUBLISHED, so this must not surface anywhere.
    const { education } = await PublicContentService.getAboutPageData();
    expect(education.map((e) => e.pub.institution)).not.toContain("Draft Test Institution");

    const home = await PublicContentService.getHomePageData();
    expect(home.education.map((e: any) => e.institution)).not.toContain("Draft Test Institution");
  });

  it("listDraftPage returns the draft for the admin list", async () => {
    const { items, total } = await EducationService.listDraftPage(1, 50);
    expect(total).toBeGreaterThan(0);
    expect(items.map((i) => i.draft.institution)).toContain("Draft Test Institution");
  });

  it("getDraftById returns the draft, and null for an unknown id", async () => {
    const id = CREATED_EDUCATION[0];
    const found = await EducationService.getDraftById(id);
    expect(found?.draft.state).toBe("DRAFT");
    expect(await EducationService.getDraftById("no-such-id")).toBeNull();
  });
});

describe("experience drafts stay out of public content", () => {
  it("a newly created experience is DRAFT only and invisible publicly", async () => {
    const created = await ExperienceService.createExperience(
      {
        organization: "Draft Test Organization",
        role: "Engineer",
        startDate: new Date("2019-01-01"),
      },
      ctx
    );
    CREATED_EXPERIENCE.push(created.base.id);

    const versions = await db.experienceVersion.findMany({
      where: { experienceId: created.base.id },
    });
    expect(versions.every((v) => v.state === "DRAFT")).toBe(true);

    const { experience } = await PublicContentService.getAboutPageData();
    expect(experience.map((e) => e.pub.organization)).not.toContain("Draft Test Organization");
  });

  it("listDraftPage paginates", async () => {
    const firstPage = await ExperienceService.listDraftPage(1, 1);
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.totalPages).toBeGreaterThanOrEqual(1);
  });
});

describe("timeline drafts stay out of public content", () => {
  it("a newly created entry is DRAFT only and invisible publicly", async () => {
    const created = await TimelineService.createEntry(
      {
        title: "Draft Test Milestone",
        entryType: "MILESTONE",
        startDate: new Date("2019-06-01"),
      },
      ctx
    );
    CREATED_TIMELINE.push(created.base.id);

    const versions = await db.timelineEntryVersion.findMany({
      where: { timelineEntryId: created.base.id },
    });
    expect(versions).toHaveLength(1);
    expect(versions[0].state).toBe("DRAFT");

    const { entries } = await PublicContentService.getTimelinePageData();
    expect(entries.map((e) => e.published.title)).not.toContain("Draft Test Milestone");

    const home = await PublicContentService.getHomePageData();
    expect(home.timelineEntries.map((e: any) => e.title)).not.toContain("Draft Test Milestone");
  });

  it("listDraftPage returns the draft for the admin list", async () => {
    const { drafts, total } = await TimelineService.listDraftPage(1, 50);
    expect(total).toBeGreaterThan(0);
    expect(drafts.map((d) => d.title)).toContain("Draft Test Milestone");
  });

  it("getDraftById returns null for an unknown id", async () => {
    expect(await TimelineService.getDraftById("no-such-id")).toBeNull();
  });
});

describe("technology drafts stay out of public content", () => {
  it("a newly created technology is DRAFT only and invisible publicly", async () => {
    const created = await TechnologyService.createTechnology(
      {
        name: "Draft Test Tech",
        slug: "draft-test-tech",
        category: "BACKEND",
        experienceLabel: "STRONG",
      },
      ctx
    );
    CREATED_TECHNOLOGY.push(created.tech.id);

    const home = await PublicContentService.getHomePageData();
    expect(home.technologies.map((t: any) => t.name)).not.toContain("Draft Test Tech");
  });

  it("listDraftPage exposes usage counts for the delete warning", async () => {
    const { items } = await TechnologyService.listDraftPage(1, 50);
    const row = items.find((i) => i.draft.name === "Draft Test Tech");
    expect(row).toBeDefined();
    expect(row).toHaveProperty("projectCount");
    expect(row).toHaveProperty("experienceCount");
    expect(row).toHaveProperty("timelineCount");
  });

  it("deleting a technology that is in use throws a message naming the usage", async () => {
    // The list page surfaces this via ?error=. It previously called
    // revalidatePath with a query string, which matches no path, so the
    // message was discarded and the delete appeared to do nothing.
    const project = await db.project.findFirstOrThrow({ where: { deletedAt: null } });
    const created = await TechnologyService.createTechnology(
      {
        name: "Draft Test Used Tech",
        slug: "draft-test-used-tech",
        category: "TOOLS",
        experienceLabel: "LEARNING",
      },
      ctx
    );
    CREATED_TECHNOLOGY.push(created.tech.id);
    await db.projectTechnology.create({
      data: { projectId: project.id, technologyId: created.tech.id, order: 0 },
    });

    await expect(TechnologyService.deleteTechnology(created.tech.id, ctx)).rejects.toThrow(
      /actively used/i
    );
  });

  it("getDraftById returns null for an unknown id", async () => {
    expect(await TechnologyService.getDraftById("no-such-id")).toBeNull();
  });
});
