"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ExperienceService } from "@/services/experience.service";
import { requireAdmin } from "@/lib/require-admin";
import { headers } from "next/headers";

/**
 * Experience — Server Actions (contract layer).
 *
 * Experience is VERSIONED: everything here writes the DRAFT row and nothing is
 * public until a publish promotes it, which is why only `/admin/experience` is
 * revalidated.
 */

async function getAuditContext() {
  // Authorization is a side effect of building the audit context.
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
 * Previously `Partial<ExperienceInput>` — erased at runtime, so server action
 * arguments reached the service unvalidated.
 */
const experienceSchema = z.object({
  organization: z.string().trim().min(1, "Organization is required").max(200),
  role: z.string().trim().min(1, "Role is required").max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  // Stored as a JSON array of strings.
  responsibilities: z.array(z.string()).nullable().optional(),
  locationText: z.string().trim().max(200).nullable().optional(),
  workType: z.enum(["ONSITE", "REMOTE", "HYBRID"]).nullable().optional(),
  showOnResume: z.boolean().optional(),
  visible: z.boolean().optional(),
  logoId: z.string().trim().nullable().optional(),
  order: z.number().int().optional(),
  technologyIds: z.array(z.string()).optional(),
});

const experiencePatchSchema = experienceSchema.partial();

export type ExperienceFormInput = z.input<typeof experienceSchema>;

export async function createExperienceAction(input: unknown) {
  const context = await getAuditContext();
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid experience input.");
  }
  const result = await ExperienceService.createExperience(parsed.data, context);
  revalidatePath("/admin/experience");
  return result;
}

export async function updateExperienceAction(id: string, input: unknown) {
  const context = await getAuditContext();
  const parsed = experiencePatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid experience input.");
  }
  const result = await ExperienceService.updateExperience(id, parsed.data, context);
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

export async function moveExperienceOrderAction(id: string, direction: "up" | "down") {
  const context = await getAuditContext();
  const result = await ExperienceService.moveOrder(id, direction, context);
  revalidatePath("/admin/experience");
  return result;
}
