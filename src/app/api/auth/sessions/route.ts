/**
 * GET  /api/auth/sessions  — List all TrackedSessions for the owner
 * DELETE /api/auth/sessions  — Revoke a specific session by sid
 */

import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { SessionService } from "@/services/session.service";

export async function GET(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const sessions = await SessionService.listForOwner(context.userId, context.sid);

  return NextResponse.json(sessions);
}

export async function DELETE(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const { sid } = await request.json();
  if (!sid || typeof sid !== "string") {
    return NextResponse.json({ error: "Missing sid" }, { status: 400 });
  }

  const result = await SessionService.revoke(sid, context.userId, {
    actorId: context.userId,
    loginMethod: context.loginMethod,
    loginAccountId: context.loginAccountId,
  });

  if (!result.ok) {
    // Distinct status codes, hence the result union rather than a thrown Error.
    return result.reason === "not-found"
      ? NextResponse.json({ error: "Session not found" }, { status: 404 })
      : NextResponse.json({ error: "Session already revoked" }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
