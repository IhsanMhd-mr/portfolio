"use server";

/**
 * Global Site Settings — Server Actions (contract layer).
 *
 * Auth, Zod validation, and revalidation only; persistence and audit live in
 * SiteProfileService. Modelled on admin/page-builder/actions.ts.
 *
 * This replaces an inline action in page.tsx that read fourteen `formData.get()
 * as string` casts straight into a Prisma update, with no authorization and no
 * validation of any kind.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getValidatedOwner, type AdminContext } from "@/lib/require-admin";
import { SiteProfileService } from "@/services/site-profile.service";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Every text field permits "" on purpose.
 *
 * The bootstrap row writes empty strings, and the public site treats "" as
 * absent — it renders nothing rather than inventing an identity. Requiring
 * non-empty values here would make a freshly initialised site unsaveable.
 * Length caps and the email shape are the only real constraints.
 */
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

const settingsSchema = z.object({
  fullName: optionalText(120),
  logoText: optionalText(60),
  title: optionalText(160),
  tagline: optionalText(200),
  // Validated only when non-empty; "" is the "not set yet" state.
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .optional()
    .default("")
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Enter a valid email address, or leave it blank.",
    }),
  locationText: optionalText(200),
  availabilityStatus: optionalText(200),
  heroIntro: optionalText(2000),
  aboutBio: optionalText(5000),
  technicalInterests: optionalText(2000),
  developmentApproach: optionalText(2000),
  currentGoals: optionalText(2000),
  defaultTheme: z.enum(["system", "light", "dark"]).optional(),
});

function auditContextOf(owner: AdminContext) {
  return {
    actorId: owner.userId,
    loginMethod: owner.loginMethod,
    loginAccountId: owner.loginAccountId,
  };
}

export async function updateSettingsAction(
  raw: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const owner = await getValidatedOwner();
  if (!owner) {
    return { success: false, error: "You must be signed in as the owner to do this." };
  }

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] ? String(issue.path[0]) : "_form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { success: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    const updated = await SiteProfileService.updateSettings(parsed.data, auditContextOf(owner));

    // These fields render on the homepage, /about and /contact. The previous
    // inline action revalidated /admin/settings ONLY, so a settings change was
    // invisible on the public site until something else happened to bust it.
    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/contact");
    revalidatePath("/admin/settings");

    return { success: true, data: { id: updated.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}
