import crypto from "crypto";

/**
 * Authentication Helper Scaffolding
 * Uses Node's native crypto module (pbkdf2) for platform-independent,
 * secure password hashing (no native binary dependencies needed for compilation).
 */

/**
 * Hashes a plain-text password using PBKDF2 with SHA-512.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, 10000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Compares a plain-text password against a hashed password signature.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = hash.split(":");
    if (parts.length !== 2) {
      resolve(false);
      return;
    }
    const [salt, key] = parts;
    crypto.pbkdf2(password, salt, 10000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString("hex") === key);
    });
  });
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    role: "ADMIN" | "USER";
  };
}

/**
 * Placeholder server session retriever.
 * Will be fully integrated with Auth.js/Supabase Auth in Phase 6.
 */
export async function getServerSession(): Promise<UserSession | null> {
  return null;
}

/**
 * Verifies if the active session belongs to an administrator.
 */
export function isAdmin(session: UserSession | null): boolean {
  return session?.user.role === "ADMIN";
}
