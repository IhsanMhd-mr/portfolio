import { NextResponse } from "next/server";
import { PasswordRecoveryService } from "@/services/password-recovery.service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  await PasswordRecoveryService.requestOtp(identifier);

  // Deliberately generic: no account lookup or existence disclosure occurs
  // until a real OTP transport and verification store are available.
  return NextResponse.json(
    { error: "Password recovery is temporarily unavailable because OTP delivery is not configured." },
    { status: 503 }
  );
}
