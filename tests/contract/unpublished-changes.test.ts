import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import db from "@/lib/database";
import { SectionGroupService } from "@/services/section-group.service";
import { FIXTURE } from "../fixtures/seed";

/**
 * B4 — every operation that changes what a publish would ship must flag the
 * page as dirty.
 *
 * `hasUnpublishedChanges` drives the "unpublished changes" indicator in the
 * admin shell. PageSectionService already set it for module add/update/remove,
 * and assignModuleToGroup set it for moves — but the five group-level
 * operations below did not, so reordering the homepage left the admin
 * reporting that there was nothing to publish.
 */
// NOTE: SectionGroupService declares its own local `AuditContext` — stricter
// than the exported one in src/lib/audit.ts, which has every field optional.
// Five services carry an identical private copy of this type. Consolidating
// them is a real cleanup but unrelated to the bugs in this section, so the
// shape is matched here rather than changed.
let ctx: { actorId: string; loginMethod: string; loginAccountId: string | null };

async function homePage() {
  return db.page.findUniqueOrThrow({ where: { key: "home" } });
}

async function clearFlag(pageId: string) {
  await db.page.update({ where: { id: pageId }, data: { hasUnpublishedChanges: false } });
}

async function flag(pageId: string) {
  const p = await db.page.findUniqueOrThrow({ where: { id: pageId } });
  return p.hasUnpublishedChanges;
}

const TEST_GROUP_PREFIX = "Flag Test";

describe("group operations flag unpublished changes", () => {
  let pageId: string;
  let originalGroupIds: string[] = [];

  // Captured BEFORE any test creates a group, so the restore list contains
  // only groups that will still exist after the cleanup delete. Capturing it
  // inside a test meant it included the test's own groups, and afterAll then
  // tried to reorder rows it had just deleted.
  beforeAll(async () => {
    const owner = await db.user.findUniqueOrThrow({
      where: { username: FIXTURE.ownerUsername },
    });
    ctx = { actorId: owner.id, loginMethod: "test", loginAccountId: null };

    const page = await homePage();
    const groups = await SectionGroupService.listGroups(page.id);
    originalGroupIds = groups.map((g) => g.id);
  });

  beforeEach(async () => {
    pageId = (await homePage()).id;
    await clearFlag(pageId);
  });

  /**
   * These tests mutate shared fixture state — they create groups and reverse
   * group ordering. tests/contract/section-composition.test.ts asserts an exact
   * rendered sequence against the same database, so leaving that state behind
   * would make one suite's result depend on the order the files happen to run
   * in. Restoring here keeps the two independent.
   */
  afterAll(async () => {
    const page = await homePage();
    await db.sectionGroup.deleteMany({
      where: { pageId: page.id, title: { startsWith: TEST_GROUP_PREFIX } },
    });
    if (originalGroupIds.length > 0) {
      await db.$transaction(
        originalGroupIds.map((id, index) =>
          db.sectionGroup.update({ where: { id }, data: { order: index } })
        )
      );
    }
    const ungrouped = await db.pageSection.findMany({
      where: { pageId: page.id, groupId: null },
      orderBy: { order: "asc" },
    });
    await db.$transaction(
      ungrouped.map((s, index) =>
        db.pageSection.update({ where: { id: s.id }, data: { order: index } })
      )
    );
    await clearFlag(page.id);
  });

  it("createGroup", async () => {
    await SectionGroupService.createGroup(pageId, { title: "Flag Test A" }, ctx);
    expect(await flag(pageId)).toBe(true);
  });

  it("updateGroup", async () => {
    const g = await SectionGroupService.createGroup(pageId, { title: "Flag Test B" }, ctx);
    await clearFlag(pageId);
    await SectionGroupService.updateGroup(g.id, { title: "Flag Test B renamed" }, ctx);
    expect(await flag(pageId)).toBe(true);
  });

  it("updateGroup — visibility toggle", async () => {
    const g = await SectionGroupService.createGroup(pageId, { title: "Flag Test C" }, ctx);
    await clearFlag(pageId);
    await SectionGroupService.updateGroup(g.id, { title: "Flag Test C", visible: false }, ctx);
    expect(await flag(pageId)).toBe(true);
  });

  it("deleteGroup", async () => {
    const g = await SectionGroupService.createGroup(pageId, { title: "Flag Test D" }, ctx);
    await clearFlag(pageId);
    await SectionGroupService.deleteGroup(g.id, pageId, ctx);
    expect(await flag(pageId)).toBe(true);
  });

  it("reorderGroups", async () => {
    const groups = await SectionGroupService.listGroups(pageId);
    await clearFlag(pageId);
    // Reverse the existing set — reorderGroups validates the id set exactly.
    await SectionGroupService.reorderGroups(pageId, groups.map((g) => g.id).reverse(), ctx);
    expect(await flag(pageId)).toBe(true);
  });

  it("reorderModulesInContainer", async () => {
    const ungrouped = await db.pageSection.findMany({ where: { pageId, groupId: null } });
    await clearFlag(pageId);
    await SectionGroupService.reorderModulesInContainer(
      pageId,
      null,
      ungrouped.map((s) => s.id).reverse(),
      ctx
    );
    expect(await flag(pageId)).toBe(true);
  });
});
