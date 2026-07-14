import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getServerSession } from "@/lib/auth";

// GET - Compile summary of differences between draft configuration and active live snapshot
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const page = await db.page.findUnique({
      where: { key: "home" },
      include: {
        draftTemplate: true,
        sections: {
          orderBy: { order: "asc" },
        },
        versions: {
          where: { isActive: true },
          take: 1,
        },
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
      
      if (Array.isArray(snapshot)) {
        publishedSectionsCount = snapshot.length;
      }
      hasSectionsCountDiff = draftSections.length !== publishedSectionsCount;
    } else {
      // If there are no published versions, everything is a pending change
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
export async function POST() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Load current page and draft layout
    const page = await db.page.findUnique({
      where: { key: "home" },
      include: {
        draftTemplate: true,
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!page || !page.draftTemplate) {
      return NextResponse.json({ error: "Draft template or page not found" }, { status: 400 });
    }

    // 2. Fetch the latest version number
    const latestVersion = await db.pageVersion.findFirst({
      where: { pageId: page.id },
      orderBy: { versionNumber: "desc" },
    });
    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // 3. Serialize sections snapshot
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

    // 4. Create new PageVersion and mark all others inactive
    await db.$transaction(async (tx) => {
      // Deactivate current active versions
      await tx.pageVersion.updateMany({
        where: { pageId: page.id, isActive: true },
        data: { isActive: false },
      });

      // Create new active version
      await tx.pageVersion.create({
        data: {
          pageId: page.id,
          versionNumber: nextVersionNumber,
          templateKey: page.draftTemplate!.key,
          snapshot: sectionsSnapshot,
          isActive: true,
          publishedById: session.user.id,
        },
      });

      // Reset page unpublished changes flag
      await tx.page.update({
        where: { id: page.id },
        data: { hasUnpublishedChanges: false },
      });

      // Update Template active status (synchronize Template model for consistency)
      await tx.template.updateMany({
        data: { isActiveLive: false },
      });
      await tx.template.update({
        where: { id: page.draftTemplateId! },
        data: { isActiveLive: true },
      });
    });

    // Create Audit Log entry
    await db.auditLog.create({
      data: {
        action: "PUBLISH",
        entityType: "PageVersion",
        summary: `Published layout snapshot version #${nextVersionNumber}`,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, version: nextVersionNumber });
  } catch (error) {
    console.error("POST publish error:", error);
    return NextResponse.json({ error: "Failed to publish page" }, { status: 500 });
  }
}
