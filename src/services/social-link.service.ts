import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

/**
 * SocialLinkService — owns all persistence for the SocialLink domain.
 *
 * Contract: callers (Server Actions) are responsible for authentication and
 * input-shape validation; this service enforces domain invariants (duplicate
 * platforms, order integrity) and records audits. Domain violations throw
 * Error with a user-safe message.
 */

export interface SocialLinkInput {
  platform: string;
  label?: string | null;
  url: string;
  iconKey?: string | null;
}

type AuditContext = {
  actorId: string;
  loginMethod: string;
  loginAccountId: string | null;
};

function normalizeUrl(platform: string, url: string): string {
  if (platform === "email") {
    return url.startsWith("mailto:") ? url : `mailto:${url}`;
  }
  return url;
}

export class SocialLinkService {
  static async list() {
    return db.socialLink.findMany({ orderBy: { order: "asc" } });
  }

  /** Domain invariant: at most one handle per platform, except "custom". */
  private static async assertNoDuplicatePlatform(platform: string, excludeId?: string) {
    if (platform === "custom") return;
    const existing = await db.socialLink.findFirst({
      where: { platform, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existing) {
      throw new Error(`A ${platform} handle already exists. Edit the existing one or choose Custom.`);
    }
  }

  static async create(input: SocialLinkInput, auditContext: AuditContext) {
    await SocialLinkService.assertNoDuplicatePlatform(input.platform);

    const last = await db.socialLink.findFirst({ orderBy: { order: "desc" } });
    const created = await db.socialLink.create({
      data: {
        platform: input.platform,
        label: input.platform === "custom" ? input.label : null,
        url: normalizeUrl(input.platform, input.url),
        iconKey: input.iconKey || null,
        visible: true,
        order: (last?.order ?? -1) + 1,
      },
    });

    await recordAudit({
      action: "SETTINGS_UPDATED",
      entityType: "SocialLink",
      entityId: created.id,
      summary: `Added social handle: ${input.platform}`,
      context: auditContext,
    });

    return created;
  }

  static async update(
    id: string,
    input: SocialLinkInput & { visible?: boolean },
    auditContext: AuditContext
  ) {
    const existing = await db.socialLink.findUnique({ where: { id } });
    if (!existing) throw new Error("Handle not found.");

    await SocialLinkService.assertNoDuplicatePlatform(input.platform, id);

    const updated = await db.socialLink.update({
      where: { id },
      data: {
        platform: input.platform,
        label: input.platform === "custom" ? input.label : null,
        url: normalizeUrl(input.platform, input.url),
        iconKey: input.iconKey || null,
        ...(typeof input.visible === "boolean" ? { visible: input.visible } : {}),
      },
    });

    await recordAudit({
      action: "SETTINGS_UPDATED",
      entityType: "SocialLink",
      entityId: updated.id,
      summary: `Updated social handle: ${input.platform}`,
      context: auditContext,
    });

    return updated;
  }

  static async setVisibility(id: string, visible: boolean, auditContext: AuditContext) {
    const existing = await db.socialLink.findUnique({ where: { id } });
    if (!existing) throw new Error("Handle not found.");

    const updated = await db.socialLink.update({ where: { id }, data: { visible } });

    await recordAudit({
      action: "SETTINGS_UPDATED",
      entityType: "SocialLink",
      entityId: updated.id,
      summary: `${visible ? "Shown" : "Hidden"} social handle: ${updated.platform}`,
      context: auditContext,
    });

    return updated;
  }

  static async remove(id: string, auditContext: AuditContext) {
    const existing = await db.socialLink.findUnique({ where: { id } });
    if (!existing) throw new Error("Handle not found.");

    await db.socialLink.delete({ where: { id } });

    await recordAudit({
      action: "SETTINGS_UPDATED",
      entityType: "SocialLink",
      entityId: id,
      summary: `Deleted social handle: ${existing.platform}`,
      context: auditContext,
    });
  }

  static async reorder(orderedIds: string[], auditContext: AuditContext) {
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.socialLink.update({ where: { id }, data: { order: index } })
      )
    );

    await recordAudit({
      action: "SETTINGS_UPDATED",
      entityType: "SocialLink",
      summary: "Reordered social handles",
      context: auditContext,
    });
  }
}
