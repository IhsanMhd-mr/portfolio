import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getServerSession } from "@/lib/auth";

// GET all sections for home page
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
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // 1. Check if bulk reorder
    if (body.reorder && Array.isArray(body.sections)) {
      const updates = body.sections.map((sec: { id: string; order: number }) =>
        db.pageSection.update({
          where: { id: sec.id },
          data: { order: sec.order },
        })
      );
      await db.$transaction(updates);

      // Set hasUnpublishedChanges to true
      await db.page.update({
        where: { key: "home" },
        data: { hasUnpublishedChanges: true },
      });

      return NextResponse.json({ success: true });
    }

    // 2. Otherwise update a single section
    const { id, internalLabel, visible, settings, animationPresetSlug, animationDelay, animationStagger } = body;
    if (!id) {
      return NextResponse.json({ error: "Section ID is required" }, { status: 400 });
    }

    const updatedSection = await db.pageSection.update({
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

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    // Log action
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        entityType: "PageSection",
        entityId: id,
        summary: `Updated settings for homepage section: ${updatedSection.internalLabel}`,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, section: updatedSection });
  } catch (error) {
    console.error("PUT sections error:", error);
    return NextResponse.json({ error: "Failed to update sections" }, { status: 500 });
  }
}

// POST - Create a new section
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, internalLabel, order, visible, settings } = await request.json();

    if (!type || !internalLabel) {
      return NextResponse.json({ error: "Type and internalLabel are required" }, { status: 400 });
    }

    const page = await db.page.findUnique({
      where: { key: "home" },
    });
    if (!page) {
      return NextResponse.json({ error: "Page 'home' not found" }, { status: 404 });
    }

    // Determine position order if not provided
    let finalOrder = order;
    if (finalOrder === undefined) {
      const maxOrderSection = await db.pageSection.findFirst({
        where: { pageId: page.id },
        orderBy: { order: "desc" },
      });
      finalOrder = maxOrderSection ? maxOrderSection.order + 1 : 1;
    }

    const newSection = await db.pageSection.create({
      data: {
        pageId: page.id,
        type,
        internalLabel,
        order: finalOrder,
        visible: visible !== undefined ? visible : true,
        settings: settings || {},
      },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    // Log action
    await db.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "PageSection",
        entityId: newSection.id,
        summary: `Created homepage section: ${newSection.internalLabel}`,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, section: newSection });
  } catch (error) {
    console.error("POST sections error:", error);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}

// DELETE a section
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const deleted = await db.pageSection.delete({
      where: { id },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    // Log action
    await db.auditLog.create({
      data: {
        action: "DELETE",
        entityType: "PageSection",
        entityId: id,
        summary: `Deleted homepage section: ${deleted.internalLabel}`,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE sections error:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
