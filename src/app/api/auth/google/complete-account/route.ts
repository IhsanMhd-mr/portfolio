import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GOOGLE_AUTH_INTENT_COOKIE, GoogleAuthService } from "@/services/google-auth.service";

export async function POST(request: Request) {
  const rawToken = (await cookies()).get(GOOGLE_AUTH_INTENT_COOKIE)?.value;
  if (!rawToken) {
    return NextResponse.json({ error: "This Google setup request is invalid or expired." }, { status: 410 });
  }
  const body = await request.json().catch(() => ({}));
  const result = await GoogleAuthService.completeNewAccount({
    rawToken,
    username: typeof body.username === "string" ? body.username : "",
    password: typeof body.password === "string" ? body.password : "",
    confirmPassword: typeof body.confirmPassword === "string" ? body.confirmPassword : "",
  });
  if (!result.ok) {
    const status = result.reason === "invalid-or-expired" ? 410 : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }
  const response = NextResponse.json(result);
  response.cookies.delete(GOOGLE_AUTH_INTENT_COOKIE);
  return response;
}
