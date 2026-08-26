"use server";

/**
 * Page Builder — Server Actions (contract layer).
 *
 * Auth + Zod validation + typed results only. All persistence/domain rules
 * live in SectionGroupService and PageSectionService. See ARCHITECTURE.md.
 */

import { z } from "zod";
import { getValidatedOwner, type AdminContext } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";
import db from "@/lib/database";
import { SectionGroupService } from "@/services/section-group.service";
import { PageSectionService } from "@/services/page-section.service";
import { registryKeyFor } from "@/components/sections/registry";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function unauthorized(): ActionResult<never> {
  return { success: false, error: "You must be signed in as the owner to do this." };
}

function fromZodError(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] ? String(issue.path[0]) : "_form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { success: false, error: "Please fix the highlighted fields.", fieldErrors };
}

function auditContextOf(owner: AdminContext) {
  return { actorId: owner.userId, loginMethod: owner.loginMethod, loginAccountId: owner.loginAccountId };
}

function domainFailure(e: unknown): ActionResult<never> {
  return { success: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

function revalidateBuilder() {
  revalidatePath("/admin/page-builder");
  revalidatePath("/");
}

async function getHomePageId(): Promise<string> {
  const page = await db.page.findUnique({ where: { key: "home" }, select: { id: true } });
  if (!page) throw new Error("Homepage record not found.");
  return page.id;
}

// ─── Groups ───────────────────────────────────────────────────────────────

const groupInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80),
  subtitle: z.string().trim().max(200).optional().nullable(),
});

export async function createGroupAction(input: z.infer<typeof groupInputSchema>): Promise<ActionResult<any>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();
  const parsed = groupInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const pageId = await getHomePageId();
    const created = await SectionGroupService.createGroup(pageId, parsed.data, auditContextOf(owner));
    revalidateBuilder();
    return { success: true, data: created };
  } catch (e) {
    return domainFailure(e);
  }
}

export async function updateGroupAction(
  id: string,
  input: z.infer<typeof groupInputSchema> & { visible?: boolean }
): Promise<ActionResult<any>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();
  const parsed = groupInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const updated = await SectionGroupService.updateGroup(
      id,
      { ...parsed.data, visible: input.visible },
      auditContextOf(owner)
    );
    revalidateBuilder();
    return { success: true, data: updated };
  } catch (e) {
    return domainFailure(e);
  }
}

export async function deleteGroupAction(id: string): Promise<ActionResult<undefined>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();
  try {
    const pageId = await getHomePageId();
    await SectionGroupService.deleteGroup(id, pageId, auditContextOf(owner));
    revalidateBuilder();
    return { success: true, data: undefined };
  } catch (e) {
    return domainFailure(e);
  }
}

export async function reorderGroupsAction(orderedIds: string[]): Promise<ActionResult<undefined>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();
  const parsed = z.array(z.string().min(1)).min(1).safeParse(orderedIds);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const pageId = await getHomePageId();
    await SectionGroupService.reorderGroups(pageId, parsed.data, auditContextOf(owner));
    revalidateBuilder();
    return { success: true, data: undefined };
  } catch (e) {
    return domainFailure(e);
  }
}

// ─── Modules ──────────────────────────────────────────────────────────────

const createModuleSchema = z.object({
  type: z.string().min(1),
  groupId: z.string().min(1).optional().nullable(),
});

export async function createModuleAction(input: z.infer<typeof createModuleSchema>): Promise<ActionResult<any>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();
  const parsed = createModuleSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const registryKey = registryKeyFor(parsed.data.type);
  if (!registryKey) return { success: false, error: "Unknown module type.", fieldErrors: { type: "Unknown module type." } };

  try {
    const pageId = await getHomePageId();
    const created = await PageSectionService.create(
      pageId,
      { type: parsed.data.type, internalLabel: parsed.data.type.replace(/_/g, " "), groupId: parsed.data.groupId ?? null },
      auditContextOf(owner)
    );
    revalidateBuilder();
    return { success: true, data: created };
  } catch (e) {
    return domainFailure(e);
  }
}

const updateModuleSchema = z.object({
  internalLabel: z.string().trim().min(1).max(120).optional(),
  visible: z.boolean().optional(),
  settings: z.record(z.string(), z.any()).optional(),
  animationPresetSlug: z.string().max(60).optional().nullable(),
  animationDelay: z.number().min(0).max(10).optional().nullable(),
  animationStagger: z.number().min(0).max(2).optional().nullable(),
});

export async function updateModuleAction(
  id: string,
  input: z.infer<typeof updateModuleSchema>
): Promise<ActionResult<any>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();
  const parsed = updateModuleSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const updated = await PageSectionService.update(id, parsed.data, auditContextOf(owner));
    revalidateBuilder();
    return { success: true, data: updated };
  } catch (e) {
    return domainFailure(e);
  }
}

export async function deleteModuleAction(id: string): Promise<ActionResult<undefined>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();
  try {
    await PageSectionService.remove(id, auditContextOf(owner));
    revalidateBuilder();
    return { success: true, data: undefined };
  } catch (e) {
    return domainFailure(e);
  }
}

const reorderModulesSchema = z.object({
  groupId: z.string().min(1).nullable(),
  orderedSectionIds: z.array(z.string().min(1)).min(1),
});

export async function reorderModulesAction(
  input: z.infer<typeof reorderModulesSchema>
): Promise<ActionResult<undefined>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();
  const parsed = reorderModulesSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const pageId = await getHomePageId();
    await SectionGroupService.reorderModulesInContainer(
      pageId,
      parsed.data.groupId,
      parsed.data.orderedSectionIds,
      auditContextOf(owner)
    );
    revalidateBuilder();
    return { success: true, data: undefined };
  } catch (e) {
    return domainFailure(e);
  }
}

const assignModuleSchema = z.object({
  sectionId: z.string().min(1),
  targetGroupId: z.string().min(1).nullable(),
});

export async function assignModuleToGroupAction(
  input: z.infer<typeof assignModuleSchema>
): Promise<ActionResult<any>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();
  const parsed = assignModuleSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  try {
    const pageId = await getHomePageId();
    const updated = await SectionGroupService.assignModuleToGroup(
      parsed.data.sectionId,
      pageId,
      parsed.data.targetGroupId,
      auditContextOf(owner)
    );
    revalidateBuilder();
    return { success: true, data: updated };
  } catch (e) {
    return domainFailure(e);
  }
}
