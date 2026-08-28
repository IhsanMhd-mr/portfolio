import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { GOOGLE_AUTH_INTENT_COOKIE, GoogleAuthService } from "@/services/google-auth.service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const kind = body.kind === "LINK" ? "LINK" : "LOGIN";
  let userId: string | null = null;

  if (kind === "LINK") {
    const { context, response } = await safeRequireAdmin(request);
    if (response) return response;
    if (context.role === "SUPERADMIN") {
      return NextResponse.json(
        { error: "Super Admin is credentials-only and cannot link Google." },
        { status: 403 }
      );
    }
    userId = context.userId;
  }

  await GoogleAuthService.cleanExpiredIntents();
  const rawToken = await GoogleAuthService.createIntent(kind, userId, body.callbackUrl);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(GOOGLE_AUTH_INTENT_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
