import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/database";
import { CertificationService } from "@/services/certification.service";
import { NavItemService } from "@/services/nav-item.service";
import { FIXTURE } from "../fixtures/seed";

/**
 * Certifications and navigation items are UNVERSIONED — they have no
 * draft/published pair, so an edit is live on the public site immediately.
 * That asymmetry with the five versioned entities is the thing most likely to
 * be misremembered, so it is asserted here rather than only documented.
 */
let ctx: { actorId: string; loginMethod: string; loginAccountId: string | null };

beforeAll(async () => {
  const owner = await db.user.findUniqueOrThrow({ where: { username: FIXTURE.ownerUsername } });
  ctx = { actorId: owner.id, loginMethod: "test", loginAccountId: null };
});

afterAll(async () => {
  await db.certification.deleteMany({ where: { title: { startsWith: "Test Cert" } } });
  await db.navItem.deleteMany({ where: { label: { startsWith: "Test Nav" } } });
});

describe("CertificationService", () => {
  it("toggleVisible flips only the visibility flag", async () => {
    const created = await CertificationService.create(
      { title: "Test Cert A", issuer: "Issuer", issueDate: null },
      ctx
    );
    expect(created.visible).toBe(true);

    const hidden = await CertificationService.toggleVisible(created.id, ctx);
    expect(hidden.visible).toBe(false);
    // The route used to pass title and issuer back through update() to change
    // a boolean; nothing but `visible` should move.
    expect(hidden.title).toBe("Test Cert A");
    expect(hidden.issuer).toBe("Issuer");

    const shown = await CertificationService.toggleVisible(created.id, ctx);
    expect(shown.visible).toBe(true);
  });

  it("toggleVisible writes an audit entry", async () => {
    const created = await CertificationService.create(
      { title: "Test Cert B", issuer: "Issuer", issueDate: null },
      ctx
    );
    const before = await db.auditLog.count();
    await CertificationService.toggleVisible(created.id, ctx);
    expect(await db.auditLog.count()).toBeGreaterThan(before);
  });

  it("toggleVisible rejects an unknown id instead of silently doing nothing", async () => {
    await expect(CertificationService.toggleVisible("does-not-exist", ctx)).rejects.toThrow();
  });

  it("getById returns the media relation the editor renders", async () => {
    const created = await CertificationService.create(
      { title: "Test Cert C", issuer: "Issuer", issueDate: null },
      ctx
    );
    const found = await CertificationService.getById(created.id);
    expect(found).not.toBeNull();
    expect(found).toHaveProperty("media");
  });

  it("hides a non-visible certification from the public list", async () => {
    const created = await CertificationService.create(
      { title: "Test Cert D", issuer: "Issuer", issueDate: null },
      ctx
    );
    await CertificationService.toggleVisible(created.id, ctx);
    const publicList = await CertificationService.list(true);
    expect(publicList.map((c) => c.title)).not.toContain("Test Cert D");
  });
});

describe("NavItemService", () => {
  it("toggleEnabled flips only the enabled flag", async () => {
    const created = await NavItemService.create({ label: "Test Nav A", target: "/x" }, ctx);
    const off = await NavItemService.toggleEnabled(created.id, ctx);
    expect(off.enabled).toBe(false);
    expect(off.label).toBe("Test Nav A");
    expect(off.target).toBe("/x");

    const on = await NavItemService.toggleEnabled(created.id, ctx);
    expect(on.enabled).toBe(true);
  });

  it("toggleEnabled rejects an unknown id", async () => {
    await expect(NavItemService.toggleEnabled("does-not-exist", ctx)).rejects.toThrow();
  });

  it("getById returns the item", async () => {
    const created = await NavItemService.create({ label: "Test Nav B", target: "/y" }, ctx);
    const found = await NavItemService.getById(created.id);
    expect(found?.label).toBe("Test Nav B");
  });
});
