import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export interface ProjectInput {
  title: string;
  slug: string;
  summary: string;
  fullDescription?: string;
  category: any;
  status: any;
  startDate?: Date | null;
  endDate?: Date | null;
  featured?: boolean;
  visible?: boolean;
  myRole?: string;
  problem?: string;
  solution?: string;
  mainFeatures?: string;
  systemArchitecture?: string;
  developmentProcess?: string;
  challenges?: string;
  solutionsDetail?: string;
  testing?: string;
  results?: string;
  lessonsLearned?: string;
  liveDemoUrl?: string;
  githubUrl?: string;
  reportUrl?: string;
  documentationUrl?: string;
  videoUrl?: string;
  presentationUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  thumbnailId?: string | null;
  coverImageId?: string | null;
  architectureImageId?: string | null;
  technologyIds?: string[];
  gallery?: { mediaId: string; caption?: string }[];
}

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "about",
  "contact",
  "projects",
  "timeline",
  "resume",
  "preview",
  "settings",
]);

export class ProjectService {
  /**
   * Validate project slug rules
   */
  static validateSlug(slug: string) {
    if (!slug) throw new Error("Slug is required.");
    const clean = slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) {
      throw new Error("Slug must contain lowercase letters, numbers, and hyphens only, with no leading or trailing hyphens.");
    }
    if (RESERVED_SLUGS.has(clean)) {
      throw new Error(`The slug '${clean}' is a reserved route path.`);
    }
    return clean;
  }

  /**
   * Create a new project along with its initial DRAFT version
   */
  static async createProject(
    input: Partial<ProjectInput>,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const slug = this.validateSlug(input.slug || `new-project-${Date.now()}`);

    // Check slug uniqueness
    const existing = await db.project.findUnique({ where: { slug } });
    if (existing) {
      throw new Error(`Project with slug '${slug}' already exists.`);
    }

    const count = await db.project.count({ where: { deletedAt: null } });

    return await db.$transaction(async (tx) => {
      // 1. Create base project
      const project = await tx.project.create({
        data: {
          slug,
        },
      });

      // 2. Create initial DRAFT version
      const draft = await tx.projectVersion.create({
        data: {
          projectId: project.id,
          state: "DRAFT",
          title: input.title || `New Project`,
          summary: input.summary || "Draft summary details.",
          fullDescription: input.fullDescription || null,
          category: input.category || "OTHER",
          status: input.status || "IN_PROGRESS",
          startDate: input.startDate || null,
          endDate: input.endDate || null,
          featured: input.featured ?? false,
          visible: input.visible ?? true,
          manualOrder: count + 1,
          myRole: input.myRole || null,
          problem: input.problem || null,
          solution: input.solution || null,
          mainFeatures: input.mainFeatures || null,
          systemArchitecture: input.systemArchitecture || null,
          developmentProcess: input.developmentProcess || null,
          challenges: input.challenges || null,
          solutionsDetail: input.solutionsDetail || null,
          testing: input.testing || null,
          results: input.results || null,
          lessonsLearned: input.lessonsLearned || null,
          liveDemoUrl: input.liveDemoUrl || null,
          githubUrl: input.githubUrl || null,
          reportUrl: input.reportUrl || null,
          seoTitle: input.seoTitle || null,
          seoDescription: input.seoDescription || null,
          thumbnailId: input.thumbnailId || null,
          coverImageId: input.coverImageId || null,
          architectureImageId: input.architectureImageId || null,
        },
      });

      // 3. Log PROJECT_CREATED
      await recordAudit({
        action: "PROJECT_CREATED",
        entityType: "Project",
        entityId: project.id,
        summary: `Created project: ${draft.title}`,
        after: { project, draft },
        context: auditContext,
        tx,
      });

      await tx.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return { project, draft };
    });
  }

  /**
   * Update the DRAFT version content of a project
   */
  static async updateProjectDraft(
    id: string,
    input: Partial<ProjectInput>,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const project = await db.project.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!project || project.deletedAt) {
      throw new Error("Project not found or deleted.");
    }

    const currentDraft = project.versions[0];
    if (!currentDraft) {
      throw new Error("Draft version record is missing.");
    }

    // Verify slug rules if slug is changing
    let cleanSlug = project.slug;
    if (input.slug && input.slug !== project.slug) {
      cleanSlug = this.validateSlug(input.slug);
      const slugCollision = await db.project.findFirst({
        where: { slug: cleanSlug, id: { not: id } },
      });
      if (slugCollision) {
        throw new Error(`Project with slug '${cleanSlug}' already exists.`);
      }
    }

    return await db.$transaction(async (tx) => {
      // 1. If slug is changed, update base and create a ProjectRedirect if published project exists
      if (cleanSlug !== project.slug) {
        const hasPublished = await tx.projectVersion.findUnique({
          where: { projectId_state: { projectId: id, state: "PUBLISHED" } },
        });

        if (hasPublished) {
          await tx.projectRedirect.upsert({
            where: { oldSlug: project.slug },
            update: { newSlug: cleanSlug },
            create: {
              projectId: id,
              oldSlug: project.slug,
              newSlug: cleanSlug,
            },
          });
        }

        await tx.project.update({
          where: { id },
          data: { slug: cleanSlug },
        });
      }

      // 2. Update DRAFT version
      const before = await tx.projectVersion.findUnique({
        where: { id: currentDraft.id },
      });

      const updatedDraft = await tx.projectVersion.update({
        where: { id: currentDraft.id },
        data: {
          title: input.title !== undefined ? input.title : currentDraft.title,
          summary: input.summary !== undefined ? input.summary : currentDraft.summary,
          fullDescription: input.fullDescription !== undefined ? input.fullDescription : currentDraft.fullDescription,
          category: input.category !== undefined ? input.category : currentDraft.category,
          status: input.status !== undefined ? input.status : currentDraft.status,
          startDate: input.startDate !== undefined ? input.startDate : currentDraft.startDate,
          endDate: input.endDate !== undefined ? input.endDate : currentDraft.endDate,
          featured: input.featured !== undefined ? input.featured : currentDraft.featured,
          visible: input.visible !== undefined ? input.visible : currentDraft.visible,
          myRole: input.myRole !== undefined ? input.myRole : currentDraft.myRole,
          problem: input.problem !== undefined ? input.problem : currentDraft.problem,
          solution: input.solution !== undefined ? input.solution : currentDraft.solution,
          mainFeatures: input.mainFeatures !== undefined ? input.mainFeatures : currentDraft.mainFeatures,
          systemArchitecture: input.systemArchitecture !== undefined ? input.systemArchitecture : currentDraft.systemArchitecture,
          developmentProcess: input.developmentProcess !== undefined ? input.developmentProcess : currentDraft.developmentProcess,
          challenges: input.challenges !== undefined ? input.challenges : currentDraft.challenges,
          solutionsDetail: input.solutionsDetail !== undefined ? input.solutionsDetail : currentDraft.solutionsDetail,
          testing: input.testing !== undefined ? input.testing : currentDraft.testing,
          results: input.results !== undefined ? input.results : currentDraft.results,
          lessonsLearned: input.lessonsLearned !== undefined ? input.lessonsLearned : currentDraft.lessonsLearned,
          liveDemoUrl: input.liveDemoUrl !== undefined ? input.liveDemoUrl : currentDraft.liveDemoUrl,
          githubUrl: input.githubUrl !== undefined ? input.githubUrl : currentDraft.githubUrl,
          reportUrl: input.reportUrl !== undefined ? input.reportUrl : currentDraft.reportUrl,
          documentationUrl: input.documentationUrl !== undefined ? input.documentationUrl : currentDraft.documentationUrl,
          videoUrl: input.videoUrl !== undefined ? input.videoUrl : currentDraft.videoUrl,
          presentationUrl: input.presentationUrl !== undefined ? input.presentationUrl : currentDraft.presentationUrl,
          seoTitle: input.seoTitle !== undefined ? input.seoTitle : currentDraft.seoTitle,
          seoDescription: input.seoDescription !== undefined ? input.seoDescription : currentDraft.seoDescription,
          thumbnailId: input.thumbnailId !== undefined ? input.thumbnailId : currentDraft.thumbnailId,
          coverImageId: input.coverImageId !== undefined ? input.coverImageId : currentDraft.coverImageId,
          architectureImageId: input.architectureImageId !== undefined ? input.architectureImageId : currentDraft.architectureImageId,
        },
      });

      // 3. Update relationships if provided
      if (input.technologyIds !== undefined) {
        await tx.projectTechnology.deleteMany({ where: { projectId: id } });
        for (let i = 0; i < input.technologyIds.length; i++) {
          await tx.projectTechnology.create({
            data: {
              projectId: id,
              technologyId: input.technologyIds[i],
              order: i + 1,
            },
          });
        }
      }

      if (input.gallery !== undefined) {
        await tx.projectImage.deleteMany({ where: { projectId: id } });
        for (let i = 0; i < input.gallery.length; i++) {
          await tx.projectImage.create({
            data: {
              projectId: id,
              mediaId: input.gallery[i].mediaId,
              caption: input.gallery[i].caption || null,
              order: i + 1,
            },
          });
        }
      }

      // 4. Log PROJECT_UPDATED
      await recordAudit({
        action: "PROJECT_UPDATED",
        entityType: "Project",
        entityId: id,
        summary: `Updated project draft: ${updatedDraft.title}`,
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
   * Duplicate a project (draft config duplication)
   */
  static async duplicateProject(
    id: string,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const project = await db.project.findUnique({
      where: { id },
      include: {
        versions: { where: { state: "DRAFT" }, take: 1 },
        technologies: true,
        images: true,
      },
    });

    if (!project || project.deletedAt) {
      throw new Error("Project not found or deleted.");
    }

    const currentDraft = project.versions[0];
    if (!currentDraft) {
      throw new Error("Draft version record is missing.");
    }

    const duplicateTitle = `${currentDraft.title} Copy`;
    const baseSlug = `${project.slug}-copy`;
    let duplicateSlug = baseSlug;
    let index = 1;

    while (await db.project.findUnique({ where: { slug: duplicateSlug } })) {
      duplicateSlug = `${baseSlug}-${index}`;
      index++;
    }

    const count = await db.project.count({ where: { deletedAt: null } });

    return await db.$transaction(async (tx) => {
      const duplicatedProject = await tx.project.create({
        data: {
          slug: duplicateSlug,
        },
      });

      const duplicatedDraft = await tx.projectVersion.create({
        data: {
          projectId: duplicatedProject.id,
          state: "DRAFT",
          title: duplicateTitle,
          summary: currentDraft.summary,
          fullDescription: currentDraft.fullDescription,
          category: currentDraft.category,
          status: currentDraft.status,
          startDate: currentDraft.startDate,
          endDate: currentDraft.endDate,
          featured: false,
          visible: currentDraft.visible,
          manualOrder: count + 1,
          myRole: currentDraft.myRole,
          problem: currentDraft.problem,
          solution: currentDraft.solution,
          mainFeatures: currentDraft.mainFeatures,
          systemArchitecture: currentDraft.systemArchitecture,
          developmentProcess: currentDraft.developmentProcess,
          challenges: currentDraft.challenges,
          solutionsDetail: currentDraft.solutionsDetail,
          testing: currentDraft.testing,
          results: currentDraft.results,
          lessonsLearned: currentDraft.lessonsLearned,
          liveDemoUrl: currentDraft.liveDemoUrl,
          githubUrl: currentDraft.githubUrl,
          reportUrl: currentDraft.reportUrl,
          documentationUrl: currentDraft.documentationUrl,
          videoUrl: currentDraft.videoUrl,
          presentationUrl: currentDraft.presentationUrl,
          seoTitle: currentDraft.seoTitle,
          seoDescription: currentDraft.seoDescription,
          thumbnailId: currentDraft.thumbnailId,
          coverImageId: currentDraft.coverImageId,
          architectureImageId: currentDraft.architectureImageId,
        },
      });

      // Duplicate Techs
      for (const tech of project.technologies) {
        await tx.projectTechnology.create({
          data: {
            projectId: duplicatedProject.id,
            technologyId: tech.technologyId,
            order: tech.order,
          },
        });
      }

      // Duplicate Gallery
      for (const img of project.images) {
        await tx.projectImage.create({
          data: {
            projectId: duplicatedProject.id,
            mediaId: img.mediaId,
            caption: img.caption,
            order: img.order,
          },
        });
      }

      await recordAudit({
        action: "PROJECT_DUPLICATED",
        entityType: "Project",
        entityId: id,
        summary: `Duplicated project as: ${duplicateTitle}`,
        after: { projectId: duplicatedProject.id, title: duplicateTitle },
        context: auditContext,
        tx,
      });

      await tx.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return { project: duplicatedProject, draft: duplicatedDraft };
    });
  }

  /**
   * Soft delete project
   */
  static async softDeleteProject(
    id: string,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const project = await db.project.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!project || project.deletedAt) {
      throw new Error("Project not found or already deleted.");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await recordAudit({
        action: "PROJECT_DELETED",
        entityType: "Project",
        entityId: id,
        summary: `Soft-deleted project: ${project.versions[0]?.title || project.slug}`,
        context: auditContext,
        tx,
      });

      await tx.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return updated;
    });
  }

  /**
   * Restore soft-deleted project
   */
  static async restoreProject(
    id: string,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const project = await db.project.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!project || !project.deletedAt) {
      throw new Error("Project not found or not deleted.");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id },
        data: { deletedAt: null },
      });

      await recordAudit({
        action: "PROJECT_RESTORED",
        entityType: "Project",
        entityId: id,
        summary: `Restored project: ${project.versions[0]?.title || project.slug}`,
        context: auditContext,
        tx,
      });

      await tx.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return updated;
    });
  }

  /**
   * Permanent Delete
   */
  static async permanentlyDeleteProject(
    id: string,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const project = await db.project.findUnique({
      where: { id },
      include: {
        versions: true,
        timelineEntries: true,
      },
    });

    if (!project) {
      throw new Error("Project not found.");
    }

    // Verify if timeline entries refer to it
    if (project.timelineEntries.length > 0) {
      throw new Error(`Cannot permanently delete this project. It is referenced by ${project.timelineEntries.length} timeline entries.`);
    }

    return await db.$transaction(async (tx) => {
      // 1. Delete relations
      await tx.projectTechnology.deleteMany({ where: { projectId: id } });
      await tx.projectImage.deleteMany({ where: { projectId: id } });
      await tx.projectRedirect.deleteMany({ where: { projectId: id } });

      // 2. Delete version records
      await tx.projectVersion.deleteMany({ where: { projectId: id } });

      // 3. Delete base project
      await tx.project.delete({ where: { id } });

      // 4. Log PROJECT_PERMANENTLY_DELETED
      await recordAudit({
        action: "PROJECT_PERMANENTLY_DELETED",
        entityType: "Project",
        entityId: id,
        summary: `Permanently deleted project: ${project.slug}`,
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
   * Toggle visibility flag of project draft version
   */
  static async toggleVisibility(
    id: string,
    currentVisible: boolean,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const project = await db.project.findUnique({
      where: { id },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    });

    if (!project || !project.versions[0]) {
      throw new Error("Project draft not found.");
    }

    return await db.$transaction(async (tx) => {
      const updated = await tx.projectVersion.update({
        where: { id: project.versions[0].id },
        data: { visible: !currentVisible },
      });

      await recordAudit({
        action: !currentVisible ? "PROJECT_SHOWN" : "PROJECT_HIDDEN",
        entityType: "Project",
        entityId: id,
        summary: `${!currentVisible ? "Made visible" : "Hid"} project: ${updated.title}`,
        context: auditContext,
        tx,
      });

      await tx.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return updated;
    });
  }

  /**
   * Reorder project position updates
   */
  static async reorderProjects(
    orderedIds: string[],
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    return await db.$transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i];
        const project = await tx.project.findUnique({
          where: { id },
          include: { versions: { where: { state: "DRAFT" }, take: 1 } },
        });

        if (project && project.versions[0]) {
          await tx.projectVersion.update({
            where: { id: project.versions[0].id },
            data: { manualOrder: i + 1 },
          });
        }
      }

      await recordAudit({
        action: "PROJECT_REORDERED",
        entityType: "Project",
        summary: `Reordered projects manual sequence.`,
        after: { orderedIds },
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
   * Move a project's draft one position up/down by swapping `manualOrder`
   * with its immediate neighbor — correct under pagination, unlike
   * `reorderProjects` which needs the full ordered id list.
   */
  static async moveOrder(
    id: string,
    direction: "up" | "down",
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    return await db.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id },
        include: { versions: { where: { state: "DRAFT" }, take: 1 } },
      });
      const current = project?.versions[0];
      if (!current) return false;

      const neighbor = await tx.projectVersion.findFirst({
        where: {
          state: "DRAFT",
          manualOrder: direction === "up" ? { lt: current.manualOrder } : { gt: current.manualOrder },
        },
        orderBy: direction === "up"
          ? [{ manualOrder: "desc" }, { id: "desc" }]
          : [{ manualOrder: "asc" }, { id: "asc" }],
      });
      if (!neighbor) return false;

      await tx.projectVersion.update({ where: { id: current.id }, data: { manualOrder: neighbor.manualOrder } });
      await tx.projectVersion.update({ where: { id: neighbor.id }, data: { manualOrder: current.manualOrder } });

      await recordAudit({
        action: "PROJECT_REORDERED",
        entityType: "Project",
        entityId: id,
        summary: `Moved a project ${direction} in the manual sequence.`,
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
