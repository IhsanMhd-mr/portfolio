import db from "@/lib/database";

/**
 * AuditLogService — read-only access to the audit trail.
 *
 * Entries are written by `recordAudit` from inside the domain services; there
 * is deliberately no create/update/delete here. An audit log a caller can
 * rewrite is not an audit log.
 */

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  search?: string;
}

export class AuditLogService {
  /**
   * One page of the signed-in owner's own entries.
   *
   * Scoped to `actorId` by construction rather than by an optional filter —
   * the viewer is the only actor in a single-owner CMS, and taking the id as a
   * required argument means a caller cannot accidentally list everyone's.
   */
  static async listPageForActor(
    actorId: string,
    filters: AuditLogFilters,
    page: number,
    limit: number
  ) {
    const where: {
      actorId: string;
      action?: string;
      entityType?: string;
      summary?: { contains: string; mode: "insensitive" };
    } = { actorId };

    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.search) where.summary = { contains: filters.search, mode: "insensitive" };

    const [total, entries] = await db.$transaction([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          summary: true,
          loginMethod: true,
          ipAddress: true,
          createdAt: true,
          beforeJson: true,
          afterJson: true,
        },
      }),
    ]);

    return { total, totalPages: Math.max(1, Math.ceil(total / limit)), entries };
  }
}
