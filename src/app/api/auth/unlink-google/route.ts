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
import { LinkedAccountService } from "@/services/linked-account.service";

export async function DELETE(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const { accountId } = await request.json();
  if (!accountId || typeof accountId !== "string") {
    return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
  }

  const result = await LinkedAccountService.unlinkGoogle(accountId, context.userId, {
    actorId: context.userId,
    loginMethod: context.loginMethod,
    loginAccountId: context.loginAccountId,
  });

  if (!result.ok) {
    return result.reason === "not-found"
      ? NextResponse.json({ error: "Account not found" }, { status: 404 })
      : NextResponse.json(
          { error: "Cannot remove the last login method. Set a password first." },
          { status: 409 }
        );
  }

  return NextResponse.json({ success: true });
}
