import crypto from "crypto";
import db from "./database";

const LINK_INTENT_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates a one-time AccountLinkIntent for the given owner.
 * Returns the raw token (to be passed to the OAuth state parameter).
 * Only the SHA-256 hash is stored in the database.
 */
export async function createLinkIntent(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await db.accountLinkIntent.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + LINK_INTENT_TTL_MS),
    },
  });

  return rawToken;
}

/**
 * Validates a link intent token and marks it as completed.
 * Returns the userId it was created for, or null if invalid/expired.
 */
export async function consumeLinkIntent(rawToken: string): Promise<string | null> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const intent = await db.accountLinkIntent.findUnique({ where: { tokenHash } });

  if (!intent) return null;
  if (intent.completedAt) return null; // already used
  if (intent.expiresAt < new Date()) return null; // expired

  await db.accountLinkIntent.update({
    where: { id: intent.id },
    data: { completedAt: new Date() },
  });

  return intent.userId;
}

/**
 * Cleans up expired or completed link intents older than 1 hour.
 * Called lazily — no scheduled worker needed.
 */
export async function cleanLinkIntents(): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await db.accountLinkIntent.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: oneHourAgo } },
        { completedAt: { lt: oneHourAgo } },
      ],
    },
  });
}
