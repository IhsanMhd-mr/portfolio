import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { dashboardService } from "@/services/dashboard.service";

export async function GET(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  try {
    const data = await dashboardService.getOverview(context.userId, context.sid);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
