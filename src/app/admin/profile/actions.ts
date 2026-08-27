"use server";

/**
 * Profile & Social Handles — Server Actions (contract layer).
 *
 * Responsibilities here are ONLY: authentication, input validation (Zod),
 * typed success/error results for the UI, and cache revalidation.
 * All persistence and domain rules live in the service layer:
 *   - SiteProfileService  (src/services/site-profile.service.ts)
 *   - SocialLinkService   (src/services/social-link.service.ts)
 */

import { z } from "zod";
import { getValidatedOwner, type AdminContext } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";
import { PLATFORM_KEYS } from "@/lib/social-platforms";
import { SiteProfileService } from "@/services/site-profile.service";
import { SocialLinkService } from "@/services/social-link.service";
import { updatePublicContentCache } from "@/lib/public-content-cache";

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
  return {
    actorId: owner.userId,
    loginMethod: owner.loginMethod,
    loginAccountId: owner.loginAccountId,
  };
}

function revalidatePublicSurfaces() {
  updatePublicContentCache();
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/admin/profile");
}

/** Maps a domain error (thrown by services) to a typed failure result. */
function domainFailure(e: unknown, field?: string): ActionResult<never> {
  const message = e instanceof Error ? e.message : "Something went wrong.";
  return {
    success: false,
    error: message,
    ...(field ? { fieldErrors: { [field]: message } } : {}),
  };
}

// ─── Profile ──────────────────────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  tagline: z.string().trim().max(200).optional().nullable(),
  aboutBio: z.string().trim().min(1, "Bio is required").max(5000),
  profileImageId: z.string().trim().min(1).optional().nullable(),
  cvFileId: z.string().trim().min(1).optional().nullable(),
});

export async function updateProfileAction(
  input: z.infer<typeof profileSchema>
): Promise<ActionResult<{ id: string }>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const updated = await SiteProfileService.updateProfile(parsed.data, auditContextOf(owner));
    revalidatePublicSurfaces();
    return { success: true, data: { id: updated.id } };
  } catch (e) {
    return domainFailure(e);
  }
}

// ─── Social Handles ─────────────────────────────────────────────────────────

const platformEnum = z.enum(PLATFORM_KEYS);

const socialHandleInputSchema = z
  .object({
    platform: platformEnum,
    label: z.string().trim().max(60).optional().nullable(),
    url: z.string().trim().min(1, "URL is required").max(2000),
    iconKey: z.string().trim().max(60).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.platform === "custom" && (!val.label || val.label.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Label is required for custom platforms", path: ["label"] });
    }
    if (val.platform === "email") {
      const emailLike = val.url.replace(/^mailto:/, "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLike)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email address", path: ["url"] });
      }
    } else {
      try {
        new URL(val.url);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid URL (including https://)", path: ["url"] });
      }
    }
  });

export type SocialHandleInput = z.infer<typeof socialHandleInputSchema>;

export async function getSocialHandles(): Promise<ActionResult<any[]>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();
  return { success: true, data: await SocialLinkService.list() };
}

export async function createSocialHandle(input: SocialHandleInput): Promise<ActionResult<any>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();

  const parsed = socialHandleInputSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const created = await SocialLinkService.create(parsed.data, auditContextOf(owner));
    revalidatePublicSurfaces();
    return { success: true, data: created };
  } catch (e) {
    return domainFailure(e, "platform");
  }
}

const updateSocialHandleSchema = socialHandleInputSchema.and(
  z.object({ visible: z.boolean().optional() })
);

export async function updateSocialHandle(
  id: string,
  input: SocialHandleInput & { visible?: boolean }
): Promise<ActionResult<any>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();

  const parsed = updateSocialHandleSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    const updated = await SocialLinkService.update(id, parsed.data, auditContextOf(owner));
    revalidatePublicSurfaces();
    return { success: true, data: updated };
  } catch (e) {
    return domainFailure(e, "platform");
  }
}

export async function toggleSocialHandleVisibility(id: string, visible: boolean): Promise<ActionResult<any>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();

  try {
    const updated = await SocialLinkService.setVisibility(id, visible, auditContextOf(owner));
    revalidatePublicSurfaces();
    return { success: true, data: updated };
  } catch (e) {
    return domainFailure(e);
  }
}

export async function deleteSocialHandle(id: string): Promise<ActionResult<{ id: string }>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();

  try {
    await SocialLinkService.remove(id, auditContextOf(owner));
    revalidatePublicSurfaces();
    return { success: true, data: { id } };
  } catch (e) {
    return domainFailure(e);
  }
}

const reorderSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)).min(1),
});

export async function reorderSocialHandles(orderedIds: string[]): Promise<ActionResult<undefined>> {
  const owner = await getValidatedOwner();
  if (!owner) return unauthorized();

  const parsed = reorderSchema.safeParse({ orderedIds });
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await SocialLinkService.reorder(parsed.data.orderedIds, auditContextOf(owner));
    revalidatePublicSurfaces();
    return { success: true, data: undefined };
  } catch (e) {
    return domainFailure(e);
  }
}
