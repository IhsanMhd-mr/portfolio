import crypto from "crypto";
import db from "@/lib/database";
import { normalizeEmail, safeInternalPath, validatePasswordConfirmation, validateUsername } from "@/lib/account-identity";
import { hashPassword, verifyPassword } from "@/lib/password";
import { recordAudit, type AuditContext } from "@/lib/audit";

export const GOOGLE_AUTH_INTENT_COOKIE = "portfolio.google-auth-intent";
const INTENT_TTL_MS = 10 * 60 * 1000;
const MAX_CONFIRMATION_ATTEMPTS = 5;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export type GoogleIntentKind = "LOGIN" | "LINK";

export class GoogleAuthService {
  static async createIntent(kind: GoogleIntentKind, userId: string | null, callbackUrl: unknown) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    await db.accountLinkIntent.create({
      data: {
        kind,
        userId,
        tokenHash: hashToken(rawToken),
        callbackUrl: safeInternalPath(callbackUrl),
        expiresAt: new Date(Date.now() + INTENT_TTL_MS),
      },
    });
    return rawToken;
  }

  static async getActiveIntent(rawToken: string | null | undefined) {
    if (!rawToken) return null;
    const intent = await db.accountLinkIntent.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (!intent || intent.completedAt || intent.expiresAt <= new Date()) return null;
    return intent;
  }

  /** Stores only the verified identity required to finish setup/linking. */
  static async stageLoginIdentity(input: {
    rawToken: string;
    providerAccountId: string;
    verifiedEmail: string;
    displayName?: string | null;
  }) {
    const intent = await this.getActiveIntent(input.rawToken);
    if (!intent || intent.kind !== "LOGIN") return null;

    const emailNormalized = normalizeEmail(input.verifiedEmail);
    const existingUser = await db.user.findUnique({ where: { emailNormalized } });
    const state = existingUser ? "EXISTING_ACCOUNT" : "NEW_ACCOUNT";

    return db.accountLinkIntent.update({
      where: { id: intent.id },
      data: {
        state,
        userId: existingUser?.id ?? null,
        providerAccountId: input.providerAccountId,
        verifiedEmail: emailNormalized,
        displayName: input.displayName?.trim() || null,
      },
    });
  }

  static async stageExplicitLink(input: {
    rawToken: string;
    userId: string;
    providerAccountId: string;
    verifiedEmail: string;
  }) {
    const intent = await this.getActiveIntent(input.rawToken);
    if (!intent || intent.kind !== "LINK" || intent.userId !== input.userId) return null;
    return db.accountLinkIntent.update({
      where: { id: intent.id },
      data: {
        providerAccountId: input.providerAccountId,
        verifiedEmail: normalizeEmail(input.verifiedEmail),
      },
    });
  }

  static async completeExplicitLink(rawToken: string, accountId: string) {
    const intent = await this.getActiveIntent(rawToken);
    if (!intent || intent.kind !== "LINK" || !intent.verifiedEmail) return;
    await db.$transaction([
      db.account.update({ where: { id: accountId }, data: { email: intent.verifiedEmail } }),
      db.accountLinkIntent.update({ where: { id: intent.id }, data: { completedAt: new Date() } }),
    ]);
  }

  static async completionDetails(rawToken: string | null | undefined) {
    const intent = await this.getActiveIntent(rawToken);
    if (!intent || intent.kind !== "LOGIN" || intent.state === "STARTED") return null;
    return {
      state: intent.state,
      email: intent.verifiedEmail,
      callbackUrl: safeInternalPath(intent.callbackUrl),
    };
  }

  static async completeNewAccount(input: {
    rawToken: string;
    username: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ ok: true; callbackUrl: string } | { ok: false; reason: string }> {
    const intent = await this.getActiveIntent(input.rawToken);
    if (
      !intent ||
      intent.kind !== "LOGIN" ||
      intent.state !== "NEW_ACCOUNT" ||
      !intent.providerAccountId ||
      !intent.verifiedEmail
    ) {
      return { ok: false, reason: "invalid-or-expired" };
    }

    const username = input.username.trim();
    const usernameError = validateUsername(username);
    if (usernameError) return { ok: false, reason: usernameError };
    const passwordError = validatePasswordConfirmation(input.password, input.confirmPassword);
    if (passwordError) return { ok: false, reason: passwordError };

    const passwordHash = await hashPassword(input.password);
    try {
      await db.$transaction(async (tx) => {
        const providerExists = await tx.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: intent.providerAccountId!,
            },
          },
        });
        if (providerExists) throw new Error("google-already-linked");

        const emailExists = await tx.user.findUnique({
          where: { emailNormalized: intent.verifiedEmail! },
        });
        if (emailExists) throw new Error("email-already-exists");

        const user = await tx.user.create({
          data: {
            username,
            email: intent.verifiedEmail!,
            emailNormalized: intent.verifiedEmail!,
            emailVerified: new Date(),
            name: intent.displayName || username,
            passwordHash,
            role: "USER",
            status: "ACTIVE",
          },
        });
        await tx.account.create({
          data: {
            userId: user.id,
            provider: "google",
            providerAccountId: intent.providerAccountId!,
            type: "oauth",
            email: intent.verifiedEmail!,
          },
        });
        await tx.accountLinkIntent.update({
          where: { id: intent.id },
          data: { userId: user.id, completedAt: new Date() },
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "google-already-linked") {
        return { ok: false, reason: "This Google identity is already linked." };
      }
      if (message === "email-already-exists") {
        return { ok: false, reason: "An account with this email already exists. Restart Google sign-in to link it." };
      }
      if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
        return { ok: false, reason: "That username is already in use." };
      }
      throw error;
    }

    return { ok: true, callbackUrl: safeInternalPath(intent.callbackUrl) };
  }

  static async confirmExistingAccount(
    rawToken: string,
    currentPassword: string,
    auditContext: AuditContext
  ): Promise<{ ok: true; callbackUrl: string } | { ok: false; reason: string }> {
    const intent = await this.getActiveIntent(rawToken);
    if (
      !intent ||
      intent.kind !== "LOGIN" ||
      intent.state !== "EXISTING_ACCOUNT" ||
      !intent.userId ||
      !intent.providerAccountId ||
      !intent.verifiedEmail
    ) {
      return { ok: false, reason: "invalid-or-expired" };
    }
    if (intent.attemptCount >= MAX_CONFIRMATION_ATTEMPTS) {
      return { ok: false, reason: "too-many-attempts" };
    }

    const user = await db.user.findUnique({ where: { id: intent.userId } });
    if (!user || user.status !== "ACTIVE" || user.role === "SUPERADMIN" || !user.passwordHash) {
      return { ok: false, reason: "not-linkable" };
    }

    const passwordMatches = await verifyPassword(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      await db.accountLinkIntent.update({
        where: { id: intent.id },
        data: { attemptCount: { increment: 1 } },
      });
      return { ok: false, reason: "invalid-credentials" };
    }

    try {
      await db.$transaction(async (tx) => {
        const latest = await tx.accountLinkIntent.findUniqueOrThrow({ where: { id: intent.id } });
        if (latest.completedAt || latest.expiresAt <= new Date()) throw new Error("invalid-or-expired");
        await tx.account.create({
          data: {
            userId: user.id,
            provider: "google",
            providerAccountId: intent.providerAccountId!,
            type: "oauth",
            email: intent.verifiedEmail!,
          },
        });
        await tx.user.update({
          where: { id: user.id },
          data: { emailVerified: user.emailVerified ?? new Date() },
        });
        await tx.accountLinkIntent.update({
          where: { id: intent.id },
          data: { completedAt: new Date() },
        });
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
        return { ok: false, reason: "already-linked" };
      }
      if (error instanceof Error && error.message === "invalid-or-expired") {
        return { ok: false, reason: error.message };
      }
      throw error;
    }

    await recordAudit({
      action: "GOOGLE_LINKED",
      entityType: "Account",
      entityId: user.id,
      summary: "Google identity linked after current-password ownership confirmation.",
      context: { ...auditContext, actorId: user.id },
    });
    return { ok: true, callbackUrl: safeInternalPath(intent.callbackUrl) };
  }

  static async cleanExpiredIntents() {
    return db.accountLinkIntent.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { completedAt: { not: null } }] },
    });
  }
}
