# Database Design, Relationships, Page-Builder Data Structure & API Plan
### The backend foundation — companion to `prisma/schema.prisma`

This is deliverable "Database" in your build order (Requirements → Page Flow → Wireframes → **Database** → Auth → …). It documents the 15 required models (plus 6 supporting ones), how they relate, how the page builder stores layout as data, and every API endpoint you'll implement. Every field maps to the Step-1 content schema.

---

## 1. Model inventory

**The 15 required models:** User, Project, Technology, ProjectTechnology, Page, PageSection, PageVersion, Template, TimelineEntry, Education, Experience, MediaAsset, ContactMessage, GameSettings, AuditLog.

**6 supporting models added for correctness (not extra scope — they make the 15 work):**
- `SiteProfile` — the single-row identity/settings record (Name, bio, CV, SEO, maintenance).
- `SocialLink` — reorderable social links (so platforms aren't hardcoded columns).
- `ProjectImage` — ordered gallery join (a project has many gallery images with order/caption).
- `ExperienceTechnology`, `TimelineTechnology` — technology joins mirroring `ProjectTechnology`.
- `GameScore` — optional persisted scores (only used if leaderboard is on).

If you must keep strictly to 15, fold `SiteProfile` fields into a settings table later — but keeping it separate is cleaner and recommended.

---

## 2. Relationships (how the data connects)

### 2.1 Media is the shared leaf
`MediaAsset` is referenced by almost everything (project thumbnail/cover/architecture/gallery, technology logo, timeline image, education/experience logos, social icons, and the profile's image/logo/favicon/CV). All these references use `onDelete: SetNull` (or `Cascade` for `ProjectImage`, which only exists to hold a media ref). This lets the admin compute a media asset's "used in" list and block hard deletion while it's in use.

```
MediaAsset ──< Project.thumbnail / cover / architectureImage
           ──< ProjectImage (gallery, ordered)
           ──< Technology.logo
           ──< TimelineEntry.image
           ──< Education.logo / Experience.logo
           ──< SocialLink.icon
           ──< SiteProfile.profileImage / logoImage / favicon / cvFile
```

### 2.2 Project ↔ Technology (explicit many-to-many)
`ProjectTechnology` is an explicit join (not implicit `@relation`) so you get an `order` column for displaying tech chips in a chosen order and can query "projects using tech X" efficiently. `TimelineEntry` and `Experience` get parallel joins (`TimelineTechnology`, `ExperienceTechnology`). One `Technology` record is therefore reused across the stack section, project chips, timeline chips, experience chips, and the 3D game — exactly one source of truth.

```
Project  >──< Technology   via ProjectTechnology (ordered)
Timeline >──< Technology   via TimelineTechnology
Experience >──< Technology via ExperienceTechnology
```

### 2.3 TimelineEntry → Project (optional link)
A timeline entry may link one `Project` (`linkedProject`, `SetNull` on delete). Linked entries inherit the project's image/links on the public side and expose "View project →"; standalone milestones render slim.

### 2.4 The page-builder trio: Page → PageSection / PageVersion
This is the heart of the CMS and the part most people get wrong. Read §3.

### 2.5 User is the actor
`User` (owner/admin, credentials or OAuth) is referenced by `AuditLog.actor`, `PageVersion.publishedBy`, and `MediaAsset.uploadedBy` — all `SetNull` so deleting a user never destroys history.

### 2.6 Template
`Template` has three rows (one per `TemplateKey`). `isActiveLive` marks the published one; the *draft* selection lives on `Page.draftTemplateId`, and the *published* template is frozen inside each `PageVersion.templateKey`. Changing template never touches content.

---

## 3. Page-builder data structure (draft vs. published)

The single most important design decision: **layout is data, and publishing takes an immutable snapshot.**

### 3.1 Three layers
1. **`Page`** — one logical page (`key: "home"`). Holds the *draft working state*: `draftTemplateId` and `hasUnpublishedChanges`. There's normally just one Page ("home"); the model generalizes to more pages later.
2. **`PageSection`** — the *draft* sections belonging to a Page: ordered (`order`), toggleable (`visible`), typed (`SectionType`), with a `settings` JSON blob and an animation assignment. **Editing in the page builder mutates these rows.** The public site never reads them directly.
3. **`PageVersion`** — an *immutable published snapshot*. On publish, the service serializes the current `PageSection` list + the draft template into `snapshot` (JSON), assigns the next `versionNumber`, sets `isActive = true` (and clears it on the previous active), and starts the `rollbackUntil` clock. **The public site reads only the active `PageVersion.snapshot`.**

```
          DRAFT (mutable)                     PUBLISHED (immutable snapshots)
   ┌───────────────────────────┐        ┌──────────────────────────────────────┐
   │ Page (home)               │        │ PageVersion v6  isActive=false        │
   │  draftTemplate = Glass    │        │ PageVersion v7  isActive=false        │
   │  hasUnpublishedChanges=T  │  ───►  │ PageVersion v8  isActive=true         │
   │  ┌ PageSection[] ───────┐ │ publish│   snapshot = { templateKey, sections }│
   │  │ ☰ Hero   order 0     │ │        │   rollbackUntil = now + 1h            │
   │  │ ☰ About  order 1     │ │        │   changeSummary = [ ... ]            │
   │  │ ☰ Tech   order 2 ... │ │        └──────────────────────────────────────┘
   │  └──────────────────────┘ │
   └───────────────────────────┘
```

### 3.2 `PageSection.settings` JSON (validated per section type)
Never store executable code — only whitelisted, Zod-validated fields keyed by `SectionType`. Shape examples:

```jsonc
// HERO
{ "publicHeading": "…", "highlightedWords": ["…"], "subtitle": "…",
  "layout": "split|centered|left", "visualType": "photo|codeCard|icosahedron",
  "primaryCta": { "label": "View Projects", "href": "/projects" },
  "background": "default", "maxWidth": "content" }

// FEATURED_PROJECTS
{ "publicHeading": "Featured", "featuredOnly": true, "displayCount": 3,
  "columns": 3, "layout": "grid|horizontal", "selectedProjectIds": ["…"],
  "show": { "thumbnail": true, "tech": true, "dates": true, "github": true } }

// TECH_STACK
{ "publicHeading": "Stack", "defaultCategory": "All", "columns": 6 }

// CONTACT / CTA / CUSTOM_CONTENT ... etc — each with its own validated schema
```
`selectedProjectIds` / `selectedTechIds` reference real records by id, so content stays normalized and a section just points at rows.

### 3.3 `PageVersion.snapshot` shape
```jsonc
{
  "templateKey": "MODERN_GLASS",
  "sections": [
    { "type": "HERO", "internalLabel": "Hero", "order": 0, "visible": true,
      "settings": { ... }, "animationPresetSlug": "rise-glass",
      "animationDelay": 0, "animationStagger": 0.08 },
    { "type": "ABOUT", "order": 1, ... }
    // ...frozen copy; safe even if a referenced project is later edited
  ]
}
```
Snapshots are self-contained enough to render the page as it was. (Referenced project *content* is still read live by id; if you want fully-frozen content too, expand the snapshot to embed resolved records — recommended for true historical accuracy.)

### 3.4 Publish / rollback / restore state machine
```
edit sections ─ save draft ─► Page.hasUnpublishedChanges = true
publish:
   next v = max(versionNumber)+1
   create PageVersion(v, snapshot, changeSummary, isActive=true,
                      rollbackUntil = now()+1h, publishedBy)
   previous active → isActive=false
   Page.hasUnpublishedChanges = false
   AuditLog(PUBLISH)
quick rollback (while now < rollbackUntil of current):
   set previous version isActive=true, current isActive=false
   AuditLog(ROLLBACK)   // history preserved, nothing deleted
restore (any older version, anytime):
   copy chosen snapshot back into PageSection draft → publish as NEW version
   AuditLog(RESTORE_VERSION)
```
History is append-only: rollback/restore never overwrite or delete `PageVersion` rows.

---

## 4. Lifecycle & visibility rules (enforced in the service layer)

- **Public read filter (every content query):** `visible = true AND deletedAt = null AND archivedAt = null AND publishState = PUBLISHED` (projects), and home layout comes from the **active** `PageVersion` only.
- **Soft delete:** set `deletedAt`; Restore clears it. Hard delete requires the typed-confirmation dialog and is the only path that truly removes rows.
- **Archive:** set `archivedAt` (projects); distinct from delete.
- **One live template:** enforce "exactly one `Template.isActiveLive`" transactionally in the publish service, not via DB constraint.
- **Single-row models** (`SiteProfile`, `GameSettings`): upsert a fixed row in seed; never create/delete.

---

## 5. API endpoint plan

Use **Next.js Route Handlers** under `app/api/*` (+ Server Actions for admin forms where convenient). Grouping:

### 5.1 Public (no auth, read-only + contact write)
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/public/home` | Active PageVersion snapshot + resolved section data |
| GET | `/api/public/projects` | Published projects (query: search, category, tech, sort, page) |
| GET | `/api/public/projects/[slug]` | One published project + related |
| GET | `/api/public/technologies` | Visible tech for stack section |
| GET | `/api/public/timeline` | Visible timeline entries |
| GET | `/api/public/resume` | Public resume data (education/experience/skills/flagged projects) |
| GET | `/api/public/settings` | Public site settings (name, socials, CV url, SEO) |
| POST | `/api/public/contact` | Submit message (validation + rate-limit + honeypot) |
| POST | `/api/public/game/score` | Submit score (only if leaderboard enabled) |

### 5.2 Auth
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Credentials login → session cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/session` | Current user (for nav "Log in" vs "Admin ▾") |
| GET | `/api/auth/oauth/[provider]/start` | Begin GitHub/Google flow |
| GET | `/api/auth/oauth/[provider]/callback` | Complete OAuth; reject non-authorized accounts |

> Use Auth.js (NextAuth) or Supabase Auth; the routes above are the conceptual surface. Sessions = secure HTTP-only cookies. All `/api/admin/*` and `/api/publish/*` require an authenticated admin session (middleware).

### 5.3 Admin — content CRUD (all require admin session)
Standard REST for each entity; each supports list/create/read/update + soft-delete/restore/duplicate where applicable.

| Entity | Base route | Extra actions |
|---|---|---|
| Projects | `/api/admin/projects` | `POST …/[id]/duplicate`, `POST …/[id]/archive`, `POST …/[id]/restore`, `PATCH …/[id]/visibility` |
| Technologies | `/api/admin/technologies` | `PATCH …/reorder` |
| Timeline | `/api/admin/timeline` | `PATCH …/reorder`, `POST …/[id]/duplicate` |
| Education | `/api/admin/education` | `PATCH …/reorder`, restore |
| Experience | `/api/admin/experience` | `PATCH …/reorder`, restore |
| Social links | `/api/admin/social-links` | `PATCH …/reorder` |
| Messages | `/api/admin/messages` | `PATCH …/[id]/status`, archive, delete |
| Media | `/api/admin/media` | `POST …/upload`, `PATCH …/[id]` (rename/alt), `POST …/[id]/replace`, `DELETE …/[id]` (blocked if in use), `GET …/[id]/usage` |
| Site settings | `/api/admin/settings` | `GET`, `PATCH` (single row) |
| Profile | `/api/admin/profile` | `GET`, `PATCH` |

Each mutation writes an `AuditLog` row.

### 5.4 Admin — page builder & layout
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/page/[key]` | Draft page + sections |
| POST | `/api/admin/page/[key]/sections` | Add section |
| PATCH | `/api/admin/page/[key]/sections/[id]` | Edit settings/animation |
| PATCH | `/api/admin/page/[key]/sections/reorder` | Drag-reorder (array of ids) |
| PATCH | `/api/admin/page/[key]/sections/[id]/visibility` | Hide/show |
| POST | `/api/admin/page/[key]/sections/[id]/duplicate` | Duplicate |
| DELETE | `/api/admin/page/[key]/sections/[id]` | Remove |
| POST | `/api/admin/page/[key]/save-draft` | Persist draft, set hasUnpublishedChanges |

### 5.5 Templates, animation presets, game
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/templates` | Three templates + live/draft state |
| PATCH | `/api/admin/templates/select` | Set draft template |
| GET/POST/PATCH/DELETE | `/api/admin/animations` | Animation preset CRUD (JSON-validated) |
| GET/PATCH | `/api/admin/game` | Game settings (single row) |

### 5.6 Publishing, versions, rollback, audit
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/publish/summary` | Diff between draft and active version |
| POST | `/api/admin/publish` | Two-step confirmed publish → new PageVersion |
| GET | `/api/admin/versions` | Version history list |
| GET | `/api/admin/versions/[id]` | One version (for preview/restore) |
| POST | `/api/admin/rollback` | Quick rollback (within 1h window) |
| POST | `/api/admin/versions/[id]/restore` | Restore older version as new version |
| GET | `/api/admin/audit` | Audit log (read-only, filterable) |

### 5.7 Preview
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/preview` | Render draft data as guests would see it (auth or short-lived token); `noindex` |

---

## 6. Seed plan (`prisma/seed.ts`)

Seed the minimum so the app boots and the public MVP renders with temporary data:
1. One **owner** `User` (from env — never hardcode a password; hash on seed).
2. Three **Template** rows (Professional Minimal, Modern Glass = `isActiveLive`, Interactive 3D).
3. One **SiteProfile** row (placeholder name/bio/email) and one **GameSettings** row.
4. A **Page** `home` with default **PageSection** rows in the wireframe order (Hero → Footer), plus an initial published **PageVersion v1** (`isActive`, snapshot of those sections, `MODERN_GLASS`).
5. A handful of placeholder **Technology**, **Project** (with `ProjectTechnology` links + gallery), **Education**, **Experience**, and **TimelineEntry** rows so the public MVP (step 5) has data to show.
6. Built-in **animation presets** if you store them in DB.

All placeholder — the admin replaces it. Do **not** seed CaloriQ.

---

## 7. Environment variables (`.env.example`)

```bash
DATABASE_URL="postgresql://user:pass@host:5432/portfolio?schema=public"
DIRECT_URL="postgresql://…"            # for migrations if using a pooler
NEXTAUTH_SECRET="…"                     # or AUTH_SECRET
NEXTAUTH_URL="http://localhost:3000"
GITHUB_ID="…"
GITHUB_SECRET="…"
GOOGLE_CLIENT_ID="…"
GOOGLE_CLIENT_SECRET="…"
OWNER_EMAIL="you@example.com"           # authorized admin account
OWNER_INITIAL_PASSWORD="…"              # hashed on seed, then remove
STORAGE_BUCKET_URL="…"                  # Supabase/Cloudinary
STORAGE_API_KEY="…"
```

Only the `OWNER_EMAIL` account (and any explicitly added ADMIN users) may access `/admin/*`; an OAuth login from any other account is refused an admin session.

---

## 8. Commands to bring it up

```bash
npx prisma format          # tidy schema
npx prisma validate        # confirm it compiles
npx prisma migrate dev --name init   # create tables
npx prisma generate        # generate the client
npx prisma db seed         # load placeholder data (configure in package.json)
npx prisma studio          # inspect visually
```

---

## 9. Indexing & integrity notes
- Hot query paths are indexed: `Project(publishState, featured, category, manualOrder)`, `Technology(category, order)`, `PageSection(pageId, order)`, `PageVersion(pageId, isActive)`, `ContactMessage(status, createdAt)`, `AuditLog(action, entityType, createdAt)`.
- `@@unique([provider, providerId])` on User prevents duplicate OAuth accounts; `email` is globally unique.
- `@@unique([pageId, versionNumber])` guarantees monotonic version numbers per page.
- All history-bearing FKs (`actor`, `publishedBy`, `uploadedBy`) use `SetNull` so deleting a user preserves the record.
- "Exactly one live template" and "exactly one active PageVersion" are transactional invariants enforced in the publish service (Postgres has no clean single-column partial-unique for booleans across the whole table without a partial index; you *may* add `@@index` + a partial unique index via raw migration if you want DB-level enforcement).
```
```

**This is the foundation.** With `schema.prisma` validated and this plan, the next build steps map 1:1: Auth (§5.2) → Public Pages (§5.1) → Admin CRUD (§5.3) → Page Builder (§5.4) → Templates (§5.5) → Publishing/Rollback (§5.6) → 3D (§5.5 game). Each later deliverable just implements the endpoints already listed here.
