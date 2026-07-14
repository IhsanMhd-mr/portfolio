/**
 * GET  /api/auth/sessions  — List all TrackedSessions for the owner
 * DELETE /api/auth/sessions  — Revoke a specific session by sid
 */

import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { recordAudit } from "@/lib/audit";
import db from "@/lib/database";

export async function GET(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const sessions = await db.trackedSession.findMany({
    where: { userId: context.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      sid: s.sid,
      loginMethod: s.loginMethod,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      revokeReason: s.revokeReason,
      isCurrent: s.sid === context.sid,
    }))
  );
}

export async function DELETE(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const { sid } = await request.json();
  if (!sid || typeof sid !== "string") {
    return NextResponse.json({ error: "Missing sid" }, { status: 400 });
  }

  const session = await db.trackedSession.findUnique({ where: { sid } });
  if (!session || session.userId !== context.userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.revokedAt) {
    return NextResponse.json({ error: "Session already revoked" }, { status: 409 });
  }

  await db.trackedSession.update({
    where: { sid },
    data: { revokedAt: new Date(), revokeReason: "MANUAL_REVOCATION" },
  });

  await recordAudit({
    action: "SESSION_REVOKED",
    entityType: "TrackedSession",
    entityId: session.id,
    summary: `Session revoked manually (IP: ${session.ipAddress ?? "unknown"})`,
    context: {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    },
  });

  return NextResponse.json({ success: true });
}
