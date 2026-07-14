import { NextResponse } from "next/server";
import db from "@/lib/database";
import { safeRequireAdmin } from "@/lib/require-admin";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  try {
    const templates = await db.template.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET templates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Update the draft template choice
export async function POST(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const { templateId } = await request.json();
    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const template = await db.template.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const auditCtx = {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    };

    await db.$transaction(async (tx) => {
      const before = await tx.page.findUnique({ where: { key: "home" }, select: { draftTemplateId: true } });
      await tx.page.update({
        where: { key: "home" },
        data: { draftTemplateId: template.id, hasUnpublishedChanges: true },
      });
      await recordAudit({
        action: "TEMPLATE_CHANGED",
        entityType: "Page",
        summary: `Changed draft template to: ${template.name}`,
        before: { draftTemplateId: before?.draftTemplateId },
        after: { draftTemplateId: template.id, templateName: template.name },
        context: auditCtx,
        tx,
      });
    });

    return NextResponse.json({ success: true, draftTemplateId: template.id });
  } catch (error) {
    console.error("POST templates error:", error);
    return NextResponse.json({ error: "Failed to select template" }, { status: 500 });
  }
}
