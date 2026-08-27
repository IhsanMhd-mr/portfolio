import db from "@/lib/database";
import { recordAudit, type ServiceAuditContext } from "@/lib/audit";

/**
 * CertificationService — owns the Certification domain (Phase 4).
 * Callers handle auth + input-shape validation; this service owns
 * persistence, ordering, and audit. Applies immediately (no draft state —
 * simple metadata, same policy as social links).
 */

export interface CertificationInput {
  title: string;
  issuer: string;
  issueDate?: Date | null;
  description?: string | null;
  credentialId?: string | null;
  credentialUrl?: string | null;
  mediaId?: string | null;
  visible?: boolean;
}

export class CertificationService {
  static async list(publicOnly = false) {
    return db.certification.findMany({
      where: publicOnly ? { visible: true } : undefined,
      include: { media: true },
      orderBy: { order: "asc" },
    });
  }

  /** One certification with the media relation the editor renders. */
  static async getById(id: string) {
    return db.certification.findUnique({
      where: { id },
      include: { media: { select: { filename: true, url: true } } },
    });
  }

  /**
   * Flips visibility in one step.
   *
   * The list page used to read the row, negate the flag, then call update()
   * passing title and issuer back in — a read-modify-write that reached into
   * the table from a route, and one that rewrites two unrelated columns to
   * change a boolean. Doing it here keeps the route out of the database and
   * touches only the column that changes.
   */
  static async toggleVisible(id: string, auditContext: ServiceAuditContext) {
    const current = await db.certification.findUnique({ where: { id } });
    if (!current) throw new Error("Certification not found.");

    const updated = await db.certification.update({
      where: { id },
      data: { visible: !current.visible },
    });

    await recordAudit({
      action: "CERTIFICATION_UPDATED",
      entityType: "Certification",
      entityId: id,
      summary: `${updated.visible ? "Showed" : "Hid"} certification: ${updated.title}`,
      context: auditContext,
    });

    return updated;
  }

  static async create(input: CertificationInput, auditContext: ServiceAuditContext) {
    const last = await db.certification.findFirst({ orderBy: { order: "desc" } });
    const created = await db.certification.create({
      data: { ...input, order: (last?.order ?? -1) + 1 },
    });
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "Certification", entityId: created.id,
      summary: `Added certification: ${input.title}`, context: auditContext,
    });
    return created;
  }

  static async update(id: string, input: CertificationInput, auditContext: ServiceAuditContext) {
    const existing = await db.certification.findUnique({ where: { id } });
    if (!existing) throw new Error("Certification not found.");
    const updated = await db.certification.update({ where: { id }, data: input });
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "Certification", entityId: id,
      summary: `Updated certification: ${input.title}`, context: auditContext,
    });
    return updated;
  }

  static async remove(id: string, auditContext: ServiceAuditContext) {
    const existing = await db.certification.findUnique({ where: { id } });
    if (!existing) throw new Error("Certification not found.");
    await db.certification.delete({ where: { id } });
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "Certification", entityId: id,
      summary: `Deleted certification: ${existing.title}`, context: auditContext,
    });
  }

  static async reorder(orderedIds: string[], auditContext: ServiceAuditContext) {
    await db.$transaction(
      orderedIds.map((id, index) => db.certification.update({ where: { id }, data: { order: index } }))
    );
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "Certification",
      summary: "Reordered certifications", context: auditContext,
    });
  }

  /** Swap a certification's `order` with its immediate neighbor — avoids refetching the full list. */
  static async moveOrder(id: string, direction: "up" | "down", auditContext: ServiceAuditContext) {
    return db.$transaction(async (tx) => {
      const current = await tx.certification.findUnique({ where: { id } });
      if (!current) return false;

      const neighbor = await tx.certification.findFirst({
        where: { order: direction === "up" ? { lt: current.order } : { gt: current.order } },
        orderBy: direction === "up"
          ? [{ order: "desc" }, { id: "desc" }]
          : [{ order: "asc" }, { id: "asc" }],
      });
      if (!neighbor) return false;

      await tx.certification.update({ where: { id: current.id }, data: { order: neighbor.order } });
      await tx.certification.update({ where: { id: neighbor.id }, data: { order: current.order } });

      await recordAudit({
        action: "SETTINGS_UPDATED", entityType: "Certification", entityId: id,
        summary: `Moved a certification ${direction} in the sequence`, context: auditContext, tx,
      });
      return true;
    });
  }
}
