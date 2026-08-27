import db from "@/lib/database";
import { recordAudit, type ServiceAuditContext } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/password";

/**
 * SessionService — TrackedSession lifecycle and password changes.
 *
 * Placed in `src/services/` rather than `src/lib/` on purpose. `src/lib/auth.ts`
 * is NextAuth wiring, called by the framework; `require-admin.ts` is the
 * authorization check every route runs. What lives here is different: domain
 * rules with invariants that routes were enforcing themselves —
 *
 *   - a session may only be revoked by the owner it belongs to
 *   - an already-revoked session is a conflict, not a repeat success
 *   - changing a password revokes every OTHER session but keeps the current
 *     one, so the owner is not logged out by their own password change
 *
 * Each result is a discriminated union rather than a thrown error, because the
 * callers map them onto distinct HTTP status codes (404 / 409 / 401) and
 * pattern-matching on an Error message to do that would be worse.
 */
export type RevokeResult =
  | { ok: true }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "already-revoked" };

export type PasswordChangeResult =
  | { ok: true }
  | { ok: false; reason: "no-local-password" }
  | { ok: false; reason: "wrong-password" };

export class SessionService {
  /** Every session for the owner, newest first, flagged with which is current. */
  static async listForOwner(userId: string, currentSid: string) {
    const sessions = await db.trackedSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return sessions.map((s) => ({
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
      isCurrent: s.sid === currentSid,
    }));
  }

  /**
   * Revokes one session by sid.
   *
   * The ownership check is what stops a valid session revoking somebody
   * else's, so it is deliberately not optional: a session belonging to another
   * user reports `not-found` rather than a permission error, which avoids
   * confirming that the sid exists.
   */
  static async revoke(sid: string, ownerId: string, auditContext: ServiceAuditContext): Promise<RevokeResult> {
    const session = await db.trackedSession.findUnique({ where: { sid } });
    if (!session || session.userId !== ownerId) return { ok: false, reason: "not-found" };
    if (session.revokedAt) return { ok: false, reason: "already-revoked" };

    await db.trackedSession.update({
      where: { sid },
      data: { revokedAt: new Date(), revokeReason: "MANUAL_REVOCATION" },
    });

    await recordAudit({
      action: "SESSION_REVOKED",
      entityType: "TrackedSession",
      entityId: session.id,
      summary: `Session revoked manually (IP: ${session.ipAddress ?? "unknown"})`,
      context: auditContext,
    });

    return { ok: true };
  }

  /** Revokes every currently-active session for the owner. */
  static async revokeAll(userId: string, reason: string) {
    return db.trackedSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  /** Revokes a single session by sid without an ownership check, for logout. */
  static async revokeOwn(sid: string, reason: string) {
    return db.trackedSession.update({
      where: { sid },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  /**
   * Best-effort revoke used by the force-logout escape hatch.
   *
   * `updateMany` rather than `update` so an already-revoked or missing session
   * is a no-op instead of a throw: force-logout exists to break a redirect
   * loop, and it must not fail on the state it was invoked to clean up.
   */
  static async revokeIfActive(sid: string, reason: string) {
    return db.trackedSession.updateMany({
      where: { sid, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  /**
   * Changes the owner's password and revokes their other sessions.
   *
   * The revocation shares the password write's transaction: a password change
   * that succeeded while leaving other sessions live would be exactly the
   * situation the revocation exists to prevent.
   */
  static async changePassword(
    userId: string,
    currentSid: string,
    currentPassword: string,
    newPassword: string,
    auditContext: ServiceAuditContext
  ): Promise<PasswordChangeResult> {
    const owner = await db.user.findUnique({ where: { id: userId } });
    if (!owner?.passwordHash) return { ok: false, reason: "no-local-password" };

    const isMatch = await verifyPassword(currentPassword, owner.passwordHash);
    if (!isMatch) return { ok: false, reason: "wrong-password" };

    const newHash = await hashPassword(newPassword);

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash, mustChangePassword: false },
      });

      // Every other session, but NOT the current one — the owner should not be
      // signed out by their own password change.
      await tx.trackedSession.updateMany({
        where: { userId, revokedAt: null, sid: { not: currentSid } },
        data: { revokedAt: new Date(), revokeReason: "PASSWORD_CHANGED" },
      });
    });

    await recordAudit({
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: userId,
      summary: "Owner changed their password. Other sessions revoked.",
      context: auditContext,
    });

    return { ok: true };
  }
}
