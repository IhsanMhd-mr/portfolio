import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

/**
 * SectionGroupService — Phase 5.
 *
 * Owns the SectionGroup domain: creating/editing/reordering groups, and
 * module (PageSection) membership within groups. Groups are PURELY
 * ORGANIZATIONAL — they order and compose modules for the builder and the
 * render pipeline; they carry no content or business logic of their own
 * (a group never decides what a module renders, only where it sits).
 *
 * DECISION (documented per Phase 5 spec §20): groups are NOT rendered as
 * visual sections on the public site in this milestone. Their title/subtitle
 * exist for builder organization only. This keeps the public renderer
 * completely unchanged (Invariant A) — no template touches group data, only
 * the flattened, ordered module list they already know how to render.
 *
 * RENDER POLICY (documented per §8/§25, the single source of truth used by
 * BOTH preview and publish so they can never disagree — see flattenOrdered):
 *   1. Visible groups render first, in group.order, each group's modules in
 *      their own order.
 *   2. Ungrouped modules (groupId = null) render after all groups, in their
 *      own order — this is exactly the pre-Phase-5 rendering behavior, so
 *      every existing page keeps rendering unchanged immediately after
 *      migration with zero admin action required.
 */

type AuditContext = { actorId: string; loginMethod: string; loginAccountId: string | null };

export interface GroupInput {
  title: string;
  subtitle?: string | null;
}

/**
 * Flags the page as having unpublished changes.
 *
 * Anything that alters what a publish would ship has to set this, or the
 * "unpublished changes" indicator in the admin shell lies. PageSectionService
 * already did it for module add/update/remove, and assignModuleToGroup did it
 * for moves — but creating, renaming, hiding, deleting and reordering groups,
 * and reordering modules within a container, all changed the rendered output
 * while leaving the flag untouched. Reordering the homepage and being told
 * there was nothing to publish was the visible symptom.
 *
 * Takes the transaction client so the flag commits atomically with the change
 * that caused it; a crash between the two would leave the page dirty in fact
 * but clean in the UI.
 */
async function markPageDirty(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  pageId: string
) {
  await tx.page.update({ where: { id: pageId }, data: { hasUnpublishedChanges: true } });
}

export class SectionGroupService {
  // ─── Group CRUD ────────────────────────────────────────────────────────

  static async listGroups(pageId: string) {
    return db.sectionGroup.findMany({ where: { pageId }, orderBy: { order: "asc" } });
  }

  static async createGroup(pageId: string, input: GroupInput, auditContext: AuditContext) {
    const last = await db.sectionGroup.findFirst({ where: { pageId }, orderBy: { order: "desc" } });
    const created = await db.$transaction(async (tx) => {
      const group = await tx.sectionGroup.create({
        data: { pageId, title: input.title, subtitle: input.subtitle || null, order: (last?.order ?? -1) + 1 },
      });
      await markPageDirty(tx, pageId);
      return group;
    });
    await recordAudit({
      action: "SECTION_GROUP_CREATED", entityType: "SectionGroup", entityId: created.id,
      summary: `Created section group: ${input.title}`, context: auditContext,
    });
    return created;
  }

  static async updateGroup(
    id: string,
    input: GroupInput & { visible?: boolean },
    auditContext: AuditContext
  ) {
    const existing = await db.sectionGroup.findUnique({ where: { id } });
    if (!existing) throw new Error("Section group not found.");
    const updated = await db.$transaction(async (tx) => {
      const group = await tx.sectionGroup.update({
        where: { id },
        data: {
          title: input.title,
          subtitle: input.subtitle ?? null,
          ...(typeof input.visible === "boolean" ? { visible: input.visible } : {}),
        },
      });
      await markPageDirty(tx, existing.pageId);
      return group;
    });
    await recordAudit({
      action: "SECTION_GROUP_UPDATED", entityType: "SectionGroup", entityId: id,
      summary: `Updated section group: ${input.title}`, context: auditContext,
    });
    return updated;
  }

  /**
   * Deletes a group. Contained modules are NOT deleted — they are moved to
   * the ungrouped bucket (groupId = null) and appended after any existing
   * ungrouped modules, preserving their relative order. This satisfies the
   * "no destructive rebuild" invariant: deleting an empty organizational
   * container never loses content.
   */
  static async deleteGroup(id: string, pageId: string, auditContext: AuditContext) {
    const existing = await db.sectionGroup.findUnique({ where: { id }, include: { sections: { orderBy: { order: "asc" } } } });
    if (!existing) throw new Error("Section group not found.");

    await db.$transaction(async (tx) => {
      const lastUngrouped = await tx.pageSection.findFirst({
        where: { pageId, groupId: null },
        orderBy: { order: "desc" },
      });
      let nextOrder = (lastUngrouped?.order ?? -1) + 1;
      for (const section of existing.sections) {
        await tx.pageSection.update({ where: { id: section.id }, data: { groupId: null, order: nextOrder } });
        nextOrder += 1;
      }
      await tx.sectionGroup.delete({ where: { id } });
      await markPageDirty(tx, pageId);
    });

    await recordAudit({
      action: "SECTION_GROUP_DELETED", entityType: "SectionGroup", entityId: id,
      summary: `Deleted section group: ${existing.title} (${existing.sections.length} module(s) moved to ungrouped)`,
      context: auditContext,
    });
  }

  static async reorderGroups(pageId: string, orderedIds: string[], auditContext: AuditContext) {
    const groups = await db.sectionGroup.findMany({ where: { pageId } });
    const validIds = new Set(groups.map((g) => g.id));
    if (orderedIds.some((id) => !validIds.has(id)) || orderedIds.length !== groups.length) {
      throw new Error("Invalid group ordering: id set does not match the page's groups.");
    }
    await db.$transaction([
      ...orderedIds.map((id, index) => db.sectionGroup.update({ where: { id }, data: { order: index } })),
      db.page.update({ where: { id: pageId }, data: { hasUnpublishedChanges: true } }),
    ]);
    await recordAudit({
      action: "SECTION_GROUP_REORDERED", entityType: "SectionGroup",
      summary: "Reordered section groups", context: auditContext,
    });
  }

  // ─── Module (PageSection) container membership ───────────────────────────

  /**
   * Reorders modules within ONE container (a group, or the ungrouped bucket
   * when groupId is null). Never trusts client-provided order values —
   * order is always recalculated from array position.
   */
  static async reorderModulesInContainer(
    pageId: string,
    groupId: string | null,
    orderedSectionIds: string[],
    auditContext: AuditContext
  ) {
    const sections = await db.pageSection.findMany({ where: { pageId, groupId } });
    const validIds = new Set(sections.map((s) => s.id));
    if (orderedSectionIds.some((id) => !validIds.has(id)) || orderedSectionIds.length !== sections.length) {
      throw new Error("Invalid module ordering: id set does not match the container's modules.");
    }
    await db.$transaction([
      ...orderedSectionIds.map((id, index) => db.pageSection.update({ where: { id }, data: { order: index } })),
      db.page.update({ where: { id: pageId }, data: { hasUnpublishedChanges: true } }),
    ]);
    await recordAudit({
      action: "SECTION_REORDERED", entityType: "PageSection",
      summary: `Reordered modules within ${groupId ? "a group" : "the ungrouped bucket"}`,
      context: auditContext,
    });
  }

  /**
   * Moves a module to a different container (group or ungrouped), appended
   * at the end, and repairs ordering in BOTH the source and destination
   * containers deterministically (§12).
   */
  static async assignModuleToGroup(
    sectionId: string,
    pageId: string,
    targetGroupId: string | null,
    auditContext: AuditContext
  ) {
    const section = await db.pageSection.findUnique({ where: { id: sectionId } });
    if (!section || section.pageId !== pageId) throw new Error("Module not found.");
    if (targetGroupId) {
      const group = await db.sectionGroup.findUnique({ where: { id: targetGroupId } });
      if (!group || group.pageId !== pageId) throw new Error("Target group not found.");
    }

    const sourceGroupId = section.groupId;
    if (sourceGroupId === targetGroupId) return section; // no-op, already there

    await db.$transaction(async (tx) => {
      const lastInTarget = await tx.pageSection.findFirst({
        where: { pageId, groupId: targetGroupId },
        orderBy: { order: "desc" },
      });
      await tx.pageSection.update({
        where: { id: sectionId },
        data: { groupId: targetGroupId, order: (lastInTarget?.order ?? -1) + 1 },
      });

      // Repair the source container so its order stays contiguous (§12).
      const remaining = await tx.pageSection.findMany({
        where: { pageId, groupId: sourceGroupId, id: { not: sectionId } },
        orderBy: { order: "asc" },
      });
      await Promise.all(
        remaining.map((s, index) => tx.pageSection.update({ where: { id: s.id }, data: { order: index } }))
      );
      await tx.page.update({ where: { id: pageId }, data: { hasUnpublishedChanges: true } });
    });

    await recordAudit({
      action: "SECTION_MOVED", entityType: "PageSection", entityId: sectionId,
      summary: `Moved module "${section.internalLabel}" to ${targetGroupId ? "a group" : "ungrouped"}`,
      context: auditContext,
    });

    return db.pageSection.findUnique({ where: { id: sectionId } });
  }

  // ─── Builder read model ───────────────────────────────────────────────────

  /** Full grouped structure for the builder UI: groups with their modules, plus the ungrouped bucket. */
  static async getPageStructure(pageId: string) {
    const [groups, ungrouped] = await Promise.all([
      db.sectionGroup.findMany({
        where: { pageId },
        orderBy: { order: "asc" },
        include: { sections: { orderBy: { order: "asc" } } },
      }),
      db.pageSection.findMany({ where: { pageId, groupId: null }, orderBy: { order: "asc" } }),
    ]);
    return { groups, ungrouped };
  }

  /**
   * THE single ordering algorithm — see class docblock for the policy.
   * Used by BOTH draft preview rendering and the publish snapshot builder,
   * so they can never diverge (§11, §18, §19).
   */
  static async flattenOrdered(pageId: string, opts: { visibleGroupsOnly: boolean }) {
    const { groups, ungrouped } = await SectionGroupService.getPageStructure(pageId);
    const orderedGroups = opts.visibleGroupsOnly ? groups.filter((g) => g.visible) : groups;

    const flattened = [
      ...orderedGroups.flatMap((g) => g.sections),
      ...ungrouped,
    ];
    return flattened;
  }
}
