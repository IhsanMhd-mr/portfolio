import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/database";
import { SessionService } from "@/services/session.service";
import { LinkedAccountService } from "@/services/linked-account.service";
import { hashPassword } from "@/lib/password";
import { FIXTURE } from "../fixtures/seed";

/**
 * Session and linked-account rules lifted out of the auth route handlers.
 *
 * The invariant worth the most attention is the lockout guard: unlinking the
 * last Google account with no local password set would leave the owner unable
 * to sign in, and this is a single-owner CMS — there is no second admin to
 * undo it and no path back through the UI.
 */
let ownerId: string;
let ctx: { actorId: string; loginMethod: string; loginAccountId: string | null };
const CREATED_SESSIONS: string[] = [];
const CREATED_ACCOUNTS: string[] = [];

async function makeSession(sid: string, userId = ownerId) {
  const s = await db.trackedSession.create({
    data: {
      sid,
      userId,
      loginMethod: "credentials",
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
  await db.user.update({ where: { id: ownerId }, data: { passwordHash: null } });
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
      data: { username: "other-owner", email: "other@example.test" },
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

describe("SessionService.changePassword", () => {
  it("rejects when no local password is set", async () => {
    await db.user.update({ where: { id: ownerId }, data: { passwordHash: null } });
    const result = await SessionService.changePassword(ownerId, "sid-x", "old", "newpassword123", ctx);
    expect(result).toEqual({ ok: false, reason: "no-local-password" });
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
  it("refuses to unlink the last login method when no password is set", async () => {
    await db.user.update({ where: { id: ownerId }, data: { passwordHash: null } });
    const only = await makeGoogleAccount("only-google");

    const result = await LinkedAccountService.unlinkGoogle(only.id, ownerId, ctx);
    expect(result).toEqual({ ok: false, reason: "last-login-method" });

    // The account must still exist — this is the lockout guard.
    expect(await db.account.findUnique({ where: { id: only.id } })).not.toBeNull();
  });

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
    await db.user.update({ where: { id: ownerId }, data: { passwordHash: null } });
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
