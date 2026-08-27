import db from "./database";

// Fields whose values must never appear in audit snapshots
const REDACTED_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "secret",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "idToken",
  "id_token",
  "cookie",
  "authorization",
  "sessionToken",
  "session_token",
]);

const MAX_SNAPSHOT_CHARS = 32_000;

/**
 * Recursively redacts sensitive fields from any JSON-serialisable object.
 */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 10) return "[truncated]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACTED_KEYS.has(k) ? "[REDACTED]" : redact(v, depth + 1);
  }
  return out;
}

function safeSnapshot(obj: unknown): unknown {
  if (!obj) return obj;
  const redacted = redact(obj);
  const json = JSON.stringify(redacted);
  if (json.length > MAX_SNAPSHOT_CHARS) {
    return { _truncated: true, _length: json.length };
  }
  return redacted;
}

/**
 * What `recordAudit` accepts. Deliberately all-optional — an entry can be
 * written from a context that does not know every field.
 */
export interface AuditContext {
  actorId?: string | null;
  loginMethod?: string | null;
  loginAccountId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * What a service requires from its caller.
 *
 * Stricter than `AuditContext`: a service mutation always knows who performed
 * it, so `actorId` and `loginMethod` are required rather than optional. Still
 * assignable to `AuditContext`, so `recordAudit({ context })` is unchanged.
 *
 * This exists because the shape was previously redeclared at 47 sites across
 * `src/services/` — 11 private `type AuditContext` aliases and 36 more inlined
 * straight into method signatures — in two different variants. Whether a
 * service could record an IP address depended on which file you were editing.
 */
export interface ServiceAuditContext {
  actorId: string;
  loginMethod: string;
  loginAccountId: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface RecordAuditOptions {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string;
  before?: unknown;
  after?: unknown;
  context: AuditContext;
  tx?: Parameters<Parameters<typeof db.$transaction>[0]>[0]; // Prisma transaction client
}

/**
 * Record a single audit log entry. If `tx` is provided the insert is part of
 * the same database transaction as the mutation — ensuring atomicity.
 */
export async function recordAudit({
  action,
  entityType,
  entityId,
  summary,
  before,
  after,
  context,
  tx,
}: RecordAuditOptions): Promise<void> {
  const client = (tx as typeof db | undefined) ?? db;
  await client.auditLog.create({
    data: {
      action,
      entityType,
      entityId: entityId ?? null,
      summary: summary ?? null,
      loginMethod: context.loginMethod ?? null,
      loginAccountId: context.loginAccountId ?? null,
      beforeJson: (before ? safeSnapshot(before) : null) as any,
      afterJson: (after ? safeSnapshot(after) : null) as any,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      actorId: context.actorId ?? null,
    },
  });
}
