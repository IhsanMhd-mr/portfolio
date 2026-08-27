import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/database";
import { MediaService } from "@/services/media.service";
import { ProjectService } from "@/services/project.service";
import { ExperienceService } from "@/services/experience.service";
import { FIXTURE } from "../fixtures/seed";

/**
 * `getMediaUsages` — what is referencing this asset?
 *
 * Shown before deleting a media asset, so a missed source means the delete
 * silently breaks a live reference. The nine reads now run as one parallel
 * wave; these tests pin that every source is still reported, since a
 * copy-paste slip while parallelising would drop one without failing anything
 * else.
 */
let ctx: { actorId: string; loginMethod: string; loginAccountId: string | null };
const CLEANUP: Array<() => Promise<unknown>> = [];

async function makeAsset(filename: string) {
  const asset = await db.mediaAsset.create({
    data: { filename, url: `/uploads/${filename}`, kind: "IMAGE", mimeType: "image/png", sizeBytes: 1 },
  });
  CLEANUP.push(() => db.mediaAsset.deleteMany({ where: { id: asset.id } }));
  return asset;
}

/**
 * The fixture deliberately seeds no technologies, so these tests create their
 * own rather than assuming one exists.
 */
async function makeTechnology(slug: string) {
  const tech = await db.technology.create({
    data: {
      slug,
      versions: {
        create: {
          state: "DRAFT",
          name: slug,
          category: "TOOLS",
          experienceLabel: "LEARNING",
        },
      },
    },
    include: { versions: true },
  });
  CLEANUP.push(() => db.technology.deleteMany({ where: { id: tech.id } }));
  return tech;
}

beforeAll(async () => {
  const owner = await db.user.findUniqueOrThrow({ where: { username: FIXTURE.ownerUsername } });
  ctx = { actorId: owner.id, loginMethod: "test", loginAccountId: null };
});

afterAll(async () => {
  // Reverse order: references before the assets they point at.
  for (const undo of CLEANUP.reverse()) await undo();
});

describe("getMediaUsages reports every source", () => {
  it("returns nothing for an unreferenced asset", async () => {
    const asset = await makeAsset("unused.png");
    expect(await MediaService.getMediaUsages(asset.id)).toEqual([]);
  });

  it("finds a project thumbnail", async () => {
    const asset = await makeAsset("thumb.png");
    const version = await db.projectVersion.findFirstOrThrow({ where: { state: "PUBLISHED" } });
    await db.projectVersion.update({ where: { id: version.id }, data: { thumbnailId: asset.id } });
    CLEANUP.push(() =>
      db.projectVersion.update({ where: { id: version.id }, data: { thumbnailId: null } })
    );

    expect(await MediaService.getMediaUsages(asset.id)).toEqual(
      expect.arrayContaining([expect.stringContaining("Project version:")])
    );
  });

  it("finds a project gallery image", async () => {
    const asset = await makeAsset("gallery.png");
    const project = await db.project.findFirstOrThrow({ where: { deletedAt: null } });
    const img = await db.projectImage.create({
      data: { projectId: project.id, mediaId: asset.id, order: 0 },
    });
    CLEANUP.push(() => db.projectImage.deleteMany({ where: { id: img.id } }));

    expect(await MediaService.getMediaUsages(asset.id)).toEqual(
      expect.arrayContaining([expect.stringContaining("Project Gallery:")])
    );
  });

  it("finds a technology logo", async () => {
    const asset = await makeAsset("techlogo.png");
    const tech = await makeTechnology("usage-probe-tech");
    await db.technologyVersion.update({
      where: { id: tech.versions[0].id },
      data: { logoId: asset.id },
    });

    expect(await MediaService.getMediaUsages(asset.id)).toEqual(
      expect.arrayContaining([expect.stringContaining("Technology Logo:")])
    );
  });

  it("finds an education logo", async () => {
    const asset = await makeAsset("edulogo.png");
    const version = await db.educationVersion.findFirstOrThrow();
    await db.educationVersion.update({ where: { id: version.id }, data: { logoId: asset.id } });
    CLEANUP.push(() =>
      db.educationVersion.update({ where: { id: version.id }, data: { logoId: null } })
    );

    expect(await MediaService.getMediaUsages(asset.id)).toEqual(
      expect.arrayContaining([expect.stringContaining("Education Logo:")])
    );
  });

  it("finds an experience logo", async () => {
    const asset = await makeAsset("explogo.png");
    const version = await db.experienceVersion.findFirstOrThrow();
    await db.experienceVersion.update({ where: { id: version.id }, data: { logoId: asset.id } });
    CLEANUP.push(() =>
      db.experienceVersion.update({ where: { id: version.id }, data: { logoId: null } })
    );

    expect(await MediaService.getMediaUsages(asset.id)).toEqual(
      expect.arrayContaining([expect.stringContaining("Experience Logo:")])
    );
  });

  it("finds a site profile reference", async () => {
    const asset = await makeAsset("avatar.png");
    const profile = await db.siteProfile.findFirstOrThrow();
    await db.siteProfile.update({ where: { id: profile.id }, data: { profileImageId: asset.id } });
    CLEANUP.push(() =>
      db.siteProfile.update({ where: { id: profile.id }, data: { profileImageId: null } })
    );

    expect(await MediaService.getMediaUsages(asset.id)).toContain("Site Settings / Profile");
  });

  it("finds a social link icon", async () => {
    const asset = await makeAsset("icon.png");
    const link = await db.socialLink.create({
      data: { platform: "github", label: "GitHub", url: "https://example.test", iconMediaId: asset.id },
    });
    CLEANUP.push(() => db.socialLink.deleteMany({ where: { id: link.id } }));

    expect(await MediaService.getMediaUsages(asset.id)).toEqual(
      expect.arrayContaining([expect.stringContaining("Social Link Icon:")])
    );
  });

  it("finds an id buried in a page-builder section's settings blob", async () => {
    // This is why that read stays unfiltered: the id can sit at any depth in an
    // untyped JSON column whose shape varies per section type.
    const asset = await makeAsset("insettings.png");
    const section = await db.pageSection.findFirstOrThrow();
    const original = section.settings;
    await db.pageSection.update({
      where: { id: section.id },
      data: { settings: { selectedImageIds: [asset.id] } },
    });
    CLEANUP.push(() =>
      db.pageSection.update({ where: { id: section.id }, data: { settings: original as never } })
    );

    expect(await MediaService.getMediaUsages(asset.id)).toEqual(
      expect.arrayContaining([expect.stringContaining("PageBuilder Section:")])
    );
  });
});

describe("batched write paths", () => {
  it("duplicating a project copies its technologies and gallery with order intact", async () => {
    const project = await db.project.findFirstOrThrow({
      where: { deletedAt: null, versions: { some: { state: "DRAFT" } } },
      include: { technologies: true, images: true },
    });

    const tech = await makeTechnology("dup-probe-tech");
    const asset = await makeAsset("dup-gallery.png");

    // Give the source something to copy, at non-zero order so a createMany that
    // dropped `order` would be visible.
    const link = await db.projectTechnology.upsert({
      where: { projectId_technologyId: { projectId: project.id, technologyId: tech.id } },
      update: { order: 3 },
      create: { projectId: project.id, technologyId: tech.id, order: 3 },
    });
    const img = await db.projectImage.create({
      data: { projectId: project.id, mediaId: asset.id, caption: "Cap", order: 2 },
    });

    const duplicated = await ProjectService.duplicateProject(project.id, ctx);
    const dupId = (duplicated as { id?: string })?.id ?? (duplicated as { project?: { id: string } })?.project?.id;

    CLEANUP.push(() => db.projectImage.deleteMany({ where: { id: img.id } }));
    CLEANUP.push(() =>
      db.projectTechnology.deleteMany({
        where: { projectId: project.id, technologyId: link.technologyId },
      })
    );
    if (dupId) CLEANUP.push(() => db.project.deleteMany({ where: { id: dupId } }));

    const copiedTechs = await db.projectTechnology.findMany({ where: { projectId: dupId } });
    const copiedImages = await db.projectImage.findMany({ where: { projectId: dupId } });

    expect(copiedTechs.some((t) => t.technologyId === tech.id && t.order === 3)).toBe(true);
    expect(copiedImages.some((i) => i.mediaId === asset.id && i.order === 2 && i.caption === "Cap")).toBe(true);
  });

  it("duplicating twice produces distinct slugs", async () => {
    const project = await db.project.findFirstOrThrow({
      where: { deletedAt: null, versions: { some: { state: "DRAFT" } } },
    });

    const first = await ProjectService.duplicateProject(project.id, ctx);
    const second = await ProjectService.duplicateProject(project.id, ctx);

    const idOf = (r: unknown) =>
      (r as { id?: string })?.id ?? (r as { project?: { id: string } })?.project?.id;
    const ids = [idOf(first), idOf(second)].filter(Boolean) as string[];
    for (const id of ids) CLEANUP.push(() => db.project.deleteMany({ where: { id } }));

    const rows = await db.project.findMany({ where: { id: { in: ids } }, select: { slug: true } });
    expect(new Set(rows.map((r) => r.slug)).size).toBe(rows.length);
  });

  it("saving an experience replaces its technology links, and an empty list clears them", async () => {
    const tech = await makeTechnology("batch-probe-tech");
    const created = await ExperienceService.createExperience(
      {
        organization: "Batch Probe Org",
        role: "Engineer",
        startDate: new Date("2020-01-01"),
        technologyIds: [tech.id],
      },
      ctx
    );
    CLEANUP.push(() => db.experience.deleteMany({ where: { id: created.base.id } }));

    expect(
      await db.experienceTechnology.count({ where: { experienceId: created.base.id } })
    ).toBe(1);

    // Replace-all semantics: an empty array must clear, not no-op.
    await ExperienceService.updateExperience(created.base.id, { technologyIds: [] }, ctx);
    expect(
      await db.experienceTechnology.count({ where: { experienceId: created.base.id } })
    ).toBe(0);
  });
});
