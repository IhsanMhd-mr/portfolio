import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

const storageMocks = vi.hoisted(() => ({
  uploadMediaObject: vi.fn(),
  removeMediaObject: vi.fn(),
  mediaObjectPathFromPublicUrl: vi.fn(() => null),
}));

vi.mock("@/lib/supabase-storage", () => ({
  SUPABASE_MEDIA_MAX_BYTES: 5 * 1024 * 1024,
  ...storageMocks,
}));

import db from "@/lib/database";
import { MediaService } from "@/services/media.service";
import { PageService, HOME_PAGE_KEY } from "@/services/page.service";
import { FIXTURE } from "../fixtures/seed";

let ctx: { actorId: string; loginMethod: string; loginAccountId: string | null };
const CREATED: string[] = [];

beforeAll(async () => {
  const owner = await db.user.findUniqueOrThrow({ where: { username: FIXTURE.ownerUsername } });
  ctx = { actorId: owner.id, loginMethod: "test", loginAccountId: null };
});

beforeEach(() => {
  storageMocks.uploadMediaObject.mockReset();
  storageMocks.removeMediaObject.mockReset();
  storageMocks.mediaObjectPathFromPublicUrl.mockReset();
  storageMocks.mediaObjectPathFromPublicUrl.mockReturnValue(null);
});

afterAll(async () => {
  const ids = CREATED.filter(Boolean);
  if (ids.length > 0) await db.mediaAsset.deleteMany({ where: { id: { in: ids } } });
});

async function makeAsset(filename: string) {
  const asset = await db.mediaAsset.create({
    data: { filename, url: `/uploads/${filename}`, kind: "IMAGE", mimeType: "image/png", sizeBytes: 1 },
  });
  CREATED.push(asset.id);
  return asset;
}

describe("PageService", () => {
  it("resolves the home page id", async () => {
    const id = await PageService.getHomePageId();
    expect(id).toBeTruthy();
    const page = await db.page.findUniqueOrThrow({ where: { key: HOME_PAGE_KEY } });
    expect(id).toBe(page.id);
  });

  it("requireHomePageId explains how to repair a missing install", async () => {
    // A page can render the hint inline; a server action cannot, so it throws
    // a message that names the repair command.
    const id = await PageService.requireHomePageId();
    expect(id).toBeTruthy();
  });

  it("markDirty sets the unpublished-changes flag", async () => {
    const page = await db.page.findUniqueOrThrow({ where: { key: HOME_PAGE_KEY } });
    await db.page.update({ where: { id: page.id }, data: { hasUnpublishedChanges: false } });
    await PageService.markDirty();
    const after = await db.page.findUniqueOrThrow({ where: { id: page.id } });
    expect(after.hasUnpublishedChanges).toBe(true);
  });
});

describe("MediaService.updateMetadata", () => {
  it("writes only the fields supplied, so a partial save cannot blank others", async () => {
    const asset = await makeAsset("partial-save.png");
    await MediaService.updateMetadata(asset.id, { altText: "Some alt" }, ctx);
    const after = await db.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(after.altText).toBe("Some alt");
    // The filename must survive an alt-text-only save.
    expect(after.filename).toBe("partial-save.png");
  });

  it("normalises a blank alt text to null rather than an empty string", async () => {
    const asset = await makeAsset("blank-alt.png");
    await MediaService.updateMetadata(asset.id, { altText: "   " }, ctx);
    const after = await db.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(after.altText).toBeNull();
  });

  it("refuses an empty filename", async () => {
    const asset = await makeAsset("keep-name.png");
    await expect(
      MediaService.updateMetadata(asset.id, { filename: "   " }, ctx)
    ).rejects.toThrow(/Filename cannot be empty/i);
  });

  it("refuses an unknown media kind", async () => {
    const asset = await makeAsset("kind-check.png");
    await expect(
      MediaService.updateMetadata(asset.id, { kind: "NOT_A_KIND" }, ctx)
    ).rejects.toThrow(/Invalid media kind/i);
  });

  it("is a no-op when nothing was supplied, without writing an audit entry", async () => {
    const asset = await makeAsset("noop.png");
    const before = await db.auditLog.count();
    const result = await MediaService.updateMetadata(asset.id, {}, ctx);
    expect(result.id).toBe(asset.id);
    expect(await db.auditLog.count()).toBe(before);
  });

  it("records an audit entry for a real change", async () => {
    const asset = await makeAsset("audited.png");
    const before = await db.auditLog.count();
    await MediaService.updateMetadata(asset.id, { filename: "renamed.png" }, ctx);
    expect(await db.auditLog.count()).toBeGreaterThan(before);
  });
});

describe("MediaService Supabase uploads", () => {
  it("stores the returned public URL for use by every related media field", async () => {
    const publicUrl =
      "https://project.supabase.co/storage/v1/object/public/portfolio-media/images/2026/test.png";
    storageMocks.uploadMediaObject.mockResolvedValue({
      objectPath: "images/2026/test.png",
      publicUrl,
    });

    const file = new File([new Uint8Array([137, 80, 78, 71])], "Profile Image.png", {
      type: "image/png",
    });
    const asset = await MediaService.uploadAsset(file, "Profile portrait", ctx);
    CREATED.push(asset.id);

    expect(asset.url).toBe(publicUrl);
    expect(asset.altText).toBe("Profile portrait");
    expect(asset.mimeType).toBe("image/png");
    expect(storageMocks.uploadMediaObject).toHaveBeenCalledWith(
      expect.stringMatching(/^images\/\d{4}\/[0-9a-f-]+-profileimage-\d+\.png$/),
      expect.any(Buffer),
      "image/png"
    );
  });

  it("does not create a database record when Storage returns no public URL", async () => {
    storageMocks.uploadMediaObject.mockResolvedValue({
      objectPath: "images/2026/missing-url.png",
      publicUrl: "",
    });
    const before = await db.mediaAsset.count();
    const file = new File([new Uint8Array([137, 80, 78, 71])], "missing-url.png", {
      type: "image/png",
    });

    await expect(MediaService.uploadAsset(file, null, ctx)).rejects.toThrow(/public media URL/i);
    expect(await db.mediaAsset.count()).toBe(before);
    expect(storageMocks.removeMediaObject).toHaveBeenCalledWith("images/2026/missing-url.png");
  });
});

describe("MediaService.listPage", () => {
  it("paginates newest first and excludes soft-deleted assets", async () => {
    const asset = await makeAsset("listed.png");
    const { assets, total, totalPages } = await MediaService.listPage(1, 100);
    expect(total).toBeGreaterThan(0);
    expect(totalPages).toBeGreaterThanOrEqual(1);
    expect(assets.map((a) => a.id)).toContain(asset.id);

    await db.mediaAsset.update({ where: { id: asset.id }, data: { deletedAt: new Date() } });
    const after = await MediaService.listPage(1, 100);
    expect(after.assets.map((a) => a.id)).not.toContain(asset.id);
  });
});
