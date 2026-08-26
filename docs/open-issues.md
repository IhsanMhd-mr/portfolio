# Open Issues — investigation results

Every item below was investigated against the running app. Findings are marked
**CONFIRMED** (reproduced with evidence), **NOT REPRODUCED** (tested and came back clean),
or **ATTRIBUTED** (real symptom, cause outside our code).

---

## 1. Cold-start connection timeouts — FIXED ✅

**Symptom.** Startup/seed scripts fail against Neon with
`Connection terminated due to connection timeout`.

**Cause.** Measured Neon cold connects at **5,315 / 14,160 / 5,858 ms**. Several pools
give up sooner:

| File | Timeout | |
|---|---|---|
| `src/lib/database.ts:21` | 10 000 ms | ✅ |
| `scripts/populate-from-cv.js:17` | 10 000 ms | ✅ |
| `scripts/initialize.js:46` | **5 000 ms** | ❌ |
| `scripts/seed-content.js:27` | **5 000 ms** | ❌ |
| `scripts/verify-initialization.js:17` | **5 000 ms** | ❌ |
| `src/prisma/seed.ts:20` | **none** | ❌ |

This is not theoretical — it is the exact failure hit during this session:
`[dev-start] Initialization failed: Connection terminated due to connection timeout`.

**Best fix.** Export one shared constant (e.g. `DB_CONNECT_TIMEOUT_MS = 10_000`) and use it
in all six pools, so they cannot drift apart again. Small, isolated, no behaviour change.

---

## 2. Mobile: sandbox sphere labels rendered off-canvas — FIXED ✅

> **Correction.** This was first written up as "fixed `h-[400px]` clips 96px of content",
> based on measuring `scrollHeight 494 > clientHeight 398`. **That was a false positive.**
> The 494 is the decorative glow blob at `-bottom-24` (`h-72` = 288px, offset 96px →
> `398 + 96 = 494` exactly), which `overflow-hidden` clips *by design*. The container
> height was never the problem and was left untouched.

**Real symptom.** On mobile, technology labels in the rotating sphere were cut off at the
canvas edge and collided with the "SANDBOX MODE" overlay.

**Real cause.** `StackGameSection.tsx` hardcoded the sphere radius to `150` px while the
projection is `scale = 250 / (250 + z3d)`, `x2d = width/2 + x3d * scale`. With
`z3d ∈ [-150, 150]`, `scale` reaches **2.5**, so a node could project to `width/2 + 375` —
**562 px on a 375 px canvas**. Wide desktop canvases hid this; phone canvases did not.

**Fix applied.** Sphere nodes are now stored as **unit vectors**, with a width-derived
radius applied at projection time (recomputed each frame, so resize works):

```ts
const maxExtent = Math.max(60, width / 2 - 48);
return Math.min(150, (maxExtent * PERSPECTIVE) / (PERSPECTIVE + maxExtent));
```

Solved from `extent = r·P/(P−r)`. Desktop keeps the full 150 (verified visually unchanged);
375 px yields ≈ 90. **Verified** at 320 / 375 / 390 / desktop — all labels sit inside the
canvas, nothing clipped at the edge.

---

## 3. Preview-mode authorization bypass — ELIMINATED ✅ (was P0)

> **Update — the whole preview feature has since been removed.** The attack surface
> described below no longer exists in any form, rather than being mitigated by the
> session check. Deleted: `src/lib/preview-mode.ts`, `src/app/admin/preview/`
> (page + actions — the only writers of the cookie), the six "Preview Draft" entry
> points, and the `isPreview` parameter throughout `PublicContentService`. The public
> site now resolves PUBLISHED versions unconditionally, so there is no code path that
> can serve a DRAFT or a `visible: false` row to anyone. Draft/publish itself is
> unchanged — the admin still edits drafts and publishes them.
>
> Stale `portfolio_preview_mode` cookies in existing browsers are inert (nothing reads
> them) and expire on their own two-hour max-age.
>
> The original analysis is kept below as the record of the vulnerability.

**Symptom.** Unpublished and deliberately hidden content is readable by anyone.

**Cause.** The `portfolio_preview_mode` cookie is *written* behind `requireAdmin()`
(`admin/preview/actions.ts:11`) but all five *reads* trust its mere presence.
`httpOnly` stops JS reading it; it does not stop a client sending it.

**Proof** (canary fixture, since reverted): an unauthenticated request with
`Cookie: portfolio_preview_mode=true` returned a DRAFT row that was also `visible=false` —
4 occurrences on `/`, 10 on `/projects/livedet`. Clean requests correctly returned 0.

**Fix applied.** New `src/lib/preview-mode.ts` exports a `cache()`-wrapped
`resolvePreviewMode()`: returns `false` immediately when the cookie is absent (zero
queries), otherwise confirms ownership via `getValidatedOwner()`. All five derivation
sites now call it. Dead `x-preview` header removed from `proxy.ts`.

**Verified** with the canary fixture — same cookie, opposite outcomes by session:

| Request | canary before | canary after |
|---|---:|---:|
| anonymous + forged cookie → `/` | 4 | **0** |
| anonymous + forged cookie → `/projects/livedet` | 10 | **0** |
| **authenticated owner previewing** → `/` | 4 | **4** (still works) |

`GET /` anonymous remains **23 queries** — the early return keeps the baseline intact.

---

## 4. Edge light mode stays dark — ATTRIBUTED (not an app bug) 🟡

**Symptom.** In Edge, switching to light mode changes text colour but the background stays
dark. Chrome behaves correctly.

**What testing shows.** In a **clean automated Edge profile** the toggle works perfectly:

```
initial      --bg=#FFFFFF   body bg=rgb(255,255,255)   color-scheme=light
after dark   --bg=#0A0A0C   body bg=rgb(10,10,12)      color-scheme=dark
after light  --bg=#FFFFFF   body bg=rgb(255,255,255)   color-scheme=light
```

Identical results in Chromium. The CSS, the `data-theme` attribute, the `.dark` class and
`color-scheme` all switch correctly.

**Most likely cause — a browser-side forced-dark layer in your Edge profile.** Two candidates:

1. **Dark Reader extension.** There is direct evidence it is installed in your Edge: the
   hydration warning you pasted earlier contained `--darkreader-inline-bgcolor` and
   `data-darkreader-inline-bgcolor`. Dark Reader overrides backgrounds while site text
   colours still apply — which is *precisely* "background stays dark, only text changes".
2. **Edge's built-in force-dark flag** (`edge://flags/#enable-force-dark`).

**How to confirm in 30 seconds.** Open the site in an Edge **InPrivate** window with
extensions disabled, or toggle Dark Reader off for `localhost`. If light mode then works,
it is the extension, and no code change is warranted.

**If you want to harden anyway:** the app already sets `color-scheme` correctly, which is
the standards-based signal. Beyond that, we can only fight extensions with `!important`
overrides — not recommended.

---

## 4b. Admin: horizontal overflow on mobile — FIXED ✅

**Found by the admin sweep** (the surface that was previously unreachable without a login).
Four routes scrolled the whole page sideways at 375 px:

| Route | scrollWidth before | after |
|---|---:|---:|
| `/admin/audit-log` | 886 | **375** |
| `/admin/projects` | 586 | **375** |
| `/admin/profile` | 489 | **375** |
| `/admin/page-builder` | 391 | **375** |

**Cause.** `src/app/admin/layout.tsx:80` — the content shell
`<div className="flex-1 flex flex-col pl-0 md:pl-[248px]">` is a **flex item**, so it
defaults to `min-width: auto` and refuses to shrink below its content's intrinsic width.
Wide content (the audit-log table, long headings) stretched it past the viewport. The
`overflow-x-hidden min-w-0` already present on `<main>` could not help, because its *parent*
had already expanded.

**Fix.** Added `min-w-0` to that shell — one class. Verified by injecting `min-width:0` at
runtime first (886→375, 586→375, 489→375, 391→375), then applied and re-swept: all four
now clean at 375 px, desktop unchanged.

A useful side effect: audit-log's table wrapper already had `overflow-x-auto`, which was
inert while the ancestors refused to shrink. It now scrolls properly (341 px visible of
852 px content) instead of the content being unreachable.

**Previously noted, now moot:** `/admin/preview` issued a second request to itself (a
server action in `useEffect` causing a post-action route refresh). That page has been
deleted along with the rest of the preview feature — see item 3.

## 5. Horizontal overflow on PUBLIC pages — NOT REPRODUCED 🟢

Tested 320 / 375 / 390 / landscape, all three templates, Edge and Chromium, scrolling the
full page. **`scrollWidth === clientWidth` in every case** — no horizontal page scroll.

An earlier pass appeared to show overflowing hero elements; that was a **false positive**
from `ScrollReveal`'s entrance transforms being measured mid-animation. Re-measured after
animations settle: **zero** overflowing elements. The only element extending past the edge
is `.pm-hero-aura`, a decorative background glow that is intentionally oversized and clipped.

---

## 6. Duplicate API calls — NOT REPRODUCED 🟢

Counted every network request per page load across all 8 public routes × 2 browsers ×
4 viewports. **No URL was requested more than once.**

Note this is distinct from the *database* query duplication, which was real and is fixed
(item 7). If you are seeing duplicate calls, the untested surfaces are: in-app `<Link>`
navigations (I measured cold loads only), and the authenticated admin area (no working
credentials). Both need a repro to chase.

---

## 7. Rapid-fire DB queries — ALREADY FIXED 🟢

`GET /` went 31 → 23 queries, 3 → 0 `IN (NULL)`, all duplicate-table groups eliminated.
See `docs/query-baseline.md`. Known documented gap: the never-published state costs ~26
with a serial `flattenOrdered` stage. (The preview state that shared this gap no longer
exists — see item 3.)

---

# Recommended order

| # | Work | Risk | Why here |
|---|---|---|---|
| 1 | **Preview auth (item 3)** | low | Only P0; plan already written |
| 2 | **Cold-start timeouts (item 1)** | very low | Isolated; already root-caused |
| 3 | **Sandbox height (item 2)** | low | Needs visual verification at 3 widths |
| 4 | **Confirm Edge (item 4)** | none | 30-second InPrivate test — may close with no code change |
| 5 | Admin-area sweep | — | Blocked on password reset; would chase items 5/6 in admin |

**Checkpoint 009** to be written once the above land, following the existing
`checkpoints/checkpoint_00N_*.md` convention (currently at 008).

---

# 8. Deep-scan findings — ALL CLOSED ✅

**All six are now fixed** (plus a seventh found while scoping, and a regression the
work exposed). See `checkpoints/checkpoint_009_*.md` Addendum 3 for the write-ups and
verification. `npm run check:promoted` now fails the build if the promotion contract
drifts again, which is what item 8.1 was really about.

The table below is kept as the record of what was found.

From a full scan of the status/publish surface. The four fixed items from that scan
(project promotion gaps, dead `ARCHIVED` filter, and two wrong dashboard numbers) are
written up in `checkpoints/checkpoint_009_*.md`; these are the ones deliberately left.

| # | Sev | Finding |
|---|---|---|
| 8.1 | Med | **10 `ProjectVersion` columns still unpromoted.** `fullDescription`, `metrics`, `showOnHomepage`, `showOnTimeline`, `documentationUrl`, `videoUrl`, `presentationUrl`, `seoTitle`, `seoDescription`, `publishedAt` are absent from `PROMOTED_FIELDS.project`. No public page reads any of them today, so the bug is currently unobservable — but the moment one is rendered, edits to it will silently never go live. Fix when a reader is added, or pre-emptively as a batch. |
| 8.2 | Med | **The publish diff counts soft-deleted entities.** `collectChangedEntities` (`publish-diff.service.ts`) queries the version tables without filtering the parent's `deletedAt`, so a deleted project can appear by name in "waiting to go live". |
| 8.3 | Med | **Publish promotes soft-deleted entities' drafts.** `POST /api/publish` selects `{ state: "DRAFT" }` with no `deletedAt` filter. Not a leak — every public read filters `deletedAt` — but it is silent wasted writes. Note the trade-off before "fixing": promoting them keeps the PUBLISHED row in sync for a later `restore()`. Decide deliberately, and fix 8.2 with it. |
| 8.4 | Med | **`versionNumber` is computed outside the publish transaction.** `api/publish/route.ts` reads the latest version with `db` rather than `tx`, then creates inside the transaction. Two concurrent publishes compute the same number and collide on `@@unique([pageId, versionNumber])`, surfacing as a raw 500. Single-admin site, so low likelihood. Fix: move the lookup inside the transaction and retry on P2002. |
| 8.5 | Low | **Duplicate technology add returns 500.** Both `POST /api/technologies` and `TechnologyService.createTechnology` check-then-create; a race (or a slug colliding after `slugify`) raises P2002, which is unhandled. Should fall through to the existing friendly "already exists → select it" path. |
| 8.6 | Low | **`technology.order = count + 1`** (`technology.service.ts`) collides once any technology is soft-deleted, since the count excludes deleted rows. |

### Checked during the same scan and found NOT to be bugs

- `revalidatePath` after publish omits `/about` and `/contact` — **moot**: the root layout
  awaits `headers()`, so every route already renders dynamically.
- The section snapshot omits group membership — **fine**: groups only affect flattened
  order, and the snapshot captures the flattened result.
- `@@unique([entityId, state])` is present on all five version tables, so the diff's
  Map-based DRAFT↔PUBLISHED pairing cannot mis-pair.
