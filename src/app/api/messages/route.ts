import { NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/database";

const MAX_LENGTHS = { name: 120, email: 254, subject: 200, message: 5000 };

function getClientIpHash(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown";
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message, category, website } = body;

    // Honeypot field — real users never fill this in
    if (website) {
      return NextResponse.json({ success: true });
    }

    // Server-side validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Name, email, subject, and message are required" },
        { status: 400 }
      );
    }

    for (const [field, max] of Object.entries(MAX_LENGTHS)) {
      if (typeof body[field] !== "string" || body[field].length > max) {
        return NextResponse.json(
          { error: `Field "${field}" is missing or too long (max ${max} characters)` },
          { status: 400 }
        );
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Rate limit: max 3 messages per IP per 10 minutes
    const ipHash = getClientIpHash(request);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await db.contactMessage.count({
      where: { ipHash, createdAt: { gte: tenMinutesAgo } },
    });
    if (recentCount >= 3) {
      return NextResponse.json(
        { error: "Too many messages. Please try again later." },
        { status: 429 }
      );
    }

    const newMessage = await db.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
        category: category || "GENERAL",
        status: "NEW",
        ipHash,
      },
    });

    return NextResponse.json({ success: true, id: newMessage.id });
  } catch (error) {
    console.error("Messages API error:", error);
    return NextResponse.json(
      { error: "Failed to store message" },
      { status: 500 }
    );
  }
}
