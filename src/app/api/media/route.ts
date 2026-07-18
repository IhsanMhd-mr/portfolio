import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { MediaService } from "@/services/media.service";

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
