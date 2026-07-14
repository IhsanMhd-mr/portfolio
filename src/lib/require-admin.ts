import { auth } from "./auth";
import { redirect } from "next/navigation";
import db from "./database";

const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export interface AdminContext {
  userId: string;
  sid: string;
  loginMethod: string;
  loginAccountId: string | null;
  mustChangePassword: boolean;
}

/**
 * Data-access layer authorization check. Call this in every Server Component,
 * Route Handler, and Server Action that touches admin data.
 *
 * Behaviour:
 *   1. Decodes the Auth.js JWT.
 *   2. Reads `sid` from the token.
 *   3. Validates the TrackedSession exists, is not revoked, and is not expired.
 *   4. Checks mustChangePassword and redirects to change-password if needed.
 *   5. Throttles lastSeenAt updates (max once per 5 minutes).
 *   6. Returns AdminContext for use by the caller.
 *
 * If any check fails it either redirects (server-side) or throws (API routes).
 */
export async function requireAdmin(options?: {
  /** Pass the current pathname so mustChangePassword redirect can be skipped on the password-change page itself. */
  pathname?: string;
  /** When true, throws a Response instead of calling redirect() — suitable for Route Handlers. */
  apiMode?: boolean;
}): Promise<AdminContext> {
  const session = await auth();
  const token = (session as any)?._token ?? session;
  const sid: string | undefined = (session?.user as any)?.sid;
  const userId: string | undefined = (session?.user as any)?.id;

  function deny(reason: string, redirectTo = "/admin/login") {
    if (options?.apiMode) {
      // For API routes, throw a Response that the caller should return
      throw new Response(JSON.stringify({ error: reason }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    redirect(`${redirectTo}?reason=${encodeURIComponent(reason)}`);
  }

  if (!sid || !userId) {
    deny("unauthenticated");
    throw new Error("unreachable"); // TypeScript narrowing
  }

  const tracked = await db.trackedSession.findUnique({ where: { sid } });

  if (!tracked) {
    deny("session-not-found");
    throw new Error("unreachable");
  }

  if (tracked.revokedAt) {
    deny("session-revoked");
    throw new Error("unreachable");
  }

  if (tracked.expiresAt < new Date()) {
    deny("session-expired");
    throw new Error("unreachable");
  }

  // Verify canonical owner still exists
  const owner = await db.user.findUnique({ where: { id: userId } });
  if (!owner) {
    deny("owner-not-found");
    throw new Error("unreachable");
  }

  // mustChangePassword enforcement
  const changePwPath = "/admin/settings/security/change-password";
  const currentPath = options?.pathname ?? "";
  if (owner.mustChangePassword && currentPath !== changePwPath && currentPath !== "/api/auth/logout") {
    if (options?.apiMode) {
      throw new Response(JSON.stringify({ error: "must-change-password", redirect: changePwPath }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    redirect(changePwPath);
    throw new Error("unreachable");
  }

  // Throttled lastSeenAt update
  const stale = tracked.lastSeenAt < new Date(Date.now() - LAST_SEEN_THROTTLE_MS);
  if (stale) {
    await db.trackedSession.update({
      where: { sid },
      data: { lastSeenAt: new Date() },
    });
  }

  return {
    userId: owner.id,
    sid,
    loginMethod: tracked.loginMethod,
    loginAccountId: tracked.accountId,
    mustChangePassword: owner.mustChangePassword,
  };
}

/**
 * Convenience: safely call requireAdmin in Route Handlers.
 * Returns { context } on success, or { response } if authorization fails.
 * 
 * Usage:
 *   const { context, response } = await safeRequireAdmin(request);
 *   if (response) return response;
 */
export async function safeRequireAdmin(request?: Request): Promise<
  | { context: AdminContext; response: null }
  | { context: null; response: Response }
> {
  try {
    const context = await requireAdmin({ apiMode: true });
    return { context, response: null };
  } catch (e) {
    if (e instanceof Response) return { context: null, response: e };
    return {
      context: null,
      response: new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
}
