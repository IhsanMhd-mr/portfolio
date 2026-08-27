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
  /**
   * One page of DRAFT rows for the admin list.
   *
   * Queries the *Version table rather than the parent: `order` lives on the
   * version, and Prisma cannot orderBy a to-many relation's field from the
   * parent model, so sorting and pagination have to happen at this boundary
   * to stay in the database rather than in memory.
   */
  static async listDraftPage(page: number, pageSize: number) {
    const [total, drafts] = await Promise.all([
      db.experienceVersion.count({ where: { state: "DRAFT" } }),
      db.experienceVersion.findMany({
        where: { state: "DRAFT" },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          logo: { select: { url: true } },
          experience: {
            include: {
              technologies: {
                include: {
                  technology: { include: { versions: { where: { state: "DRAFT" }, take: 1 } } },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: drafts.map((draft) => ({
        id: draft.experience.id,
        draft,
        technologies: draft.experience.technologies,
      })),
    };
  }

  /** The DRAFT version plus its linked technology ids, for the editor. */
  static async getDraftById(id: string) {
    const experience = await db.experience.findUnique({
      where: { id },
      include: {
        versions: {
          where: { state: "DRAFT" },
          take: 1,
          include: { logo: { select: { filename: true, url: true } } },
        },
        technologies: { select: { technologyId: true } },
      },
    });
    if (!experience || experience.deletedAt || !experience.versions[0]) return null;
    return {
      experience,
      draft: experience.versions[0],
      linkedTechIds: new Set(experience.technologies.map((t) => t.technologyId)),
    };
  }

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
          // Column is `WorkType?` — leave it unset rather than inventing a
          // default. "ON_SITE" used to be the fallback here, which is not a
          // member of the WorkType enum and threw at the Prisma boundary.
          workType: input.workType || null,
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

  /**
   * Move an experience entry's draft one position up/down by swapping `order`
   * with its immediate neighbor — correct under pagination, unlike
   * `reorderExperience` which needs the full ordered id list.
   */
  static async moveOrder(
    id: string,
    direction: "up" | "down",
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    return await db.$transaction(async (tx) => {
      const base = await tx.experience.findUnique({
        where: { id },
        include: { versions: { where: { state: "DRAFT" }, take: 1 } },
      });
      const current = base?.versions[0];
      if (!current) return false;

      const neighbor = await tx.experienceVersion.findFirst({
        where: {
          state: "DRAFT",
          order: direction === "up" ? { lt: current.order } : { gt: current.order },
        },
        orderBy: direction === "up"
          ? [{ order: "desc" }, { id: "desc" }]
          : [{ order: "asc" }, { id: "asc" }],
      });
      if (!neighbor) return false;

      await tx.experienceVersion.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.experienceVersion.update({ where: { id: neighbor.id }, data: { order: current.order } });

      await recordAudit({
        action: "EXPERIENCE_REORDERED",
        entityType: "Experience",
        entityId: id,
        summary: `Moved a career history entry ${direction} in the sequence.`,
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
