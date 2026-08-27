import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { safeRequireAdmin } from "@/lib/require-admin";
import { PublishService } from "@/services/publish.service";

/**
 * Publishing endpoints.
 *
 * GET  — what a publish would change, for the confirmation screen.
 * POST — promote every draft to PUBLISHED and ship a new layout snapshot.
 *
 * The promotion itself lives in PublishService; this file is auth, cache
 * invalidation and status codes.
 */

export async function GET(request: Request) {
  const { response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const status = await PublishService.getStatus();
    if (!status) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET publish info error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const result = await PublishService.publishHomePage({
      userId: context.userId,
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "Draft template or page not found" },
        { status: 400 }
      );
    }

    for (const path of PublishService.REVALIDATE_PATHS) revalidatePath(path);
    for (const path of PublishService.REVALIDATE_DYNAMIC_PATHS) revalidatePath(path, "page");

    return NextResponse.json({ success: true, version: result.versionNumber });
  } catch (error) {
    // Deliberately NOT `error.message`. Promotion runs raw writes across five
    // tables, so a constraint violation surfaces a Prisma message naming the
    // table and column — that used to be returned straight to the client.
    // The detail belongs in the server log, not the response body.
    console.error("POST publish error:", error);
    return NextResponse.json({ error: "Failed to publish page" }, { status: 500 });
  }
}
