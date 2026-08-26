import { describe, it, expect } from "vitest";
import { PublicContentService } from "@/services/public-content.service";
import { SectionGroupService } from "@/services/section-group.service";
import db from "@/lib/database";

/**
 * CMS page composition.
 *
 * The critical invariant: `PageSection.order` is CONTAINER-scoped, not
 * page-scoped — every group restarts at 0 and the ungrouped bucket has its own
 * sequence. Render order is the sequence `flattenOrdered` produces and nothing
 * else. The fixture gives the ungrouped section `order: 0`, the same value the
 * first grouped section has, so a stray global
 * `.sort((a, b) => a.order - b.order)` reorders the page and fails here rather
 * than shipping.
 */

const EXPECTED_ORDER = [
  "HERO",
  "ABOUT",
  "EDUCATION",
  "EXPERIENCE",
  "CONTACT",
  "CALL_TO_ACTION",
  // ungrouped renders after every group, despite having order 0
  "CERTIFICATIONS",
];

describe("section composition", () => {
  it("renders visible sections in flattened container order", async () => {
    const { sections } = await PublicContentService.getHomePageData();
    expect(sections.map((s) => s.type)).toEqual(EXPECTED_ORDER);
  });

  it("places ungrouped sections after all groups, not by their order value", async () => {
    const { sections } = await PublicContentService.getHomePageData();
    const types = sections.map((s) => s.type);
    expect(types[types.length - 1]).toBe("CERTIFICATIONS");
    // Guards the trap directly: sorting globally by `order` would hoist the
    // ungrouped section to the front, because its order is 0.
    const ungrouped = sections[sections.length - 1];
    expect(ungrouped.order).toBe(0);
    expect(types[0]).toBe("HERO");
  });

  it("excludes sections inside a hidden group", async () => {
    const { sections } = await PublicContentService.getHomePageData();
    expect(sections.map((s) => s.type)).not.toContain("PROJECT_GRID");
  });

  it("excludes a section hidden at the section level", async () => {
    const { sections } = await PublicContentService.getHomePageData();
    expect(sections.map((s) => s.internalLabel)).not.toContain("Hidden Section");
  });

  it("keeps EDUCATION and EXPERIENCE as separate rows at the service layer", async () => {
    // Both map to one combined component; de-duplication is the template's job,
    // not the service's. If this ever collapses to one row, the template's
    // de-dup pass silently becomes dead code.
    const { sections } = await PublicContentService.getHomePageData();
    const types = sections.map((s) => s.type);
    expect(types.filter((t) => t === "EDUCATION" || t === "EXPERIENCE")).toHaveLength(2);
  });
});

describe("flattenOrdered", () => {
  it("includes hidden groups when visibleGroupsOnly is false", async () => {
    const page = await db.page.findUniqueOrThrow({ where: { key: "home" } });
    const all = await SectionGroupService.flattenOrdered(page.id, { visibleGroupsOnly: false });
    const visibleOnly = await SectionGroupService.flattenOrdered(page.id, { visibleGroupsOnly: true });
    // The publish diff screen relies on `false` showing hidden groups while the
    // shipped snapshot uses `true`. Both behaviours are load-bearing.
    expect(all.map((s) => s.type)).toContain("PROJECT_GRID");
    expect(visibleOnly.map((s) => s.type)).not.toContain("PROJECT_GRID");
  });

  it("does not apply section-level visibility itself", async () => {
    const page = await db.page.findUniqueOrThrow({ where: { key: "home" } });
    const flattened = await SectionGroupService.flattenOrdered(page.id, { visibleGroupsOnly: true });
    // Section-level filtering happens in resolveSections, not here. Moving it
    // would change what the publish snapshot contains.
    expect(flattened.map((s) => s.internalLabel)).toContain("Hidden Section");
  });
});
