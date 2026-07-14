/**
 * POST /api/auth/change-password
 *
 * Changes the owner's password. Revokes all OTHER tracked sessions.
 * The current session is preserved (user stays logged in).
 */

import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { verifyPassword, hashPassword } from "@/lib/password";
import { recordAudit } from "@/lib/audit";
import db from "@/lib/database";

export async function POST(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both passwords are required" }, { status: 400 });
  }

  if (newPassword.length < 12) {
    return NextResponse.json({ error: "New password must be at least 12 characters" }, { status: 400 });
  }

  const owner = await db.user.findUnique({ where: { id: context.userId } });
  if (!owner?.passwordHash) {
    return NextResponse.json({ error: "No local password set" }, { status: 400 });
  }

  const isMatch = await verifyPassword(currentPassword, owner.passwordHash);
  if (!isMatch) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);

  await db.$transaction(async (tx) => {
    // Update password and clear mustChangePassword flag
    await tx.user.update({
      where: { id: context.userId },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    // Revoke all other active sessions (not the current one)
    await tx.trackedSession.updateMany({
      where: {
        userId: context.userId,
        revokedAt: null,
        sid: { not: context.sid },
      },
      data: { revokedAt: new Date(), revokeReason: "PASSWORD_CHANGED" },
    });
  });

  await recordAudit({
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: context.userId,
    summary: "Owner changed their password. Other sessions revoked.",
    context: {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    },
  });

  return NextResponse.json({ success: true });
}
