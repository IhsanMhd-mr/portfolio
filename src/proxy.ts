/**
 * proxy.ts — Next.js 16 Proxy (formerly middleware.ts)
 *
 * Purpose: FAST OPTIMISTIC check only.
 *   - Validates that the Auth.js JWT cookie exists and has not expired.
 *   - Redirects unauthenticated visitors away from /admin routes.
 *   - Does NOT check TrackedSession revocation — requireAdmin() does that.
 *
 * requireAdmin() in lib/require-admin.ts performs the deep database check.
 */

import { edgeAuth } from "@/lib/auth-config";
import { NextResponse } from "next/server";

export default edgeAuth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Forward useful headers to Server Components
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  // NOTE: an `x-preview` header used to be set here from `?preview=true`. The
  // draft-preview feature has since been removed entirely — the public site
  // renders published content only, so there is nothing for it to unlock.

  const isLogin = pathname === "/admin/login";
  const isOnAdmin = pathname.startsWith("/admin");
  const isLoggedIn = !!session?.user;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = isLoggedIn && (role === "ADMIN" || role === "SUPERADMIN");

  if (isOnAdmin) {
    // Already logged in + on login page → go to dashboard
    if (isLogin) {
      if (isAdmin) {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Not authenticated → redirect to login
    if (!isAdmin) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    // /admin root → dashboard
    if (pathname === "/admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: ["/admin/:path*", "/"],
};
