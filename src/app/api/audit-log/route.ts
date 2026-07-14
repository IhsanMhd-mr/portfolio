/**
 * GET /api/audit-log
 * Returns paginated audit log entries for the admin UI.
 * Query params: page, limit, action, entityType, search
 */

import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import db from "@/lib/database";

export async function GET(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const action = searchParams.get("action") ?? undefined;
  const entityType = searchParams.get("entityType") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const where: any = { actorId: context.userId };
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (search) {
    where.summary = { contains: search, mode: "insensitive" };
  }

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

  return NextResponse.json({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    entries,
  });
}
