/**
 * auth.ts — Full NextAuth v5 configuration for the portfolio admin.
 *
 * Architecture:
 *  - JWT session strategy (cookie-based, Edge-compatible).
 *  - TrackedSession records stored in the database with a random `sid`.
 *  - The `sid` is embedded in the encrypted JWT.
 *  - requireAdmin() (lib/require-admin.ts) validates the sid against the DB
 *    on every protected request — enabling immediate session revocation.
 *  - Google sign-in only succeeds if the providerAccountId is already linked
 *    to the canonical owner (via Account table). Unknown Google accounts are
 *    rejected before a session is created.
 */

import NextAuth, { CredentialsSignin } from "next-auth";
import { getToken } from "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import crypto from "crypto";
import db from "./database";
import { verifyPassword } from "./password";
import { recordAudit } from "./audit";

// ─── Typed credential errors (surfaced to the client as `res.code`) ──────────

class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}
class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

// ─── Rate-limiting helpers ────────────────────────────────────────────────────

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Failure ceilings are counted separately per identifier and per IP.
 *
 * A single OR'd counter would mean one admin's failed attempts lock out every
 * other admin behind the same IP/NAT — harmless when there was only ever one
 * account, a real cross-user lockout once there are two. Splitting them keeps
 * the targeted-account limit tight while leaving enough headroom for several
 * people on one network; the IP ceiling still stops credential spraying across
 * many usernames from one source.
 */
const MAX_FAILURES_PER_IDENTIFIER = 10;
const MAX_FAILURES_PER_IP = 30;

async function assertNotRateLimited(email: string, ip: string) {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const [identifierFailures, ipFailures] = await Promise.all([
    db.loginAttempt.count({
      where: { emailHash: sha256(email), success: false, createdAt: { gte: fifteenMinutesAgo } },
    }),
    db.loginAttempt.count({
      where: { ipHash: sha256(ip), success: false, createdAt: { gte: fifteenMinutesAgo } },
    }),
  ]);
  if (identifierFailures >= MAX_FAILURES_PER_IDENTIFIER) throw new RateLimitedError();
  if (ipFailures >= MAX_FAILURES_PER_IP) throw new RateLimitedError();
}

async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  await db.loginAttempt.create({
    data: { emailHash: sha256(email), ipHash: sha256(ip), success },
  });
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
  if (!owner) return null;

  return owner.id;
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

        // Rate-limit check
        await assertNotRateLimited(identifier, ip);

        // Look up by email OR username
        const user = await db.user.findFirst({
          where: {
            OR: [{ email: identifier }, { username: identifier }],
          },
        });

        if (!user || !user.passwordHash) {
          // Constant-time dummy check to prevent timing attacks
          await verifyPassword(password, "pbkdf2sha256:600000:dummysalt:dummyhash");
          await recordLoginAttempt(identifier, ip, false);
          return null;
        }

        // Account lockout check
        // (lockedUntil field removed from User — now handled via LoginAttempt count)
        // 5 consecutive failures within 15 min = locked for 15 min
        const recentFailures = await db.loginAttempt.count({
          where: {
            emailHash: sha256(identifier),
            success: false,
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        });
        if (recentFailures >= 5) {
          throw new AccountLockedError();
        }

        const isMatch = await verifyPassword(password, user.passwordHash);
        if (!isMatch) {
          await recordLoginAttempt(identifier, ip, false);
          return null;
        }

        await recordLoginAttempt(identifier, ip, true);
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Return the user object — TrackedSession is created in jwt callback below
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * signIn callback — only controls whether the sign-in is allowed.
     *
     * For Google, two cases are legitimate:
     *  1. The providerAccountId is already linked to the owner (an ordinary
     *     "Continue with Google" login by a previously-linked account).
     *  2. There's no link yet, but the browser completing this OAuth round trip
     *     already carries a VALID admin session cookie — i.e. the owner is
     *     currently logged in and clicked "Link Google Account". Auth.js's
     *     PrismaAdapter (see handleLoginOrRegister in @auth/core) natively
     *     auto-links a new OAuth account to the CURRENT session's user when one
     *     is present — no custom token/state plumbing needed or possible (Auth.js
     *     always overwrites any custom `state` query param with its own CSRF
     *     value before redirecting to the provider, so passing a link token
     *     through `state` cannot work).
     *
     * Anything else — an unlinked Google account with no current admin session —
     * is an unknown account trying to self-register as owner. Reject it.
     */
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const linked = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (!linked) {
          const currentAdminUserId = await getValidAdminUserIdFromRequest(request);
          if (!currentAdminUserId) {
            // Unknown Google account, no active admin session — reject silently, log the attempt
            const ip = getTrustedClientIp(request);
            await recordAudit({
              action: "LOGIN_FAILED",
              entityType: "User",
              summary: `Rejected unknown Google account: ${user.email ?? "unknown"} (sub: ${account.providerAccountId})`,
              context: { ipAddress: ip, userAgent: request?.headers.get("user-agent") ?? null },
            });
            return false;
          }
          // Valid admin session present — this is a genuine link attempt. Auth.js's
          // adapter will auto-link this account to that same session's user.
        }
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
        token.mustChangePassword = (user as any).mustChangePassword ?? false;
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
