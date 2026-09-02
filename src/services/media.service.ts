import db from "@/lib/database";
import { recordAudit, type ServiceAuditContext } from "@/lib/audit";
import {
  mediaObjectPathFromPublicUrl,
  removeMediaObject,
  SUPABASE_MEDIA_MAX_BYTES,
  uploadMediaObject,
} from "@/lib/supabase-storage";
import { randomUUID } from "node:crypto";
import fs from "fs";
import path from "path";

const MAX_FILE_SIZE_BYTES = SUPABASE_MEDIA_MAX_BYTES;
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
    auditContext: ServiceAuditContext
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
    auditContext: ServiceAuditContext
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

    // Generate a unique object name. A fresh path also prevents CDN-stale
    // content when an asset is later replaced.
    const timestamp = Date.now();
    const cleanBasename = path.basename(file.name, `.${origExt}`)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "") || "asset";
    const filename = `${cleanBasename}-${timestamp}.${origExt}`;
    const objectPath = `images/${new Date().getUTCFullYear()}/${randomUUID()}-${filename}`;

    // Read buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // SVG Sanitization
    if (mimeType === "image/svg+xml") {
      const svgText = buffer.toString("utf8");
      const cleanSvg = sanitizeSvg(svgText);
      buffer = Buffer.from(cleanSvg, "utf8");
    }

    const stored = await uploadMediaObject(objectPath, buffer, mimeType);
    const kind = mimeType === "application/pdf" ? "DOCUMENT" : "IMAGE";

    try {
      return await db.$transaction(async (tx) => {
        const asset = await tx.mediaAsset.create({
          data: {
            url: stored.publicUrl,
            filename,
            kind,
            altText: altText?.trim() || null,
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
    } catch (error) {
      await removeMediaObject(stored.objectPath).catch((cleanupError) => {
        console.error("Failed to clean up Supabase object after database error:", cleanupError);
      });
      throw error;
    }
  }

  /**
   * Everything currently referencing a media asset, as human-readable labels.
   *
   * Shown before deleting an asset, so it must cover every table that can hold
   * a media id. The nine reads are mutually independent and now run as one
   * parallel wave — they previously ran strictly in sequence, which on a remote
   * database meant nine round trips of latency (~2s on Neon at ~250ms each) for
   * work that takes one.
   *
   * The result strings and their order are unchanged: the reads are awaited
   * together, then the labels are built in the same sequence as before.
   */
  static async getMediaUsages(id: string) {
    const [
      projectVersions,
      projectImages,
      techVersions,
      timelineVersions,
      eduVersions,
      expVersions,
      siteProfiles,
      socialLinks,
      pageSections,
    ] = await Promise.all([
      // 1. Project thumbnails / covers / architecture diagrams
      db.projectVersion.findMany({
        where: {
          OR: [{ thumbnailId: id }, { coverImageId: id }, { architectureImageId: id }],
        },
      }),
      // 2. Project gallery images
      db.projectImage.findMany({
        where: { mediaId: id },
        include: { project: { include: { versions: { where: { state: "DRAFT" } } } } },
      }),
      // 3. Technology logos
      db.technologyVersion.findMany({ where: { logoId: id } }),
      // 4. Timeline entry images
      db.timelineEntryVersion.findMany({ where: { imageId: id } }),
      // 5. Education logos
      db.educationVersion.findMany({ where: { logoId: id } }),
      // 6. Experience logos
      db.experienceVersion.findMany({ where: { logoId: id } }),
      // 7. Site profile: avatar, logo, favicon, CV
      db.siteProfile.findMany({
        where: {
          OR: [{ profileImageId: id }, { logoImageId: id }, { faviconId: id }, { cvFileId: id }],
        },
      }),
      // 8. Social link icons
      db.socialLink.findMany({ where: { iconMediaId: id } }),
      // 9. Page-builder section settings.
      //
      // Deliberately unfiltered. A media id can appear anywhere inside a
      // section's untyped `settings` blob, whose shape differs per section
      // type, and the column is `Json` rather than `Jsonb` — so there is no
      // containment operator to push this into SQL. Scanning in application
      // code is correct; the table is small (one row per homepage module).
      db.pageSection.findMany({}),
    ]);

    const usages: string[] = [];

    for (const pv of projectVersions) {
      usages.push(`Project version: ${pv.title} (${pv.state})`);
    }
    for (const pi of projectImages) {
      usages.push(`Project Gallery: ${pi.project.versions[0]?.title || pi.project.slug}`);
    }
    for (const tv of techVersions) {
      usages.push(`Technology Logo: ${tv.name} (${tv.state})`);
    }
    for (const tlv of timelineVersions) {
      usages.push(`Timeline Image: ${tlv.title} (${tlv.state})`);
    }
    for (const ev of eduVersions) {
      usages.push(`Education Logo: ${ev.institution} (${ev.state})`);
    }
    for (const exv of expVersions) {
      usages.push(`Experience Logo: ${exv.organization} (${exv.state})`);
    }
    if (siteProfiles.length > 0) {
      usages.push(`Site Settings / Profile`);
    }
    for (const sl of socialLinks) {
      usages.push(`Social Link Icon: ${sl.platform}`);
    }
    for (const sec of pageSections) {
      if (JSON.stringify(sec.settings || {}).includes(id)) {
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
    auditContext: ServiceAuditContext
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

    const updated = await db.$transaction(async (tx) => {
      // Soft delete database record
      const updated = await tx.mediaAsset.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

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

    await this.deleteStoredFile(asset.url).catch((error) => {
      // The database record remains soft-deleted and auditable. A failed
      // external cleanup leaves an orphaned object, not a live broken record.
      console.error("Failed to delete stored media object:", error);
    });

    return updated;
  }

  /**
   * Replace physical file and update database size/checksum info
   */
  static async replaceAsset(
    id: string,
    file: File,
    auditContext: ServiceAuditContext
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

    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // SVG sanitization
    if (mimeType === "image/svg+xml") {
      const svgText = buffer.toString("utf8");
      const cleanSvg = sanitizeSvg(svgText);
      buffer = Buffer.from(cleanSvg, "utf8");
    }

    const origExt = path.extname(file.name).toLowerCase().replace(".", "");
    if (!allowedExtensions.includes(origExt) && !(origExt === "jpg" && allowedExtensions.includes("jpeg"))) {
      throw new Error(`File extension '.${origExt}' does not match MIME type '${mimeType}'.`);
    }

    const safeLabel = path.basename(file.name, `.${origExt}`)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "") || "asset";
    const objectPath = `images/${new Date().getUTCFullYear()}/${randomUUID()}-${safeLabel}.${origExt}`;
    const stored = await uploadMediaObject(objectPath, buffer, mimeType);

    try {
      const updated = await db.$transaction(async (tx) => {
        const updated = await tx.mediaAsset.update({
          where: { id },
          data: {
            url: stored.publicUrl,
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

      await this.deleteStoredFile(asset.url).catch((error) => {
        console.error("Failed to clean up replaced media object:", error);
      });
      return updated;
    } catch (error) {
      await removeMediaObject(stored.objectPath).catch((cleanupError) => {
        console.error("Failed to clean up replacement object after database error:", cleanupError);
      });
      throw error;
    }
  }

  private static async deleteStoredFile(url: string) {
    const objectPath = mediaObjectPathFromPublicUrl(url);
    if (objectPath) {
      await removeMediaObject(objectPath);
      return;
    }

    if (!url.startsWith("/uploads/")) return;
    const filename = path.basename(url);
    const filePath = path.resolve(UPLOADS_DIR, filename);
    const uploadsRoot = path.resolve(UPLOADS_DIR) + path.sep;
    if (!filePath.startsWith(uploadsRoot)) return;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
