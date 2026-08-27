/**
 * POST /api/auth/change-password
 *
 * Changes the owner's password. Revokes all OTHER tracked sessions.
 * The current session is preserved (user stays logged in).
 */

import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { SessionService } from "@/services/session.service";

export async function POST(request: Request) {
  // Pass the change-password pathname so the mustChangePassword gate does not
  // block the very endpoint used to change the password.
  const { context, response } = await safeRequireAdmin(request, {
    pathname: "/admin/settings/security/change-password",
  });
  if (response) return response;

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both passwords are required" }, { status: 400 });
  }

  if (newPassword.length < 12) {
    return NextResponse.json({ error: "New password must be at least 12 characters" }, { status: 400 });
  }

  const result = await SessionService.changePassword(
    context.userId,
    context.sid,
    currentPassword,
    newPassword,
    {
      actorId: context.userId,
      loginMethod: context.loginMethod,
      loginAccountId: context.loginAccountId,
    }
  );

  if (!result.ok) {
    // Distinct status codes, hence the result union rather than a thrown Error.
    return result.reason === "no-local-password"
      ? NextResponse.json({ error: "No local password set" }, { status: 400 })
      : NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
