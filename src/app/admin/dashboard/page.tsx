import React from "react";
import DashboardClientPage from "@/components/admin/dashboard/DashboardClientPage";
import { requireAdmin } from "@/lib/require-admin";
import { currentPathname } from "@/lib/current-pathname";
import { dashboardService } from "@/services/dashboard.service";

export default async function AdminDashboardPage() {
  const ctx = await requireAdmin(await currentPathname());
  const data = await dashboardService.getOverview(ctx.userId, ctx.sid);

  return <DashboardClientPage initialData={data} />;
}
