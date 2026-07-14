/**
 * POST /api/auth/link-google — Initiate linking a new Google account.
 * Returns a one-time token to embed in the OAuth state parameter.
 *
 * GET  /api/auth/link-google/accounts — List linked Google accounts.
 */

import { NextResponse } from "next/server";
import { safeRequireAdmin } from "@/lib/require-admin";
import { createLinkIntent } from "@/lib/linking";
import db from "@/lib/database";

export async function POST(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const token = await createLinkIntent(context.userId);

  // The caller should redirect to:
  // /api/auth/signin/google?callbackUrl=/admin/settings/security&state=<token>
  // Auth.js will handle the OAuth dance; the callback validates the token.
  return NextResponse.json({ linkToken: token });
}

export async function GET(request: Request) {
  const { context, response } = await safeRequireAdmin(request);
  if (response) return response;

  const accounts = await db.account.findMany({
    where: { userId: context.userId, provider: "google" },
    select: {
      id: true,
      email: true,
      providerAccountId: true,
    },
  });

  return NextResponse.json(accounts);
}
