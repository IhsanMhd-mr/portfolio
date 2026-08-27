import db from "@/lib/database";
import { recordAudit, type ServiceAuditContext } from "@/lib/audit";

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
  /** Max submissions allowed from one IP hash within the window below. */
  static readonly RATE_LIMIT = 3;
  static readonly RATE_WINDOW_MS = 10 * 60 * 1000;

  /**
   * Records a submission from the public contact form.
   *
   * Returns `{ rateLimited: true }` rather than throwing, because the caller
   * answers it with a 429 rather than an error page. The limit is keyed on a
   * hash of the client IP, not the address itself — the raw IP is never
   * stored.
   */
  static async submit(input: {
    name: string;
    email: string;
    subject: string;
    message: string;
    category?: string | null;
    ipHash: string;
  }): Promise<{ rateLimited: true } | { rateLimited: false; id: string }> {
    const since = new Date(Date.now() - ContactMessageService.RATE_WINDOW_MS);
    const recentCount = await db.contactMessage.count({
      where: { ipHash: input.ipHash, createdAt: { gte: since } },
    });
    if (recentCount >= ContactMessageService.RATE_LIMIT) return { rateLimited: true };

    const created = await db.contactMessage.create({
      data: {
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        category: (input.category || "GENERAL") as never,
        status: "NEW",
        ipHash: input.ipHash,
      },
    });

    return { rateLimited: false, id: created.id };
  }

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
  static async toggleRead(id: string, auditContext: ServiceAuditContext) {
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

  static async softDelete(id: string, auditContext: ServiceAuditContext) {
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
