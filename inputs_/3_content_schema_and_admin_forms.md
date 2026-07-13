# STEP 1 — Content Model & Admin CRUD Schema
### Companion to the architecture prompt + design specs (Parts 1 & 2)

> **Purpose.** This is not portfolio copy — it's the *schema* for every piece of content the admin manages. Each entity below defines its fields, field types, validation, and which CRUD actions apply. Your code AI turns each entity into: a Prisma model, a Zod validation schema, an admin list view, and an admin create/edit form. Nothing here is hardcoded into public components; the public site reads it all from the database.
>
> **Global rules for every entity below:**
> - All entities support **Create · Read · Update · Delete**, plus **soft-delete (Archive) + Restore** where noted.
> - Deletes are soft by default (`deletedAt` timestamp); hard-delete requires the typed-confirmation dialog.
> - Every content entity that appears publicly has a **visibility** state and flows through the **draft → preview → publish** pipeline — saving in admin never changes the live site until published.
> - Field types: `text` (single line), `richtext` (formatted, sanitized), `slug`, `date`, `enum`, `bool`, `int`, `url`, `email`, `image` (media ref), `image[]` (gallery), `ref` (link to another entity), `ref[]` (many).
> - `required` = form blocks save without it; everything else is optional and the public UI hides empty fields.

---

# 1. Profile / Site Identity  (single record — edit only, no create/delete)

Managed at **Site Settings** + a **Profile** panel. One row exists; admin edits it.

| Field | Type | Required | Notes |
|---|---|---|---|
| fullName | text | ✓ | Used in hero, footer, resume, SEO |
| initials / logoText | text | ✓ | Navbar logo fallback |
| title | text | ✓ | e.g. "Final-year Software Engineering student" |
| tagline | text | — | One-line hero subtitle |
| heroIntro | richtext | — | Short intro paragraph on home hero |
| aboutBio | richtext | ✓ | Full About-page biography |
| aboutSummary | richtext | — | Shortened bio for home "About summary" |
| technicalInterests | text | — | Comma/tag list, shown on About |
| developmentApproach | richtext | — | "How I work" block |
| currentGoals | richtext | — | Goals callout |
| availabilityStatus | enum | — | `Open to work` / `Open to internships` / `Not available` |
| locationText | text | — | e.g. "Colombo, Sri Lanka" |
| profileImage | image | — | Hero/about portrait |
| logoImage | image | — | Optional image logo |
| favicon | image | — | Site favicon |
| contactEmail | email | ✓ | Public contact + mailto buttons |
| defaultSeoTitle | text | — | Fallback `<title>` |
| defaultSeoDescription | text | — | Fallback meta description |
| footerText | text | — | e.g. copyright line |
| maintenanceMode | bool | — | Takes public site to maintenance screen |

**CRUD:** Read, Update only. (Never created or deleted by the admin.)

---

# 2. Social Links  (small list — full CRUD, reorderable)

Rather than fixed GitHub/LinkedIn columns, store as a reorderable list so any platform can be added.

| Field | Type | Required | Notes |
|---|---|---|---|
| platform | enum | ✓ | `GitHub` / `LinkedIn` / `Google` / `Twitter/X` / `Email` / `Website` / `Other` |
| label | text | — | Display/override label |
| url | url | ✓ | Validated URL (or mailto for Email) |
| icon | enum/image | — | Lucide icon key or uploaded logo |
| showInHeader | bool | — | Appears in nav/hero |
| showInFooter | bool | — | Appears in footer |
| order | int | — | Manual display order (drag to set) |
| visible | bool | ✓ | Hide without deleting |

**CRUD:** Create · Read · Update · Delete. Reorder by drag.

---

# 3. CV / Resume File  (managed asset + structured resume data)

Two parts: the downloadable file, and the structured data shown on `/resume`.

**3a. CV file**
| Field | Type | Required | Notes |
|---|---|---|---|
| cvFile | file (pdf) | — | The "Download CV" target |
| cvVersionLabel | text | — | e.g. "Updated Jul 2026" |
| cvUpdatedAt | date | auto | Set on upload |

**3b. Resume page** reuses Education, Experience, Technologies, and flagged Projects (below) — no duplicate data. A `showOnResume` bool on those entities controls inclusion.

**CRUD:** Read, Update (replace file).

---

# 4. Projects  (the core entity — full CRUD + archive/restore + duplicate)

Admin list columns: image · title · status · featured · homepage · timeline · updated · actions.

**Group 1 — Basic info**
| Field | Type | Required | Notes |
|---|---|---|---|
| title | text | ✓ | |
| slug | slug | ✓ | Auto from title, editable, unique |
| summary | text | ✓ | 1–2 line card summary |
| fullDescription | richtext | — | Long intro on detail page |
| category | enum | ✓ | `Web` / `Full Stack` / `Machine Learning` / `Java` / `Academic` / `Other` |
| startDate | date | — | Development period start |
| endDate | date | — | Blank = ongoing |
| status | enum | ✓ | `Completed` / `In progress` / `Planned` |

**Group 2 — Images**
| coverImage | image | — | 21:9 hero on detail page |
| thumbnail | image | — | Card image |
| gallery | image[] | — | Screenshots, sortable |
| architectureImage | image | — | System diagram |

**Group 3 — Technology**
| technologies | ref[] → Technology | — | Reused records, not free text |

**Group 4 — Details (all richtext, all optional)**
problem · solution · myRole · mainFeatures · systemArchitecture · developmentProcess · challenges · solutions · testing · lessonsLearned

**Group 5 — Results**
| results | richtext | — | Narrative |
| metrics | list of {label, value} | — | Real numbers only; rendered as stat blocks |

**Group 6 — Links** (each optional; public UI hides empty)
liveDemoUrl · githubUrl · reportUrl · documentationUrl · videoUrl · presentationUrl — all `url`.

**Group 7 — Display settings**
| featured | bool | — | Shows in Featured Projects |
| showOnHomepage | bool | — | Eligible for home sections |
| showOnTimeline | bool | — | Creates/links a timeline entry |
| showOnResume | bool | — | Appears in resume "key projects" |
| manualOrder | int | — | Drag-set ordering |
| visible | bool | ✓ | Hide from public |

**Group 8 — SEO**
| seoTitle | text | — | |
| seoDescription | text | — | |

**Group 9 — Status**
| publishState | enum | ✓ | `Draft` / `Published` |
| archivedAt | date | auto | Set on archive |

**CRUD:** Create · Read · Update · Delete · **Duplicate** · **Archive/Restore** · Hide/Show · Preview.

---

# 5. Technologies  (reusable records — full CRUD, reorderable)

One record is reused across stack section, project chips, timeline, resume, and the 3D game.

| Field | Type | Required | Notes |
|---|---|---|---|
| name | text | ✓ | e.g. "Next.js" |
| slug | slug | ✓ | Unique |
| logo | image | — | Brand SVG/PNG |
| category | enum | ✓ | `Frontend` / `Backend` / `Database` / `AI/ML` / `Mobile` / `Tools` / `DevOps` / `Other` |
| description | text | — | Shown in tech modal |
| experienceLabel | enum | ✓ | `Strong` / `Comfortable` / `Working knowledge` / `Learning` (NO percentages) |
| linkedProjects | ref[] → Project | — | Auto-suggests count on card |
| showInStack | bool | ✓ | Appears in Technology Stack section |
| showInGame | bool | — | Appears as a 3D ball |
| showOnResume | bool | — | |
| order | int | — | Manual order |
| visible | bool | ✓ | Hide without deleting |

**CRUD:** Create · Read · Update · Delete · Hide/Show · Reorder.

---

# 6. Education  (list — full CRUD, reorderable)

| Field | Type | Required | Notes |
|---|---|---|---|
| institution | text | ✓ | |
| qualification | text | ✓ | e.g. "BSc (Hons) Software Engineering" |
| startDate | date | ✓ | |
| endDate | date | — | Blank = current |
| isCurrent | bool | — | Shows "Current" chip |
| grade | text | — | Only if supplied |
| description | richtext | — | |
| logo | image | — | Institution logo |
| modules | text (tags) | — | Relevant modules |
| showOnResume | bool | — | |
| visible | bool | ✓ | |
| order | int | — | |

**CRUD:** Create · Read · Update · Delete · Restore · Reorder.

---

# 7. Experience  (list — full CRUD, reorderable)

| Field | Type | Required | Notes |
|---|---|---|---|
| organization | text | ✓ | |
| role | text | ✓ | |
| startDate | date | ✓ | |
| endDate | date | — | Blank = current |
| isCurrent | bool | — | "Current" chip + pulse dot |
| description | richtext | — | |
| responsibilities | text (list) | — | Bulleted on public side |
| technologies | ref[] → Technology | — | |
| logo | image | — | Org logo |
| locationText | text | — | |
| workType | enum | — | `Full-time` / `Part-time` / `Internship` / `Freelance` / `Volunteer` |
| showOnResume | bool | — | |
| visible | bool | ✓ | |
| order | int | — | |

**CRUD:** Create · Read · Update · Delete · Restore · Reorder.

---

# 8. Timeline Entries  (list — full CRUD, reorderable)

Can be standalone milestones OR linked to a project (linked ones inherit image/links).

| Field | Type | Required | Notes |
|---|---|---|---|
| title | text | ✓ | |
| entryType | enum | ✓ | `Project` / `Academic` / `Milestone` / `Personal` |
| startDate | date | ✓ | Drives chronological order |
| endDate | date | — | |
| description | text | — | |
| image | image | — | Ignored if linked project has one |
| linkedProject | ref → Project | — | Enables "View project →" |
| technologies | ref[] → Technology | — | |
| externalLinks | list of {label, url} | — | |
| status | enum | — | `Completed` / `In progress` |
| visible | bool | ✓ | |
| order | int | — | Manual override of date order |

**CRUD:** Create · Read · Update · Delete · Link project · Reorder · Hide/Show.

---

# 9. Contact Messages  (created by GUESTS — admin reads/manages, never creates)

| Field | Type | Source | Notes |
|---|---|---|---|
| name | text | guest form | |
| email | email | guest form | |
| subject | text | guest form | |
| message | richtext/text | guest form | |
| category | enum | guest form | `General` / `Opportunity` / `Collaboration` / `Other` |
| status | enum | admin | `New` / `Read` / `Replied` / `Archived` |
| createdAt | date | auto | |

**CRUD:** Read · Update (status) · Archive · Delete. (No admin Create.)

---

# 10. Media Library  (assets — full CRUD)

Every `image`/`file` field above references a Media record (reusable).

| Field | Type | Notes |
|---|---|---|
| file | image/file | Uploaded asset |
| filename | text | Editable |
| altText | text | Accessibility |
| mimeType / size / dimensions | auto | Read-only metadata |
| usedIn | ref[] | Computed dependency list |

**CRUD:** Create (upload) · Read · Update (rename/alt/replace) · Delete (blocked while in use → require replace/remove + typed confirm).

---

# 11. Page Sections & Layout  (managed by the Page Builder, not a form)

Homepage section order, visibility, per-section settings, chosen template, and animation presets are all content too — versioned and published like everything else. Covered by the Page Builder + Animation Studio specs; listed here so it's clear these are DB-driven, not code.

---

# 12. What "add / edit / delete in admin" means per entity (summary)

| Entity | Create | Edit | Delete | Archive/Restore | Duplicate | Reorder |
|---|---|---|---|---|---|---|
| Profile/Site | — | ✓ | — | — | — | — |
| Social links | ✓ | ✓ | ✓ | — | — | ✓ |
| CV file | — | ✓ | — | — | — | — |
| Projects | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Technologies | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Education | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Experience | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Timeline | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Messages | — | ✓(status) | ✓ | ✓ | — | — |
| Media | ✓ | ✓ | ✓ | — | — | — |

**Decision locked before coding:** these entities + fields are the complete content surface. Any public element must map to a field here; if it doesn't, it's either a Site Settings field or it shouldn't be dynamic. Build the Prisma models and admin forms directly from this table.
