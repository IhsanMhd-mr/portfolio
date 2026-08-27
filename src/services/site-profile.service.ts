import db from "@/lib/database";
import { recordAudit, type ServiceAuditContext } from "@/lib/audit";

/**
 * SiteProfileService — owns persistence for the SiteProfile singleton.
 *
 * Contract: callers handle auth + input-shape validation; this service owns
 * the singleton lookup, persistence, publish-state side effects, and audit.
 */

/**
 * The bootstrap row.
 *
 * These columns are NOT NULL so something must be written, but "" is what the
 * public site treats as absent — it renders nothing rather than publishing a
 * fictional identity or an unowned email address the owner never entered.
 *
 * This literal previously existed twice, in admin/profile/page.tsx and
 * admin/settings/page.tsx, each with its own copy of the comment explaining
 * why it must stay empty. Two copies of a rule like that is one edit away from
 * a seeded fake identity.
 */
const EMPTY_PROFILE = {
  fullName: "",
  logoText: "",
  title: "",
  aboutBio: "",
  contactEmail: "",
} as const;

/** Fields the Global Site Settings form owns. Broader than ProfileUpdateInput. */
export interface SiteSettingsInput {
  fullName: string;
  logoText: string;
  title: string;
  tagline?: string | null;
  contactEmail: string;
  locationText?: string | null;
  availabilityStatus?: string | null;
  heroIntro?: string | null;
  aboutBio: string;
  technicalInterests?: string | null;
  developmentApproach?: string | null;
  currentGoals?: string | null;
  /** NOT NULL with a "system" default — never written as null. */
  defaultTheme?: string;
}

export interface ProfileUpdateInput {
  fullName: string;
  tagline?: string | null;
  aboutBio: string;
  profileImageId?: string | null;
  cvFileId?: string | null;
}

export class SiteProfileService {
  /** The singleton, bootstrapped empty on first access. */
  static async getOrCreate() {
    return (
      (await db.siteProfile.findFirst()) ??
      (await db.siteProfile.create({ data: { ...EMPTY_PROFILE } }))
    );
  }

  /** The singleton with the media relations the profile editor renders. */
  static async getOrCreateWithMedia() {
    const include = { profileImage: true, cvFile: true } as const;
    return (
      (await db.siteProfile.findFirst({ include })) ??
      (await db.siteProfile.create({ data: { ...EMPTY_PROFILE }, include }))
    );
  }

  /**
   * Global Site Settings form.
   *
   * Separate from updateProfile: that one owns the identity/avatar/resume
   * subset the profile editor exposes, this one owns branding, contact and
   * bio-summary fields. They deliberately do not share a field list — merging
   * them would let either form blank out fields it does not render.
   */
  static async updateSettings(
    input: SiteSettingsInput,
    auditContext: ServiceAuditContext
  ) {
    const profile = await SiteProfileService.getOrCreate();

    const updated = await db.siteProfile.update({
      where: { id: profile.id },
      data: {
        fullName: input.fullName,
        logoText: input.logoText,
        title: input.title,
        tagline: input.tagline ?? null,
        contactEmail: input.contactEmail,
        locationText: input.locationText ?? null,
        availabilityStatus: input.availabilityStatus ?? null,
        heroIntro: input.heroIntro ?? null,
        aboutBio: input.aboutBio,
        technicalInterests: input.technicalInterests ?? null,
        developmentApproach: input.developmentApproach ?? null,
        currentGoals: input.currentGoals ?? null,
        // Omitted rather than nulled when absent: the column is NOT NULL.
        ...(input.defaultTheme ? { defaultTheme: input.defaultTheme } : {}),
      },
    });

    // These fields render on the homepage, /about and /contact.
    await db.page
      .update({ where: { key: "home" }, data: { hasUnpublishedChanges: true } })
      .catch(() => {});

    await recordAudit({
      action: "SITE_SETTINGS_UPDATED",
      entityType: "SiteProfile",
      entityId: updated.id,
      summary: "Owner updated global site settings.",
      context: auditContext,
    });

    return updated;
  }

  static async updateProfile(
    input: ProfileUpdateInput,
    auditContext: ServiceAuditContext
  ) {
    const profile = await db.siteProfile.findFirst();
    if (!profile) throw new Error("Site profile not found.");

    const updated = await db.siteProfile.update({
      where: { id: profile.id },
      data: {
        fullName: input.fullName,
        tagline: input.tagline || null,
        aboutBio: input.aboutBio,
        profileImageId: input.profileImageId || null,
        cvFileId: input.cvFileId || null,
      },
    });

    // Profile fields render on the homepage — flag unpublished changes.
    await db.page
      .update({ where: { key: "home" }, data: { hasUnpublishedChanges: true } })
      .catch(() => {});

    await recordAudit({
      action: "SITE_SETTINGS_UPDATED",
      entityType: "SiteProfile",
      entityId: updated.id,
      summary: "Owner updated profile (name/tagline/bio/avatar/resume).",
      context: auditContext,
    });

    return updated;
  }
}
