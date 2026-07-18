"use server";

import { revalidatePath } from "next/cache";
import { ExperienceService, ExperienceInput } from "@/services/experience.service";
import { requireAdmin } from "@/lib/require-admin";
import { headers } from "next/headers";

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

export async function createExperienceAction(input: Partial<ExperienceInput>) {
  const context = await getAuditContext();
  const result = await ExperienceService.createExperience(input, context);
  revalidatePath("/admin/experience");
  return result;
}

export async function updateExperienceAction(id: string, input: Partial<ExperienceInput>) {
  const context = await getAuditContext();
  const result = await ExperienceService.updateExperience(id, input, context);
  revalidatePath("/admin/experience");
  return result;
}

export async function deleteExperienceAction(id: string) {
  const context = await getAuditContext();
  const result = await ExperienceService.deleteExperience(id, context);
  revalidatePath("/admin/experience");
  return result;
}

export async function reorderExperienceAction(ids: string[]) {
  const context = await getAuditContext();
  const result = await ExperienceService.reorderExperience(ids, context);
  revalidatePath("/admin/experience");
  return result;
}
