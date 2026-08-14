import db from "@/lib/database";
import { recordAudit } from "@/lib/audit";

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

type AuditContext = { actorId: string; loginMethod: string; loginAccountId: string | null };

export class CertificationService {
  static async list(publicOnly = false) {
    return db.certification.findMany({
      where: publicOnly ? { visible: true } : undefined,
      include: { media: true },
      orderBy: { order: "asc" },
    });
  }

  static async create(input: CertificationInput, auditContext: AuditContext) {
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

  static async update(id: string, input: CertificationInput, auditContext: AuditContext) {
    const existing = await db.certification.findUnique({ where: { id } });
    if (!existing) throw new Error("Certification not found.");
    const updated = await db.certification.update({ where: { id }, data: input });
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "Certification", entityId: id,
      summary: `Updated certification: ${input.title}`, context: auditContext,
    });
    return updated;
  }

  static async remove(id: string, auditContext: AuditContext) {
    const existing = await db.certification.findUnique({ where: { id } });
    if (!existing) throw new Error("Certification not found.");
    await db.certification.delete({ where: { id } });
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "Certification", entityId: id,
      summary: `Deleted certification: ${existing.title}`, context: auditContext,
    });
  }

  static async reorder(orderedIds: string[], auditContext: AuditContext) {
    await db.$transaction(
      orderedIds.map((id, index) => db.certification.update({ where: { id }, data: { order: index } }))
    );
    await recordAudit({
      action: "SETTINGS_UPDATED", entityType: "Certification",
      summary: "Reordered certifications", context: auditContext,
    });
  }
}
