import { NextResponse } from "next/server";
import { auth, clearAuthCookies } from "@/lib/auth";
import db from "@/lib/database";

/**
 * GET /api/auth/force-logout?reason=...
 *
 * Breaks the redirect loop that occurs when a TrackedSession is revoked
 * server-side (e.g. password change, manual revoke, `initialize --reset`)
 * while the browser still holds a JWT that decrypts fine. Without this,
 * requireAdmin() would redirect() to /admin/login (a Server Component
 * cannot mutate cookies), the still-valid-looking JWT would make the
 * fast-path proxy.ts treat the user as logged in on /admin/login, and it
 * would bounce straight back to /admin/dashboard — forever.
 *
 * This is a Route Handler, so it CAN clear cookies before redirecting,
 * which actually breaks the loop.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reason = url.searchParams.get("reason") || "session-invalid";

  try {
    const session = await auth();
    const sid: string | undefined = (session?.user as any)?.sid;
    if (sid) {
      // Best-effort — already revoked/missing is fine, this just ensures
      // consistency if we got here via expiry rather than an explicit revoke.
      await db.trackedSession.updateMany({
        where: { sid, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: reason },
      });
    }
  } catch (error) {
    // Fail open on the DB side — clearing the cookie below is what actually
    // matters for breaking the loop; don't let a DB hiccup block that.
    console.error("force-logout: failed to revoke tracked session:", error);
  }

  await clearAuthCookies();

  return NextResponse.redirect(new URL(`/admin/login?reason=${encodeURIComponent(reason)}`, request.url));
}
