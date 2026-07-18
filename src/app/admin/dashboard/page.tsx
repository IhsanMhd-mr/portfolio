import React from "react";
import DashboardClientPage from "@/components/admin/dashboard/DashboardClientPage";
import { requireAdmin } from "@/lib/require-admin";

export default async function AdminDashboardPage() {
  // Validate session immediately server-side
  await requireAdmin({ pathname: "/admin/dashboard" });

  return <DashboardClientPage />;
}
