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

---

# Addendum — preview feature removed, publish diff made truthful

Two follow-up changes landed after the checkpoint above was written. The first
supersedes the preview-authorization fix recorded earlier in this document.

## A. Draft-preview feature removed entirely

The preview-mode bypass was fixed above by validating the session instead of trusting the
cookie. The feature itself has now been **deleted**, so the surface is gone rather than
guarded.

**Removed:** `src/lib/preview-mode.ts`; `src/app/admin/preview/` (page + actions — the only
writers of the `portfolio_preview_mode` cookie); the six "Preview Draft" entry points
(admin layout, page-builder, publish-confirmation, and the three dashboard cards); and the
`isPreview` parameter threaded through `PublicContentService.getHomePageData` /
`resolveSections` / `resolveTemplateKey`, the root layout, both public pages, three
templates and twelve section components (~65 references).

**Behavioural consequences**, all intended:

- The public site resolves PUBLISHED versions unconditionally. No code path can serve a
  DRAFT or a `visible: false` row to anyone.
- `HeroSection`'s owner-only "Upload profile image" hint is gone.
- `CertificationsSection`'s `isPreview || c.visible` filter is now just `c.visible` —
  identical behaviour for public traffic, which always had `isPreview === false`.
- "View Live Site" is the only way to view the site from admin, and it shows published
  content. Draft/publish is otherwise unchanged.

Stale cookies in existing browsers are inert and expire on their own two-hour max-age.

## B. Publish change detection replaced with a real diff

**Symptom reported:** selecting a different template and then re-selecting the original one
still asked to publish.

**Cause:** `Page.hasUnpublishedChanges` is a sticky one-way latch — roughly forty service
call sites set it `true`, and only a successful publish sets it `false`. Nothing ever
re-examined whether the edit changed anything. The publish page ORed that flag in, so
A→B→A stayed "pending" forever even though `hasTemplateDiff` correctly computed `false`.

The same check was simultaneously **too weak**: `hasSectionsCountDiff` compared array
*length*, so a reorder or a per-section settings edit at equal count reported "no changes".

**Fix:** new `src/services/publish-diff.service.ts` computes an actual comparison across
the three axes a publish promotes — template key, the section snapshot (deep-compared,
built by the shared `buildSectionsSnapshot` the publish route now also uses), and per-entity
DRAFT-vs-PUBLISHED content across all five versioned types.

`PROMOTED_FIELDS` and `PROMOTION_DEFAULTS` are shared with `POST /api/publish` deliberately:
the value written and the value compared must be produced identically, or a field could be
published while the UI reported nothing to publish. `pickPromoted` is generic
(`Pick<T, K>`, not `Record<string, any>`) so Prisma still enforces required columns —
returning `any` silently disabled that check when first written.

`GET /api/publish` now also **self-heals the latch**: when the computed diff is empty but
the flag is set, it clears the flag. That is what makes A→B→A settle, and it clears the
admin sidebar's "unpublished changes" chip too. The flag is kept as a cheap conservative
hint for the sidebar and dashboard, which cannot afford a full diff on every page load.

### Two false positives found and fixed during verification

Null-vs-empty Json coercion runs in **both** directions in the real data, and normalizing
only one side left a permanent phantom change:

| Entity | Draft | Published | Cause |
|---|---|---|---|
| Timeline entries (3) | `externalLinks: null` | `{}` | publish coerces `null → {}` |
| Experience (1) | `responsibilities: []` | `null` | row predates the coercion |

`versionsDiffer` now normalizes both sides through `PROMOTION_DEFAULTS`.

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ clean |
| Residual `isPreview` / `preview-mode` / cookie refs in `src` | ✅ 0 |
| `GET /` | ✅ 200, published content, no owner-only markers |
| `GET /admin/preview` authenticated | ✅ 404 |
| `GET /api/publish` unauthenticated | ✅ 401 |
| Dashboard "Preview Draft" references | ✅ 0 |
| **Template A→B** | ✅ pending = true |
| **Template B→A (the reported bug)** | ✅ pending = **false** |
| Project title edit | ✅ detected, entity named; reverts clean |
| Section reorder at equal count | ✅ detected (old check missed this) |
| Section settings edit at equal count | ✅ detected (old check missed this) |
| Latch self-heal (forced `true` → GET) | ✅ cleared to `false` |

Note for future work: `scripts/dev-start.js` rewrites `DATABASE_URL` from
`DATABASE_URL_LOCAL` when `DB_TARGET=local`, but `src/lib/database.ts` reads only
`DATABASE_URL`. A standalone script run with `DB_TARGET=local` therefore hits **Neon**, not
local — set `DATABASE_URL="$DATABASE_URL_LOCAL"` explicitly instead.

## Known / deferred

- `dashboard.service.ts:217` returns a hardcoded `5` for `pendingChangeCount` with a
  `// Using standard mock placeholder` comment. Pre-existing; out of scope here.

---

# Addendum 2 — deep bug scan: four fixes

A full scan of the status/publish surface found 10 bugs. Four were fixed; six are recorded
in `docs/open-issues.md` §8. Three items initially suspected turned out **not** to be bugs
and are listed there too.

## N1. Three `ProjectVersion` columns were never promoted on publish (the significant one)

`PROMOTED_FIELDS.project` — inherited verbatim from the original `POST /api/publish` — omitted
13 columns. Three have public readers:

| Column | Read by | Symptom |
|---|---|---|
| `status` | `(public)/projects/[slug]/page.tsx:183,191` | Project status edits never reached the live page |
| `featured` | `FeaturedProjectsSection`, `OtherProjectsSection`, all 3 templates | Featuring never changed the live homepage |
| `showOnResume` | `(public)/resume/page.tsx` | Resume inclusion never changed |

The draft held the new value and the published row kept the old one **permanently** — and
because the diff shares `PROMOTED_FIELDS`, the UI truthfully reported "nothing to publish".
Both halves were blind to the same columns at once.

The omission was project-specific: `showOnResume` is promoted for technology, education and
experience; `status` is promoted for timeline entries. Only project omitted them.

**Fix:** added `status`, `featured`, `showOnResume` to `PROMOTED_FIELDS.project`. One edit
fixes promotion and detection together, because the list is shared. The other 10 columns
have no public reader today and were left — recorded as open issue 8.1.

**Verified end-to-end** against the local DB and a running server:

| Step | Result |
|---|---|
| Baseline | nothing pending |
| Flip `draft.status` COMPLETED → IN_PROGRESS | — |
| `GET /api/publish` | ✅ detects it, names LIVEDET (silent before the fix) |
| `POST /api/publish` | version 17 |
| `PUBLISHED.status` | ✅ COMPLETED → **IN_PROGRESS** (never changed before) |
| `/projects/livedet` | ✅ renders **"In Progress"**, was "COMPLETED" |
| Restore + republish | ✅ back to COMPLETED, diff clean |

The same cycle was run for `featured` and confirmed at the data layer (PUBLISHED row
promoted). Note its *render* impact could not be shown on this site: the homepage has no
Featured Projects section enabled (its sections are Hero, About, Tech Stack, Education,
Other Projects, Contact), so `featured` currently changes no visible output here.

## N2. Dead `ARCHIVED` project filter

`admin/projects/page.tsx` built `status: "ARCHIVED"`, but `ProjectStatus` is
`COMPLETED | IN_PROGRESS | PLANNED`. An `as const` cast kept TypeScript quiet. The status
dropdown also offered `MAINTAINED`, equally non-existent.

**Fix:** removed the Archived tab, both invalid dropdown options, and the filter branch.
Soft-deleted projects remain reachable via Trash Bin (`deletedAt`), a different axis.

## A1. Dashboard always read "5 Unpublished Changes"

`dashboard.service.ts:217` returned a hardcoded `5` (`// Using standard mock placeholder`);
the correct value computed at `:191` was dead code, shadowed by the literal.

**Fix:** `pendingChangeCount` now comes from `computePublishDiff()`, joined into the
existing `Promise.all` so it adds no round-trip latency:
`changedEntities.length + (hasTemplateDiff ? 1 : 0) + (hasSectionsDiff ? 1 : 0)`.
The dashboard card and the publish page now agree instead of contradicting each other.

**Verified:** one pending change → card reads **"1 Unpublished Changes"**; clean →
**"Your live portfolio is up to date"**, matching `GET /api/publish`.

## A2. Dashboard "draft projects" always equalled the total

`:103` counted projects having *any* DRAFT version — but every project always has one, that
being the editing model. The number could never be anything but the total.

**Fix:** the triple now describes **live** state throughout:

| Count | Definition |
|---|---|
| `published` | has a PUBLISHED version with `visible: true` |
| `draft` | has **no** PUBLISHED version (never went live) |
| `hidden` | has a PUBLISHED version with `visible: false` |

This also resolves the axis mismatch where `hidden` was querying DRAFT while `published`
queried PUBLISHED. **Verified:** `published + draft + hidden === total` (5 = 5), and
`draft === total` is now false where it was previously always true.

## Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ clean |
| `eslint --quiet` | ✅ clean |
| N1 status → live page | ✅ full chain, then restored |
| N1 featured → published row | ✅ promoted (no render impact on this site's sections) |
| A1 dashboard count | ✅ 1 when one change, "up to date" when none |
| A2 project triple | ✅ sums to total; draft no longer equals total |
| Local DB left clean | ✅ all 5 projects DRAFT/PUBLISHED titles match, diff empty |

## Documentation

`architecture.md` was refreshed: the stale `getHomePageData(isPreview)` pipeline corrected,
and a new §4 **Content Status Lifecycle** added — the two independent status axes, every
record and writer on each, the `PROMOTED_FIELDS` / `PROMOTION_DEFAULTS` promotion contract,
and N1 written up as the worked example of what a missing entry costs.

## Process note

A verification script used `findFirst` with no stable ordering to revert a temporary edit,
and matched a *different* row than the one it had dirtied, leaving a stray `(tmp)` title in
the local database. Caught and cleaned by matching on the marker rather than re-running the
selection. Mutating verification scripts must select by recorded id, never re-query.
