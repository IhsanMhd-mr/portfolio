/**
 * GET /api/auth/link-google — list safe linked-method metadata.
 * Linking starts through POST /api/auth/google/start.
 */

import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { LinkedAccountService } from "@/services/linked-account.service";

export async function GET(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const accounts = await LinkedAccountService.listGoogleAccounts(context.userId);

  return NextResponse.json({
    accounts,
    role: context.role,
    googleLinkingAllowed: context.role !== "SUPERADMIN",
  });
}
