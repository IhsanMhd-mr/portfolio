import { NextResponse } from "next/server";
import db from "@/lib/database";
import { safeRequireAdmin } from "@/lib/require-admin";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// GET - Compile summary of differences between draft configuration and active live snapshot
export async function GET(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const page = await db.page.findUnique({
      where: { key: "home" },
      include: {
        draftTemplate: true,
        sections: { orderBy: { order: "asc" } },
        versions: { where: { isActive: true }, take: 1 },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const draftTemplateName = page.draftTemplate?.name || "None";
    const draftTemplateKey = page.draftTemplate?.key || "MODERN_GLASS";
    const draftSections = page.sections;

    const activeVersion = page.versions?.[0];
    let publishedTemplateKey = "None";
    let publishedSectionsCount = 0;
    let hasTemplateDiff = false;
    let hasSectionsCountDiff = false;

    if (activeVersion) {
      publishedTemplateKey = activeVersion.templateKey;
      hasTemplateDiff = draftTemplateKey !== publishedTemplateKey;
      const snapshot = typeof activeVersion.snapshot === "string"
        ? JSON.parse(activeVersion.snapshot)
        : activeVersion.snapshot;
      if (Array.isArray(snapshot)) publishedSectionsCount = snapshot.length;
      hasSectionsCountDiff = draftSections.length !== publishedSectionsCount;
    } else {
      hasTemplateDiff = true;
      hasSectionsCountDiff = true;
    }

    return NextResponse.json({
      hasUnpublishedChanges: page.hasUnpublishedChanges,
      draftTemplate: draftTemplateName,
      draftTemplateKey,
      publishedTemplate: publishedTemplateKey,
      hasTemplateDiff,
      draftSectionsCount: draftSections.length,
      publishedSectionsCount,
      hasSectionsCountDiff,
      sectionsList: draftSections.map((s) => ({
        id: s.id,
        label: s.internalLabel,
        type: s.type,
        visible: s.visible,
        order: s.order,
      })),
    });
  } catch (error) {
    console.error("GET publish info error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Atomic Transactional Promotion of all Draft Content to Published State
export async function POST(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const page = await db.page.findUnique({
      where: { key: "home" },
      include: { draftTemplate: true, sections: { orderBy: { order: "asc" } } },
    });

    if (!page || !page.draftTemplate) {
      return NextResponse.json({ error: "Draft template or page not found" }, { status: 400 });
    }

    const latestVersion = await db.pageVersion.findFirst({
      where: { pageId: page.id },
      orderBy: { versionNumber: "desc" },
    });
    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const sectionsSnapshot = page.sections.map((s) => ({
      id: s.id,
      type: s.type,
      internalLabel: s.internalLabel,
      order: s.order,
      visible: s.visible,
      settings: typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings || {},
      animationPresetSlug: s.animationPresetSlug,
      animationDelay: s.animationDelay,
      animationStagger: s.animationStagger,
    }));

    const auditCtx = {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    };

    const newVersion = await db.$transaction(async (tx) => {
      // 1. Projects versions promotion
      const draftProjects = await tx.projectVersion.findMany({
        where: { state: "DRAFT" },
      });
      for (const draft of draftProjects) {
        const pub = await tx.projectVersion.findFirst({
          where: { projectId: draft.projectId, state: "PUBLISHED" },
        });
        const data = {
          title: draft.title,
          summary: draft.summary,
          category: draft.category,
          startDate: draft.startDate,
          endDate: draft.endDate,
          myRole: draft.myRole,
          problem: draft.problem,
          solution: draft.solution,
          mainFeatures: draft.mainFeatures,
          systemArchitecture: draft.systemArchitecture,
          developmentProcess: draft.developmentProcess,
          challenges: draft.challenges,
          solutionsDetail: draft.solutionsDetail,
          testing: draft.testing,
          results: draft.results,
          lessonsLearned: draft.lessonsLearned,
          liveDemoUrl: draft.liveDemoUrl,
          githubUrl: draft.githubUrl,
          reportUrl: draft.reportUrl,
          thumbnailId: draft.thumbnailId,
          coverImageId: draft.coverImageId,
          architectureImageId: draft.architectureImageId,
          visible: draft.visible,
          manualOrder: draft.manualOrder,
        };
        if (pub) {
          await tx.projectVersion.update({ where: { id: pub.id }, data });
        } else {
          await tx.projectVersion.create({
            data: { ...data, projectId: draft.projectId, state: "PUBLISHED" },
          });
        }
      }

      // 2. Technologies versions promotion
      const draftTechs = await tx.technologyVersion.findMany({
        where: { state: "DRAFT" },
      });
      for (const draft of draftTechs) {
        const pub = await tx.technologyVersion.findFirst({
          where: { technologyId: draft.technologyId, state: "PUBLISHED" },
        });
        const data = {
          name: draft.name,
          category: draft.category,
          experienceLabel: draft.experienceLabel,
          description: draft.description,
          logoId: draft.logoId,
          showInStack: draft.showInStack,
          showInGame: draft.showInGame,
          showOnResume: draft.showOnResume,
          visible: draft.visible,
          order: draft.order,
        };
        if (pub) {
          await tx.technologyVersion.update({ where: { id: pub.id }, data });
        } else {
          await tx.technologyVersion.create({
            data: { ...data, technologyId: draft.technologyId, state: "PUBLISHED" },
          });
        }
      }

      // 3. Timeline Entries versions promotion
      const draftTimeline = await tx.timelineEntryVersion.findMany({
        where: { state: "DRAFT" },
      });
      for (const draft of draftTimeline) {
        const pub = await tx.timelineEntryVersion.findFirst({
          where: { timelineEntryId: draft.timelineEntryId, state: "PUBLISHED" },
        });
        const data = {
          title: draft.title,
          entryType: draft.entryType,
          startDate: draft.startDate,
          endDate: draft.endDate,
          description: draft.description,
          status: draft.status,
          externalLinks: draft.externalLinks || {},
          visible: draft.visible,
          order: draft.order,
          imageId: draft.imageId,
        };
        if (pub) {
          await tx.timelineEntryVersion.update({ where: { id: pub.id }, data });
        } else {
          await tx.timelineEntryVersion.create({
            data: { ...data, timelineEntryId: draft.timelineEntryId, state: "PUBLISHED" },
          });
        }
      }

      // 4. Education versions promotion
      const draftEdu = await tx.educationVersion.findMany({
        where: { state: "DRAFT" },
      });
      for (const draft of draftEdu) {
        const pub = await tx.educationVersion.findFirst({
          where: { educationId: draft.educationId, state: "PUBLISHED" },
        });
        const data = {
          institution: draft.institution,
          qualification: draft.qualification,
          startDate: draft.startDate,
          endDate: draft.endDate,
          isCurrent: draft.isCurrent,
          grade: draft.grade,
          description: draft.description,
          modules: draft.modules,
          showOnResume: draft.showOnResume,
          visible: draft.visible,
          order: draft.order,
          logoId: draft.logoId,
        };
        if (pub) {
          await tx.educationVersion.update({ where: { id: pub.id }, data });
        } else {
          await tx.educationVersion.create({
            data: { ...data, educationId: draft.educationId, state: "PUBLISHED" },
          });
        }
      }

      // 5. Experience versions promotion
      const draftExp = await tx.experienceVersion.findMany({
        where: { state: "DRAFT" },
      });
      for (const draft of draftExp) {
        const pub = await tx.experienceVersion.findFirst({
          where: { experienceId: draft.experienceId, state: "PUBLISHED" },
        });
        const data = {
          organization: draft.organization,
          role: draft.role,
          startDate: draft.startDate,
          endDate: draft.endDate,
          isCurrent: draft.isCurrent,
          description: draft.description,
          responsibilities: draft.responsibilities || [],
          locationText: draft.locationText,
          workType: draft.workType,
          showOnResume: draft.showOnResume,
          visible: draft.visible,
          order: draft.order,
          logoId: draft.logoId,
        };
        if (pub) {
          await tx.experienceVersion.update({ where: { id: pub.id }, data });
        } else {
          await tx.experienceVersion.create({
            data: { ...data, experienceId: draft.experienceId, state: "PUBLISHED" },
          });
        }
      }

      // 6. Save current layout snapshot as page version record
      await tx.pageVersion.updateMany({
        where: { pageId: page.id, isActive: true },
        data: { isActive: false },
      });

      const newVer = await tx.pageVersion.create({
        data: {
          pageId: page.id,
          versionNumber: nextVersionNumber,
          templateKey: page.draftTemplate!.key,
          snapshot: sectionsSnapshot,
          isActive: true,
          publishedById: context.userId,
        },
      });

      await tx.page.update({ where: { id: page.id }, data: { hasUnpublishedChanges: false } });

      await tx.template.updateMany({ data: { isActiveLive: false } });
      await tx.template.update({
        where: { id: page.draftTemplateId! },
        data: { isActiveLive: true },
      });

      await recordAudit({
        action: "PAGE_PUBLISHED",
        entityType: "PageVersion",
        entityId: newVer.id,
        summary: `Published layout snapshot version #${nextVersionNumber}`,
        context: auditCtx,
        tx,
      });

      return newVer;
    });

    // Invalidate caches
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/timeline");
    revalidatePath("/resume");

    return NextResponse.json({ success: true, version: nextVersionNumber });
  } catch (error: any) {
    console.error("POST publish error:", error);
    return NextResponse.json({ error: error.message || "Failed to publish page" }, { status: 500 });
  }
}
