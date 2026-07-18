"use server";

import { revalidatePath } from "next/cache";
import { ProjectService, ProjectInput } from "@/services/project.service";
import { requireAdmin } from "@/lib/require-admin";
import { headers } from "next/headers";

/**
 * Get context for audit logging from headers
 */
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

export async function createProjectAction(input: Partial<ProjectInput>) {
  const context = await getAuditContext();
  const result = await ProjectService.createProject(input, context);
  revalidatePath("/admin/projects");
  return result;
}

export async function updateProjectAction(id: string, input: Partial<ProjectInput>) {
  const context = await getAuditContext();
  const result = await ProjectService.updateProjectDraft(id, input, context);
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${id}/edit`);
  return result;
}

export async function duplicateProjectAction(id: string) {
  const context = await getAuditContext();
  const result = await ProjectService.duplicateProject(id, context);
  revalidatePath("/admin/projects");
  return result;
}

export async function toggleProjectVisibilityAction(id: string, currentVisible: boolean) {
  const context = await getAuditContext();
  const result = await ProjectService.toggleVisibility(id, currentVisible, context);
  revalidatePath("/admin/projects");
  return result;
}

export async function softDeleteProjectAction(id: string) {
  const context = await getAuditContext();
  const result = await ProjectService.softDeleteProject(id, context);
  revalidatePath("/admin/projects");
  return result;
}

export async function restoreProjectAction(id: string) {
  const context = await getAuditContext();
  const result = await ProjectService.restoreProject(id, context);
  revalidatePath("/admin/projects");
  return result;
}

export async function permanentlyDeleteProjectAction(id: string) {
  const context = await getAuditContext();
  const result = await ProjectService.permanentlyDeleteProject(id, context);
  revalidatePath("/admin/projects");
  return result;
}

export async function reorderProjectsAction(orderedIds: string[]) {
  const context = await getAuditContext();
  const result = await ProjectService.reorderProjects(orderedIds, context);
  revalidatePath("/admin/projects");
  return result;
}
