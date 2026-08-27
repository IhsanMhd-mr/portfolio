"use server";

import { revalidatePath } from "next/cache";
import { MediaService } from "@/services/media.service";
import { requireAdmin } from "@/lib/require-admin";
import { headers } from "next/headers";
import { updatePublicContentCache } from "@/lib/public-content-cache";

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
  updatePublicContentCache();
  revalidatePath("/admin/media");
  revalidatePath("/admin/projects");
  return result;
}

export interface MediaMetadataInput {
  altText?: string | null;
  filename?: string;
  kind?: string;
}

/**
 * Updates the editable metadata on a media asset. Validation and persistence
 * live in MediaService.updateMetadata; this layer supplies auth, the audit
 * context and revalidation.
 */
export async function updateMediaMetadataAction(id: string, input: MediaMetadataInput) {
  const context = await getAuditContext();
  const updated = await MediaService.updateMetadata(id, input, context);
  updatePublicContentCache();
  revalidatePath("/admin/media");
  return updated;
}
