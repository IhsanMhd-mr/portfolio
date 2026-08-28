import crypto from "crypto";
import db from "@/lib/database";
import { normalizeEmail } from "@/lib/account-identity";
import { verifyPassword } from "@/lib/password";

const MAX_FAILURES_PER_IDENTIFIER = 10;
const MAX_FAILURES_PER_IP = 30;
const LOCK_THRESHOLD = 5;
const WINDOW_MS = 15 * 60 * 1000;
const DUMMY_HASH = "pbkdf2sha256:600000:dummysalt:dummyhash";

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export type CredentialAuthResult =
  | { ok: true; user: { id: string; email: string; name: string | null; role: string; mustChangePassword: boolean } }
  | { ok: false; reason: "invalid-credentials" | "account-locked" | "rate-limited" };

export class CredentialAuthService {
  static async authenticate(identifierInput: string, password: string, ip: string): Promise<CredentialAuthResult> {
    const identifier = identifierInput.trim();
    const normalizedIdentifier = normalizeEmail(identifier);
    const identifierHash = sha256(normalizedIdentifier);
    const ipHash = sha256(ip);
    const since = new Date(Date.now() - WINDOW_MS);

    const [identifierFailures, ipFailures] = await Promise.all([
      db.loginAttempt.count({
        where: { emailHash: identifierHash, success: false, createdAt: { gte: since } },
      }),
      db.loginAttempt.count({
        where: { ipHash, success: false, createdAt: { gte: since } },
      }),
    ]);
    if (identifierFailures >= MAX_FAILURES_PER_IDENTIFIER || ipFailures >= MAX_FAILURES_PER_IP) {
      return { ok: false, reason: "rate-limited" };
    }
    if (identifierFailures >= LOCK_THRESHOLD) {
      return { ok: false, reason: "account-locked" };
    }

    const user = await db.user.findFirst({
      where: {
        OR: [{ emailNormalized: normalizedIdentifier }, { username: identifier }],
      },
    });

    if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
      await verifyPassword(password, DUMMY_HASH);
      await db.loginAttempt.create({ data: { emailHash: identifierHash, ipHash, success: false } });
      return { ok: false, reason: "invalid-credentials" };
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    await db.loginAttempt.create({
      data: { emailHash: identifierHash, ipHash, success: passwordMatches },
    });
    if (!passwordMatches) return { ok: false, reason: "invalid-credentials" };

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }
}
