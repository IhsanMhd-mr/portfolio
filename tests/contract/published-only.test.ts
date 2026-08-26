import { describe, it, expect } from "vitest";
import { PublicContentService } from "@/services/public-content.service";
import { FIXTURE } from "../fixtures/seed";

/**
 * The published-only contract, as stated in src/services/public-content.service.ts:
 *
 *   "the public site renders PUBLISHED content and nothing else ... Anything
 *    unpublished or `visible: false` is filtered out in SQL and can never reach
 *    a response."
 *
 * Nothing in the type system enforces that. These tests do.
 */
describe("published-only contract — homepage data", () => {
  it("includes a published, visible project", async () => {
    const { projects } = await PublicContentService.getHomePageData();
    expect(projects.map((p: any) => p.slug)).toContain(FIXTURE.visibleProjectSlug);
  });

  it("excludes a published project marked not-visible", async () => {
    const { projects } = await PublicContentService.getHomePageData();
    expect(projects.map((p: any) => p.slug)).not.toContain(FIXTURE.hiddenProjectSlug);
  });

  it("excludes a draft-only project", async () => {
    const { projects } = await PublicContentService.getHomePageData();
    expect(projects.map((p: any) => p.slug)).not.toContain(FIXTURE.draftOnlyProjectSlug);
  });

  it("excludes hidden education", async () => {
    const { education } = await PublicContentService.getHomePageData();
    expect(education.map((e: any) => e.institution)).not.toContain("Hidden Institution");
  });

  it("resolves the active template", async () => {
    const { templateKey } = await PublicContentService.getHomePageData();
    expect(templateKey).toBe("MODERN_GLASS");
  });
});

describe("published-only contract — service sorts by the admin order column", () => {
  it("orders education by `order`, not by date", async () => {
    const { education } = await PublicContentService.getHomePageData();
    const names = education.map((e: any) => e.institution);
    // Fixture seeds order and date to disagree; `order` must win here.
    expect(names).toEqual([FIXTURE.olderInstitution, FIXTURE.newerInstitution]);
  });

  it("orders experience by `order`, not by date", async () => {
    const { experience } = await PublicContentService.getHomePageData();
    const names = experience.map((e: any) => e.organization);
    expect(names).toEqual([FIXTURE.olderOrganization, FIXTURE.newerOrganization]);
  });
});
