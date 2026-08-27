import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/database";
import { TechnologyService } from "@/services/technology.service";
import { ContactMessageService } from "@/services/contact-message.service";
import { AuditLogService } from "@/services/audit-log.service";
import { TemplateService } from "@/services/template.service";
import { PageService } from "@/services/page.service";
import { FIXTURE } from "../fixtures/seed";

/**
 * Logic lifted out of the API route handlers.
 *
 * The technology quick-add rules in particular were documented prose inside a
 * route: what counts as "the same skill", and how to resolve two concurrent
 * requests racing to create it. Those are domain rules, and they are now
 * testable.
 */
let ctx: { actorId: string; loginMethod: string; loginAccountId: string | null };
const CREATED_TECH: string[] = [];
const CREATED_MSG: string[] = [];

beforeAll(async () => {
  const owner = await db.user.findUniqueOrThrow({ where: { username: FIXTURE.ownerUsername } });
  ctx = { actorId: owner.id, loginMethod: "test", loginAccountId: null };
});

afterAll(async () => {
  const t = CREATED_TECH.filter(Boolean);
  if (t.length > 0) await db.technology.deleteMany({ where: { id: { in: t } } });
  const m = CREATED_MSG.filter(Boolean);
  if (m.length > 0) await db.contactMessage.deleteMany({ where: { id: { in: m } } });
});

describe("TechnologyService.slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(TechnologyService.slugify("React Native")).toBe("react-native");
  });

  it("strips leading and trailing separators", () => {
    expect(TechnologyService.slugify("  ...Node.js!  ")).toBe("node-js");
  });

  it("returns empty for a name with no usable characters", () => {
    expect(TechnologyService.slugify("!!!")).toBe("");
  });
});

describe("TechnologyService.quickAdd", () => {
  it("creates a new skill", async () => {
    const result = await TechnologyService.quickAdd("Quickadd Probe", ctx);
    CREATED_TECH.push(result.id);
    expect(result.existed).toBe(false);
    expect(result.name).toBe("Quickadd Probe");
  });

  it("returns the existing row instead of creating a near-duplicate", async () => {
    const again = await TechnologyService.quickAdd("Quickadd Probe", ctx);
    expect(again.existed).toBe(true);
    // Crucially: no second row, and no `quickadd-probe-2`.
    const count = await db.technology.count({ where: { slug: "quickadd-probe", deletedAt: null } });
    expect(count).toBe(1);
  });

  it("matches on display name even when the stored slug disagrees", async () => {
    // "Node.js" is stored as `nodejs` in real data while slugify gives
    // `node-js`. A slug-only check sails past that and creates a duplicate.
    const created = await TechnologyService.createTechnology(
      { name: "Nodedotjs Probe", slug: "nodedotjsprobe", category: "BACKEND", experienceLabel: "STRONG" },
      ctx
    );
    CREATED_TECH.push(created.tech.id);

    const result = await TechnologyService.quickAdd("Nodedotjs Probe", ctx);
    expect(result.existed).toBe(true);
    expect(result.id).toBe(created.tech.id);
  });

  it("is case-insensitive on the display name", async () => {
    const result = await TechnologyService.quickAdd("QUICKADD PROBE", ctx);
    expect(result.existed).toBe(true);
  });

  it("rejects a name with no usable characters", async () => {
    await expect(TechnologyService.quickAdd("!!!", ctx)).rejects.toThrow(/no usable letters/i);
  });
});

describe("ContactMessageService.submit", () => {
  const base = {
    name: "Visitor",
    email: "visitor@example.test",
    subject: "Hello",
    message: "Message body",
  };

  it("stores a submission", async () => {
    const result = await ContactMessageService.submit({ ...base, ipHash: "hash-a" });
    expect(result.rateLimited).toBe(false);
    if (!result.rateLimited) CREATED_MSG.push(result.id);
  });

  it("rate limits after the configured number of submissions from one ip hash", async () => {
    const hash = "hash-b";
    for (let i = 0; i < ContactMessageService.RATE_LIMIT; i++) {
      const r = await ContactMessageService.submit({ ...base, ipHash: hash });
      if (!r.rateLimited) CREATED_MSG.push(r.id);
    }
    const blocked = await ContactMessageService.submit({ ...base, ipHash: hash });
    expect(blocked.rateLimited).toBe(true);
  });

  it("keys the limit per ip hash, so one visitor cannot block another", async () => {
    const other = await ContactMessageService.submit({ ...base, ipHash: "hash-c" });
    expect(other.rateLimited).toBe(false);
    if (!other.rateLimited) CREATED_MSG.push(other.id);
  });
});

describe("AuditLogService.listPageForActor", () => {
  it("returns only the given actor's entries", async () => {
    const { entries, total } = await AuditLogService.listPageForActor(ctx.actorId, {}, 1, 50);
    expect(total).toBeGreaterThan(0);
    expect(entries.length).toBeGreaterThan(0);
  });

  it("returns nothing for an actor with no entries", async () => {
    const { total } = await AuditLogService.listPageForActor("no-such-actor", {}, 1, 50);
    expect(total).toBe(0);
  });
});

describe("TemplateService", () => {
  it("lists the available templates", async () => {
    const templates = await TemplateService.list();
    expect(templates.map((t) => t.key)).toContain("MODERN_GLASS");
  });

  it("returns null for an unknown template id rather than throwing", async () => {
    expect(await TemplateService.selectDraftTemplate("no-such-id", ctx)).toBeNull();
  });

  it("points the draft at a template and flags unpublished changes", async () => {
    const target = await db.template.findFirstOrThrow({ where: { key: "PROFESSIONAL_MINIMAL" } });
    const page = await PageService.getHomePage();
    await db.page.update({ where: { id: page!.id }, data: { hasUnpublishedChanges: false } });

    const result = await TemplateService.selectDraftTemplate(target.id, ctx);
    expect(result?.id).toBe(target.id);

    const after = await PageService.getHomePage();
    expect(after?.draftTemplateId).toBe(target.id);
    expect(after?.hasUnpublishedChanges).toBe(true);

    // Restore so the template suite's expectations still hold.
    const original = await db.template.findFirstOrThrow({ where: { key: "MODERN_GLASS" } });
    await TemplateService.selectDraftTemplate(original.id, ctx);
  });
});
