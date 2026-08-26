"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { EducationService } from "@/services/education.service";
import { requireAdmin } from "@/lib/require-admin";
import { headers } from "next/headers";

/**
 * Education — Server Actions (contract layer).
 *
 * Education is VERSIONED: everything here writes the DRAFT row, and nothing
 * reaches the public site until a publish promotes it. That is why these
 * actions revalidate `/admin/education` only — revalidating `/` would discard
 * a good public cache for a change no visitor can see yet.
 */

async function getAuditContext() {
  // Authorization is a side effect of building the audit context. Every
  // exported action below must call this before touching the service.
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

/**
 * Server action arguments are attacker-controlled. These were previously typed
 * `Partial<EducationInput>`, which TypeScript erases at runtime — so the input
 * was entirely unvalidated in the shipped build.
 *
 * `.partial()` below keeps update calls able to send a single field.
 */
const educationSchema = z.object({
  institution: z.string().trim().min(1, "Institution is required").max(200),
  qualification: z.string().trim().min(1, "Qualification is required").max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  isCurrent: z.boolean().optional(),
  grade: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  modules: z.string().trim().max(5000).nullable().optional(),
  showOnResume: z.boolean().optional(),
  visible: z.boolean().optional(),
  logoId: z.string().trim().nullable().optional(),
  order: z.number().int().optional(),
});

const educationPatchSchema = educationSchema.partial();

export type EducationFormInput = z.input<typeof educationSchema>;

export async function createEducationAction(input: unknown) {
  const context = await getAuditContext();
  const parsed = educationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid education input.");
  }
  const result = await EducationService.createEducation(parsed.data, context);
  revalidatePath("/admin/education");
  return result;
}

export async function updateEducationAction(id: string, input: unknown) {
  const context = await getAuditContext();
  const parsed = educationPatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid education input.");
  }
  const result = await EducationService.updateEducation(id, parsed.data, context);
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
