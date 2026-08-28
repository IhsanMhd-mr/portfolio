/**
 * A temporary-password reset applies only when that password authenticated the
 * current session. A linked Google identity remains a complete login method
 * even while the owner's local password is still marked for rotation.
 */
export function requiresPasswordChange(
  mustChangePassword: boolean,
  loginMethod: string
): boolean {
  return mustChangePassword && loginMethod === "LOCAL";
}
