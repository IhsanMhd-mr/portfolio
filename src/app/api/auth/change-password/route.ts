/**
 * POST /api/auth/change-password
 *
 * Changes the owner's password. Revokes all OTHER tracked sessions.
 * The current session is preserved (user stays logged in).
 */

import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { SessionService } from "@/services/session.service";
import { validatePasswordConfirmation } from "@/lib/account-identity";

export async function POST(request: Request) {
  // Pass the change-password pathname so the mustChangePassword gate does not
  // block the very endpoint used to change the password.
  const { context, response } = await safeRequireAdmin(request, {
    pathname: "/admin/settings/security/change-password",
  });
  if (response) return response;

  const { currentPassword, newPassword, confirmPassword } = await request.json();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Current, new, and confirmation passwords are required" }, { status: 400 });
  }
  const passwordError = validatePasswordConfirmation(newPassword, confirmPassword);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "New password must be different from the current password" }, { status: 400 });
  }

  const auditContext = {
    actorId: context.userId,
    loginMethod: context.loginMethod,
    loginAccountId: context.loginAccountId,
  };

  const result = await SessionService.changePassword(
    context.userId,
    context.sid,
    currentPassword,
    newPassword,
    auditContext
  );

  if (!result.ok) {
    // Distinct status codes, hence the result union rather than a thrown Error.
    if (result.reason === "immutable-account") {
      return NextResponse.json(
        { error: "Super Admin password cannot be changed in the application" },
        { status: 403 }
      );
    }
    return result.reason === "no-local-password"
      ? NextResponse.json({ error: "No local password set" }, { status: 400 })
      : NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
