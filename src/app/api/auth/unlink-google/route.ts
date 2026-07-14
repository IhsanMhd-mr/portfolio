/**
 * DELETE /api/auth/unlink-google
 *
 * Unlinks a Google account from the owner.
 * Rules:
 *   - The owner must have at least one other login method remaining.
 *   - Soft-deletes are not used — the Account row is permanently removed.
 *   - An audit event is recorded.
 */

import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { recordAudit } from "@/lib/audit";
import db from "@/lib/database";

export async function DELETE(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const { accountId } = await request.json();
  if (!accountId || typeof accountId !== "string") {
    return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
  }

  // Verify the account belongs to this owner
  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== context.userId || account.provider !== "google") {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Count remaining login methods (other Google + local password)
  const owner = await db.user.findUnique({ where: { id: context.userId } });
  const otherGoogleCount = await db.account.count({
    where: { userId: context.userId, provider: "google", id: { not: accountId } },
  });
  const hasLocalPassword = !!owner?.passwordHash;

  if (otherGoogleCount === 0 && !hasLocalPassword) {
    return NextResponse.json(
      { error: "Cannot remove the last login method. Set a password first." },
      { status: 409 }
    );
  }

  const email = account.email ?? account.providerAccountId;

  await db.account.delete({ where: { id: accountId } });

  await recordAudit({
    action: "GOOGLE_UNLINKED",
    entityType: "Account",
    entityId: accountId,
    summary: `Google account unlinked: ${email}`,
    context: {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    },
  });

  return NextResponse.json({ success: true });
}
