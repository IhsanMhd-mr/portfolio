import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";
import fs from "fs";
import path from "path";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/png", ["png"]],
  ["image/webp", ["webp"]],
  ["image/avif", ["avif"]],
  ["image/svg+xml", ["svg"]],
  ["application/pdf", ["pdf"]],
]);

function sanitizeSvg(content: string): string {
  // Remove <script>...</script> tags
  let clean = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove inline scripting event handlers like onload, onerror, onclick, etc.
  clean = clean.replace(/\son[a-z]+=\s*['"][^'"]*['"]/gi, "");
  clean = clean.replace(/\son[a-z]+=\s*[^>\s]+/gi, "");
  return clean;
}

const MEDIA_KINDS = ["IMAGE", "DOCUMENT", "LOGO"] as const;
type MediaKindValue = (typeof MEDIA_KINDS)[number];

export class MediaService {
  /**
   * Save upload file to local disk and record in DB
   */
  /**
   * One page for the media picker: searchable, and selecting only the columns
   * the picker renders rather than whole asset rows.
   */
  static async listForPicker(search: string, page: number, pageSize: number) {
    const where = {
      deletedAt: null,
      ...(search ? { filename: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [total, assets] = await Promise.all([
      db.mediaAsset.count({ where }),
      db.mediaAsset.findMany({
        where,
        select: { id: true, filename: true, url: true, mimeType: true, kind: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, totalPages: Math.max(1, Math.ceil(total / pageSize)), assets };
  }

  /** One page of the media library, newest first. */
  static async listPage(page: number, pageSize: number) {
    const [total, assets] = await Promise.all([
      db.mediaAsset.count({ where: { deletedAt: null } }),
      db.mediaAsset.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, totalPages: Math.max(1, Math.ceil(total / pageSize)), assets };
  }

  /**
   * Editable metadata: alt text, filename and kind.
   *
   * `url` is deliberately not editable — it points at the stored object, and
   * rewriting it here would silently break every reference to the asset.
   *
   * Only the fields actually supplied are written, so an alt-text-only save
   * cannot blank the filename. Re-submitting the same values is a no-op that
   * still returns the row rather than writing an empty update.
   */
  static async updateMetadata(
    id: string,
    input: { altText?: string | null; filename?: string; kind?: string },
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const data: { altText?: string | null; filename?: string; kind?: MediaKindValue } = {};

    if ("altText" in input) {
      const trimmed = input.altText?.trim();
      data.altText = trimmed ? trimmed : null;
    }

    if (input.filename !== undefined) {
      const filename = input.filename.trim();
      // filename is NOT NULL and is the asset's label everywhere, so an empty
      // one would make the asset unidentifiable in the picker.
      if (!filename) throw new Error("Filename cannot be empty.");
      data.filename = filename;
    }

    if (input.kind !== undefined) {
      if (!MEDIA_KINDS.includes(input.kind as MediaKindValue)) {
        throw new Error(`Invalid media kind: ${input.kind}`);
      }
      data.kind = input.kind as MediaKindValue;
    }

    if (Object.keys(data).length === 0) {
      return db.mediaAsset.findUniqueOrThrow({ where: { id } });
    }

    return db.$transaction(async (tx) => {
      const before = await tx.mediaAsset.findUniqueOrThrow({
        where: { id },
        select: { altText: true, filename: true, kind: true },
      });

      const updated = await tx.mediaAsset.update({ where: { id }, data });

      await recordAudit({
        action: "MEDIA_METADATA_UPDATED",
        entityType: "MediaAsset",
        entityId: id,
        summary: `Updated metadata for media: ${updated.filename}`,
        before,
        after: data,
        context: auditContext,
        tx,
      });

      return updated;
    });
  }

  static async uploadAsset(
    file: File,
    altText: string | null,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    if (!file || file.size === 0) {
      throw new Error("No file provided or file is empty.");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB).`);
    }

    const mimeType = file.type;
    const allowedExtensions = ALLOWED_MIME_TYPES.get(mimeType);
    if (!allowedExtensions) {
      throw new Error(`MIME type '${mimeType}' is not supported. Supported types: JPG, PNG, WEBP, AVIF, SVG, PDF.`);
    }

    // Verify extension
    const origExt = path.extname(file.name).toLowerCase().replace(".", "");
    if (!allowedExtensions.includes(origExt) && !(origExt === "jpg" && allowedExtensions.includes("jpeg"))) {
      throw new Error(`File extension '.${origExt}' does not match MIME type '${mimeType}'.`);
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // Generate unique name
    const timestamp = Date.now();
    const cleanBasename = path.basename(file.name, `.${origExt}`)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
    const filename = `${cleanBasename}-${timestamp}.${origExt}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Read buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // SVG Sanitization
    if (mimeType === "image/svg+xml") {
      const svgText = buffer.toString("utf8");
      const cleanSvg = sanitizeSvg(svgText);
      buffer = Buffer.from(cleanSvg, "utf8");
    }

    // Save to disk
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    const kind = mimeType === "application/pdf" ? "DOCUMENT" : "IMAGE";

    return await db.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          url: publicUrl,
          filename,
          kind,
          altText: altText || null,
          mimeType,
          sizeBytes: buffer.length,
          uploadedById: auditContext.actorId,
        },
      });

      await recordAudit({
        action: "MEDIA_UPLOADED",
        entityType: "MediaAsset",
        entityId: asset.id,
        summary: `Uploaded file: ${filename}`,
        after: { asset },
        context: auditContext,
        tx,
      });

      return asset;
    });
  }

  /**
   * Scan every entity in the database to check if the media is in use
   */
  static async getMediaUsages(id: string) {
    const usages: string[] = [];

    // 1. Projects thumbnails/covers/architecture
    const projectVersions = await db.projectVersion.findMany({
      where: {
        OR: [
          { thumbnailId: id },
          { coverImageId: id },
          { architectureImageId: id },
        ],
      },
    });
    for (const pv of projectVersions) {
      usages.push(`Project version: ${pv.title} (${pv.state})`);
    }

    // 2. Project images gallery
    const projectImages = await db.projectImage.findMany({
      where: { mediaId: id },
      include: { project: { include: { versions: { where: { state: "DRAFT" } } } } },
    });
    for (const pi of projectImages) {
      usages.push(`Project Gallery: ${pi.project.versions[0]?.title || pi.project.slug}`);
    }

    // 3. Technology logo
    const techVersions = await db.technologyVersion.findMany({
      where: { logoId: id },
    });
    for (const tv of techVersions) {
      usages.push(`Technology Logo: ${tv.name} (${tv.state})`);
    }

    // 4. Timeline entry image
    const timelineVersions = await db.timelineEntryVersion.findMany({
      where: { imageId: id },
    });
    for (const tlv of timelineVersions) {
      usages.push(`Timeline Image: ${tlv.title} (${tlv.state})`);
    }

    // 5. Education logo
    const eduVersions = await db.educationVersion.findMany({
      where: { logoId: id },
    });
    for (const ev of eduVersions) {
      usages.push(`Education Logo: ${ev.institution} (${ev.state})`);
    }

    // 6. Experience logo
    const expVersions = await db.experienceVersion.findMany({
      where: { logoId: id },
    });
    for (const exv of expVersions) {
      usages.push(`Experience Logo: ${exv.organization} (${exv.state})`);
    }

    // 7. Site Profile settings (profile, logo, favicon, cv)
    const siteProfiles = await db.siteProfile.findMany({
      where: {
        OR: [
          { profileImageId: id },
          { logoImageId: id },
          { faviconId: id },
          { cvFileId: id },
        ],
      },
    });
    if (siteProfiles.length > 0) {
      usages.push(`Site Settings / Profile`);
    }

    // 8. Social Link icons
    const socialLinks = await db.socialLink.findMany({
      where: { iconMediaId: id },
    });
    for (const sl of socialLinks) {
      usages.push(`Social Link Icon: ${sl.platform}`);
    }

    // 9. PageBuilder section settings
    const pageSections = await db.pageSection.findMany({});
    for (const sec of pageSections) {
      const settingsStr = JSON.stringify(sec.settings || {});
      if (settingsStr.includes(id)) {
        usages.push(`PageBuilder Section: ${sec.internalLabel} (${sec.type})`);
      }
    }

    return usages;
  }

  /**
   * Delete asset with usage verification
   */
  static async deleteAsset(
    id: string,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const asset = await db.mediaAsset.findUnique({ where: { id } });
    if (!asset || asset.deletedAt) {
      throw new Error("Asset not found or already deleted.");
    }

    // Check usage
    const usages = await this.getMediaUsages(id);
    if (usages.length > 0) {
      throw new Error(`Deletion blocked. Media asset '${asset.filename}' is actively used in:\n- ${usages.join("\n- ")}`);
    }

    return await db.$transaction(async (tx) => {
      // Soft delete database record
      const updated = await tx.mediaAsset.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Attempt to delete physical file
      const filePath = path.join(process.cwd(), "public", asset.url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error("Failed to delete physical file:", e);
        }
      }

      await recordAudit({
        action: "MEDIA_DELETED",
        entityType: "MediaAsset",
        entityId: id,
        summary: `Deleted media file: ${asset.filename}`,
        context: auditContext,
        tx,
      });

      return updated;
    });
  }

  /**
   * Replace physical file and update database size/checksum info
   */
  static async replaceAsset(
    id: string,
    file: File,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null; ipAddress?: string; userAgent?: string }
  ) {
    const asset = await db.mediaAsset.findUnique({ where: { id } });
    if (!asset || asset.deletedAt) {
      throw new Error("Media asset to replace not found.");
    }

    if (!file || file.size === 0) {
      throw new Error("No replacement file provided.");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds 5MB limit.`);
    }

    // Ensure MIME type matches or is valid
    const mimeType = file.type;
    const allowedExtensions = ALLOWED_MIME_TYPES.get(mimeType);
    if (!allowedExtensions) {
      throw new Error(`Replacement type '${mimeType}' is not supported.`);
    }

    const filePath = path.join(process.cwd(), "public", asset.url);
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // SVG sanitization
    if (mimeType === "image/svg+xml") {
      const svgText = buffer.toString("utf8");
      const cleanSvg = sanitizeSvg(svgText);
      buffer = Buffer.from(cleanSvg, "utf8");
    }

    // Write file back to disk, replacing content
    fs.writeFileSync(filePath, buffer);

    return await db.$transaction(async (tx) => {
      const updated = await tx.mediaAsset.update({
        where: { id },
        data: {
          sizeBytes: buffer.length,
          mimeType,
        },
      });

      await recordAudit({
        action: "MEDIA_REPLACED",
        entityType: "MediaAsset",
        entityId: id,
        summary: `Replaced physical content for file: ${asset.filename}`,
        after: { asset: updated },
        context: auditContext,
        tx,
      });

      return updated;
    });
  }
}
