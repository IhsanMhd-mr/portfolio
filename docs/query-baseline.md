# `GET /` Query Baseline

Regression baseline for the public homepage's database access. Re-run the checks in
**How to re-measure** before/after any change that touches
`src/services/public-content.service.ts`, the public templates, or the homepage sections.

Last verified: 2026-08-24 (branch `test`). Preview rows corrected 2026-08-26.

---

## Frozen baseline

⚠️ **The query count depends on runtime state.** The headline figure below is the
*published + active snapshot* case. One other state legitimately measures higher — do not
treat it as a regression:

| State | Queries | Section structure queried | `flattenOrdered` serial? |
|---|---:|---|---|
| **Published + active snapshot** (the baseline) | **23** | no | n/a |
| **Published, no snapshot yet** (fresh install) | ~26 | yes | yes |

> **Updated 2026-08-26: the preview row is gone because the feature is.** This table
> previously listed a third state, "Preview (owner previewing drafts)", at 26 queries.
> Preview mode has since been removed entirely (`src/lib/preview-mode.ts` deleted, the
> `isPreview` parameter dropped from `PublicContentService` — see `docs/open-issues.md`
> item 3). The public site now resolves PUBLISHED content unconditionally, so that state
> is no longer reachable and its measurements are not comparable to anything current.

The extra three come from `resolveSections()` falling through to
`SectionGroupService.flattenOrdered()` (`public-content.service.ts:355`) instead of
parsing the stored snapshot. **In that state there is a genuine serial stage:** the
section queries execute dead last, after the whole parallel wave. On Neon
(~250 ms/query) that adds roughly 250–750 ms.

The "no waterfall" property documented below therefore holds for the **published+snapshot
path only**. A fresh install measuring 26 is expected, not a regression.

```text
GET /  (published + active snapshot)
Prisma queries:            23
IN(NULL) queries:           0
Duplicate query groups:     0
42-column project_versions: 0
React key warnings:         0
Blank technology tags:      0
```

**Admin routes:** 3 queries (`site_profiles` + its 2 media relations). The public template
is deliberately not resolved there — see "Admin exemption" below. `/admin/templates` is the
exception at 6.

```text
tsc:                 PASS
eslint:              PASS
next build:          PASS
routes (7 public):   PASS  (all 200)
admin routes:        PASS  (307 redirect when unauthenticated)
HTML semantic diff:  PASS  (only intended change vs previous build)
```

Per-route query counts (same run):

| Route | Queries |
| --- | --- |
| `/` | 23 |
| `/projects/livedet` | 18 |
| `/projects` | 16 |
| `/resume` | 14 |
| `/about` | 12 |
| `/timeline` | 12 |
| `/contact` | 9 |

### Timing

| Environment | Queries | GET / | Notes |
| --- | --- | ---: | --- |
| Local Postgres | 23 | ~472 ms | Stable, low variance. Use this for regression checks. |
| Neon (cloud) | 23 | ~1.3–1.6 s | High variance; ~250 ms per query round-trip. |

Neon timing is **not** a reliable regression signal — its latency drifts substantially
under repeated load (observed 1.3 s → 3.3 s → 14 s+ across one session). Treat
**query count** as the authoritative metric and local timing as the secondary one.

---

## The 23 queries, by purpose

Three server components each contribute a group. They render concurrently, so these
are **two overlapping parallel waves, not a 23-step chain** (see Execution shape).

### A. Root layout — `src/app/layout.tsx`
Resolves the template skin and colour theme for `<html>`.

| # | Query | Caller | Consumer | Rows | Conditional? |
| --- | --- | --- | --- | ---: | --- |
| 1 | `pages` | `resolveTemplateKey` → `getHomePageRecord` | `data-template` attr | 1 | no |
| 2 | `page_versions` | ↳ relation | active template key | 1 | no |
| 3 | `templates` | ↳ relation | template key enum | 1 | no |
| 4 | `site_profiles` | `getSiteProfile` | `defaultTheme` + all profile UI | 1 | no |
| 5–6 | `media_assets` ×2 | ↳ `profileImage`, `cvFile` | hero avatar, CV link | 0–1 | no |

Queries 1–4 are `cache()`-wrapped and **shared** with groups B and C — this is why
they appear once per request rather than three times.

### B. Public layout — `src/app/(public)/layout.tsx`
Navbar/footer chrome via `getPublicChrome`.

| # | Query | Consumer | Rows |
| --- | --- | --- | ---: |
| 7 | `nav_items` | Navbar links (falls back to defaults if empty) | 0 |
| 8 | `social_links` | Footer "Connect" | 2 |

(`site_profiles` reused from group A — no extra query.)

### C. Homepage — `getHomePageData` (one `Promise.all`)
Eight independent root fetches plus their relation loads.

| # | Query | Consumer UI | Rows | Cols |
| --- | --- | --- | ---: | ---: |
| 9 | `technologies` | TechnologyStack, StackGame | 36 | 1 |
| 10 | `technology_versions` | ↳ name/category/experienceLabel | 36 | 7 |
| 11 | `projects` | Featured/Grid/Other projects | 5 | 2 |
| 12 | `project_versions` | ↳ title/summary/category/links | 5 | 10 |
| 13 | `project_technologies` | ↳ join rows only; names resolved in memory | 5 | 1 |
| 14 | `media_assets` | ↳ project `thumbnail` | 0–5 | 2 |
| 15 | `timeline_entries` | ProjectTimeline | 3 | 1 |
| 16 | `timeline_entry_versions` | ↳ title/dates/description | 3 | 7 |
| 17 | `projects` (2nd) | ↳ `linkedProject.slug` only | ≤3 | 1 |
| 18 | `education` | EducationExperience | 2 | 1 |
| 19 | `education_versions` | ↳ institution/qualification/dates | 2 | 9 |
| 20 | `experience` | EducationExperience | 1 | 1 |
| 21 | `experience_versions` | ↳ role/org/dates/description | 1 | 9 |
| 22 | `certifications` | Certifications section | 0 | all |
| 23 | `game_settings` | StackGame (mode/ball config) | 1 | all |

---

## Execution shape

```text
root layout ─┬─ getHomePageRecord (pages → page_versions, templates)
             └─ getSiteProfile (→ media ×2)
                        │  (concurrent)
public layout ── getPublicChrome (nav_items, social_links)
                        │  (concurrent)
homepage ─── Promise.all ─┬─ technologies ──→ technology_versions
                          ├─ projects ──────→ project_versions / project_technologies / media
                          ├─ timeline ──────→ versions / linkedProject
                          ├─ education ─────→ versions
                          ├─ experience ────→ versions
                          ├─ certifications
                          ├─ game_settings
                          └─ site_profiles (cache hit)
```

**Verified not sequential.** `getHomePageData` awaits `resolveSections()` and
`resolveTemplateKey()` after its `Promise.all` (service lines ~287–288), which *looks*
like a waterfall — but both hit the `getHomePageRecord` cache already warmed by the
root layout rendering concurrently. Evidence: `pages` executes at position **11 of 23**
(mid-stream, not last) and `pages`/`page_versions`/`templates` each appear exactly
**once** per request.

⚠️ **Cache-order invariant — read before touching `src/app/layout.tsx`.**

Those two tail awaits (`public-content.service.ts:287-288`) are free *only because* the root
layout calls `resolveTemplateKey` concurrently, warming the `getHomePageRecord` cache while
the `Promise.all` is still in flight.

Removing that call would **not change the query count** — `getHomePageRecord` runs either
way. It would convert 3 cached reads into a **serial stage** after the `Promise.all`
(~250–750 ms on Neon). The cost is invisible to query-count checks, so a regression here
would pass every test in this document while making the page slower.

**If you modify the root layout, re-verify that `pages` still executes mid-stream** (around
position 11 of 23), not last.

**Admin exemption (intentional).** `src/app/layout.tsx` skips `resolveTemplateKey()` when
`x-pathname` starts with `/admin`, because `[data-admin="true"]` in `src/styles/admin.css`
redefines every template token the admin renders with — the resolved value was discarded.
This does **not** weaken the invariant above: `getHomePageData` never runs on admin routes,
so there are no tail awaits to keep warm there.

Two traps if you edit that condition:
1. `/admin/templates` is deliberately **excluded** from the skip — it live-previews template
   switching by writing `data-template` client-side, so it needs the real value server-rendered.
2. The test must be "**skip if** `startsWith('/admin')`", never "resolve only if known".
   `proxy.ts`'s matcher is `["/admin/:path*", "/"]`, so `x-pathname` is **empty** on
   `/about`, `/projects`, etc. Inverting it strips the template from every non-homepage
   public route.

---

## Retained by design

Each remaining repeat is justified — do not "optimise" these away without new evidence:

- **`projects` ×2** (#11, #17) — the second resolves `timelineEntry.linkedProject.slug`.
  Resolving from the in-memory list would break for a timeline entry linking a project
  whose version is hidden (and therefore absent from the main list).
- **`media_assets` ×3** (#5, #6, #14) — `profileImage`, `cvFile`, project `thumbnail`.
  All three are rendered.
- **`certifications` / `game_settings` fetched unconditionally** — the section list
  resolves *after* the `Promise.all`, so gating on section presence would serialise the
  request to save one query. Not worth it.
- **Separate `*_versions` queries** — Prisma splits relation loads; collapsing them
  needs raw SQL, which is explicitly out of scope.

## Known remaining over-fetch (accepted, not a regression)

Four queries still select every column. Each returns 0–2 rows, so the payload cost is
negligible and projecting them would add churn for no measurable gain. Recorded here so
a future audit doesn't "rediscover" them as new findings:

| Query | Cols fetched | Cols used | Rows |
| --- | ---: | ---: | ---: |
| `game_settings` | 17 | 4 (`mode`, `ballCount`, `ballSize`, `fallingSpeed`) | 1 |
| `certifications` | 12 | ~6 | 0 |
| `social_links` | 12 | 4 (`id`, `platform`, `label`, `url`) | 2 |
| `nav_items` | 7 | 2 (`label`, `target`) | 0 |

Revisit only if these tables grow substantially (e.g. many certifications).

## Explicitly out of scope

- **Do not** pursue "23 → 15 with raw SQL" unless profiling proves these round-trips are
  the actual bottleneck.
- **Do not** merge genuinely distinct entity queries to lower the count.

---

## Interaction boundaries (lazy-load rules)

Verified correct — data must **not** move earlier than these triggers:

| Trigger | Loads | Status |
| --- | --- | --- |
| `GET /` | homepage content only | ✅ |
| Login clicked | auth/session work | ✅ `AuthDialog` fetches nothing; `isOpen`-guarded; sign-in happens on submit |
| Media picker opened | media list | ✅ `MediaPickerModal` guards `if (!open) return` before `fetch` |
| Project opened | full case-study detail | ✅ long-form fields live on `/projects/[slug]`, never on `/` |
| Anonymous visit | no auth queries | ✅ JWT strategy short-circuits before Prisma |

The homepage does **not** compute owner state: no public section renders owner-only UI,
so `getValidatedOwner()` was removed from `(public)/page.tsx`. Reintroduce it there only
if owner-only JSX is actually added.

---

## How to re-measure

With the dev server running and its output tee'd to `$LOG`:

```bash
# warm first — dev compiles on demand
for i in 1 2 3; do curl -s -o /dev/null http://localhost:3000/; sleep 5; done

b=$(grep -c 'prisma:query' "$LOG")
curl -s -o /dev/null http://localhost:3000/
sleep 4
a=$(grep -c 'prisma:query' "$LOG")
echo "queries: $((a-b))"          # expect 23

# regression signals
grep 'prisma:query' "$LOG" | grep -c 'IN (NULL)'   # expect 0
grep -c 'key" prop' "$LOG"                          # expect 0
curl -s http://localhost:3000/ \
  | grep -oE '<span[^>]*bg-\[var\(--bg-inset\)\][^>]*></span>' | wc -l   # expect 0
```

Prefer **local Postgres** (`npm run dev`) for regression runs — Neon's variance swamps
the signal. When comparing two code versions, measure them **adjacently** and interleaved;
a non-adjacent A/B on Neon produced a false 900 ms "regression" that vanished once the
runs were made adjacent.
