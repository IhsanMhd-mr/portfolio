# Checkpoint 009: Query Optimization, Preview Authorization & Mobile Sandbox

**Date:** August 25, 2026
**Status:** ✅ Complete — `npm run build` passes (0 errors), `tsc --noEmit` and `eslint` clean

---

## 1. Content migrated to real CV data

- Wiped placeholder content and repopulated every content model from the owner's CV
  (`scripts/populate-from-cv.js`): SiteProfile, 36 Technologies, 2 Education, 1 Experience,
  5 Projects, 3 Timeline entries, 2 SocialLinks. Applied to both the local and Neon databases.
- Removed AI-agent files from git tracking and history; `.gitignore` now covers
  `CLAUDE.md`, `AGENTS.md`, `.claude/`.

## 2. Database query optimization (`GET /`: 31 → 23 queries)

Root causes found and fixed in `src/services/public-content.service.ts`:

- **Request-level deduplication.** `cache()` from React was used in exactly one file
  (`require-admin.ts`). `generateMetadata()` and the page body each fetched the same data
  independently, and the root/public layouts resolved chrome separately. Wrapped
  `getHomePageData`, `getPublicChrome`, `getSiteProfile`, `getHomePageRecord`,
  `resolveSections` and `resolveTemplateKey`.
- **Dead fetches removed:** `project.images` + nested media, `experience.technologies`
  (3-level join feeding an unrendered field), `certification.media`,
  `timelineEntry.linkedProject.versions`.
- **Projections:** `project_versions` 42 → 10 columns (all long-form case-study text was
  fetched and discarded, twice); `technology_versions` 16 → 7.
- **De-fragmented technologies:** the full technology list is already in memory, so project
  chips resolve from a `Map` instead of a third nested round trip.
- **SQL-side visibility filtering** replaced per-entity JS `.filter()` passes.
- **Removed dead `isOwner` plumbing** — threaded into every section, read by none.

**Result:** 3 → 0 `IN (NULL)` queries, all duplicate-table groups eliminated. Baseline
frozen in `docs/query-baseline.md` with a re-measurement procedure.

## 3. Correctness bugs found during the audit

- **Blank technology tags (user-visible).** `FeaturedProjectsSection` read `.name` off
  `Technology`, but `name` lives on `TechnologyVersion` — five empty pills rendered. Now
  shows Python, YOLO11, PyTorch, OpenCV, MiDaS.
- **Thumbnails could never render (latent).** `thumbnail` is a `ProjectVersion` relation
  that was never included, so `project.thumbnail?.url` was always `undefined`.
- **`key` spread into JSX.** `ProfessionalMinimalTemplate` and `Interactive3DTemplate`
  placed `key` inside the spread props object — 8 server warnings per request, now 0.
- **Admin change-password redirect loop.** A redundant `router.refresh()` after
  `router.push()` in `LoginForm` and `ChangePasswordForm` caused a ~350 ms self-navigation
  loop; ~80 requests reduced to 3.

## 4. Preview-mode authorization (P0)

The `portfolio_preview_mode` cookie was written behind `requireAdmin()` but every read
trusted its presence. `httpOnly` prevents JavaScript reading a cookie; it does not stop a
client sending one.

**Proven with a canary fixture** (a DRAFT row set to `visible=false`): an unauthenticated
request with a forged cookie returned unpublished, explicitly-hidden content — 4 occurrences
on `/`, 10 on `/projects/livedet`. `/projects/[slug]` is not even covered by the proxy matcher.

**Fix:** new `src/lib/preview-mode.ts` exporting a `cache()`-wrapped `resolvePreviewMode()`
— returns `false` before any DB access when the cookie is absent, otherwise validates
ownership via `getValidatedOwner()`. All five derivation sites converted. Dead `x-preview`
header removed from `proxy.ts`.

| Request | before | after |
|---|---:|---:|
| anonymous + forged cookie → `/` | 4 | **0** |
| anonymous + forged cookie → `/projects/livedet` | 10 | **0** |
| authenticated owner previewing | 4 | **4** (unchanged) |

## 5. Cold-start connection timeouts

Neon cold connects measured at 5.3 / 14.2 / 5.9 s, but `initialize.js`, `seed-content.js`
and `verify-initialization.js` gave up at 5 s and `src/prisma/seed.ts` had no timeout at
all — the cause of `Connection terminated due to connection timeout` on `npm run dev`.
All four raised to 10 s with an explanatory comment.

## 6. Mobile: sandbox sphere labels rendered off-canvas

The rotating-sphere radius was hardcoded to `150` px while the projection
(`scale = 250/(250+z3d)`) magnifies up to 2.5×, projecting nodes to `width/2 + 375` —
562 px on a 375 px canvas. Nodes are now unit vectors with a width-derived radius applied
per frame (so resize works): `r = min(150, extent·P/(P+extent))`. Desktop keeps 150 and is
visually unchanged; 375 px yields ≈ 90. Verified at 320 / 375 / 390 / desktop.

## 7. Admin: mobile horizontal overflow

An admin-wide sweep (Edge, 375 px and 1280 px, all 18 admin routes) found four routes
scrolling the entire page sideways: `/admin/audit-log` (886 px), `/admin/projects` (586),
`/admin/profile` (489), `/admin/page-builder` (391).

**Cause:** the content shell in `src/app/admin/layout.tsx` is a flex item and so defaulted
to `min-width: auto`, refusing to shrink below its content. The `overflow-x-hidden min-w-0`
already on `<main>` was ineffective because its parent had expanded first.

**Fix:** added `min-w-0` to that shell. All four routes now measure exactly 375 px; desktop
unchanged. The audit-log table's existing `overflow-x-auto` wrapper — previously inert —
now scrolls correctly (341 px of 852 px visible) rather than the content being unreachable.

## 8. Environment & deployment

- `dev` / `dev:cloud` scripts select local Postgres vs Neon via `DB_TARGET`; both
  connection strings live in `.env`.
- Fixed `next-auth` ↔ Next 16 peer conflict (`beta.25` → `beta.32`); added
  `postinstall: prisma generate` so fresh deploys have a typed client.
- Removed the GitHub Pages workflow — this app is server-rendered (all 43 routes dynamic,
  13 API routes, Prisma + Auth.js) and cannot run on static hosting.
- Deleted `docs/.env`, a redundant copy of the Neon production credentials (gitignored and
  untracked, so never exposed, but unnecessary).

---

## Verification

| Check | Result |
|---|---|
| `npm run build` | ✅ 0 errors |
| `tsc --noEmit` | ✅ clean |
| `eslint --quiet` | ✅ clean |
| `GET /` query count | ✅ 23 (baseline held) |
| Public routes (7) | ✅ all 200 |
| Admin routes unauthenticated | ✅ 307 redirect |
| Admin routes @375px (18 routes) | ✅ no horizontal overflow |
| Forced password-change flow | ✅ login → change → dashboard |
| Owner preview | ✅ still renders drafts |
| Canary leak test | ✅ 0 for anonymous |

## Known / deferred

- Preview and never-published states cost ~26 queries with a serial `flattenOrdered` stage
  (documented in `docs/query-baseline.md`, not a regression).
- `/admin/*` still resolves the public homepage template (3 queries) it never uses; the
  admin zone overrides those tokens via `[data-admin="true"]`. Deferred — see
  `docs/open-issues.md`.
- "Edge light mode stays dark" could not be reproduced: a clean Edge profile toggles
  correctly. Evidence points to a browser-side forced-dark layer (Dark Reader was visible
  in an earlier hydration trace). Needs an InPrivate check to confirm.
