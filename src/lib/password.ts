import crypto from "crypto";

/**
 * Secure password hashing using PBKDF2-SHA256 with 600,000 iterations (OWASP recommended).
 * Encoded format: "pbkdf2sha256:<iterations>:<salt_hex>:<hash_hex>"
 * This format allows future algorithm upgrades without breaking existing hashes.
 */

const ALGORITHM = "sha256";
const ITERATIONS = 600_000;
const KEY_LENGTH = 64; // bytes

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString("hex");
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, ALGORITHM, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`pbkdf2sha256:${ITERATIONS}:${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Support legacy format "salt:hash" (10,000 iterations PBKDF2-SHA512) from old seed
    if (!storedHash.startsWith("pbkdf2sha256:")) {
      const parts = storedHash.split(":");
      if (parts.length !== 2) { resolve(false); return; }
      const [salt, key] = parts;
      crypto.pbkdf2(password, salt, 10_000, 64, "sha512", (err, derivedKey) => {
        if (err) reject(err);
        else resolve(timingSafeEqual(derivedKey.toString("hex"), key));
      });
      return;
    }

    const segments = storedHash.split(":");
    if (segments.length !== 4) { resolve(false); return; }
    const [, iterStr, salt, key] = segments;
    const iterations = parseInt(iterStr, 10);
    if (isNaN(iterations)) { resolve(false); return; }

    crypto.pbkdf2(password, salt, iterations, KEY_LENGTH, ALGORITHM, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(timingSafeEqual(derivedKey.toString("hex"), key));
    });
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
