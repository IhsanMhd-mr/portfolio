"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { TimelineService } from "@/services/timeline.service";
import { requireAdmin } from "@/lib/require-admin";
import { headers } from "next/headers";

/**
 * Timeline — Server Actions (contract layer).
 *
 * Timeline entries are VERSIONED: these actions write the DRAFT row and
 * nothing reaches the public site until a publish promotes it, which is why
 * only `/admin/timeline` is revalidated.
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
 * Previously `Partial<TimelineInput>`, which TypeScript erases at runtime —
 * server action arguments reached the service unvalidated.
 *
 * `entryType` is a real database enum; accepting an arbitrary string here got
 * as far as Prisma before failing.
 */
const timelineSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  entryType: z.enum(["PROJECT", "ACADEMIC", "MILESTONE", "PERSONAL"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: z.string().trim().max(60).nullable().optional(),
  externalLinks: z.unknown().optional(),
  visible: z.boolean().optional(),
  order: z.number().int().optional(),
  imageId: z.string().trim().nullable().optional(),
  linkedProjectId: z.string().trim().nullable().optional(),
});

const timelinePatchSchema = timelineSchema.partial();

export type TimelineFormInput = z.input<typeof timelineSchema>;

export async function createTimelineEntryAction(input: unknown) {
  const context = await getAuditContext();
  const parsed = timelineSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid timeline input.");
  }
  const result = await TimelineService.createEntry(parsed.data, context);
  revalidatePath("/admin/timeline");
  return result;
}

export async function updateTimelineEntryAction(id: string, input: unknown) {
  const context = await getAuditContext();
  const parsed = timelinePatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid timeline input.");
  }
  const result = await TimelineService.updateEntry(id, parsed.data, context);
  revalidatePath("/admin/timeline");
  return result;
}

export async function deleteTimelineEntryAction(id: string) {
  const context = await getAuditContext();
  const result = await TimelineService.deleteEntry(id, context);
  revalidatePath("/admin/timeline");
  return result;
}

export async function reorderTimelineEntriesAction(ids: string[]) {
  const context = await getAuditContext();
  const result = await TimelineService.reorderEntries(ids, context);
  revalidatePath("/admin/timeline");
  return result;
}

export async function moveTimelineEntryOrderAction(id: string, direction: "up" | "down") {
  const context = await getAuditContext();
  const result = await TimelineService.moveOrder(id, direction, context);
  revalidatePath("/admin/timeline");
  return result;
}
