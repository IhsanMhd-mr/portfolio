/**
 * auth-config.ts — Edge-compatible (no Node.js modules) NextAuth config.
 *
 * Used exclusively by proxy.ts for optimistic JWT validation.
 * Does NOT perform any database access — that is done by requireAdmin().
 */

import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";

export const authConfig = {
  providers: [], // Must remain empty — no Node.js modules allowed in Edge
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours — must match auth.ts
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    /**
     * Optimistic check: is the JWT present and valid?
     * Does NOT verify TrackedSession revocation — requireAdmin() does that.
     */
    authorized({ auth }) {
      return !!auth?.user;
    },
    async jwt({ token, user, account }) {
      // Mirror fields from auth.ts jwt callback so client session is consistent
      if (user) {
        token.userId = user.id;
        token.mustChangePassword = (user as any).mustChangePassword ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.userId ?? token.sub;
        (session.user as any).sid = token.sid;
        (session.user as any).loginMethod = token.loginMethod;
        (session.user as any).mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { auth: edgeAuth } = NextAuth(authConfig);
