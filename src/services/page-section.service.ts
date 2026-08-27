import db from "@/lib/database";
import { recordAudit, type ServiceAuditContext } from "@/lib/audit";

/**
 * PageSectionService — CRUD for individual page modules (PageSection rows).
 * Container membership/ordering (groups, move-between-groups, reorder) lives
 * in SectionGroupService, which owns that concern; this service owns the
 * module's own lifecycle and content-adjacent fields (label, visibility,
 * settings, animation).
 *
 * Extracted from the legacy /api/sections route.ts per ARCHITECTURE.md's
 * debt-reduction rule (routes must not query the database directly) while
 * touching this code for Phase 5.
 */

export interface CreateModuleInput {
  type: string;
  internalLabel: string;
  groupId?: string | null;
  settings?: Record<string, unknown>;
}

export interface UpdateModuleInput {
  internalLabel?: string;
  visible?: boolean;
  settings?: Record<string, unknown>;
  animationPresetSlug?: string | null;
  animationDelay?: number | null;
  animationStagger?: number | null;
}

export class PageSectionService {
  static async create(pageId: string, input: CreateModuleInput, auditContext: ServiceAuditContext) {
    if (input.groupId) {
      const group = await db.sectionGroup.findUnique({ where: { id: input.groupId } });
      if (!group || group.pageId !== pageId) throw new Error("Target group not found.");
    }

    const last = await db.pageSection.findFirst({
      where: { pageId, groupId: input.groupId ?? null },
      orderBy: { order: "desc" },
    });

    const created = await db.$transaction(async (tx) => {
      const section = await tx.pageSection.create({
        data: {
          pageId,
          type: input.type as any,
          internalLabel: input.internalLabel,
          groupId: input.groupId ?? null,
          order: (last?.order ?? -1) + 1,
          visible: true,
          settings: (input.settings || {}) as any,
        },
      });
      await tx.page.update({ where: { id: pageId }, data: { hasUnpublishedChanges: true } });
      await recordAudit({
        action: "SECTION_ADDED", entityType: "PageSection", entityId: section.id,
        summary: `Added module: ${section.internalLabel}`, after: section,
        context: auditContext, tx,
      });
      return section;
    });

    return created;
  }

  static async update(id: string, input: UpdateModuleInput, auditContext: ServiceAuditContext) {
    const result = await db.$transaction(async (tx) => {
      const before = await tx.pageSection.findUniqueOrThrow({ where: { id } });
      const after = await tx.pageSection.update({
        where: { id },
        data: {
          internalLabel: input.internalLabel,
          visible: input.visible,
          settings: input.settings as any,
          animationPresetSlug: input.animationPresetSlug,
          animationDelay: input.animationDelay ?? undefined,
          animationStagger: input.animationStagger ?? undefined,
        },
      });
      await tx.page.update({ where: { id: before.pageId }, data: { hasUnpublishedChanges: true } });
      await recordAudit({
        action: "SECTION_UPDATED", entityType: "PageSection", entityId: id,
        summary: `Updated module: ${after.internalLabel}`, before, after,
        context: auditContext, tx,
      });
      return after;
    });
    return result;
  }

  static async remove(id: string, auditContext: ServiceAuditContext) {
    await db.$transaction(async (tx) => {
      const section = await tx.pageSection.findUniqueOrThrow({ where: { id } });
      await tx.pageSection.delete({ where: { id } });
      await tx.page.update({ where: { id: section.pageId }, data: { hasUnpublishedChanges: true } });
      await recordAudit({
        action: "SECTION_DELETED", entityType: "PageSection", entityId: id,
        summary: `Deleted module: ${section.internalLabel}`, before: section,
        context: auditContext, tx,
      });
    });
  }
}
