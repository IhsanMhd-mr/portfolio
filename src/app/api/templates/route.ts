import { NextResponse } from "next/server";
import db from "@/lib/database";
import { getServerSession } from "@/lib/auth";

export async function GET() {
  try {
    const templates = await db.template.findMany({
      orderBy: { key: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET templates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Update the draft template choice
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const template = await db.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 442 });
    }

    // Update the draft template id on home page
    const updatedPage = await db.page.update({
      where: { key: "home" },
      data: {
        draftTemplateId: template.id,
        hasUnpublishedChanges: true,
      },
    });

    // Log action
    await db.auditLog.create({
      data: {
        action: "TEMPLATE_CHANGE",
        entityType: "Page",
        entityId: updatedPage.id,
        summary: `Changed draft template to: ${template.name}`,
        actorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, draftTemplateId: template.id });
  } catch (error) {
    console.error("POST templates error:", error);
    return NextResponse.json({ error: "Failed to select template" }, { status: 500 });
  }
}
