import { NextResponse } from "next/server";
import db from "@/lib/database";
import { safeRequireAdmin } from "@/lib/require-admin";
import { recordAudit } from "@/lib/audit";

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

// POST - Publish draft configuration
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

    await db.$transaction(async (tx) => {
      await tx.pageVersion.updateMany({
        where: { pageId: page.id, isActive: true },
        data: { isActive: false },
      });

      const newVersion = await tx.pageVersion.create({
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
        entityId: newVersion.id,
        summary: `Published layout snapshot version #${nextVersionNumber}`,
        context: auditCtx,
        tx,
      });
    });

    return NextResponse.json({ success: true, version: nextVersionNumber });
  } catch (error) {
    console.error("POST publish error:", error);
    return NextResponse.json({ error: "Failed to publish page" }, { status: 500 });
  }
}
