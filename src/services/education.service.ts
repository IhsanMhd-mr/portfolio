import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

export interface EducationInput {
  institution: string;
  qualification: string;
  startDate: Date;
  endDate?: Date | null;
  isCurrent?: boolean;
  grade?: string | null;
  description?: string | null;
  modules?: string | null;
  showOnResume?: boolean;
  visible?: boolean;
  logoId?: string | null;
  order?: number;
}

export class EducationService {
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
      db.educationVersion.count({ where: { state: "DRAFT" } }),
      db.educationVersion.findMany({
        where: { state: "DRAFT" },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { education: true, logo: { select: { url: true } } },
      }),
    ]);

    return {
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: drafts.map((draft) => ({ id: draft.education.id, draft })),
    };
  }

  /** The DRAFT version for the editor. Null when missing or soft-deleted. */
  static async getDraftById(id: string) {
    const education = await db.education.findUnique({
      where: { id },
      include: {
        versions: {
          where: { state: "DRAFT" },
          take: 1,
          include: { logo: { select: { filename: true, url: true } } },
        },
      },
    });
    if (!education || education.deletedAt || !education.versions[0]) return null;
    return { education, draft: education.versions[0] };
  }

  static async createEducation(
    input: Partial<EducationInput>,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const count = await db.education.count({ where: { deletedAt: null } });

    return await db.$transaction(async (tx) => {
      const base = await tx.education.create({ data: {} });

      const draft = await tx.educationVersion.create({
        data: {
          educationId: base.id,
          state: "DRAFT",
          institution: input.institution || "Institution",
          qualification: input.qualification || "Degree / Course",
          startDate: input.startDate || new Date(),
          endDate: input.endDate || null,
          isCurrent: input.isCurrent ?? false,
          grade: input.grade || null,
          description: input.description || null,
          modules: input.modules || null,
          showOnResume: input.showOnResume ?? true,
          visible: input.visible ?? true,
          order: count + 1,
          logoId: input.logoId || null,
        },
      });

      await recordAudit({
        action: "EDUCATION_CREATED",
        entityType: "Education",
        entityId: base.id,
        summary: `Created academic profile: ${draft.institution} - ${draft.qualification}`,
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

  static async updateEducation(
    id: string,
    input: Partial<EducationInput>,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const base = await db.education.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!base) throw new Error("Academic entry not found.");

    const draft = base.versions[0];
    if (!draft) throw new Error("Academic draft record not found.");

    return await db.$transaction(async (tx) => {
      const before = await tx.educationVersion.findUnique({ where: { id: draft.id } });

      const updatedDraft = await tx.educationVersion.update({
        where: { id: draft.id },
        data: {
          institution: input.institution !== undefined ? input.institution : draft.institution,
          qualification: input.qualification !== undefined ? input.qualification : draft.qualification,
          startDate: input.startDate !== undefined ? input.startDate : draft.startDate,
          endDate: input.endDate !== undefined ? input.endDate : draft.endDate,
          isCurrent: input.isCurrent !== undefined ? input.isCurrent : draft.isCurrent,
          grade: input.grade !== undefined ? input.grade : draft.grade,
          description: input.description !== undefined ? input.description : draft.description,
          modules: input.modules !== undefined ? input.modules : draft.modules,
          showOnResume: input.showOnResume !== undefined ? input.showOnResume : draft.showOnResume,
          visible: input.visible !== undefined ? input.visible : draft.visible,
          logoId: input.logoId !== undefined ? input.logoId : draft.logoId,
        },
      });

      await recordAudit({
        action: "EDUCATION_UPDATED",
        entityType: "Education",
        entityId: id,
        summary: `Updated academic draft: ${updatedDraft.institution}`,
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

  static async deleteEducation(
    id: string,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const base = await db.education.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!base) throw new Error("Academic entry not found.");

    return await db.$transaction(async (tx) => {
      await tx.educationVersion.deleteMany({ where: { educationId: id } });
      await tx.education.delete({ where: { id } });

      await recordAudit({
        action: "EDUCATION_DELETED",
        entityType: "Education",
        entityId: id,
        summary: `Deleted academic entry: ${base.versions[0]?.institution || id}`,
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

  static async reorderEducation(
    ids: string[],
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    return await db.$transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const base = await tx.education.findUnique({
          where: { id },
          include: { versions: { where: { state: "DRAFT" }, take: 1 } },
        });
        if (base && base.versions[0]) {
          await tx.educationVersion.update({
            where: { id: base.versions[0].id },
            data: { order: i + 1 },
          });
        }
      }

      await recordAudit({
        action: "EDUCATION_REORDERED",
        entityType: "Education",
        summary: `Reordered academic profile sequence.`,
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
   * Move an education entry's draft one position up/down by swapping `order`
   * with its immediate neighbor — correct under pagination, unlike
   * `reorderEducation` which needs the full ordered id list.
   */
  static async moveOrder(
    id: string,
    direction: "up" | "down",
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    return await db.$transaction(async (tx) => {
      const base = await tx.education.findUnique({
        where: { id },
        include: { versions: { where: { state: "DRAFT" }, take: 1 } },
      });
      const current = base?.versions[0];
      if (!current) return false;

      const neighbor = await tx.educationVersion.findFirst({
        where: {
          state: "DRAFT",
          order: direction === "up" ? { lt: current.order } : { gt: current.order },
        },
        orderBy: direction === "up"
          ? [{ order: "desc" }, { id: "desc" }]
          : [{ order: "asc" }, { id: "asc" }],
      });
      if (!neighbor) return false;

      await tx.educationVersion.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.educationVersion.update({ where: { id: neighbor.id }, data: { order: current.order } });

      await recordAudit({
        action: "EDUCATION_REORDERED",
        entityType: "Education",
        entityId: id,
        summary: `Moved an academic profile entry ${direction} in the sequence.`,
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
