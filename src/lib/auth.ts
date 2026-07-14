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

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import crypto from "crypto";
import db from "./database";
import { verifyPassword } from "./password";
import { recordAudit } from "./audit";

// ─── Rate-limiting helpers ────────────────────────────────────────────────────

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function assertNotRateLimited(email: string, ip: string) {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const attempts = await db.loginAttempt.count({
    where: {
      OR: [{ emailHash: sha256(email) }, { ipHash: sha256(ip) }],
      success: false,
      createdAt: { gte: fifteenMinutesAgo },
    },
  });
  if (attempts >= 10) throw new Error("RATE_LIMITED");
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
          throw new Error("ACCOUNT_LOCKED");
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
     * For Google: reject any providerAccountId not already linked to the owner.
     * Auth.js adapter will create Account rows automatically for credentials logins.
     */
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Check that this exact Google subject is already linked to the canonical owner
        const linked = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
        });
        if (!linked) {
          // Unknown Google account — reject silently, log the attempt
          const ip = getTrustedClientIp(request);
          await recordAudit({
            action: "LOGIN_FAILED",
            entityType: "User",
            summary: `Rejected unknown Google account: ${user.email ?? "unknown"} (sub: ${account.providerAccountId})`,
            context: { ipAddress: ip, userAgent: request?.headers.get("user-agent") ?? null },
          });
          return false;
        }
      }
      return true;
    },

    /**
     * jwt callback — called on every JWT creation and refresh.
     * On initial sign-in (user object is present): create a TrackedSession and
     * embed the random `sid` in the encrypted JWT.
     */
    async jwt({ token, user, account, trigger }) {
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
