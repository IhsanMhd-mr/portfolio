import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GOOGLE_AUTH_INTENT_COOKIE, GoogleAuthService } from "@/services/google-auth.service";

export async function POST(request: Request) {
  const rawToken = (await cookies()).get(GOOGLE_AUTH_INTENT_COOKIE)?.value;
  if (!rawToken) {
    return NextResponse.json({ error: "This Google linking request is invalid or expired." }, { status: 410 });
  }
  const body = await request.json().catch(() => ({}));
  const result = await GoogleAuthService.confirmExistingAccount(
    rawToken,
    typeof body.currentPassword === "string" ? body.currentPassword : "",
    { ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent") }
  );
  if (!result.ok) {
    const status = result.reason === "invalid-credentials" ? 401 :
      result.reason === "too-many-attempts" ? 429 :
      result.reason === "invalid-or-expired" ? 410 : 403;
    const error = result.reason === "invalid-credentials"
      ? "Current password is incorrect."
      : "This Google account could not be linked.";
    return NextResponse.json({ error }, { status });
  }
  const response = NextResponse.json(result);
  response.cookies.delete(GOOGLE_AUTH_INTENT_COOKIE);
  return response;
}
