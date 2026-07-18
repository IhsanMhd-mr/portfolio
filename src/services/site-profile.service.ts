import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

/**
 * SiteProfileService — owns persistence for the SiteProfile singleton.
 *
 * Contract: callers handle auth + input-shape validation; this service owns
 * the singleton lookup, persistence, publish-state side effects, and audit.
 */

export interface ProfileUpdateInput {
  fullName: string;
  tagline?: string | null;
  aboutBio: string;
  profileImageId?: string | null;
  cvFileId?: string | null;
}

export class SiteProfileService {
  static async updateProfile(
    input: ProfileUpdateInput,
    auditContext: { actorId: string; loginMethod: string; loginAccountId: string | null }
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
