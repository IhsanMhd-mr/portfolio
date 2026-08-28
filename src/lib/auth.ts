/**
 * auth.ts — Full NextAuth v5 configuration for the portfolio admin.
 *
 * Architecture:
 *  - JWT session strategy (cookie-based, Edge-compatible).
 *  - TrackedSession records stored in the database with a random `sid`.
 *  - The `sid` is embedded in the encrypted JWT.
 *  - requireAdmin() (lib/require-admin.ts) validates the sid against the DB
 *    on every protected request — enabling immediate session revocation.
 *  - Google identities resolve through Auth.js Account rows linked to one User.
 *    Unknown identities are redirected into explicit setup or ownership
 *    confirmation before any User or Account is persisted.
 */

import NextAuth, { CredentialsSignin } from "next-auth";
import { getToken } from "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import crypto from "crypto";
import db from "./database";
import { recordAudit } from "./audit";
import { requiresPasswordChange } from "./auth-policy";
import { CredentialAuthService } from "@/services/credential-auth.service";
import { GOOGLE_AUTH_INTENT_COOKIE, GoogleAuthService } from "@/services/google-auth.service";

// ─── Typed credential errors (surfaced to the client as `res.code`) ──────────

class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}
class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

// ─── IP extraction helper (only trust well-known proxy headers) ───────────────

function getTrustedClientIp(request: Request | undefined): string {
  if (!request) return "unknown";
  // In production behind a reverse proxy, trust X-Forwarded-For (first value only).
  // In development (localhost) this will be the direct socket address.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

// ─── Current-session lookup (used to detect a genuine Google account-link attempt) ─

/**
 * Reads the session cookie straight off the incoming OAuth-callback request and,
 * if it decodes to a still-valid TrackedSession, returns that user's id.
 *
 * This is what lets "+ Link Google Account" work: the browser completing the
 * OAuth round trip still carries the admin's existing session cookie the whole
 * time (same browser, same site), so we can recognize "the owner is currently
 * logged in and is deliberately linking a new account" without any custom
 * state/token machinery — Auth.js's own OAuth `state` param is not usable for
 * this (it's always overwritten with Auth.js's internal CSRF value).
 */
async function getValidAdminUserIdFromRequest(request: Request | undefined): Promise<string | null> {
  if (!request) return null;

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const token = await getToken({
    req: request,
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });
  const sid = token?.sid as string | undefined;
  const userId = token?.userId as string | undefined;
  if (!sid || !userId) return null;

  const tracked = await db.trackedSession.findUnique({ where: { sid } });
  if (!tracked || tracked.revokedAt || tracked.expiresAt < new Date()) return null;

  const owner = await db.user.findUnique({ where: { id: userId } });
  if (!owner || owner.status !== "ACTIVE" || !["ADMIN", "SUPERADMIN"].includes(owner.role)) {
    return null;
  }

  return owner.id;
}

function requestCookie(request: Request | undefined, name: string): string | null {
  const cookieHeader = request?.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

// ─── Lazy NextAuth factory (captures the incoming Request for IP/UA) ──────────

export const { handlers, auth, signIn, signOut } = NextAuth((request) => ({
  adapter: PrismaAdapter(db),

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      authorization: {
        params: { scope: "openid email profile" },
      },
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const identifier = credentials.email as string;
        const password = credentials.password as string;
        const ip = getTrustedClientIp(request);

        const result = await CredentialAuthService.authenticate(identifier, password, ip);
        if (!result.ok) {
          if (result.reason === "account-locked") throw new AccountLockedError();
          if (result.reason === "rate-limited") throw new RateLimitedError();
          return null;
        }
        const user = result.user;

        // Account lockout check
        // (lockedUntil field removed from User — now handled via LoginAttempt count)
        // 5 consecutive failures within 15 min = locked for 15 min
        // Return the user object — TrackedSession is created in jwt callback below
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * Google is accepted only with a provider-verified email. Linked identities
     * log in directly. Explicit ADMIN linking requires both a valid tracked
     * session and a matching short-lived intent. Other unknown identities are
     * staged and redirected before Auth.js can auto-create a User/Account.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const googleProfile = profile as
          | { email?: string; email_verified?: boolean; name?: string }
          | undefined;
        if (!googleProfile?.email || googleProfile.email_verified !== true) {
          await recordAudit({
            action: "LOGIN_FAILED",
            entityType: "User",
            summary: "Rejected Google authentication without a verified email.",
            context: {
              ipAddress: getTrustedClientIp(request),
              userAgent: request?.headers.get("user-agent") ?? null,
            },
          });
          return false;
        }

        const linked = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
          include: { user: true },
        });

        if (linked) {
          return linked.user.status === "ACTIVE" && linked.user.role !== "SUPERADMIN";
        }

        const rawIntent = requestCookie(request, GOOGLE_AUTH_INTENT_COOKIE);
        const intent = await GoogleAuthService.getActiveIntent(rawIntent);
        if (!intent) return false;

        if (intent.kind === "LINK") {
          const currentAdminUserId = await getValidAdminUserIdFromRequest(request);
          if (!currentAdminUserId || currentAdminUserId !== intent.userId) return false;
          const currentUser = await db.user.findUnique({ where: { id: currentAdminUserId } });
          if (currentUser?.role !== "ADMIN" || currentUser.status !== "ACTIVE") return false;
          return !!(await GoogleAuthService.stageExplicitLink({
            rawToken: rawIntent!,
            userId: currentAdminUserId,
            providerAccountId: account.providerAccountId,
            verifiedEmail: googleProfile.email,
          }));
        }

        const staged = await GoogleAuthService.stageLoginIdentity({
          rawToken: rawIntent!,
          providerAccountId: account.providerAccountId,
          verifiedEmail: googleProfile.email,
          displayName: googleProfile.name ?? user.name,
        });
        if (!staged) return false;
        return staged.state === "EXISTING_ACCOUNT"
          ? "/auth/google/link-account"
          : "/auth/google/complete-account";
      }
      return true;
    },

    /**
     * jwt callback — called on every JWT creation and refresh.
     * On initial sign-in (user object is present): create a TrackedSession and
     * embed the random `sid` in the encrypted JWT.
     */
    async jwt({ token, user, account, trigger: _trigger }) {
      const ip = getTrustedClientIp(request);
      const ua = request?.headers.get("user-agent") ?? null;

      if (user && account) {
        // Initial sign-in — generate sid and create TrackedSession
        const sid = crypto.randomUUID();
        const loginMethod = account.provider === "credentials" ? "LOCAL" : "GOOGLE";

        // Find accountId for Google logins (PrismaAdapter creates Account row before jwt callback)
        let accountId: string | null = null;
        if (loginMethod === "GOOGLE") {
          const acc = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: account.providerAccountId,
              },
            },
          });
          accountId = acc?.id ?? null;
          if (acc) {
            const rawIntent = requestCookie(request, GOOGLE_AUTH_INTENT_COOKIE);
            const intent = await GoogleAuthService.getActiveIntent(rawIntent);
            if (intent?.kind === "LINK") {
              await GoogleAuthService.completeExplicitLink(rawIntent!, acc.id);
            } else if (user.email && !acc.email) {
              await db.account.update({ where: { id: acc.id }, data: { email: user.email } });
            }
          }
        }

        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
        await db.trackedSession.create({
          data: {
            sid,
            userId: user.id!,
            loginMethod,
            accountId,
            ipAddress: ip,
            userAgent: ua,
            expiresAt,
          },
        });

        // Audit the login
        await recordAudit({
          action: "LOGIN_SUCCESS",
          entityType: "User",
          entityId: user.id,
          summary: `Owner logged in via ${loginMethod}`,
          context: {
            actorId: user.id,
            loginMethod,
            loginAccountId: accountId,
            ipAddress: ip,
            userAgent: ua,
          },
        });

        // Store in token
        token.sid = sid;
        token.userId = user.id;
        token.loginMethod = loginMethod;
        token.loginAccountId = accountId;
        token.role = (user as any).role;
        token.mustChangePassword = requiresPasswordChange(
          (user as any).mustChangePassword ?? false,
          loginMethod
        );
      }

      return token;
    },

    /**
     * session callback — maps JWT fields to the session object for client components.
     */
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.userId ?? token.sub;
        (session.user as any).sid = token.sid;
        (session.user as any).loginMethod = token.loginMethod;
        (session.user as any).loginAccountId = token.loginAccountId;
        (session.user as any).role = token.role;
        (session.user as any).mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
}));

// ─── Legacy compatibility helpers ─────────────────────────────────────────────

export interface UserSession {
  user: {
    id: string;
    email: string;
    sid: string;
    loginMethod: string;
    loginAccountId: string | null;
    mustChangePassword: boolean;
    role: string;
  };
}

/** Use requireAdmin() in new code instead. */
export async function getServerSession(): Promise<UserSession | null> {
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user as any;
  return {
    user: {
      id: u.id,
      email: session.user.email as string,
      sid: u.sid,
      loginMethod: u.loginMethod ?? "LOCAL",
      loginAccountId: u.loginAccountId ?? null,
      mustChangePassword: u.mustChangePassword ?? false,
      role: u.role ?? "USER",
    },
  };
}

/** Clears Auth.js cookies to force browser logout (use after revoking a session). */
import { cookies } from "next/headers";
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  const names = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];
  for (const name of names) {
    cookieStore.delete(name);
  }
}

/** Legacy alias */
export async function deleteSession() {
  await clearAuthCookies();
}
