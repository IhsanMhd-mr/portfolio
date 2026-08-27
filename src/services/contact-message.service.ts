import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

type AuditContext = {
  actorId: string;
  loginMethod: string;
  loginAccountId: string | null;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * ContactMessageService — the inbox behind the public contact form.
 *
 * These rows are visitor-submitted, so every mutation is audited. The admin
 * route previously updated them inline with no audit entry at all, which meant
 * a deleted enquiry left no record of who removed it or when.
 *
 * Deletion is soft (`deletedAt`), matching the rest of the codebase.
 */
export class ContactMessageService {
  /** One page of the inbox, newest first, excluding deleted messages. */
  static async listPage(page: number, pageSize: number) {
    const [total, messages] = await Promise.all([
      db.contactMessage.count({ where: { deletedAt: null } }),
      db.contactMessage.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, totalPages: Math.max(1, Math.ceil(total / pageSize)), messages };
  }

  /**
   * Flips NEW ⇄ READ.
   *
   * The route read the current status out of the form and sent back its
   * opposite, so a stale page could write a status derived from a value the
   * row no longer had. Reading it here makes the flip depend on the stored
   * state instead of on what the browser last rendered.
   */
  static async toggleRead(id: string, auditContext: AuditContext) {
    const current = await db.contactMessage.findUnique({ where: { id } });
    if (!current || current.deletedAt) throw new Error("Message not found.");

    const updated = await db.contactMessage.update({
      where: { id },
      data: { status: current.status === "NEW" ? "READ" : "NEW" },
    });

    await recordAudit({
      action: "CONTACT_MESSAGE_UPDATED",
      entityType: "ContactMessage",
      entityId: id,
      summary: `Marked message from ${updated.email} as ${updated.status}.`,
      context: auditContext,
    });

    return updated;
  }

  static async softDelete(id: string, auditContext: AuditContext) {
    const current = await db.contactMessage.findUnique({ where: { id } });
    if (!current || current.deletedAt) throw new Error("Message not found.");

    const updated = await db.contactMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await recordAudit({
      action: "CONTACT_MESSAGE_DELETED",
      entityType: "ContactMessage",
      entityId: id,
      summary: `Deleted message from ${current.email}.`,
      context: auditContext,
    });

    return updated;
  }
}
