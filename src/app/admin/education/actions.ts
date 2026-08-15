"use server";

import { revalidatePath } from "next/cache";
import { EducationService, EducationInput } from "@/services/education.service";
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

export async function createEducationAction(input: Partial<EducationInput>) {
  const context = await getAuditContext();
  const result = await EducationService.createEducation(input, context);
  revalidatePath("/admin/education");
  return result;
}

export async function updateEducationAction(id: string, input: Partial<EducationInput>) {
  const context = await getAuditContext();
  const result = await EducationService.updateEducation(id, input, context);
  revalidatePath("/admin/education");
  return result;
}

export async function deleteEducationAction(id: string) {
  const context = await getAuditContext();
  const result = await EducationService.deleteEducation(id, context);
  revalidatePath("/admin/education");
  return result;
}

export async function reorderEducationAction(ids: string[]) {
  const context = await getAuditContext();
  const result = await EducationService.reorderEducation(ids, context);
  revalidatePath("/admin/education");
  return result;
}

export async function moveEducationOrderAction(id: string, direction: "up" | "down") {
  const context = await getAuditContext();
  const result = await EducationService.moveOrder(id, direction, context);
  revalidatePath("/admin/education");
  return result;
}
