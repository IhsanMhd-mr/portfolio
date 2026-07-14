import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Authentication Helper
 * Uses Node's native crypto module (pbkdf2) for PBKDF2 hashing and crypto.createHmac
 * for signed session cookie tokens. This is dependency-free and Edge-compatible.
 */

const SESSION_COOKIE_NAME = "portfolio_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "super-secret-key-1234567890-change-in-prod";

export interface UserSession {
  user: {
    id: string;
    email: string;
    role: "ADMIN" | "OWNER";
  };
}

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

/**
 * Encrypts a payload into a signed session token.
 */
export async function encryptSession(payload: any): Promise<string> {
  const data = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
  return Buffer.from(`${data}.${signature}`).toString("base64");
}

/**
 * Decrypts and verifies a signed session token.
 */
export async function decryptSession(token: string): Promise<any | null> {
  try {
    const raw = Buffer.from(token, "base64").toString("utf-8");
    const parts = raw.split(".");
    if (parts.length < 2) return null;
    const signature = parts.pop();
    const data = parts.join(".");
    const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
    if (signature !== expectedSignature) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Retrieves the server session by parsing and validating the cookie.
 */
export async function getServerSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await decryptSession(token);
    if (!payload || !payload.userId) return null;

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null;
    }

    return {
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Sets a session cookie for an authenticated user.
 */
export async function setSession(userId: string, email: string, role: string) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const token = await encryptSession({ userId, email, role, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });
}

/**
 * Deletes the session cookie.
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Verifies if the active session belongs to an administrator/owner.
 */
export function isAdmin(session: UserSession | null): boolean {
  return session?.user.role === "ADMIN" || session?.user.role === "OWNER";
}

