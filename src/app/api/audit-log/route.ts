/**
 * GET /api/audit-log
 * Returns paginated audit log entries for the admin UI.
 * Query params: page, limit, action, entityType, search
 */

import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { AuditLogService } from "@/services/audit-log.service";

export async function GET(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const action = searchParams.get("action") ?? undefined;
  const entityType = searchParams.get("entityType") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const { total, totalPages, entries } = await AuditLogService.listPageForActor(
    context.userId,
    { action, entityType, search },
    page,
    limit
  );

  return NextResponse.json({
    total,
    page,
    limit,
    totalPages,
    entries,
  });
}
