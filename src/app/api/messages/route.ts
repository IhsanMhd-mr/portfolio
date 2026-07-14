import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function POST(request: Request) {
  try {
    const { name, email, subject, message, category } = await request.json();

    // Server-side validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Name, email, subject, and message are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Insert message into the database
    const newMessage = await db.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
        category: category || "GENERAL",
        status: "NEW",
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
