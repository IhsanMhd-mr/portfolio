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
 * Fixed in Section 3: both components now use `byOrderThenNewest`
 * (src/lib/content-order.ts), which sorts on the admin `order` column and
 * falls back to newest-first only as a tiebreak. These assertions carried
 * `.fails` markers while the bug existed.
 */
const baseUrl = process.env.TEST_BASE_URL;
const suite = baseUrl ? describe : describe.skip;

const html = (path: string) => fetchDom(baseUrl!, path);

suite("homepage honours the admin order column", () => {
  it("renders education in `order` sequence, not newest-first", async () => {
    const dom = await html("/");
    // order 0 ("Older") must precede order 1 ("Newer"), even though "Newer"
    // has the more recent startDate.
    expect(domIndex(dom, FIXTURE.olderInstitution)).toBeLessThan(
      domIndex(dom, FIXTURE.newerInstitution)
    );
  });

  it("renders experience in `order` sequence, not newest-first", async () => {
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
