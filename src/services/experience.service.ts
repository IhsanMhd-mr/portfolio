import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

export interface ExperienceInput {
  organization: string;
  role: string;
  startDate: Date;
  endDate?: Date | null;
  isCurrent?: boolean;
  description?: string | null;
  responsibilities?: any; // JSON array of string
  locationText?: string | null;
  workType?: any;
  showOnResume?: boolean;
  visible?: boolean;
  logoId?: string | null;
  order?: number;
  technologyIds?: string[];
}

export class ExperienceService {
  static async createExperience(
    input: Partial<ExperienceInput>,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const count = await db.experience.count({ where: { deletedAt: null } });

    return await db.$transaction(async (tx) => {
      const base = await tx.experience.create({ data: {} });

      const draft = await tx.experienceVersion.create({
        data: {
          experienceId: base.id,
          state: "DRAFT",
          organization: input.organization || "Company / Organization",
          role: input.role || "Role / Position",
          startDate: input.startDate || new Date(),
          endDate: input.endDate || null,
          isCurrent: input.isCurrent ?? false,
          description: input.description || null,
          responsibilities: input.responsibilities || [],
          locationText: input.locationText || null,
          workType: input.workType || "ON_SITE",
          showOnResume: input.showOnResume ?? true,
          visible: input.visible ?? true,
          order: count + 1,
          logoId: input.logoId || null,
        },
      });

      // Link technologies if provided
      if (input.technologyIds && input.technologyIds.length > 0) {
        for (const techId of input.technologyIds) {
          await tx.experienceTechnology.create({
            data: {
              experienceId: base.id,
              technologyId: techId,
            },
          });
        }
      }

      await recordAudit({
        action: "EXPERIENCE_CREATED",
        entityType: "Experience",
        entityId: base.id,
        summary: `Created career history entry: ${draft.organization} - ${draft.role}`,
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

  static async updateExperience(
    id: string,
    input: Partial<ExperienceInput>,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const base = await db.experience.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!base) throw new Error("Experience entry not found.");

    const draft = base.versions[0];
    if (!draft) throw new Error("Experience draft record not found.");

    return await db.$transaction(async (tx) => {
      const before = await tx.experienceVersion.findUnique({ where: { id: draft.id } });

      const updatedDraft = await tx.experienceVersion.update({
        where: { id: draft.id },
        data: {
          organization: input.organization !== undefined ? input.organization : draft.organization,
          role: input.role !== undefined ? input.role : draft.role,
          startDate: input.startDate !== undefined ? input.startDate : draft.startDate,
          endDate: input.endDate !== undefined ? input.endDate : draft.endDate,
          isCurrent: input.isCurrent !== undefined ? input.isCurrent : draft.isCurrent,
          description: input.description !== undefined ? input.description : draft.description,
          responsibilities: input.responsibilities !== undefined ? input.responsibilities : draft.responsibilities,
          locationText: input.locationText !== undefined ? input.locationText : draft.locationText,
          workType: input.workType !== undefined ? input.workType : draft.workType,
          showOnResume: input.showOnResume !== undefined ? input.showOnResume : draft.showOnResume,
          visible: input.visible !== undefined ? input.visible : draft.visible,
          logoId: input.logoId !== undefined ? input.logoId : draft.logoId,
        },
      });

      // Update technologies if provided
      if (input.technologyIds !== undefined) {
        await tx.experienceTechnology.deleteMany({ where: { experienceId: id } });
        for (const techId of input.technologyIds) {
          await tx.experienceTechnology.create({
            data: {
              experienceId: id,
              technologyId: techId,
            },
          });
        }
      }

      await recordAudit({
        action: "EXPERIENCE_UPDATED",
        entityType: "Experience",
        entityId: id,
        summary: `Updated career draft: ${updatedDraft.organization}`,
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

  static async deleteExperience(
    id: string,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const base = await db.experience.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!base) throw new Error("Experience entry not found.");

    return await db.$transaction(async (tx) => {
      await tx.experienceTechnology.deleteMany({ where: { experienceId: id } });
      await tx.experienceVersion.deleteMany({ where: { experienceId: id } });
      await tx.experience.delete({ where: { id } });

      await recordAudit({
        action: "EXPERIENCE_DELETED",
        entityType: "Experience",
        entityId: id,
        summary: `Deleted career history entry: ${base.versions[0]?.organization || id}`,
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

  static async reorderExperience(
    ids: string[],
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    return await db.$transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const base = await tx.experience.findUnique({
          where: { id },
          include: { versions: { where: { state: "DRAFT" }, take: 1 } },
        });
        if (base && base.versions[0]) {
          await tx.experienceVersion.update({
            where: { id: base.versions[0].id },
            data: { order: i + 1 },
          });
        }
      }

      await recordAudit({
        action: "EXPERIENCE_REORDERED",
        entityType: "Experience",
        summary: `Reordered career history sequences manually.`,
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
