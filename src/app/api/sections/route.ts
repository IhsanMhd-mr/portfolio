import { NextResponse } from "next/server";
import db from "@/lib/database";
import { safeRequireAdmin } from "@/lib/require-admin";
import { recordAudit } from "@/lib/audit";

// GET all sections for home page (public-readable)
export async function GET() {
  try {
    const page = await db.page.findUnique({
      where: { key: "home" },
      include: {
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page.sections);
  } catch (error) {
    console.error("GET sections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/sections - Reorder or update multiple/single section
export async function PUT(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const body = await request.json();
    const auditCtx = {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    };

    // Bulk reorder
    if (body.reorder && Array.isArray(body.sections)) {
      await db.$transaction(async (tx) => {
        const updates = body.sections.map((sec: { id: string; order: number }) =>
          tx.pageSection.update({ where: { id: sec.id }, data: { order: sec.order } })
        );
        await Promise.all(updates);
        await tx.page.update({ where: { key: "home" }, data: { hasUnpublishedChanges: true } });
        await recordAudit({
          action: "SECTION_REORDERED",
          entityType: "Page",
          summary: `Reordered ${body.sections.length} homepage sections`,
          context: auditCtx,
          tx,
        });
      });
      return NextResponse.json({ success: true });
    }

    // Single section update
    const { id, internalLabel, visible, settings, animationPresetSlug, animationDelay, animationStagger } = body;
    if (!id) {
      return NextResponse.json({ error: "Section ID is required" }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const before = await tx.pageSection.findUniqueOrThrow({ where: { id } });
      const after = await tx.pageSection.update({
        where: { id },
        data: {
          internalLabel,
          visible,
          settings: settings ? (typeof settings === "string" ? JSON.parse(settings) : settings) : undefined,
          animationPresetSlug,
          animationDelay,
          animationStagger,
        },
      });
      await tx.page.update({ where: { key: "home" }, data: { hasUnpublishedChanges: true } });
      await recordAudit({
        action: "SECTION_UPDATED",
        entityType: "PageSection",
        entityId: id,
        summary: `Updated settings for homepage section: ${after.internalLabel}`,
        before,
        after,
        context: auditCtx,
        tx,
      });
      return after;
    });

    return NextResponse.json({ success: true, section: result });
  } catch (error) {
    console.error("PUT sections error:", error);
    return NextResponse.json({ error: "Failed to update sections" }, { status: 500 });
  }
}

// POST - Create a new section
export async function POST(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const { type, internalLabel, order, visible, settings } = await request.json();
    if (!type || !internalLabel) {
      return NextResponse.json({ error: "Type and internalLabel are required" }, { status: 400 });
    }

    const page = await db.page.findUnique({ where: { key: "home" } });
    if (!page) {
      return NextResponse.json({ error: "Page 'home' not found" }, { status: 404 });
    }

    let finalOrder = order;
    if (finalOrder === undefined) {
      const maxOrderSection = await db.pageSection.findFirst({
        where: { pageId: page.id },
        orderBy: { order: "desc" },
      });
      finalOrder = maxOrderSection ? maxOrderSection.order + 1 : 1;
    }

    const auditCtx = {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    };

    const newSection = await db.$transaction(async (tx) => {
      const section = await tx.pageSection.create({
        data: {
          pageId: page.id,
          type,
          internalLabel,
          order: finalOrder,
          visible: visible !== undefined ? visible : true,
          settings: settings || {},
        },
      });
      await tx.page.update({ where: { key: "home" }, data: { hasUnpublishedChanges: true } });
      await recordAudit({
        action: "SECTION_ADDED",
        entityType: "PageSection",
        entityId: section.id,
        summary: `Added homepage section: ${section.internalLabel}`,
        after: section,
        context: auditCtx,
        tx,
      });
      return section;
    });

    return NextResponse.json({ success: true, section: newSection });
  } catch (error) {
    console.error("POST sections error:", error);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}

// DELETE a section
export async function DELETE(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const auditCtx = {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    };

    await db.$transaction(async (tx) => {
      const section = await tx.pageSection.findUniqueOrThrow({ where: { id } });
      await tx.pageSection.delete({ where: { id } });
      await tx.page.update({ where: { key: "home" }, data: { hasUnpublishedChanges: true } });
      await recordAudit({
        action: "SECTION_DELETED",
        entityType: "PageSection",
        entityId: id,
        summary: `Deleted homepage section: ${section.internalLabel}`,
        before: section,
        context: auditCtx,
        tx,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE sections error:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
