import { NextResponse } from "next/server";
import crypto from "crypto";
import { ContactMessageService } from "@/services/contact-message.service";

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

    // Rate limiting and persistence live in the service; the handler only
    // maps the outcome onto a status code.
    const result = await ContactMessageService.submit({
      name,
      email,
      subject,
      message,
      category,
      ipHash: getClientIpHash(request),
    });

    if (result.rateLimited) {
      return NextResponse.json(
        { error: "Too many messages. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error("Messages API error:", error);
    return NextResponse.json(
      { error: "Failed to store message" },
      { status: 500 }
    );
  }
}
