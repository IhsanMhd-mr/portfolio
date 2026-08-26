import { describe, it, expect, beforeEach, afterAll } from "vitest";
import db from "@/lib/database";
import { SiteProfileService } from "@/services/site-profile.service";
import { FIXTURE } from "../fixtures/seed";

/**
 * Global Site Settings, now owned by SiteProfileService.
 */
let ctx: { actorId: string; loginMethod: string; loginAccountId: string | null };

const base = {
  fullName: "Owner Name",
  logoText: "ON",
  title: "Engineer",
  contactEmail: "owner@example.test",
  aboutBio: "Bio",
};

/**
 * These tests rewrite and even delete the SiteProfile singleton, which other
 * suites read (it drives homepage metadata). Files run serially against one
 * database, so the fixture values have to be put back or a passing run would
 * depend on file order.
 */
afterAll(async () => {
  await db.siteProfile.deleteMany({});
  await db.siteProfile.create({
    data: {
      fullName: "Test Owner",
      logoText: "TO",
      title: "Test Engineer",
      aboutBio: "Fixture bio.",
      contactEmail: "owner@example.test",
    },
  });
});

describe("SiteProfileService.getOrCreate", () => {
  it("returns the existing singleton rather than creating a second row", async () => {
    const before = await db.siteProfile.count();
    const a = await SiteProfileService.getOrCreate();
    const b = await SiteProfileService.getOrCreate();
    expect(a.id).toBe(b.id);
    expect(await db.siteProfile.count()).toBe(before);
  });

  it("bootstraps an EMPTY identity, never a fictional one", async () => {
    // The public site treats "" as absent and renders nothing. A bootstrap that
    // seeded a placeholder name would publish it as the owner's own.
    await db.siteProfile.deleteMany({});
    const created = await SiteProfileService.getOrCreate();
    expect(created.fullName).toBe("");
    expect(created.contactEmail).toBe("");
    expect(created.logoText).toBe("");
  });

  it("getOrCreateWithMedia returns the media relations", async () => {
    const p = await SiteProfileService.getOrCreateWithMedia();
    expect(p).toHaveProperty("profileImage");
    expect(p).toHaveProperty("cvFile");
  });
});

describe("SiteProfileService.updateSettings", () => {
  beforeEach(async () => {
    const owner = await db.user.findUniqueOrThrow({ where: { username: FIXTURE.ownerUsername } });
    ctx = { actorId: owner.id, loginMethod: "test", loginAccountId: null };
    await SiteProfileService.getOrCreate();
  });

  it("persists the settings field set", async () => {
    const updated = await SiteProfileService.updateSettings(
      { ...base, tagline: "A tagline", locationText: "Somewhere" },
      ctx
    );
    expect(updated.fullName).toBe("Owner Name");
    expect(updated.tagline).toBe("A tagline");
    expect(updated.locationText).toBe("Somewhere");
  });

  it("flags the homepage as having unpublished changes", async () => {
    const page = await db.page.findUniqueOrThrow({ where: { key: "home" } });
    await db.page.update({ where: { id: page.id }, data: { hasUnpublishedChanges: false } });
    await SiteProfileService.updateSettings(base, ctx);
    const after = await db.page.findUniqueOrThrow({ where: { id: page.id } });
    expect(after.hasUnpublishedChanges).toBe(true);
  });

  it("writes an audit entry", async () => {
    const before = await db.auditLog.count();
    await SiteProfileService.updateSettings(base, ctx);
    expect(await db.auditLog.count()).toBeGreaterThan(before);
  });

  it("never writes null to the NOT NULL defaultTheme column", async () => {
    const updated = await SiteProfileService.updateSettings(base, ctx);
    expect(updated.defaultTheme).toBeTruthy();
  });
});
