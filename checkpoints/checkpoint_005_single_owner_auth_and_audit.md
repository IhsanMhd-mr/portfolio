# Portfolio CMS — Agent Checkpoint

**Last updated:** 2026-07-14  
**Build status:** ✅ `npm run build` passes — 0 errors, 37 pages

---

## 1. Outstanding Work

Nothing outstanding from the current session. The single-owner auth migration is complete.

**Suggested next steps (not started):**
- Add `Security` and `Audit Log` links to the [`AdminSidebar`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/components/admin/AdminSidebar.tsx) component.
- Implement the `/admin/settings/security/change-password` page (standalone forced-redirect page for `mustChangePassword` flow). Currently the API (`POST /api/auth/change-password`) exists but there is no dedicated admin page at that route.
- Wire up the Google account linking flow: the `POST /api/auth/link-google` route issues an `AccountLinkIntent` token, but the OAuth callback in `[...nextauth]/route.ts` needs to validate that token and link the returned Google `Account` to the canonical owner rather than creating a second `User`.
- Write automated tests per the spec in `inputs_/6_single_owner_multiple_login_methods_audit_prompt.md` § 26.

---

## 2. User Knowledge

| Fact | Value |
|---|---|
| OS | Windows |
| Shell | PowerShell |
| PostgreSQL version | 17 (local) |
| PostgreSQL user | `postgres` |
| PostgreSQL password | `123` |
| Database name | `portfolio` |
| PostgreSQL data dir | `C:\Program Files\PostgreSQL\17\data` |
| Node path (no spaces) | `C:\PROGRA~1\PostgreSQL\17\bin\` |
| Next.js version | 16.2.10 |
| NextAuth version | `next-auth@5.0.0-beta.25` (install with `--legacy-peer-deps`) |
| Prisma version | 7.8.0 |

**PostgreSQL note:** The Windows service (`postgresql-x64-17`) fails to start due to local user privileges. PostgreSQL is launched manually as a background task via the `dev` / `start` npm scripts using `pg_ctl.exe start`. If the DB is unreachable, check that the background postgres process is still running.

---

## 3. Environment Variables (`.env`)

| Variable | Required for |
|---|---|
| `DATABASE_URL` | Prisma DB connection |
| `AUTH_SECRET` | NextAuth JWT signing (**must be set before production**) |
| `AUTH_GOOGLE_ID` | Google OAuth |
| `AUTH_GOOGLE_SECRET` | Google OAuth |
| `INITIAL_ADMIN_USERNAME` | One-time `npm run admin:init` (remove after running) |
| `INITIAL_ADMIN_EMAIL` | One-time `npm run admin:init` (remove after running) |
| `INITIAL_ADMIN_PASSWORD` | One-time `npm run admin:init` (remove after running) |

---

## 4. Architecture Overview

### Auth Flow
```
Browser JWT Cookie (encrypted, 8h TTL)
  │ contains: sid (random UUID)
  ▼
proxy.ts  ← optimistic JWT check, no DB (Next.js 16 Proxy)
  │
  ▼
requireAdmin()  ← DB check on every protected page/route/action
  ├── TrackedSession.sid exists?
  ├── revokedAt IS NULL?
  ├── expiresAt > now?
  ├── User still exists?
  └── mustChangePassword? → redirect /admin/settings/security/change-password
  │
  ▼
AdminContext { userId, sid, loginMethod, loginAccountId }
```

### Single-Owner Identity Model
```
User (one row — the portfolio owner)
  ├── Local credential  → Account { provider: "credentials" }
  ├── Google account A  → Account { provider: "google", providerAccountId: "sub_A" }
  └── Google account B  → Account { provider: "google", providerAccountId: "sub_B" }
```
- Unknown Google accounts are rejected in the `signIn` callback before a session is created.
- All `Account` rows share the same `userId`.

### Session Revocation
- `TrackedSession.revokedAt` = soft delete (history preserved).
- `requireAdmin()` detects revocation → calls `clearAuthCookies()` → redirects to `/admin/login?reason=session-revoked`.
- No redirect loop: login page is excluded from `requireAdmin()`.

### Audit Log
- `recordAudit(tx, { action, entityType, before, after, context })` runs **inside** `prisma.$transaction` with the content mutation — atomic.
- Recursively redacts: `password`, `passwordHash`, `token`, `secret`, `access_token`, `refresh_token`, `id_token`, `cookie`, `authorization`, `sessionToken`.
- Snapshot capped at 32 KB.

---

## 5. File Map — Key Files

### Auth & Security
| File | Purpose |
|---|---|
| [`src/lib/auth.ts`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/lib/auth.ts) | Full NextAuth config (lazy factory), credentials + Google providers, `jwt` callback creates `TrackedSession` with `sid`, `getServerSession()` compat wrapper |
| [`src/lib/auth-config.ts`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/lib/auth-config.ts) | Edge-safe config (no Node.js modules) — used by `proxy.ts` only |
| [`src/lib/require-admin.ts`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/lib/require-admin.ts) | `requireAdmin()` DAL + `safeRequireAdmin()` for Route Handlers |
| [`src/lib/password.ts`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/lib/password.ts) | `hashPassword` / `verifyPassword` — PBKDF2-SHA256 @ 600k iterations, legacy-compatible |
| [`src/lib/audit.ts`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/lib/audit.ts) | `recordAudit()` — recursive redaction, transaction-aware |
| [`src/lib/linking.ts`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/lib/linking.ts) | `AccountLinkIntent` lifecycle: `createLinkIntent`, `consumeLinkIntent`, `cleanLinkIntents` |
| [`src/proxy.ts`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/proxy.ts) | Next.js 16 Proxy (was `middleware.ts`) — optimistic JWT check only |

### API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | handlers | NextAuth catch-all |
| `/api/auth/logout` | POST | Soft-revoke session, clear cookies, audit LOGOUT |
| `/api/auth/sessions` | GET / DELETE | List all / revoke by `sid` |
| `/api/auth/change-password` | POST | Update hash, revoke other sessions |
| `/api/auth/link-google` | GET / POST | List linked accounts / initiate link intent |
| `/api/auth/unlink-google` | DELETE | Remove Google Account (enforces last-method rule) |
| `/api/audit-log` | GET | Paginated, filterable audit log |
| `/api/sections` | GET / PUT / POST / DELETE | Page-builder sections (transactional audit) |
| `/api/templates` | GET / POST | Template selection (transactional audit) |
| `/api/publish` | GET / POST | Publish page version (transactional audit) |

### Admin UI Pages
| Route | File |
|---|---|
| `/admin/login` | `src/app/admin/login/page.tsx` |
| `/admin/settings/security` | `src/app/admin/settings/security/page.tsx` |
| `/admin/audit-log` | `src/app/admin/audit-log/page.tsx` |

### Database
| File | Purpose |
|---|---|
| [`src/prisma/schema.prisma`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/prisma/schema.prisma) | Full schema — single-owner, no Role enum |
| [`src/prisma/seed.ts`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/prisma/seed.ts) | Seeds templates, sample owner (user: `admin`, pw: `admin123`), site profile, technologies, pages, social links, game settings |
| [`src/scripts/initialize-owner.ts`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/src/scripts/initialize-owner.ts) | One-time CLI: `npm run admin:init` |
| [`prisma.config.ts`](file:///c:/Users/ihsan/Documents/GitHub/portfolio/prisma.config.ts) | Prisma 7 config — DB URL, schema path, seed command |

---

## 6. Key Models (Prisma)

### User (single row — the owner)
```prisma
model User {
  id                 String    @id @default(cuid())
  username           String    @unique
  email              String    @unique
  name               String?
  passwordHash       String?   // "pbkdf2sha256:600000:salt:hash" or legacy "salt:hash"
  mustChangePassword Boolean   @default(false)
  avatarUrl          String?
  lastLoginAt        DateTime?
  accounts           Account[]
  trackedSessions    TrackedSession[]
  auditLogs          AuditLog[]
}
```

### TrackedSession
```prisma
model TrackedSession {
  sid          String    @unique   // embedded in JWT
  userId       String
  loginMethod  String              // "LOCAL" | "GOOGLE"
  accountId    String?             // Account.id when GOOGLE
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  revokedAt    DateTime?           // soft-delete — never physically removed
  revokeReason String?
}
```

### AuditLog
```prisma
model AuditLog {
  action         String    // e.g. "LOGIN_SUCCESS", "PROJECT_UPDATED"
  entityType     String
  entityId       String?
  summary        String?
  loginMethod    String?
  loginAccountId String?
  beforeJson     Json?     // redacted snapshot
  afterJson      Json?     // redacted snapshot
  ipAddress      String?
  userAgent      String?
  createdAt      DateTime  @default(now())
}
```

---

## 7. Useful Commands

```bash
# Start dev server (also starts PostgreSQL)
npm run dev

# Production build
npm run build

# One-time owner initialization
npm run admin:init

# Reset + push schema to DB (destructive)
node --env-file=.env node_modules/prisma/build/index.js db push --force-reset

# Re-generate Prisma client after schema change
node --env-file=.env node_modules/prisma/build/index.js generate

# Seed the database
node --env-file=.env node_modules/prisma/build/index.js db seed
```

### Seeded dev credentials
| Field | Value |
|---|---|
| Username | `admin` |
| Email | `admin@portfolio.com` |
| Password | `admin123` |
| `mustChangePassword` | `true` (change on first login) |

---

## 8. Work Completed This Session

1. **Schema** — Rewrote for single-owner: removed `Role`/`AuthProvider` enums, added `TrackedSession`, `AccountLinkIntent`, enhanced `AuditLog`.
2. **Auth** — Lazy NextAuth factory, `sid`-based session tracking, strict Google OIDC enforcement, backwards-compatible PBKDF2-SHA256 (600k) passwords.
3. **`requireAdmin()`** — Secure data-access-layer session validation for every admin route.
4. **`proxy.ts`** — Migrated to Next.js 16 Proxy convention (renamed from `middleware.ts`).
5. **Audit service** — Recursive redaction, transaction-aware, 32KB snapshot limit.
6. **API routes** — Sessions, change-password, link/unlink Google, audit-log endpoints.
7. **Transactional audit** — Sections, templates, and publish routes all wrap mutation + audit in `$transaction`.
8. **Admin UI** — Security Settings page (password, linked accounts, active sessions) and Audit Log page (filterable table, JSON diff viewer).
9. **CLI tool** — `npm run admin:init` with single-owner constraints and strong password validation.
10. **Seed** — Updated to new schema; database reset and reseeded successfully.
