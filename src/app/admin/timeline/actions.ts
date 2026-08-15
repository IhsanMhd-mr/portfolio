"use server";

import { revalidatePath } from "next/cache";
import { TimelineService, TimelineInput } from "@/services/timeline.service";
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

export async function createTimelineEntryAction(input: Partial<TimelineInput>) {
  const context = await getAuditContext();
  const result = await TimelineService.createEntry(input, context);
  revalidatePath("/admin/timeline");
  return result;
}

export async function updateTimelineEntryAction(id: string, input: Partial<TimelineInput>) {
  const context = await getAuditContext();
  const result = await TimelineService.updateEntry(id, input, context);
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
