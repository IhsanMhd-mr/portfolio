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

export async function updateMediaMetadataAction(id: string, altText: string | null) {
  const context = await getAuditContext();
  
  return await db.$transaction(async (tx) => {
    const updated = await tx.mediaAsset.update({
      where: { id },
      data: { altText },
    });

    await recordAudit({
      action: "MEDIA_METADATA_UPDATED",
      entityType: "MediaAsset",
      entityId: id,
      summary: `Updated metadata for media: ${updated.filename}`,
      after: { altText },
      context,
      tx,
    });

    revalidatePath("/admin/media");
    return updated;
  });
}
