import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GOOGLE_AUTH_INTENT_COOKIE, GoogleAuthService } from "@/services/google-auth.service";

export async function GET() {
  const rawToken = (await cookies()).get(GOOGLE_AUTH_INTENT_COOKIE)?.value;
  const details = await GoogleAuthService.completionDetails(rawToken);
  if (!details) {
    return NextResponse.json({ error: "This Google setup request is invalid or expired." }, { status: 410 });
  }
  return NextResponse.json(details);
}
