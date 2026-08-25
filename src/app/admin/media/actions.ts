"use server";

import { revalidatePath } from "next/cache";
import { MediaService } from "@/services/media.service";
import { requireAdmin } from "@/lib/require-admin";
import { headers } from "next/headers";
import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

async function getAuditContext() {
  const admin = await requireAdmin();
  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || undefined;
  const userAgent = reqHeaders.get("user-agent") || undefined;

  return {
    actorId: admin.userId,
    loginMethod: admin.loginMethod,
    loginAccountId: admin.loginAccountId,
    ipAddress,
    userAgent,
  };
}

export async function deleteMediaAction(id: string) {
  const context = await getAuditContext();
  const result = await MediaService.deleteAsset(id, context);
  revalidatePath("/admin/media");
  revalidatePath("/admin/projects");
  return result;
}

const MEDIA_KINDS = ["IMAGE", "DOCUMENT", "LOGO"] as const;
type MediaKindValue = (typeof MEDIA_KINDS)[number];

export interface MediaMetadataInput {
  altText?: string | null;
  filename?: string;
  kind?: string;
}

/**
 * Updates the editable metadata on a media asset: alt text, filename and kind.
 * `url` is deliberately not editable — it points at the stored object, and
 * rewriting it here would silently break every reference to the asset.
 *
 * Idempotent: it writes only the fields actually supplied, and re-submitting
 * the same values produces the same row. Omitted keys are left untouched, so
 * an alt-text-only save cannot blank the filename.
 */
export async function updateMediaMetadataAction(id: string, input: MediaMetadataInput) {
  const context = await getAuditContext();

  const data: { altText?: string | null; filename?: string; kind?: MediaKindValue } = {};

  if ("altText" in input) {
    const trimmed = input.altText?.trim();
    data.altText = trimmed ? trimmed : null;
  }

  if (input.filename !== undefined) {
    const filename = input.filename.trim();
    // filename is NOT NULL and is shown as the asset's label everywhere, so an
    // empty one would make the asset unidentifiable in the picker.
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
    return await db.mediaAsset.findUniqueOrThrow({ where: { id } });
  }

  return await db.$transaction(async (tx) => {
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
      context,
      tx,
    });

    revalidatePath("/admin/media");
    return updated;
  });
}
