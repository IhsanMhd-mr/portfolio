import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

export interface TechnologyInput {
  name: string;
  slug: string;
  category: any;
  description?: string | null;
  experienceLabel: any;
  showInStack?: boolean;
  showInGame?: boolean;
  showOnResume?: boolean;
  visible?: boolean;
  order?: number;
  logoId?: string | null;
}

export class TechnologyService {
  /**
   * Create a new technology with its DRAFT version
   */
  static async createTechnology(
    input: Partial<TechnologyInput>,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    if (!input.slug) throw new Error("Slug is required.");
    const slug = input.slug.trim().toLowerCase();

    // Check slug uniqueness
    const existing = await db.technology.findUnique({ where: { slug } });
    if (existing) {
      throw new Error(`Technology with slug '${slug}' already exists.`);
    }

    const count = await db.technology.count({ where: { deletedAt: null } });

    return await db.$transaction(async (tx) => {
      const tech = await tx.technology.create({
        data: {
          slug,
        },
      });

      const draft = await tx.technologyVersion.create({
        data: {
          technologyId: tech.id,
          state: "DRAFT",
          name: input.name || `New Tech`,
          category: input.category || "OTHER",
          description: input.description || null,
          experienceLabel: input.experienceLabel || "WORKING_KNOWLEDGE",
          showInStack: input.showInStack ?? true,
          showInGame: input.showInGame ?? false,
          showOnResume: input.showOnResume ?? false,
          visible: input.visible ?? true,
          order: count + 1,
          logoId: input.logoId || null,
        },
      });

      await recordAudit({
        action: "TECHNOLOGY_CREATED",
        entityType: "Technology",
        entityId: tech.id,
        summary: `Created technology: ${draft.name}`,
        after: { tech, draft },
        context: auditContext,
        tx,
      });

      await tx.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return { tech, draft };
    });
  }

  /**
   * Update Technology DRAFT version
   */
  static async updateTechnology(
    id: string,
    input: Partial<TechnologyInput>,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const tech = await db.technology.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!tech) throw new Error("Technology not found.");

    const draft = tech.versions[0];
    if (!draft) throw new Error("DRAFT version record not found.");

    // Validate slug if changed
    let cleanSlug = tech.slug;
    if (input.slug && input.slug !== tech.slug) {
      cleanSlug = input.slug.trim().toLowerCase();
      const collision = await db.technology.findFirst({
        where: { slug: cleanSlug, id: { not: id } },
      });
      if (collision) {
        throw new Error(`Technology with slug '${cleanSlug}' already exists.`);
      }
    }

    return await db.$transaction(async (tx) => {
      if (cleanSlug !== tech.slug) {
        await tx.technology.update({
          where: { id },
          data: { slug: cleanSlug },
        });
      }

      const before = await tx.technologyVersion.findUnique({ where: { id: draft.id } });

      const updatedDraft = await tx.technologyVersion.update({
        where: { id: draft.id },
        data: {
          name: input.name !== undefined ? input.name : draft.name,
          category: input.category !== undefined ? input.category : draft.category,
          description: input.description !== undefined ? input.description : draft.description,
          experienceLabel: input.experienceLabel !== undefined ? input.experienceLabel : draft.experienceLabel,
          showInStack: input.showInStack !== undefined ? input.showInStack : draft.showInStack,
          showInGame: input.showInGame !== undefined ? input.showInGame : draft.showInGame,
          showOnResume: input.showOnResume !== undefined ? input.showOnResume : draft.showOnResume,
          visible: input.visible !== undefined ? input.visible : draft.visible,
          logoId: input.logoId !== undefined ? input.logoId : draft.logoId,
        },
      });

      await recordAudit({
        action: "TECHNOLOGY_UPDATED",
        entityType: "Technology",
        entityId: id,
        summary: `Updated technology draft: ${updatedDraft.name}`,
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

  /**
   * Check references and delete or reject
   */
  static async deleteTechnology(
    id: string,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const tech = await db.technology.findUnique({
      where: { id },
      include: {
        versions: { where: { state: "DRAFT" }, take: 1 },
        projects: { include: { project: { include: { versions: { where: { state: "DRAFT" } } } } } },
        experienceTech: { include: { experience: { include: { versions: { where: { state: "DRAFT" } } } } } },
        timelineTech: { include: { timelineEntry: { include: { versions: { where: { state: "DRAFT" } } } } } },
      },
    });

    if (!tech) throw new Error("Technology not found.");

    const draft = tech.versions[0];
    const name = draft?.name || tech.slug;

    // Check project uses
    const projectNames = tech.projects.map((p) => p.project.versions[0]?.title || p.project.slug);
    const expNames = tech.experienceTech.map((e) => `${e.experience.versions[0]?.organization} - ${e.experience.versions[0]?.role}`);
    const tlNames = tech.timelineTech.map((t) => t.timelineEntry.versions[0]?.title);

    const usages: string[] = [];
    if (projectNames.length > 0) usages.push(`Projects: ${projectNames.join(", ")}`);
    if (expNames.length > 0) usages.push(`Experience Entries: ${expNames.join(", ")}`);
    if (tlNames.length > 0) usages.push(`Timeline Milestones: ${tlNames.join(", ")}`);

    // Check homepage settings references
    const sections = await db.pageSection.findMany({
      where: { page: { key: "home" } },
    });
    for (const sec of sections) {
      const settings = (sec.settings || {}) as any;
      if (Array.isArray(settings.technologyIds) && settings.technologyIds.includes(id)) {
        usages.push(`Homepage PageBuilder Section: ${sec.internalLabel} (${sec.type})`);
      }
    }

    if (usages.length > 0) {
      throw new Error(`Deletion blocked. Technology '${name}' is actively used in:\n- ${usages.join("\n- ")}`);
    }

    return await db.$transaction(async (tx) => {
      // 1. Delete version rows
      await tx.technologyVersion.deleteMany({ where: { technologyId: id } });

      // 2. Delete base technology
      await tx.technology.delete({ where: { id } });

      // 3. Log TECHNOLOGY_DELETED
      await recordAudit({
        action: "TECHNOLOGY_DELETED",
        entityType: "Technology",
        entityId: id,
        summary: `Permanently deleted technology: ${name}`,
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
   * Reorder technology sequence
   */
  static async reorderTechnologies(
    ids: string[],
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    return await db.$transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const tech = await tx.technology.findUnique({
          where: { id },
          include: { versions: { where: { state: "DRAFT" }, take: 1 } },
        });
        if (tech && tech.versions[0]) {
          await tx.technologyVersion.update({
            where: { id: tech.versions[0].id },
            data: { order: i + 1 },
          });
        }
      }

      await recordAudit({
        action: "TECHNOLOGY_REORDERED",
        entityType: "Technology",
        summary: `Reordered technologies visual positioning list.`,
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
