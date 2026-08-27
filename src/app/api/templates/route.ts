import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { TemplateService } from "@/services/template.service";
import { safeRequireAdmin } from "@/lib/require-admin";
import { revalidatePublicContentCache } from "@/lib/public-content-cache";

/**
 * Admin-only. This handler was previously unauthenticated while the POST
 * below it required an owner session — an inconsistency, and an unauthenticated
 * read of a CMS table (including each template's `isActiveLive` state) by
 * anyone who knew the path. The only caller is src/app/admin/templates/page.tsx,
 * a client component that already runs behind the admin layout and sends its
 * session cookie, so guarding this changes nothing for legitimate use.
 */
export async function GET(request: Request) {
  const { response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const templates = await TemplateService.list();
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

    const template = await TemplateService.selectDraftTemplate(templateId, {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Selecting a template is a DRAFT change, but a site with no active
    // PageVersion falls through to the draft pointer for its public
    // template — so the homepage can change immediately on a fresh install.
    revalidatePath("/admin/templates");
    revalidatePath("/");
    revalidatePublicContentCache();

    return NextResponse.json({ success: true, draftTemplateId: template.id });
  } catch (error) {
    console.error("POST templates error:", error);
    return NextResponse.json({ error: "Failed to select template" }, { status: 500 });
  }
}
