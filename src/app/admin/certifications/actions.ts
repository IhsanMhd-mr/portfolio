"use server";

/**
 * Certifications — Server Actions (contract layer).
 *
 * Auth, Zod validation, typed results and revalidation only; persistence and
 * audit live in CertificationService.
 *
 * Certifications are UNVERSIONED: edits apply to the live site immediately,
 * with no draft/publish step. That is why every action here revalidates "/"
 * as well as the admin route.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getValidatedOwner, type AdminContext } from "@/lib/require-admin";
import { CertificationService } from "@/services/certification.service";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

/**
 * The route hand-rolled this as `.trim().slice(0, 160)`, which silently
 * TRUNCATES over-long input rather than rejecting it — a pasted value was
 * saved half-complete with nothing to indicate it. Zod reports instead.
 */
const certificationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  issuer: z.string().trim().min(1, "Issuer is required").max(160),
  issueDate: z.string().trim().optional(),
  description: z.string().trim().max(2000).optional(),
  credentialId: z.string().trim().max(120).optional(),
  credentialUrl: z.string().trim().max(2000).optional(),
  mediaId: z.string().trim().optional(),
});

export type CertificationFormInput = z.input<typeof certificationSchema>;

function auditContextOf(owner: AdminContext) {
  return {
    actorId: owner.userId,
    loginMethod: owner.loginMethod,
    loginAccountId: owner.loginAccountId,
  };
}

function revalidate() {
  revalidatePath("/admin/certifications");
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

/** Shapes validated form input into the service input type. */
function toServiceInput(d: z.output<typeof certificationSchema>) {
  return {
    title: d.title,
    issuer: d.issuer,
    issueDate: d.issueDate ? new Date(d.issueDate) : null,
    description: d.description || null,
    credentialId: d.credentialId || null,
    credentialUrl: d.credentialUrl || null,
    mediaId: d.mediaId || null,
  };
}

export async function createCertificationAction(
  raw: CertificationFormInput
): Promise<ActionResult<{ id: string }>> {
  const owner = await getValidatedOwner();
  if (!owner) return { success: false, error: "You must be signed in as the owner." };

  const parsed = certificationSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  try {
    const created = await CertificationService.create(
      toServiceInput(parsed.data),
      auditContextOf(owner)
    );
    revalidate();
    return { success: true, data: { id: created.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateCertificationAction(
  id: string,
  raw: CertificationFormInput
): Promise<ActionResult<{ id: string }>> {
  const owner = await getValidatedOwner();
  if (!owner) return { success: false, error: "You must be signed in as the owner." };

  const parsed = certificationSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  try {
    await CertificationService.update(id, toServiceInput(parsed.data), auditContextOf(owner));
    revalidate();
    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function certificationRowAction(
  id: string,
  op: "delete" | "toggle" | "up" | "down"
): Promise<ActionResult> {
  const owner = await getValidatedOwner();
  if (!owner) return { success: false, error: "You must be signed in as the owner." };
  const ctx = auditContextOf(owner);

  try {
    if (op === "delete") await CertificationService.remove(id, ctx);
    else if (op === "toggle") await CertificationService.toggleVisible(id, ctx);
    else await CertificationService.moveOrder(id, op, ctx);
    revalidate();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
