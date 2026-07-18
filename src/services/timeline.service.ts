import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

export interface TimelineInput {
  title: string;
  entryType: any;
  startDate: Date;
  endDate?: Date | null;
  description?: string | null;
  status?: any | null;
  externalLinks?: any;
  visible?: boolean;
  order?: number;
  imageId?: string | null;
  linkedProjectId?: string | null;
}

export class TimelineService {
  static async createEntry(
    input: Partial<TimelineInput>,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const count = await db.timelineEntry.count({ where: { deletedAt: null } });

    return await db.$transaction(async (tx) => {
      const base = await tx.timelineEntry.create({
        data: {
          linkedProjectId: input.linkedProjectId || null,
        },
      });

      const draft = await tx.timelineEntryVersion.create({
        data: {
          timelineEntryId: base.id,
          state: "DRAFT",
          title: input.title || "Milestone Milestone",
          entryType: input.entryType || "MILESTONE",
          startDate: input.startDate || new Date(),
          endDate: input.endDate || null,
          description: input.description || null,
          status: input.status || null,
          externalLinks: input.externalLinks || {},
          visible: input.visible ?? true,
          order: count + 1,
          imageId: input.imageId || null,
        },
      });

      await recordAudit({
        action: "TIMELINE_CREATED",
        entityType: "TimelineEntry",
        entityId: base.id,
        summary: `Created timeline milestone: ${draft.title}`,
        after: { base, draft },
        context: auditContext,
        tx,
      });

      await tx.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return { base, draft };
    });
  }

  static async updateEntry(
    id: string,
    input: Partial<TimelineInput>,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const base = await db.timelineEntry.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!base) throw new Error("Timeline entry not found.");

    const draft = base.versions[0];
    if (!draft) throw new Error("Timeline draft record not found.");

    return await db.$transaction(async (tx) => {
      if (input.linkedProjectId !== undefined) {
        await tx.timelineEntry.update({
          where: { id },
          data: { linkedProjectId: input.linkedProjectId },
        });
      }

      const before = await tx.timelineEntryVersion.findUnique({ where: { id: draft.id } });

      const updatedDraft = await tx.timelineEntryVersion.update({
        where: { id: draft.id },
        data: {
          title: input.title !== undefined ? input.title : draft.title,
          entryType: input.entryType !== undefined ? input.entryType : draft.entryType,
          startDate: input.startDate !== undefined ? input.startDate : draft.startDate,
          endDate: input.endDate !== undefined ? input.endDate : draft.endDate,
          description: input.description !== undefined ? input.description : draft.description,
          status: input.status !== undefined ? input.status : draft.status,
          externalLinks: input.externalLinks !== undefined ? input.externalLinks : draft.externalLinks,
          visible: input.visible !== undefined ? input.visible : draft.visible,
          imageId: input.imageId !== undefined ? input.imageId : draft.imageId,
        },
      });

      await recordAudit({
        action: "TIMELINE_UPDATED",
        entityType: "TimelineEntry",
        entityId: id,
        summary: `Updated timeline milestone draft: ${updatedDraft.title}`,
        before,
        after: updatedDraft,
        context: auditContext,
        tx,
      });

      await tx.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return updatedDraft;
    });
  }

  static async deleteEntry(
    id: string,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const base = await db.timelineEntry.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!base) throw new Error("Timeline entry not found.");

    return await db.$transaction(async (tx) => {
      await tx.timelineEntryVersion.deleteMany({ where: { timelineEntryId: id } });
      await tx.timelineEntry.delete({ where: { id } });

      await recordAudit({
        action: "TIMELINE_DELETED",
        entityType: "TimelineEntry",
        entityId: id,
        summary: `Deleted timeline milestone: ${base.versions[0]?.title || id}`,
        context: auditContext,
        tx,
      });

      await tx.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return true;
    });
  }

  static async reorderEntries(
    ids: string[],
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    return await db.$transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const base = await tx.timelineEntry.findUnique({
          where: { id },
          include: { versions: { where: { state: "DRAFT" }, take: 1 } },
        });
        if (base && base.versions[0]) {
          await tx.timelineEntryVersion.update({
            where: { id: base.versions[0].id },
            data: { order: i + 1 },
          });
        }
      }

      await recordAudit({
        action: "TIMELINE_REORDERED",
        entityType: "TimelineEntry",
        summary: `Reordered timeline events manually.`,
        context: auditContext,
        tx,
      });

      await tx.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return true;
    });
  }
}
