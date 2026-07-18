"use server";

import { revalidatePath } from "next/cache";
import { TechnologyService, TechnologyInput } from "@/services/technology.service";
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

export async function createTechnologyAction(input: Partial<TechnologyInput>) {
  const context = await getAuditContext();
  const result = await TechnologyService.createTechnology(input, context);
  revalidatePath("/admin/technologies");
  return result;
}

export async function updateTechnologyAction(id: string, input: Partial<TechnologyInput>) {
  const context = await getAuditContext();
  const result = await TechnologyService.updateTechnology(id, input, context);
  revalidatePath("/admin/technologies");
  return result;
}

export async function deleteTechnologyAction(id: string) {
  const context = await getAuditContext();
  const result = await TechnologyService.deleteTechnology(id, context);
  revalidatePath("/admin/technologies");
  return result;
}

export async function reorderTechnologiesAction(ids: string[]) {
  const context = await getAuditContext();
  const result = await TechnologyService.reorderTechnologies(ids, context);
  revalidatePath("/admin/technologies");
  return result;
}
