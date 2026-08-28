import { cache } from "react";
import { auth, clearAuthCookies } from "./auth";
import { redirect } from "next/navigation";
import db from "./database";
import { requiresPasswordChange } from "./auth-policy";

const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export interface AdminContext {
  userId: string;
  /**
   * The owner's email. Included because the full user row is already loaded to
   * validate the session — the admin layout was issuing a second
   * `db.user.findUnique` for this one field.
   */
  email: string;
  username: string;
  role: "ADMIN" | "SUPERADMIN";
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
 *
 * Wrapped in React `cache()` so repeated calls with the same arguments within
 * a single request (e.g. the admin layout and the page it wraps both calling
 * this) resolve once instead of re-querying TrackedSession/User each time.
 * The cache is strictly request-scoped (React's per-request cache() semantics)
 * — it never persists across requests or users. `pathname` is a real argument
 * (not folded into a shared options object) specifically so it stays part of
 * the cache key, since it changes the mustChangePassword redirect behavior.
 */
export const requireAdmin = cache(async function requireAdmin(
  /** Pass the current pathname so mustChangePassword redirect can be skipped on the password-change page itself. */
  pathname?: string,
  /** When true, throws a Response instead of calling redirect() — suitable for Route Handlers. */
  apiMode?: boolean
): Promise<AdminContext> {
  const session = await auth();
  const sid: string | undefined = (session?.user as any)?.sid;
  const userId: string | undefined = (session?.user as any)?.id;

  /**
   * On any failure below, the caller may still be holding an Auth.js cookie
   * that *decrypts fine* (proxy.ts only checks JWT presence, not
   * TrackedSession validity) even though the deep check here says the
   * session is invalid. A plain redirect("/admin/login") from a Server
   * Component can't clear that cookie (cookies() can't be mutated during
   * render), so proxy.ts would see "still logged in" on /admin/login and
   * bounce the request straight back — an infinite redirect loop.
   *
   * Fix: always redirect through the force-logout Route Handler, which CAN
   * clear the cookie before redirecting to /admin/login for real.
   */
  async function deny(reason: string): Promise<never> {
    if (apiMode) {
      // Route Handlers/Server Actions CAN mutate cookies directly.
      await clearAuthCookies();
      throw new Response(JSON.stringify({ error: reason }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    redirect(`/api/auth/force-logout?reason=${encodeURIComponent(reason)}`);
  }

  if (!sid || !userId) {
    await deny("unauthenticated");
    throw new Error("unreachable"); // TypeScript narrowing
  }

  const tracked = await db.trackedSession.findUnique({ where: { sid } });

  if (!tracked) {
    await deny("session-not-found");
    throw new Error("unreachable");
  }

  if (tracked.revokedAt) {
    await deny("session-revoked");
    throw new Error("unreachable");
  }

  if (tracked.expiresAt < new Date()) {
    await deny("session-expired");
    throw new Error("unreachable");
  }

  // Resolve authorization from the canonical account, never from OAuth email.
  const owner = await db.user.findUnique({ where: { id: userId } });
  if (!owner) {
    await deny("owner-not-found");
    throw new Error("unreachable");
  }
  if (owner.status !== "ACTIVE") {
    await deny("account-disabled");
    throw new Error("unreachable");
  }
  if (owner.role !== "ADMIN" && owner.role !== "SUPERADMIN") {
    await deny("admin-required");
    throw new Error("unreachable");
  }

  // Temporary-password rotation applies only to a session authenticated with
  // that password. Google sessions remain valid independent login methods.
  const changePwPath = "/admin/settings/security/change-password";
  const currentPath = pathname ?? "";
  const mustChangePassword = requiresPasswordChange(
    owner.mustChangePassword,
    tracked.loginMethod
  );
  if (mustChangePassword && currentPath !== changePwPath && currentPath !== "/api/auth/logout") {
    if (apiMode) {
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
    email: owner.email,
    username: owner.username,
    role: owner.role,
    sid,
    loginMethod: tracked.loginMethod,
    loginAccountId: tracked.accountId,
    mustChangePassword,
  };
});

/**
 * Non-throwing owner check for PUBLIC pages, where an unauthenticated guest is
 * the expected common case (so redirect/throw would be wrong).
 *
 * Returns the AdminContext when the caller is the canonical owner with a VALID
 * tracked session (exists, not revoked, not expired) — otherwise null. This
 * validates against TrackedSession, so a revoked/expired session carrying a
 * stale JWT is treated as a guest and will NOT see owner-only UI.
 *
 * Use to conditionally render owner-only elements on public pages. Because it
 * runs in a Server Component, gated JSX is simply omitted from the response for
 * guests — never shipped and hidden client-side.
 */
export async function getValidatedOwner(): Promise<AdminContext | null> {
  const session = await auth();
  const sid: string | undefined = (session?.user as any)?.sid;
  const userId: string | undefined = (session?.user as any)?.id;
  if (!sid || !userId) return null;

  const tracked = await db.trackedSession.findUnique({ where: { sid } });
  if (!tracked || tracked.revokedAt || tracked.expiresAt < new Date()) return null;

  const owner = await db.user.findUnique({ where: { id: userId } });
  if (
    !owner ||
    owner.status !== "ACTIVE" ||
    (owner.role !== "ADMIN" && owner.role !== "SUPERADMIN")
  ) return null;

  const mustChangePassword = requiresPasswordChange(
    owner.mustChangePassword,
    tracked.loginMethod
  );

  return {
    userId: owner.id,
    email: owner.email,
    username: owner.username,
    role: owner.role,
    sid,
    loginMethod: tracked.loginMethod,
    loginAccountId: tracked.accountId,
    mustChangePassword,
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
export async function safeRequireAdmin(
  request?: Request,
  options?: { pathname?: string }
): Promise<
  | { context: AdminContext; response: null }
  | { context: null; response: Response }
> {
  try {
    const context = await requireAdmin(options?.pathname, true);
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
