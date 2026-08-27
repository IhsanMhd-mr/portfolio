"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { TechnologyService } from "@/services/technology.service";
import { requireAdmin } from "@/lib/require-admin";
import { headers } from "next/headers";

/**
 * Technologies — Server Actions (contract layer).
 *
 * Technologies are VERSIONED: these actions write the DRAFT row and nothing
 * reaches the public site until a publish promotes it, which is why only
 * `/admin/technologies` is revalidated.
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
 * Previously `Partial<TechnologyInput>`, whose `category` and
 * `experienceLabel` were typed `any` — both are database enums, so an invalid
 * value travelled all the way to Prisma and surfaced as a database error
 * rather than a form error.
 */
const technologySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug may contain lowercase letters, numbers and hyphens only."),
  category: z.enum([
    "FRONTEND",
    "BACKEND",
    "DATABASE",
    "AI_ML",
    "MOBILE",
    "TOOLS",
    "DEVOPS",
    "OTHER",
  ]),
  description: z.string().trim().max(2000).nullable().optional(),
  experienceLabel: z.enum(["STRONG", "COMFORTABLE", "WORKING_KNOWLEDGE", "LEARNING"]),
  showInStack: z.boolean().optional(),
  showInGame: z.boolean().optional(),
  showOnResume: z.boolean().optional(),
  visible: z.boolean().optional(),
  order: z.number().int().optional(),
  logoId: z.string().trim().nullable().optional(),
});

const technologyPatchSchema = technologySchema.partial();

export type TechnologyFormInput = z.input<typeof technologySchema>;

export async function createTechnologyAction(input: unknown) {
  const context = await getAuditContext();
  const parsed = technologySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid technology input.");
  }
  const result = await TechnologyService.createTechnology(parsed.data, context);
  revalidatePath("/admin/technologies");
  return result;
}

export async function updateTechnologyAction(id: string, input: unknown) {
  const context = await getAuditContext();
  const parsed = technologyPatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid technology input.");
  }
  const result = await TechnologyService.updateTechnology(id, parsed.data, context);
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

export async function moveTechnologyOrderAction(id: string, direction: "up" | "down") {
  const context = await getAuditContext();
  const result = await TechnologyService.moveOrder(id, direction, context);
  revalidatePath("/admin/technologies");
  return result;
}
