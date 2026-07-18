"use server";

import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/require-admin";

/**
 * Enable preview mode by setting secure HTTP-only cookie
 */
export async function enablePreviewModeAction() {
  // Check authorization
  await requireAdmin();

  const cookieStore = await cookies();
  cookieStore.set("portfolio_preview_mode", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 2, // 2 hours
    path: "/",
  });

  return { success: true };
}

/**
 * Disable preview mode by clearing cookie
 */
export async function disablePreviewModeAction() {
  const cookieStore = await cookies();
  cookieStore.set("portfolio_preview_mode", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return { success: true };
}
