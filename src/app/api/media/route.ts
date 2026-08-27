import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { MediaService } from "@/services/media.service";

const PICKER_PAGE_SIZE = 24;

/**
 * Paginated/searchable media listing for MediaPickerModal — returns only the
 * fields the picker needs, never the full MediaAsset row, and never the full
 * table (unlike the admin forms this replaces, which used to `findMany()`
 * every asset just to populate a <select>).
 */
export async function GET(request: Request) {
  const { response } = await safeRequireAdmin(request);
  if (response) return response;

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const { total, totalPages, assets } = await MediaService.listForPicker(
    search,
    page,
    PICKER_PAGE_SIZE
  );

  return NextResponse.json({
    assets,
    page,
    totalPages,
    total,
  });
}

export async function POST(request: Request) {
  // Enforce requireAdmin validation
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const data = await request.formData();
    const file = data.get("file") as File;
    const altText = data.get("altText") as string || null;
    const replaceId = data.get("replaceId") as string || null;

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const auditContext = {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
      ipAddress,
      userAgent,
    };

    if (replaceId) {
      // Replacement flow
      const asset = await MediaService.replaceAsset(replaceId, file, auditContext);
      return NextResponse.json({ success: true, asset });
    } else {
      // Normal upload flow
      const asset = await MediaService.uploadAsset(file, altText, auditContext);
      return NextResponse.json({ success: true, asset });
    }
  } catch (e: any) {
    console.error("API Media Upload error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to process media file." },
      { status: 400 }
    );
  }
}
