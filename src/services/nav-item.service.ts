import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

/**
 * NavItemService — owns the configurable public navigation (Phase 4).
 * When no NavItem rows exist, the public Navbar falls back to its built-in
 * defaults, so a fresh install never renders an empty nav.
 */

export interface NavItemInput {
  label: string;
  target: string;
  enabled?: boolean;
}

type AuditContext = { actorId: string; loginMethod: string; loginAccountId: string | null };

export class NavItemService {
  static async list(enabledOnly = false) {
    return db.navItem.findMany({
      where: enabledOnly ? { enabled: true } : undefined,
      orderBy: { order: "asc" },
    });
  }

  static async create(input: NavItemInput, auditContext: AuditContext) {
    const last = await db.navItem.findFirst({ orderBy: { order: "desc" } });
    const created = await db.navItem.create({ data: { ...input, order: (last?.order ?? -1) + 1 } });
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "NavItem", entityId: created.id,
      summary: `Added nav item: ${input.label} → ${input.target}`, context: auditContext,
    });
    return created;
  }

  static async update(id: string, input: NavItemInput & { enabled?: boolean }, auditContext: AuditContext) {
    const existing = await db.navItem.findUnique({ where: { id } });
    if (!existing) throw new Error("Nav item not found.");
    const updated = await db.navItem.update({ where: { id }, data: input });
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "NavItem", entityId: id,
      summary: `Updated nav item: ${input.label}`, context: auditContext,
    });
    return updated;
  }

  static async remove(id: string, auditContext: AuditContext) {
    const existing = await db.navItem.findUnique({ where: { id } });
    if (!existing) throw new Error("Nav item not found.");
    await db.navItem.delete({ where: { id } });
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "NavItem", entityId: id,
      summary: `Deleted nav item: ${existing.label}`, context: auditContext,
    });
  }

  static async reorder(orderedIds: string[], auditContext: AuditContext) {
    await db.$transaction(
      orderedIds.map((id, index) => db.navItem.update({ where: { id }, data: { order: index } }))
    );
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "NavItem",
      summary: "Reordered nav items", context: auditContext,
    });
  }
}
