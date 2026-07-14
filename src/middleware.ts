import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "portfolio_session";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isLogged = !!token;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  
  if (searchParams.get("preview") === "true") {
    requestHeaders.set("x-preview", "true");
  }

  // Admin routes checks
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (isLogged) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    if (!isLogged) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    if (pathname === "/admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/"],
};
