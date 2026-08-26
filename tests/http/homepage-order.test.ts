import { describe, it, expect } from "vitest";
import { FIXTURE } from "../fixtures/seed";
import { fetchDom, domIndex } from "./dom";

/**
 * B2 — rendered ordering.
 *
 * PublicContentService sorts education and experience by the admin `order`
 * column, and tests/contract/published-only.test.ts proves it. But
 * EducationExperienceSection re-sorts the same arrays by `startDate`
 * descending, so the admin's drag-to-reorder has no effect on what actually
 * renders. Only the HTML shows this.
 *
 * The fixture seeds `order` and `startDate` to disagree, so the two orderings
 * are distinguishable in the markup.
 *
 * Both assertions below are marked `.fails`: they state the behaviour we want
 * and record that the code does not do it yet. Section 3 adopts the
 * order-then-date comparator from src/app/(public)/about/page.tsx, at which
 * point these start failing by passing, forcing the `.fails` to be removed.
 */
const baseUrl = process.env.TEST_BASE_URL;
const suite = baseUrl ? describe : describe.skip;

const html = (path: string) => fetchDom(baseUrl!, path);

suite("homepage honours the admin order column", () => {
  it.fails("KNOWN BUG B2 — renders education in `order` sequence", async () => {
    const dom = await html("/");
    // order 0 ("Older") must precede order 1 ("Newer"), even though "Newer"
    // has the more recent startDate.
    expect(domIndex(dom, FIXTURE.olderInstitution)).toBeLessThan(
      domIndex(dom, FIXTURE.newerInstitution)
    );
  });

  it.fails("KNOWN BUG B2 — renders experience in `order` sequence", async () => {
    const dom = await html("/");
    expect(domIndex(dom, FIXTURE.olderOrganization)).toBeLessThan(
      domIndex(dom, FIXTURE.newerOrganization)
    );
  });
});

suite("homepage de-duplicates combined sections", () => {
  it("renders the education/experience block exactly once", async () => {
    // EDUCATION and EXPERIENCE are separate rows mapping to one component.
    // Without the template's de-dup pass the whole block renders twice.
    const dom = await html("/");
    const occurrences = dom.split(FIXTURE.olderInstitution).length - 1;
    expect(occurrences).toBe(1);
  });
});
