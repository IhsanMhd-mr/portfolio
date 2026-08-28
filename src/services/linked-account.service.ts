import db from "@/lib/database";
import { recordAudit, type ServiceAuditContext } from "@/lib/audit";

/**
 * LinkedAccountService — the owner's linked OAuth identities.
 *
 * Holds one invariant that matters more than the rest of this file put
 * together: **the owner must never be left without a way to sign in.**
 * Unlinking the last Google account is refused unless a local password exists,
 * because the alternative is an account nobody can reach — not recoverable
 * from the UI, and this is a single-owner CMS with no second admin to undo it.
 */
export type UnlinkResult =
  | { ok: true; email: string }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "last-login-method" }
  | { ok: false; reason: "immutable-account" };

export class LinkedAccountService {
  /** The owner's linked Google accounts. */
  static async listGoogleAccounts(userId: string) {
    return db.account.findMany({
      where: { userId, provider: "google" },
      orderBy: { id: "asc" },
      select: { id: true, email: true, provider: true },
    });
  }

  /**
   * Unlinks one Google account.
   *
   * An account belonging to another user reports `not-found` rather than a
   * permission error, so the response does not confirm that the id exists.
   */
  static async unlinkGoogle(
    accountId: string,
    ownerId: string,
    auditContext: ServiceAuditContext
  ): Promise<UnlinkResult> {
    const account = await db.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== ownerId || account.provider !== "google") {
      return { ok: false, reason: "not-found" };
    }

    const [owner, otherGoogleCount] = await Promise.all([
      db.user.findUnique({ where: { id: ownerId } }),
      db.account.count({
        where: { userId: ownerId, provider: "google", id: { not: accountId } },
      }),
    ]);

    if (owner?.role === "SUPERADMIN" || owner?.passwordLocked) {
      return { ok: false, reason: "immutable-account" };
    }

    // The lockout guard. Removing this check makes the account unreachable.
    if (otherGoogleCount === 0 && !owner?.passwordHash) {
      return { ok: false, reason: "last-login-method" };
    }

    const email = account.email ?? account.providerAccountId;
    await db.account.delete({ where: { id: accountId } });

    await recordAudit({
      action: "GOOGLE_UNLINKED",
      entityType: "Account",
      entityId: accountId,
      summary: `Google account unlinked: ${email}`,
      context: auditContext,
    });

    return { ok: true, email };
  }
}
