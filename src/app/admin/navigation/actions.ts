"use server";

/**
 * Navigation — Server Actions (contract layer).
 *
 * Nav items are UNVERSIONED: edits are live immediately, hence revalidating
 * "/" alongside the admin route.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getValidatedOwner, type AdminContext } from "@/lib/require-admin";
import { NavItemService } from "@/services/nav-item.service";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

const navItemSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(60),
  // Route or hash only. An external URL is now REFUSED with a message; the
  // route used to `return` silently, so the form reset with no explanation.
  target: z
    .string()
    .trim()
    .min(1, "Target is required")
    .max(200)
    .regex(/^[/#]/, "Target must be a route (/projects) or a section (#contact)."),
});

export type NavItemFormInput = z.infer<typeof navItemSchema>;

function auditContextOf(owner: AdminContext) {
  return {
    actorId: owner.userId,
    loginMethod: owner.loginMethod,
    loginAccountId: owner.loginAccountId,
  };
}

function revalidate() {
  revalidatePath("/admin/navigation");
  revalidatePath("/");
}

function fail(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] ? String(issue.path[0]) : "_form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { success: false, error: "Please fix the highlighted fields.", fieldErrors };
}

export async function createNavItemAction(
  raw: NavItemFormInput
): Promise<ActionResult<{ id: string }>> {
  const owner = await getValidatedOwner();
  if (!owner) return { success: false, error: "You must be signed in as the owner." };

  const parsed = navItemSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  try {
    const created = await NavItemService.create(parsed.data, auditContextOf(owner));
    revalidate();
    return { success: true, data: { id: created.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateNavItemAction(
  id: string,
  raw: NavItemFormInput
): Promise<ActionResult<{ id: string }>> {
  const owner = await getValidatedOwner();
  if (!owner) return { success: false, error: "You must be signed in as the owner." };

  const parsed = navItemSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  try {
    await NavItemService.update(id, parsed.data, auditContextOf(owner));
    revalidate();
    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function navItemRowAction(
  id: string,
  op: "delete" | "toggle" | "up" | "down"
): Promise<ActionResult> {
  const owner = await getValidatedOwner();
  if (!owner) return { success: false, error: "You must be signed in as the owner." };
  const ctx = auditContextOf(owner);

  try {
    if (op === "delete") await NavItemService.remove(id, ctx);
    else if (op === "toggle") await NavItemService.toggleEnabled(id, ctx);
    else await NavItemService.moveOrder(id, op, ctx);
    revalidate();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
