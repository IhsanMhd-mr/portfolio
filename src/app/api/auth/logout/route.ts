import { NextResponse } from "next/server";
import { auth, clearAuthCookies } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import db from "@/lib/database";

export async function POST() {
  try {
    const session = await auth();
    const user = session?.user as any;
    const sid: string | undefined = user?.sid;

    if (sid) {
      // Soft-revoke the TrackedSession (preserves history for audit)
      await db.trackedSession.update({
        where: { sid },
        data: { revokedAt: new Date(), revokeReason: "LOGOUT" },
      });

      // Log the logout
      await recordAudit({
        action: "LOGOUT",
        entityType: "User",
        entityId: user?.id,
        summary: `Owner logged out`,
        context: {
          actorId: user?.id,
          loginMethod: user?.loginMethod,
          loginAccountId: user?.loginAccountId,
        },
      });
    }

    // Clear Auth.js cookies so the browser JWT is gone
    await clearAuthCookies();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
