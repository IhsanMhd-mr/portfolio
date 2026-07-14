# Portfolio Architecture Audit and Refactor Prompt

## Objective

Inspect the **existing portfolio codebase** and correct its architecture, routing, page hierarchy, navigation, section order, and admin-to-public content flow.

The current application may already contain pages and features, but the page order and connections are jumbled. Do not blindly rebuild the entire project. First inspect the current implementation, identify mismatches, and then refactor it to follow the canonical architecture defined below.

The final system must have three clearly separated interfaces:

1. **Guest/Public Website**
2. **Admin Dashboard**
3. **Admin Draft Preview**

Publishing must remain simple for now:

```text
Edit
→ Save Draft
→ Preview
→ Publish Confirmation Page
→ Publish
```

Do not add a second confirmation, typed confirmation word, rollback timer, or complex version-restoration workflow at this stage.

Do not include CaloriQ anywhere in the portfolio.

---

# 1. Required Working Method

Follow this order before making changes.

## Step 1: Audit the Existing Codebase

Inspect:

- Current route structure
- App Router or Pages Router setup
- Public layout
- Admin layout
- Preview layout
- Navigation components
- Homepage section renderer
- Existing database schema
- Page-section records
- Seed data
- Project records
- Technology records
- Timeline records
- Template logic
- Authentication middleware
- API routes
- Admin CRUD screens
- Publishing logic
- Existing redirect behavior
- Mobile navigation
- Links between pages

Create an internal architecture map from the code before editing.

## Step 2: Compare Against the Canonical Architecture

For every existing page or component, determine whether it is:

- Correctly placed
- Incorrectly placed
- Duplicated
- Missing
- Unused
- Linked incorrectly
- Displayed in the wrong order
- Mixing admin and public responsibilities
- Loading draft content publicly
- Hard-coded when it should be database-driven

## Step 3: Refactor Instead of Rebuilding Unnecessarily

Preserve working code where possible.

Do not:

- Replace the entire project without need
- Remove working features just because their file names differ
- Change the chosen stack without a technical reason
- Break existing database content
- Delete user-uploaded media
- Change public URLs unnecessarily
- Expose admin routes
- Hard-code the homepage order

## Step 4: Update All Dependent Areas

When fixing architecture, update all related parts:

- Routes
- Navigation
- Layouts
- Imports
- Buttons
- Breadcrumbs
- Database relationships
- Section order values
- Seed data
- Admin sidebar
- Public header
- Preview links
- Publish confirmation links
- Mobile menu
- Tests

---

# 2. Canonical Application Architecture

The application must be separated into three areas.

```text
Portfolio Application
├── Public Website
├── Admin Dashboard
└── Admin Draft Preview
```

## Public Website

Used by recruiters, lecturers, clients, and general visitors.

It must only display **published and visible content**.

## Admin Dashboard

Used only by the portfolio owner.

It manages:

- Homepage structure
- Templates
- Projects
- Technologies
- Timeline
- Education
- Experience
- Media
- Contact messages
- 3D section settings
- Global site settings

## Admin Draft Preview

Used only by the authenticated admin.

It must render:

- Draft content
- Draft section order
- Draft visibility
- Draft template selection

It must never be mistaken for the live public website.

---

# 3. Required Route Architecture

Use route groups or equivalent structure so public and admin layouts remain separate.

## Public Routes

```text
/
├── /about
├── /projects
│   └── /projects/[slug]
├── /timeline
├── /resume
├── /contact
└── /404
```

## Admin Routes

```text
/admin/login
/admin/dashboard
/admin/page-builder
/admin/templates
/admin/projects
/admin/projects/new
/admin/projects/[id]/edit
/admin/technologies
/admin/timeline
/admin/education
/admin/experience
/admin/media
/admin/messages
/admin/game
/admin/settings
/admin/preview
/admin/publish-confirmation
```

## Route Protection

Apply these rules:

```text
Public route
→ No login required
→ Load published content only
```

```text
Admin route
→ Check authenticated admin session
→ If missing, redirect to /admin/login
```

```text
Admin preview
→ Check authenticated admin session
→ Load draft content
```

```text
Successful admin login
→ Redirect to /admin/dashboard
```

```text
Admin logout
→ Destroy session
→ Redirect to /admin/login
```

Do not allow public users to access draft APIs, admin data, private messages, or unpublished projects.

---

# 4. Required Layout Separation

## Public Layout

Must contain:

- Public header
- Main public content
- Public footer
- Mobile navigation
- Public theme styles

Must not contain:

- Admin sidebar
- Admin top bar
- Draft badges
- Edit buttons
- Publish buttons

## Admin Layout

Must contain:

- Admin sidebar
- Admin top bar
- Main admin content
- Notification area
- Draft status
- Preview button
- View Live Site button
- Publish button

Must not reuse the public header as the main admin navigation.

## Preview Layout

Must visually resemble the public website but include a fixed admin-only preview toolbar.

Example:

```text
PREVIEW MODE
Template: Modern Glass
Desktop | Tablet | Mobile

[Back to Editor] [View Live Site] [Publish]
```

The preview layout must:

- Load draft content
- Show a preview warning
- Block search engine indexing
- Require authentication
- Never become the normal public layout

---

# 5. Canonical Public Navigation

The public header order must be:

```text
Logo / Name
Home
About
Projects
Timeline
Contact
Download CV
```

Connections:

| Navigation Item | Destination |
|---|---|
| Logo / Name | `/` |
| Home | `/` |
| About | `/about` |
| Projects | `/projects` |
| Timeline | `/timeline` |
| Contact | `/contact` |
| Download CV | `/resume` or the current CV file |

On mobile, use the same order inside the mobile navigation drawer.

Remove or relocate admin-only links accidentally shown in the public navigation.

---

# 6. Canonical Homepage Order

The default published homepage order must be:

```text
1. Navigation Bar
2. Hero
3. About Summary
4. Technology Stack
5. Featured Projects
6. Project Timeline Preview
7. Education and Experience Preview
8. Other Projects
9. 3D Technology Interaction
10. Contact Call to Action
11. Footer
```

The navigation and footer are layout elements and do not need to be draggable page-builder sections unless the current architecture intentionally supports them.

The content-section order should normally be:

```text
Hero
About Summary
Technology Stack
Featured Projects
Project Timeline
Education and Experience
Other Projects
3D Technology Interaction
Contact Call to Action
```

## Important Dynamic-Order Rule

The homepage must use the published section records stored by the page builder.

The renderer must:

1. Load the active published homepage configuration
2. Filter sections where `isVisible === true`
3. Sort sections using the stored `position`
4. Match each section to the component registry
5. Render sections in that exact order
6. Skip invalid section types safely

Example:

```ts
sections
  .filter((section) => section.isVisible)
  .sort((a, b) => a.position - b.position)
  .map(renderRegisteredSection);
```

Do not manually call homepage sections in a fixed JSX order if the page builder is intended to control them.

## Fix Existing Jumbled Order

Check all of the following:

- Current database `position` values
- Default seed records
- Migration defaults
- Drag-and-drop update logic
- Sort direction
- Duplicate position values
- String-based sorting instead of numeric sorting
- Zero-based versus one-based positions
- Hidden sections occupying incorrect positions
- Template-specific hard-coded order
- Client-side state not matching persisted order
- Preview order differing from published order

Normalize section positions after every reorder:

```text
0, 1, 2, 3, 4...
```

or:

```text
1, 2, 3, 4, 5...
```

Choose one system and use it consistently.

---

# 7. Public Page Responsibilities and Connections

## Home Page `/`

Purpose:

- Provide a complete portfolio overview
- Direct visitors to deeper pages

Required connections:

```text
Hero View Projects → /projects
Hero Contact → /contact
Hero Download CV → /resume or CV
About Read More → /about
Featured Project → /projects/[slug]
View All Projects → /projects
Timeline Project → /projects/[slug]
View Full Timeline → /timeline
Education/Experience More → /about
3D Technology → related projects
Contact CTA → /contact
```

## About Page `/about`

Required content:

- Personal introduction
- Education
- Experience
- Technical interests
- Development approach
- Career goals
- CV action
- Contact action

Connections:

```text
About → Projects
About → Resume
About → Contact
Related academic project → Project Detail
```

Do not duplicate the entire Projects page inside About.

## Projects Page `/projects`

Required content:

- Project search
- Category filters
- Technology filters
- Sorting
- Published project grid

Connections:

```text
Project Card → /projects/[slug]
GitHub → external repository
Live Demo → external URL
Technology Filter → update project results
Contact CTA → /contact
```

Only show:

- Published projects
- Visible projects
- Non-deleted projects

## Project Detail `/projects/[slug]`

Required order:

```text
Breadcrumb
Project Hero
Project Summary
Date and Status
Main Image
Technology Stack
Problem
Solution
My Role
Key Features
Architecture
Development Process
Challenges and Solutions
Testing
Results
Gallery
Lessons Learned
Project Links
Related Projects
Back to Projects
```

Connections:

```text
Home breadcrumb → /
Projects breadcrumb → /projects
Technology → related technology information
Related Project → /projects/[slug]
GitHub → external
Demo → external
Report → file or external URL
Back to Projects → /projects
```

Only render sections that contain valid data.

## Timeline Page `/timeline`

Required content:

- Full chronological project journey
- Academic milestones
- Technical milestones
- Project links

Connections:

```text
Timeline Entry → /projects/[slug]
Contact CTA → /contact
```

## Resume Page `/resume`

Required content:

- Summary
- Education
- Experience
- Skills
- Selected projects
- Download current CV

Connections:

```text
Project → /projects/[slug]
Contact → /contact
Download CV → current PDF
```

## Contact Page `/contact`

Required content:

- Contact form
- Email
- GitHub
- LinkedIn
- Availability text
- Form feedback

Flow:

```text
Submit Form
→ Client Validation
→ Protected Public Contact API
→ Server Validation
→ Rate Limit
→ Store Message
→ Show Success
→ Display in Admin Messages
```

---

# 8. Canonical Admin Sidebar Order

The admin sidebar order must be:

```text
1. Dashboard
2. Page Builder
3. Templates
4. Projects
5. Technologies
6. Timeline
7. Education
8. Experience
9. Media Library
10. Messages
11. 3D Game
12. Site Settings
13. Logout
```

Connections:

| Admin Item | Route |
|---|---|
| Dashboard | `/admin/dashboard` |
| Page Builder | `/admin/page-builder` |
| Templates | `/admin/templates` |
| Projects | `/admin/projects` |
| Technologies | `/admin/technologies` |
| Timeline | `/admin/timeline` |
| Education | `/admin/education` |
| Experience | `/admin/experience` |
| Media Library | `/admin/media` |
| Messages | `/admin/messages` |
| 3D Game | `/admin/game` |
| Site Settings | `/admin/settings` |
| Logout | session logout action |

Remove duplicated or incorrectly nested admin navigation items.

---

# 9. Admin Dashboard Responsibilities

Route:

```text
/admin/dashboard
```

Must show:

- Total projects
- Published projects
- Draft projects
- Hidden projects
- Technology count
- Timeline count
- Unread messages
- Active template
- Last published date
- Recent admin activity

Quick actions:

```text
Add Project → /admin/projects/new
Edit Homepage → /admin/page-builder
Change Template → /admin/templates
Upload Media → /admin/media
Preview Draft → /admin/preview
View Live Site → /
View Messages → /admin/messages
```

Do not place full editing forms directly on the dashboard.

---

# 10. Page Builder Architecture

Route:

```text
/admin/page-builder
```

Use three areas:

```text
Component Library | Page Structure | Section Settings
```

## Component Library

Available homepage sections:

- Hero
- About Summary
- Technology Stack
- Featured Projects
- Project Grid
- Project Timeline
- Education and Experience
- Custom Content
- Other Projects
- 3D Stack Game
- Contact Call to Action

## Page Structure

Every section row must provide:

- Drag handle
- Section name
- Section type
- Visibility state
- Edit
- Duplicate
- Hide or show
- Delete
- Move up
- Move down

## Section Settings

Common options:

- Internal admin label
- Public title
- Subtitle
- Description
- Selected records
- Layout style
- Background
- Alignment
- Spacing
- Animation
- Visibility
- Mobile behavior

## Page Builder Data Flow

```text
Admin Changes Section
→ Update Local Draft State
→ Save Draft
→ Persist Draft Section Settings and Position
→ Preview Draft
→ Publish Confirmation
→ Publish
```

## Reordering Requirements

When a section is dragged:

1. Update visible order immediately
2. Update all affected numeric positions
3. Persist the new draft order
4. Show a saved or unsaved status
5. Keep preview order identical
6. Do not publish automatically

---

# 11. Templates Architecture

Route:

```text
/admin/templates
```

Required templates:

1. Professional Minimal
2. Modern Glass
3. Interactive 3D

Each template must:

- Use the same content records
- Use the same route structure
- Use the same section registry
- Respect the stored homepage section order
- Respect visibility
- Preserve links
- Preserve projects
- Preserve technologies
- Preserve timeline data

Template selection changes presentation, not content.

Flow:

```text
Select Template as Draft
→ Save Draft Selection
→ Preview
→ Publish Confirmation
→ Publish
```

Check whether any current template component hard-codes a different homepage order. Remove that behavior.

---

# 12. Content Manager Interconnections

## Projects Manager

Route:

```text
/admin/projects
```

Project data appears in:

- Featured Projects
- Project Grid
- Project Timeline
- Project Detail
- Resume
- Related Projects
- Technology relationships
- 3D technology links

Project editor must support:

- Basic information
- Media
- Technologies
- Case study
- Results
- Links
- Display settings
- SEO
- Save draft
- Preview

## Technologies Manager

Route:

```text
/admin/technologies
```

Technology data appears in:

- Technology Stack
- Project cards
- Project detail
- Timeline
- Filters
- 3D section

## Timeline Manager

Route:

```text
/admin/timeline
```

Timeline data appears in:

- Homepage timeline preview
- Full timeline page
- Related project links

## Education Manager

Route:

```text
/admin/education
```

Education appears in:

- Home preview
- About
- Resume

## Experience Manager

Route:

```text
/admin/experience
```

Experience appears in:

- Home preview
- About
- Resume

## Media Library

Route:

```text
/admin/media
```

Media can be reused by:

- Hero
- About
- Projects
- Technology logos
- Timeline
- Education
- Experience
- Resume
- Template preview
- 3D section

## Messages

Route:

```text
/admin/messages
```

Messages must come only from the public contact form.

## 3D Game Settings

Route:

```text
/admin/game
```

Must reuse technology records rather than maintaining a disconnected list of technology names.

## Site Settings

Route:

```text
/admin/settings
```

Must control:

- Site name
- Logo
- Favicon
- Contact email
- GitHub
- LinkedIn
- CV
- Footer
- SEO defaults
- Theme defaults

---

# 13. Admin Preview Requirements

Route:

```text
/admin/preview
```

Preview must show:

- Draft template
- Draft homepage order
- Draft visibility
- Draft project changes
- Draft technology changes
- Draft site settings

Preview toolbar connections:

```text
Back to Editor → previous admin editor
View Live Site → /
Publish → /admin/publish-confirmation
```

`View Live Site` must load published data.

`Preview Draft` must load draft data.

Do not make both buttons open the same content source.

---

# 14. Publish Confirmation Page

Route:

```text
/admin/publish-confirmation
```

Publishing remains a single confirmation page.

Required content:

```text
Publish Confirmation

Pending Changes Summary
Selected Template
Changed Homepage Sections
Changed Projects
Changed Technologies
Changed Timeline Entries
Changed Education or Experience
Changed Site Settings

[Back to Preview]
[Cancel]
[Publish Changes]
```

Flow:

```text
Edit
→ Save Draft
→ Preview
→ Publish Confirmation
→ Publish
→ Public Website Updated
```

Do not implement:

- Second confirmation modal
- Typed PUBLISH requirement
- Rollback timer
- Version restore system

unless explicitly requested later.

---

# 15. Required Data Relationships

Ensure the database supports:

```text
Project many-to-many Technology
Project optional Timeline Entry
Project one-to-many Project Images
Page one-to-many Page Sections
Template selected by Site Settings or Published Configuration
Contact Form one-to-many Contact Messages
Technology selected by 3D Game Settings
Media Asset reused across entities
```

Check current foreign keys and relation fields.

Fix:

- Orphaned records
- Duplicate technology records
- Timeline entries with invalid project IDs
- Section records with invalid types
- Invalid media references
- Incorrect cascade deletion
- Missing visibility filters

Use soft deletion where already supported.

---

# 16. Component Registry Requirement

All dynamic homepage sections must be rendered through one controlled registry.

Example:

```ts
const sectionRegistry = {
  hero: HeroSection,
  about: AboutSummarySection,
  "tech-stack": TechnologyStackSection,
  "featured-projects": FeaturedProjectsSection,
  "project-grid": ProjectGridSection,
  "project-timeline": ProjectTimelineSection,
  "education-experience": EducationExperienceSection,
  "other-projects": OtherProjectsSection,
  "stack-game": StackGameSection,
  contact: ContactCTASection,
};
```

Do not scatter section-type conditions across multiple templates and pages.

Unknown section type behavior:

```text
Log warning
→ Skip safely
→ Do not crash homepage
```

---

# 17. Architecture Problems to Search For

Explicitly inspect for these common problems:

- Home sections manually written in the wrong JSX order
- Database order ignored
- Different order in each template
- Preview and live site using the same draft query
- Public site accidentally loading draft records
- Public and admin navigation mixed together
- Duplicate routes
- Broken breadcrumbs
- Buttons linking to placeholder `#`
- Nested interactive elements
- Project cards linking to edit pages
- Admin buttons linking to public project pages unintentionally
- Published and draft state mixed in one field
- Hidden items still rendered
- Deleted items still rendered
- Technologies stored as plain strings in some places and database relations elsewhere
- Timeline duplicating project data instead of referencing it
- Media paths hard-coded in components
- Template selected only in local storage
- Page-builder reorder saved only in browser state
- Admin sidebar order inconsistent
- Mobile navigation missing routes
- `/admin` route not redirecting correctly
- Login page using public header
- Preview page indexed publicly
- Contact form not connected to admin messages
- CV button pointing to an old file
- No not-found handling for invalid project slug

Correct all mismatches found.

---

# 18. Required Final Site Flow

## Guest Flow

```text
Home
├── About
├── Projects
│   └── Project Detail
├── Timeline
├── Resume
└── Contact
```

## Admin Flow

```text
Login
→ Dashboard
├── Page Builder
├── Templates
├── Projects
├── Technologies
├── Timeline
├── Education
├── Experience
├── Media
├── Messages
├── 3D Game
└── Settings
```

## Publishing Flow

```text
Admin Editor
→ Save Draft
→ Preview Draft
→ Publish Confirmation
→ Publish
→ Public Website
```

## Content Flow

```text
Projects
├── Homepage Featured Projects
├── Projects Page
├── Project Detail
├── Timeline
├── Resume
└── Related Projects

Technologies
├── Stack Section
├── Project Cards
├── Project Detail
├── Filters
└── 3D Section

Education and Experience
├── Home Preview
├── About
└── Resume

Contact
→ Contact Message
→ Admin Messages
```

---

# 19. Testing Requirements

After refactoring, verify:

## Route Tests

- `/` loads public home
- `/about` loads About
- `/projects` loads published projects
- `/projects/[slug]` loads correct project
- Invalid slug returns 404
- `/timeline` loads timeline
- `/resume` loads current resume data
- `/contact` submits messages
- `/admin/*` redirects when logged out
- Admin login redirects to dashboard
- Preview requires authentication
- Publish confirmation requires authentication

## Navigation Tests

- Public header links go to correct pages
- Mobile navigation order matches desktop
- Admin sidebar links go to correct modules
- Breadcrumbs work
- Home CTAs work
- Project card links work
- Related-project links work
- External links open correctly

## Homepage Order Tests

- Published homepage follows stored positions
- Draft preview follows draft positions
- Hidden sections are absent
- Duplicate positions are normalized
- All three templates use the same order
- Drag-and-drop persists after refresh

## Data Visibility Tests

- Draft projects are not public
- Hidden projects are not public
- Deleted records are not public
- Draft site settings are not public
- Preview shows drafts
- Live site shows published data

## Admin Tests

- Add, edit, duplicate, hide, delete, and rearrange work
- Project and technology relationships work
- Timeline project links work
- Media reuse works
- Contact message appears in admin
- Publish confirmation summarizes pending changes
- Publish updates the public site

---

# 20. Required Refactor Output

After completing the audit and changes, provide a concise implementation report containing:

1. Existing architecture problems found
2. Routes added, removed, or changed
3. Layout changes
4. Navigation changes
5. Homepage-order issues fixed
6. Database or seed-order fixes
7. Page-builder fixes
8. Template consistency fixes
9. Draft-versus-published fixes
10. Broken links fixed
11. Remaining limitations
12. Files modified

Do not claim a problem was fixed unless the code was actually updated and verified.

---

# 21. Final Acceptance Criteria

The architecture is correct only when:

- Guest, admin, and preview experiences are clearly separated
- Public navigation follows the required order
- Admin sidebar follows the required order
- Public pages are connected logically
- Project cards link to project details
- Timeline entries link to projects
- Technologies link to related projects
- Contact submissions appear in Admin Messages
- Homepage sections render from stored published positions
- Admin preview renders from draft positions
- Every template respects the same section order
- Drag-and-drop order survives refresh
- Hidden sections do not render
- Draft content does not appear publicly
- Admin routes are protected
- Preview and live views use different content states
- Publish uses the dedicated confirmation page
- Existing working functionality is preserved
- The codebase no longer contains conflicting page-order logic

---

# 22. Final Instruction to the Code Editor

Inspect the actual repository and apply these corrections directly.

Do not only describe what should change.

Do not generate an unrelated sample project.

Do not leave the old jumbled routing or section-order logic active beside the new implementation.

Refactor the existing files, database ordering, seed data, navigation, and dynamic renderer so the running application follows this architecture.

Where the current code already follows the specification, keep it.

Where it differs, update it and verify the complete guest-to-admin flow.
