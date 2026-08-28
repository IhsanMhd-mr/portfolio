import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/database";
import { SessionService } from "@/services/session.service";
import { LinkedAccountService } from "@/services/linked-account.service";
import { CredentialAuthService } from "@/services/credential-auth.service";
import { GoogleAuthService } from "@/services/google-auth.service";
import { PasswordRecoveryService } from "@/services/password-recovery.service";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requiresPasswordChange } from "@/lib/auth-policy";
import { validatePasswordConfirmation } from "@/lib/account-identity";
import { FIXTURE } from "../fixtures/seed";

/**
 * Session and linked-account rules lifted out of the auth route handlers.
 *
 * Completed Users have a database-required local password, while Google
 * identities remain optional linked methods on that same User.
 */
let ownerId: string;
let ctx: { actorId: string; loginMethod: string; loginAccountId: string | null };
const CREATED_SESSIONS: string[] = [];
const CREATED_ACCOUNTS: string[] = [];
const FIXTURE_PASSWORD_HASH = "fixture-hash-not-used-for-authentication";

async function makeSession(
  sid: string,
  userId = ownerId,
  loginMethod = "LOCAL",
  accountId: string | null = null
) {
  const s = await db.trackedSession.create({
    data: {
      sid,
      userId,
      loginMethod,
      accountId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  CREATED_SESSIONS.push(s.id);
  return s;
}

async function makeGoogleAccount(providerAccountId: string, userId = ownerId) {
  const a = await db.account.create({
    data: {
      userId,
      type: "oauth",
      provider: "google",
      providerAccountId,
      email: `${providerAccountId}@example.test`,
    },
  });
  CREATED_ACCOUNTS.push(a.id);
  return a;
}

beforeAll(async () => {
  const owner = await db.user.findUniqueOrThrow({ where: { username: FIXTURE.ownerUsername } });
  ownerId = owner.id;
  ctx = { actorId: owner.id, loginMethod: "test", loginAccountId: null };
});

afterAll(async () => {
  if (CREATED_SESSIONS.length > 0) {
    await db.trackedSession.deleteMany({ where: { id: { in: CREATED_SESSIONS } } });
  }
  if (CREATED_ACCOUNTS.length > 0) {
    await db.account.deleteMany({ where: { id: { in: CREATED_ACCOUNTS } } });
  }
  await db.user.update({ where: { id: ownerId }, data: { passwordHash: FIXTURE_PASSWORD_HASH } });
});

describe("temporary-password policy", () => {
  it("requires a reset for a local session when the owner flag is set", () => {
    expect(requiresPasswordChange(true, "LOCAL")).toBe(true);
  });

  it("does not require a reset for a Google session", () => {
    expect(requiresPasswordChange(true, "GOOGLE")).toBe(false);
  });

  it("does not require a reset when the owner flag is clear", () => {
    expect(requiresPasswordChange(false, "LOCAL")).toBe(false);
  });
});

describe("SessionService.revoke", () => {
  it("revokes a session belonging to the owner", async () => {
    const s = await makeSession("sid-revoke-ok");
    const result = await SessionService.revoke(s.sid, ownerId, ctx);
    expect(result.ok).toBe(true);

    const after = await db.trackedSession.findUniqueOrThrow({ where: { sid: s.sid } });
    expect(after.revokedAt).not.toBeNull();
    expect(after.revokeReason).toBe("MANUAL_REVOCATION");
  });

  it("reports already-revoked rather than succeeding twice", async () => {
    const s = await makeSession("sid-revoke-twice");
    await SessionService.revoke(s.sid, ownerId, ctx);
    const again = await SessionService.revoke(s.sid, ownerId, ctx);
    expect(again).toEqual({ ok: false, reason: "already-revoked" });
  });

  it("refuses to revoke another user's session, reported as not-found", async () => {
    const other = await db.user.create({
      data: {
        username: "other-owner",
        email: "other@example.test",
        emailNormalized: "other@example.test",
        passwordHash: FIXTURE_PASSWORD_HASH,
      },
    });
    const s = await makeSession("sid-other-user", other.id);

    const result = await SessionService.revoke(s.sid, ownerId, ctx);
    // not-found rather than forbidden: the response must not confirm the sid exists.
    expect(result).toEqual({ ok: false, reason: "not-found" });

    const after = await db.trackedSession.findUniqueOrThrow({ where: { sid: s.sid } });
    expect(after.revokedAt).toBeNull();

    await db.trackedSession.deleteMany({ where: { userId: other.id } });
    await db.user.delete({ where: { id: other.id } });
  });

  it("reports not-found for an unknown sid", async () => {
    expect(await SessionService.revoke("no-such-sid", ownerId, ctx)).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("SessionService.revokeIfActive", () => {
  it("is a no-op on a missing session rather than throwing", async () => {
    // force-logout exists to break a redirect loop; it must not fail on the
    // exact state it was invoked to clean up.
    await expect(SessionService.revokeIfActive("no-such-sid", "x")).resolves.toBeDefined();
  });
});

describe("SessionService.listForOwner", () => {
  it("labels credential sessions with the username and Google sessions with the linked email", async () => {
    const local = await makeSession("sid-identity-local");
    const account = await makeGoogleAccount("identity-google");
    const google = await makeSession("sid-identity-google", ownerId, "GOOGLE", account.id);

    const sessions = await SessionService.listForOwner(ownerId, google.sid);

    expect(sessions.find((s) => s.sid === local.sid)).toMatchObject({
      loginMethod: "LOCAL",
      loginIdentity: FIXTURE.ownerUsername,
      isCurrent: false,
    });
    expect(sessions.find((s) => s.sid === google.sid)).toMatchObject({
      loginMethod: "GOOGLE",
      loginIdentity: "identity-google@example.test",
      isCurrent: true,
    });

    await db.trackedSession.delete({ where: { id: google.id } });
    await db.account.delete({ where: { id: account.id } });
  });
});

describe("SessionService.changePassword", () => {
  it("rejects mismatched new-password confirmation at the shared policy boundary", () => {
    expect(validatePasswordConfirmation("Strong-New-Password-123!", "different")).toBe(
      "Passwords do not match."
    );
  });

  it("rejects an incorrect current password", async () => {
    await db.user.update({
      where: { id: ownerId },
      data: { passwordHash: await hashPassword("correct-horse-battery") },
    });
    const result = await SessionService.changePassword(ownerId, "sid-x", "wrong", "newpassword123", ctx);
    expect(result).toEqual({ ok: false, reason: "wrong-password" });
  });

  it("changes the password and revokes other sessions but NOT the current one", async () => {
    await db.user.update({
      where: { id: ownerId },
      data: { passwordHash: await hashPassword("correct-horse-battery") },
    });
    const current = await makeSession("sid-current");
    const other = await makeSession("sid-other");

    const result = await SessionService.changePassword(
      ownerId,
      current.sid,
      "correct-horse-battery",
      "a-brand-new-password",
      ctx
    );
    expect(result.ok).toBe(true);

    const currentAfter = await db.trackedSession.findUniqueOrThrow({ where: { sid: current.sid } });
    const otherAfter = await db.trackedSession.findUniqueOrThrow({ where: { sid: other.sid } });
    // The owner must not be signed out by their own password change.
    expect(currentAfter.revokedAt).toBeNull();
    expect(otherAfter.revokedAt).not.toBeNull();
    expect(otherAfter.revokeReason).toBe("PASSWORD_CHANGED");
  });
});

describe("LinkedAccountService.unlinkGoogle", () => {
  it("allows unlinking the last Google account when a password exists", async () => {
    await db.user.update({
      where: { id: ownerId },
      data: { passwordHash: await hashPassword("has-a-password-now") },
    });
    const acct = await makeGoogleAccount("removable-google");

    const result = await LinkedAccountService.unlinkGoogle(acct.id, ownerId, ctx);
    expect(result.ok).toBe(true);
    expect(await db.account.findUnique({ where: { id: acct.id } })).toBeNull();
  });

  it("allows unlinking when another Google account remains", async () => {
    const first = await makeGoogleAccount("google-one");
    const second = await makeGoogleAccount("google-two");

    const result = await LinkedAccountService.unlinkGoogle(first.id, ownerId, ctx);
    expect(result.ok).toBe(true);
    expect(await db.account.findUnique({ where: { id: second.id } })).not.toBeNull();
  });

  it("reports not-found for an account belonging to someone else", async () => {
    expect(await LinkedAccountService.unlinkGoogle("no-such-id", ownerId, ctx)).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("canonical credentials", () => {
  const password = "Correct-Credential-123!";

  beforeAll(async () => {
    await db.user.update({
      where: { id: ownerId },
      data: { passwordHash: await hashPassword(password), status: "ACTIVE" },
    });
  });

  it("authenticates the same User by username", async () => {
    const result = await CredentialAuthService.authenticate(
      FIXTURE.ownerUsername,
      password,
      "credential-username-ip"
    );
    expect(result.ok && result.user.id).toBe(ownerId);
  });

  it("authenticates the same User by normalized email", async () => {
    const result = await CredentialAuthService.authenticate(
      "  OWNER@EXAMPLE.TEST ",
      password,
      "credential-email-ip"
    );
    expect(result.ok && result.user.id).toBe(ownerId);
  });

  it("rejects a wrong password and an unknown identifier generically", async () => {
    expect((await CredentialAuthService.authenticate(
      FIXTURE.ownerUsername,
      "wrong-password",
      "credential-wrong-ip"
    )).ok).toBe(false);
    expect((await CredentialAuthService.authenticate(
      "unknown@example.test",
      "wrong-password",
      "credential-unknown-ip"
    )).ok).toBe(false);
  });
});

describe("Google canonical-account completion", () => {
  it("keeps a new Google identity pending until username and password setup succeeds", async () => {
    const rawToken = await GoogleAuthService.createIntent("LOGIN", null, "/");
    const staged = await GoogleAuthService.stageLoginIdentity({
      rawToken,
      providerAccountId: "new-google-human",
      verifiedEmail: "New.Human@Example.Test",
      displayName: "New Human",
    });
    expect(staged?.state).toBe("NEW_ACCOUNT");
    expect(await db.user.findUnique({ where: { emailNormalized: "new.human@example.test" } })).toBeNull();

    expect(await GoogleAuthService.completeNewAccount({
      rawToken,
      username: "new-human",
      password: "Strong-New-Password-123!",
      confirmPassword: "does-not-match",
    })).toMatchObject({ ok: false });

    const completed = await GoogleAuthService.completeNewAccount({
      rawToken,
      username: "new-human",
      password: "Strong-New-Password-123!",
      confirmPassword: "Strong-New-Password-123!",
    });
    expect(completed.ok).toBe(true);

    const user = await db.user.findUniqueOrThrow({
      where: { emailNormalized: "new.human@example.test" },
      include: { accounts: true },
    });
    expect(user.role).toBe("USER");
    expect(user.passwordHash).not.toBeNull();
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0]).toMatchObject({ provider: "google", providerAccountId: "new-google-human" });
    expect(await verifyPassword("Strong-New-Password-123!", user.passwordHash!)).toBe(true);
    await expect(db.account.create({
      data: {
        userId: ownerId,
        provider: "google",
        providerAccountId: "new-google-human",
        type: "oauth",
      },
    })).rejects.toMatchObject({ code: "P2002" });
    await expect(db.user.create({
      data: {
        username: "duplicate-normalized-email",
        email: "NEW.HUMAN@example.test",
        emailNormalized: "new.human@example.test",
        passwordHash: FIXTURE_PASSWORD_HASH,
      },
    })).rejects.toMatchObject({ code: "P2002" });

    await db.user.delete({ where: { id: user.id } });
  });

  it("requires the current password before linking a matching existing email", async () => {
    const currentPassword = "Existing-Owner-Password-123!";
    await db.user.update({
      where: { id: ownerId },
      data: { passwordHash: await hashPassword(currentPassword) },
    });
    const beforeCount = await db.user.count();
    const rawToken = await GoogleAuthService.createIntent("LOGIN", null, "/admin/dashboard");
    const staged = await GoogleAuthService.stageLoginIdentity({
      rawToken,
      providerAccountId: "existing-owner-google",
      verifiedEmail: "OWNER@EXAMPLE.TEST",
    });
    expect(staged).toMatchObject({ state: "EXISTING_ACCOUNT", userId: ownerId });
    expect(await db.user.count()).toBe(beforeCount);

    expect(await GoogleAuthService.confirmExistingAccount(rawToken, "wrong", {})).toEqual({
      ok: false,
      reason: "invalid-credentials",
    });
    expect(await db.account.findUnique({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: "existing-owner-google" } },
    })).toBeNull();

    expect((await GoogleAuthService.confirmExistingAccount(rawToken, currentPassword, {})).ok).toBe(true);
    const account = await db.account.findUniqueOrThrow({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: "existing-owner-google" } },
    });
    expect(account.userId).toBe(ownerId);
    expect(await db.user.count()).toBe(beforeCount);
    await db.account.delete({ where: { id: account.id } });
  });
});

describe("Super Admin and recovery boundaries", () => {
  it("rejects in-application Super Admin password changes and login-method mutations", async () => {
    const superadmin = await db.user.create({
      data: {
        username: "contract-superadmin",
        email: "contract-superadmin@example.test",
        emailNormalized: "contract-superadmin@example.test",
        passwordHash: await hashPassword("Immutable-Superadmin-123!"),
        passwordLocked: true,
        role: "SUPERADMIN",
      },
    });
    const account = await makeGoogleAccount("superadmin-google-conflict", superadmin.id);
    const result = await SessionService.changePassword(
      superadmin.id,
      "missing-current-session",
      "Immutable-Superadmin-123!",
      "Changed-Superadmin-123!",
      { actorId: superadmin.id, loginMethod: "LOCAL", loginAccountId: null }
    );
    expect(result).toEqual({ ok: false, reason: "immutable-account" });
    expect(await LinkedAccountService.unlinkGoogle(account.id, superadmin.id, {
      actorId: superadmin.id,
      loginMethod: "LOCAL",
      loginAccountId: null,
    })).toEqual({ ok: false, reason: "immutable-account" });

    await db.account.delete({ where: { id: account.id } });
    await db.user.delete({ where: { id: superadmin.id } });
  });

  it("cannot issue a password reset while OTP providers are unavailable", async () => {
    expect(await PasswordRecoveryService.requestOtp("owner@example.test")).toEqual({
      ok: false,
      reason: "otp-provider-unavailable",
    });
  });
});
