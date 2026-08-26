import { describe, it, expect } from "vitest";
import { PublicContentService } from "@/services/public-content.service";
import { FIXTURE } from "../fixtures/seed";

/**
 * /about and /resume data, now owned by the service rather than assembled in
 * the route files. The two routes previously carried byte-identical query and
 * sort blocks.
 */
describe("getAboutPageData", () => {
  it("returns published, visible education and experience", async () => {
    const { education, experience } = await PublicContentService.getAboutPageData();
    expect(education.map((e) => e.pub.institution)).toContain(FIXTURE.olderInstitution);
    expect(experience.map((e) => e.pub.organization)).toContain(FIXTURE.olderOrganization);
  });

  it("excludes hidden education", async () => {
    const { education } = await PublicContentService.getAboutPageData();
    expect(education.map((e) => e.pub.institution)).not.toContain("Hidden Institution");
  });

  it("does NOT apply showOnResume — that flag is the resume's concern", async () => {
    const { education } = await PublicContentService.getAboutPageData();
    expect(education.map((e) => e.pub.institution)).toContain(FIXTURE.resumeExcludedInstitution);
  });

  it("orders by the admin order column, newest-first as tiebreak", async () => {
    const { education } = await PublicContentService.getAboutPageData();
    const names = education.map((e) => e.pub.institution);
    expect(names.indexOf(FIXTURE.olderInstitution)).toBeLessThan(
      names.indexOf(FIXTURE.newerInstitution)
    );
  });
});

describe("getResumePageData", () => {
  it("applies showOnResume to education", async () => {
    // The behaviour change in this section: showOnResume previously filtered
    // technologies only, so clearing it on a qualification did nothing.
    const { education } = await PublicContentService.getResumePageData();
    expect(education.map((e) => e.pub.institution)).not.toContain(
      FIXTURE.resumeExcludedInstitution
    );
  });

  it("still returns education that is flagged for the resume", async () => {
    const { education } = await PublicContentService.getResumePageData();
    expect(education.map((e) => e.pub.institution)).toContain(FIXTURE.olderInstitution);
  });

  it("excludes hidden education", async () => {
    const { education } = await PublicContentService.getResumePageData();
    expect(education.map((e) => e.pub.institution)).not.toContain("Hidden Institution");
  });

  it("returns experience and technologies", async () => {
    const { experience, technologies } = await PublicContentService.getResumePageData();
    expect(experience.map((e) => e.pub.organization)).toContain(FIXTURE.olderOrganization);
    expect(Array.isArray(technologies)).toBe(true);
  });
});
