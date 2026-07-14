/**
 * initialize-owner.ts — One-time CLI script to create the canonical portfolio owner.
 *
 * Usage:
 *   npm run admin:init
 *
 * Environment variables (set in .env, remove after running):
 *   INITIAL_ADMIN_USERNAME=ihsan
 *   INITIAL_ADMIN_EMAIL=owner@example.com
 *   INITIAL_ADMIN_PASSWORD=SomeStr0ngPass!
 *
 * Safety rules:
 *   - Refuses to run if a valid owner already exists (must be idempotent).
 *   - Validates username, email, and password strength.
 *   - Hashes password using PBKDF2-SHA256 (600k iterations).
 *   - Sets mustChangePassword = true so the owner changes it on first login.
 *   - Never prints the plaintext password.
 *   - Warns the developer to remove the env vars after running.
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const db = new PrismaClient();

async function main() {
  console.log("\n🔐  Portfolio Owner Initialization\n");

  const username = process.env.INITIAL_ADMIN_USERNAME?.trim();
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  // ── Validate inputs ──────────────────────────────────────────────────────────
  if (!username || !email || !password) {
    console.error(
      "❌  Missing required environment variables:\n" +
        "    INITIAL_ADMIN_USERNAME\n" +
        "    INITIAL_ADMIN_EMAIL\n" +
        "    INITIAL_ADMIN_PASSWORD"
    );
    process.exit(1);
  }

  if (!/^[a-z0-9_.-]{3,32}$/i.test(username)) {
    console.error("❌  Invalid username. Use 3–32 alphanumeric characters, dots, underscores, or hyphens.");
    process.exit(1);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("❌  Invalid email address.");
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("❌  Password must be at least 12 characters long.");
    process.exit(1);
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const strengthCount = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (strengthCount < 3) {
    console.error(
      "❌  Password must contain at least 3 of: uppercase, lowercase, digits, special characters."
    );
    process.exit(1);
  }

  // ── Check existing users ────────────────────────────────────────────────────
  const userCount = await db.user.count();

  if (userCount === 0) {
    // New installation — create the owner
    console.log("ℹ️   No existing users found. Creating owner account...");

    const passwordHash = await hashPassword(password);

    const owner = await db.user.create({
      data: {
        username,
        email,
        name: username,
        passwordHash,
        mustChangePassword: true,
      },
    });

    console.log(`\n✅  Owner account created successfully!`);
    console.log(`    ID:       ${owner.id}`);
    console.log(`    Username: ${owner.username}`);
    console.log(`    Email:    ${owner.email}`);
    console.log(`    mustChangePassword: true\n`);
  } else if (userCount === 1) {
    // Existing single owner — offer safe update path
    const existing = await db.user.findFirst();
    console.log(`\n⚠️   One existing user found: ${existing?.username} <${existing?.email}>`);
    console.log("    The owner account already exists. No changes made.");
    console.log("    To update the password, use the Security Settings page instead.\n");
  } else {
    // Multiple users — stop and require manual consolidation
    console.error(
      `\n❌  Found ${userCount} user records. This application is designed for a single owner.\n` +
        "    Please consolidate users manually before running this command.\n"
    );
    process.exit(1);
  }

  console.log(
    "⚠️   IMPORTANT: Remove INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_EMAIL, and\n" +
      "    INITIAL_ADMIN_PASSWORD from your .env file now to keep your credentials safe.\n"
  );
}

main()
  .catch((e) => {
    console.error("❌  Initialization failed:", e.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
