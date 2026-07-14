import { NextResponse } from "next/server";
import { deleteSession, getServerSession } from "@/lib/auth";
import db from "@/lib/database";

export async function POST() {
  try {
    const session = await getServerSession();
    
    if (session) {
      // Create Audit Log
      await db.auditLog.create({
        data: {
          action: "LOGOUT",
          entityType: "User",
          entityId: session.user.id,
          summary: `User ${session.user.email} logged out`,
          actorId: session.user.id,
        },
      });
    }

    // Delete session cookies
    await deleteSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
