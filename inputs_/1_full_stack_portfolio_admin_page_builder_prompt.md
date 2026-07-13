# Full-Stack Developer Portfolio with Admin CMS and Visual Page Builder

## Master Development Prompt

Build a complete, modern, full-stack developer portfolio for a final-year Software Engineering student.

The system must include:

- A polished public portfolio website
- A secure owner-only admin panel
- Full add, edit, delete, duplicate, hide, publish, and archive controls
- A drag-and-drop homepage page builder
- Three selectable public website templates
- A project timeline with images and project links
- A technology stack section with logos/images
- A 3D technology-ball interaction or mini-game near the bottom of the homepage
- Draft, preview, confirmation, publish, and rollback functionality
- A second confirmation step before important changes become public
- A one-hour rollback timer after publishing
- Responsive desktop, tablet, and mobile layouts
- A real database, authentication, validation, image storage, and APIs

Do not build this as a static hard-coded portfolio. The public website must be generated from content and layout settings managed through the admin panel.

Do not invent personal details, project names, achievements, links, technologies, work history, grades, or metrics. Use clear placeholder data where actual content has not been supplied.

Do not include CaloriQ as a project.

---

# 1. Main Objective

Create a portfolio that demonstrates a moderate but capable final-year Software Engineering student's knowledge of:

- Frontend development
- Backend development
- Database design
- Authentication and authorization
- REST API development
- Content management
- File and image uploading
- Drag-and-drop user interfaces
- Responsive web design
- Version control concepts
- Deployment
- Basic 3D web interaction
- Software architecture
- Validation and error handling

The user must be able to manage the complete portfolio through the admin panel without editing source code.

---

# 2. Recommended Technology Stack

## Frontend

- Next.js with App Router
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- dnd-kit for drag-and-drop
- React Hook Form
- Zod
- Lucide React icons

## 3D Section

- Three.js
- React Three Fiber
- Drei
- React Three Rapier only if physics is included

## Backend

Use one of these two architectures.

### Preferred architecture

- Next.js Route Handlers
- Server Actions where appropriate
- Service layer
- Repository layer
- Prisma ORM
- PostgreSQL

### Acceptable alternative

- Next.js frontend
- NestJS or Express backend
- REST API
- Prisma ORM
- PostgreSQL

## Authentication and Storage

- Supabase Authentication or Auth.js
- Supabase Storage, Cloudinary, or an equivalent image-storage service
- Secure HTTP-only session cookies where possible

## Deployment

- Vercel for the Next.js application
- Supabase, Neon, or another managed PostgreSQL database
- GitHub for version control
- GitHub Actions for build, lint, and test checks

---

# 3. User Roles

## Public Visitor

Can:

- View the portfolio
- Browse projects
- View project details
- View project timelines
- Explore technology stacks
- Use the 3D technology interaction
- Download the CV
- Open GitHub, LinkedIn, demo, report, and repository links
- Submit a contact message

Cannot:

- Access drafts
- Access the admin panel
- Modify content
- View private contact messages
- View unpublished projects

## Portfolio Owner or Admin

Can:

- Log in securely
- Manage all portfolio content
- Add, edit, delete, archive, duplicate, hide, or publish items
- Rearrange homepage sections
- Add new homepage sections
- Change section settings
- Select one of three public templates
- Preview changes before publishing
- Confirm public changes using a two-stage confirmation process
- Roll back the latest published change for one hour
- Restore older saved versions through version history
- Manage files and images
- Read and manage contact messages
- Configure the 3D stack game
- Manage global site settings

Only the owner or authorized administrator must access the admin routes.

---

# 4. Public Website Structure

The public website should contain the following pages.

## 4.1 Homepage

Recommended default section order:

1. Navigation bar
2. Hero section
3. About section
4. Technology stack section
5. Featured projects
6. Project journey or project timeline
7. Education and experience
8. Other projects
9. 3D technology-ball interaction or game
10. Contact section
11. Footer

This order must not be hard-coded. The admin must be able to rearrange, hide, add, duplicate, or remove homepage sections.

## 4.2 Projects Listing Page

Route example:

```text
/projects
```

Features:

- Project cards
- Search
- Category filters
- Technology filters
- Status filters where appropriate
- Sort by newest, oldest, featured, or manually selected order
- Pagination or load-more behavior
- Links to project detail pages

## 4.3 Project Detail Page

Route example:

```text
/projects/[slug]
```

Recommended project page structure:

1. Project hero
2. Project title and summary
3. Project date or development period
4. Project status
5. Main project image
6. Technology stack
7. Problem statement
8. Proposed solution
9. My role
10. Main features
11. System architecture
12. Development process
13. Challenges
14. Solutions
15. Testing
16. Results
17. Screenshots and gallery
18. Lessons learned
19. Related projects
20. External links

External links may include:

- Live demo
- GitHub repository
- Demo video
- Report
- Documentation
- Presentation
- Notebook

Only show links that exist.

## 4.4 About Page

Route example:

```text
/about
```

May include:

- Personal introduction
- Education
- Technical interests
- Current availability
- Career goals
- CV download
- Main tools and technologies

## 4.5 Contact Page

Route example:

```text
/contact
```

Include:

- Contact form
- Name
- Email
- Subject
- Message
- Optional category
- Social links
- Success and failure feedback
- Spam protection
- Validation
- Rate limiting

---

# 5. Public Homepage Sections

Each homepage section must be implemented as a reusable registered component.

## 5.1 Navigation Bar

Settings:

- Logo text or logo image
- Navigation links
- Sticky mode
- Transparent or solid mode
- Active section indicator
- CV button
- Contact button
- Mobile menu
- Theme-aware colors

## 5.2 Hero Section

Settings:

- Main heading
- Highlighted words
- Short introduction
- Role or title
- Profile image
- Background style
- Primary button
- Secondary button
- Social links
- Optional orbiting technology icons
- Optional animated code card
- Left, centered, or split layout

## 5.3 About Section

Settings:

- Section title
- Main description
- Profile image
- Short facts
- Current status
- Location text
- CV link
- Image-left, image-right, centered, or card layout

## 5.4 Technology Stack Section

Display technologies as visual cards with logos or images.

Each technology card may contain:

- Logo
- Name
- Category
- Short description
- Number of linked projects
- Optional experience label
- Optional modal with related projects

Category filters:

- All
- Frontend
- Backend
- Database
- AI and Machine Learning
- Mobile
- Tools
- DevOps
- Other

Do not use unrealistic percentage values such as React 95%.

Use labels such as:

- Strong
- Comfortable
- Working knowledge
- Learning

## 5.5 Featured Projects Section

Settings:

- Section title
- Description
- Number of projects
- Featured-only toggle
- Selected projects
- Grid or horizontal layout
- Number of columns
- Show thumbnail
- Show technology stack
- Show dates
- Show GitHub
- Show live demo
- Show case-study link
- Card animation
- Manual order

## 5.6 Project Timeline

Display projects based on development period.

Each timeline entry may contain:

- Project name
- Start date
- End date
- Image
- Summary
- Role
- Technologies
- Status
- Project detail link
- GitHub link
- Live demo link

Timeline layout options:

- Alternating left and right
- Left aligned
- Horizontal
- Card-based
- Compact mobile version

The admin must be able to manually rearrange timeline entries.

## 5.7 Education Section

Fields:

- Institution
- Qualification
- Start date
- End date
- Grade or result if supplied
- Description
- Institution logo
- Relevant modules
- Current or completed status

## 5.8 Experience Section

Fields:

- Organization
- Role
- Start date
- End date
- Description
- Responsibilities
- Technologies
- Logo
- Work type
- Location text
- Current role indicator

## 5.9 Custom Content Section

Allow controlled flexible content.

Settings:

- Heading
- Subheading
- Rich text
- Image
- Buttons
- Alignment
- Background
- Width
- Padding
- Optional two-column layout

Do not allow arbitrary executable code from the admin panel.

## 5.10 3D Technology-Ball Section

Place this section near the end of the default homepage.

### Preferred initial version

Create a 3D sphere or floating environment with technology-logo balls.

Visitors can:

- Drag to rotate
- Hover over a ball
- Click a ball
- View technology details
- View linked projects
- Open related projects

### Optional game mode

Technology balls fall into a 3D container.

The user controls a basket or platform to collect them.

Possible controls:

- Arrow keys
- A and D keys
- Mouse movement
- Touch drag
- On-screen mobile controls

When a ball is collected, show:

- Technology name
- Points
- Short use case
- Projects using the technology

Game settings in the admin panel:

- Enable or disable game mode
- Select technologies
- Ball count
- Ball size
- Falling speed
- Difficulty
- Sound
- Score display
- Instructions
- Background
- Physics mode
- Save scores toggle
- Leaderboard toggle

The 3D section must lazy-load and must not block the initial page render.

Provide a simple non-3D fallback for unsupported devices or reduced-motion mode.

## 5.11 Contact Section

Settings:

- Heading
- Description
- Form fields
- Email display toggle
- Location display toggle
- Social links
- Success message
- Background style
- Optional illustration

## 5.12 Footer

Settings:

- Copyright text
- Navigation links
- Social links
- Back-to-top button
- Technology credit text
- Current year handling

---

# 6. Three Selectable Public Templates

Create three complete visual templates that use the same database content and section configuration.

The admin can choose which template is currently active.

Changing the template must not delete content.

## Template 1: Professional Minimal

Style:

- White or soft dark background
- Clean grid
- Moderate rounded cards
- Subtle shadows
- Small animations
- Strong readability
- Professional recruiter-friendly layout

Best for:

- Job applications
- Academic review
- Formal presentation

## Template 2: Modern Glass

Style:

- Dark navy or charcoal background
- Glassmorphism cards
- Soft gradients
- Blue, cyan, or violet accent
- Smooth motion
- Slight glow
- Modern technical appearance

Best for:

- Full-stack developer identity
- Creative but professional presentation

## Template 3: Interactive 3D

Style:

- Dark immersive background
- 3D hero object
- Floating technology elements
- More noticeable transitions
- Interactive stack section
- Stronger visual emphasis

Best for:

- Demonstrating animation and 3D development
- Showing the technology-ball interaction prominently

## Template Requirements

All three templates must:

- Use the same content
- Support the same pages
- Support the same section types
- Respect the selected section order
- Support responsive design
- Support accessibility
- Support light or dark mode where applicable
- Keep project data and links unchanged
- Allow template-specific section styling
- Have preview thumbnails in the admin panel

The admin template selector should display:

```text
Professional Minimal
Modern Glass
Interactive 3D
```

Each option should include:

- Preview image
- Description
- Current active indicator
- Preview button
- Select button

Do not make the selected template public immediately. It must follow the draft, preview, confirmation, and publish workflow.

---

# 7. Admin Panel Structure

Recommended routes:

```text
/admin/login
/admin
/admin/page-builder
/admin/templates
/admin/projects
/admin/technologies
/admin/timeline
/admin/education
/admin/experience
/admin/media
/admin/messages
/admin/game
/admin/settings
/admin/versions
/admin/preview
```

## 7.1 Admin Dashboard

Show:

- Published projects
- Draft projects
- Hidden projects
- Technologies
- Timeline entries
- Unread messages
- Last published time
- Active template
- Current rollback timer
- Recent activity
- Quick add project
- Quick edit homepage
- Preview portfolio
- Publish pending changes

## 7.2 Admin Sidebar

Include:

- Dashboard
- Page Builder
- Templates
- Projects
- Technologies
- Timeline
- Education
- Experience
- Media Library
- Messages
- 3D Game
- Site Settings
- Version History
- Logout

---

# 8. Visual Page Builder

The page builder must behave like a simplified form builder or website builder.

Use three main areas.

## Left Panel: Component Library

Available components:

- Hero
- About
- Technology Stack
- Featured Projects
- Project Grid
- Project Timeline
- Education
- Experience
- Custom Content
- 3D Stack Game
- Contact
- Footer Spacer
- Call to Action

The admin clicks or drags a component into the page.

## Middle Panel: Page Structure

Display all homepage sections.

Each section must show:

- Drag handle
- Section name
- Section type
- Visibility status
- Draft-change indicator
- Edit button
- Duplicate button
- Hide or show button
- Delete button

Example:

```text
☰ Hero
☰ About Me
☰ Technology Stack
☰ Featured Projects
☰ Project Timeline
☰ Education
☰ 3D Stack Game
☰ Contact
```

The admin can drag sections up or down.

## Right Panel: Section Settings

The selected section opens a form.

Common section settings:

- Internal admin label
- Public title
- Subtitle
- Description
- Visibility
- Background style
- Text alignment
- Maximum width
- Top spacing
- Bottom spacing
- Animation
- Template-specific appearance
- Mobile behavior
- Selected content
- Save section button

## Page Builder Actions

Include:

- Add section
- Edit section
- Duplicate section
- Hide section
- Show section
- Delete section
- Drag to reorder
- Undo
- Redo
- Save draft
- Discard draft
- Preview
- Start publish process

---

# 9. Controlled Component Registry

Do not allow arbitrary React code to be inserted through the admin panel.

Use a registered section-component map.

Example:

```ts
const sectionRegistry = {
  hero: HeroSection,
  about: AboutSection,
  "tech-stack": TechStackSection,
  "featured-projects": FeaturedProjectsSection,
  "project-grid": ProjectGridSection,
  "project-timeline": ProjectTimelineSection,
  education: EducationSection,
  experience: ExperienceSection,
  "custom-content": CustomContentSection,
  "stack-game": StackGameSection,
  contact: ContactSection,
};
```

The public renderer must:

1. Load the active published page version
2. Load the active public template
3. Filter visible sections
4. Sort by position
5. Match each section type to a registered component
6. Render the section with validated settings
7. Skip unsupported or corrupted section types safely

---

# 10. Content Management Features

Every main content type must support CRUD operations.

CRUD means:

- Create
- Read
- Update
- Delete

Also support:

- Draft
- Publish
- Hide
- Archive
- Duplicate
- Restore
- Search
- Filter
- Sort
- Manual display order

## 10.1 Project Management

Project fields:

- Title
- Slug
- Summary
- Full description
- Start date
- End date
- Status
- Thumbnail
- Cover image
- Gallery
- Demo video
- Category
- Technologies
- Problem
- Solution
- My role
- Main features
- Architecture
- Challenges
- Solutions
- Testing
- Results
- Lessons learned
- Live demo URL
- GitHub URL
- Report URL
- Documentation URL
- Video URL
- Featured toggle
- Homepage toggle
- Timeline toggle
- Published toggle
- Manual order
- SEO title
- SEO description

## 10.2 Technology Management

Technology fields:

- Name
- Slug
- Logo
- Category
- Description
- Experience label
- Display order
- Linked projects
- Show in stack section
- Show in 3D game
- Active or hidden

## 10.3 Timeline Management

Timeline fields:

- Title
- Start date
- End date
- Description
- Image
- Related project
- Technology list
- Links
- Status
- Visibility
- Display order

## 10.4 Education Management

Education fields:

- Institution
- Qualification
- Start date
- End date
- Description
- Grade if supplied
- Logo
- Modules
- Visibility
- Display order

## 10.5 Experience Management

Experience fields:

- Organization
- Role
- Start date
- End date
- Current role
- Description
- Responsibilities
- Technology list
- Logo
- Location text
- Work type
- Visibility
- Display order

## 10.6 Contact Message Management

Message fields:

- Name
- Email
- Subject
- Message
- Status
- Created date
- Reply status

Statuses:

- New
- Read
- Replied
- Archived

Actions:

- Open
- Mark read
- Mark unread
- Mark replied
- Archive
- Delete

---

# 11. Media Library

Create a reusable media manager.

Features:

- Upload image
- Upload document
- Upload CV
- Upload project screenshots
- Upload logos
- Preview file
- Rename
- Replace
- Delete
- Copy URL
- Search
- Filter by type
- Add alternative text
- View file size
- View upload date
- Prevent deleting files that are currently used, unless the user confirms replacement or removal

Supported public media examples:

- JPG
- PNG
- WebP
- SVG
- PDF
- MP4 or video URL where appropriate

Validate:

- MIME type
- File extension
- Maximum size
- Image dimensions where required

---

# 12. Draft, Preview, Two-Step Confirmation, and Publishing

Important changes must not immediately affect the public website.

Use this workflow:

```text
Edit
→ Save Draft
→ Preview
→ Review Changes
→ First Confirmation
→ Second Confirmation
→ Publish
→ One-Hour Rollback Window
```

## 12.1 Save Draft

Saving a draft:

- Stores changes privately
- Does not update the live site
- Shows an unsaved or draft indicator
- Records the admin and timestamp

No confirmation is required for a normal draft save.

## 12.2 Preview

The preview must:

- Render the selected draft content
- Render the selected draft template
- Show draft section order
- Be visible only to the logged-in admin
- Clearly display a PREVIEW MODE banner
- Provide desktop, tablet, and mobile preview controls
- Prevent search engine indexing

Suggested route:

```text
/admin/preview
```

## 12.3 Change Review Screen

Before publishing, display a summary of all pending changes.

Example:

```text
Pending Public Changes

- Active template changed from Professional Minimal to Modern Glass
- Technology Stack moved above Featured Projects
- One project added
- One project hidden
- Hero title updated
- 3D game enabled
```

The admin must review this page before continuing.

## 12.4 First Confirmation

Show:

```text
You are about to update the public portfolio.

Please confirm that you reviewed the preview and change summary.

[Cancel] [I Reviewed the Changes]
```

## 12.5 Second Confirmation

After the first confirmation, show a second independent confirmation dialog.

For normal publishing:

```text
Final Confirmation

These changes will become visible on the public website.

Type PUBLISH to continue.

[Cancel] [Publish Changes]
```

The publish button must remain disabled until the correct confirmation word is entered.

For destructive actions such as permanent deletion:

```text
Type DELETE to permanently remove this item.
```

For template changes:

```text
Type SWITCH to make this template public.
```

The system may also require password re-entry for highly sensitive actions.

## 12.6 Publishing

When published:

- Create a new immutable published version
- Store the previous published version
- Store who published it
- Store the publication timestamp
- Update the public website
- Start the one-hour rollback timer
- Show a success message
- Show a direct link to the public website

---

# 13. One-Hour Rollback Timer

After every successful publish, display a rollback banner in the admin panel.

Example:

```text
Version 12 is now live.

You can instantly roll back to Version 11 for:
59:42 remaining

[View Live Site] [Rollback]
```

## Timer Rules

- Rollback window duration: exactly one hour
- Start time: successful publication timestamp
- Display a live countdown
- Persist the timer across page refreshes
- Calculate the remaining time on the server
- Do not rely only on the browser clock
- Show the rollback banner throughout the admin panel
- Allow only authorized administrators to roll back

## Rollback Confirmation

Rollback must also use two-step confirmation.

First step:

```text
Rollback will replace the current public version with the previous version.

[Cancel] [Continue]
```

Second step:

```text
Type ROLLBACK to confirm.
```

## Rollback Result

When rollback succeeds:

- Restore the immediately previous published version
- Keep the rolled-back version in version history
- Record the action in the audit log
- Show a success message
- Start a new one-hour rollback period for the restoration action, if version rules allow it

## After One Hour

After the one-hour instant rollback period expires:

- Disable the quick rollback button
- Show “Rollback window expired”
- Keep all versions in version history
- Allow restoration through the Version History screen
- Require the same two-step confirmation for an older version restoration

This means the one-hour timer controls quick rollback, but version history remains available for safe recovery.

---

# 14. Version History

Create a Version History page.

Show:

- Version number
- Publication date
- Published by
- Active or inactive status
- Template used
- Short change summary
- Preview
- Restore
- Rollback availability
- Rollback expiration time

Example:

```text
Version 12 — Active
Published: 13 July 2026, 1:30 AM
Template: Modern Glass

Version 11
Published: 12 July 2026, 8:10 PM
Template: Professional Minimal
```

Version snapshots should include:

- Page sections
- Section order
- Section visibility
- Section settings
- Active template
- Global site settings
- Relevant published content identifiers

Do not overwrite previous versions.

---

# 15. Delete and Destructive Action Safety

Use soft deletion where practical.

Examples:

- Projects
- Technologies
- Timeline entries
- Education
- Experience
- Media records

Suggested field:

```text
deleted_at
```

For normal soft delete:

1. Open confirmation dialog
2. Show affected content
3. Ask for confirmation
4. Move item to Trash

For permanent deletion:

1. First confirmation
2. Show dependency warning
3. Require typed confirmation
4. Delete only after server validation

If an item is used by a public section, warn the admin before deletion.

Example:

```text
This technology is used by:

- LIVEDET
- Technology Stack section
- 3D Stack Game

Remove these references before permanent deletion.
```

---

# 16. Template Selection Workflow

Admin template selection must work as follows:

1. Open Templates
2. View three template cards
3. Preview any template using current draft content
4. Select a template as draft
5. Save draft
6. Open full preview
7. Review change summary
8. Complete first confirmation
9. Complete second confirmation
10. Publish
11. Start the one-hour rollback timer

The template selector must clearly show:

- Active live template
- Selected draft template
- Preview state
- Unsaved state

---

# 17. Database Design

Use PostgreSQL.

Suggested tables or models follow.

## User

```text
id
email
password_hash or auth_provider_id
role
is_active
created_at
updated_at
last_login_at
```

## SiteSettings

```text
id
site_name
site_description
logo_url
favicon_url
default_seo_title
default_seo_description
contact_email
cv_url
github_url
linkedin_url
active_template_id
draft_template_id
created_at
updated_at
```

## Template

```text
id
name
slug
description
preview_image_url
is_available
created_at
updated_at
```

## Page

```text
id
name
slug
status
created_at
updated_at
published_at
```

## PageSection

```text
id
page_id
type
admin_label
position
is_visible
draft_settings_json
published_settings_json
created_at
updated_at
deleted_at
```

An alternative approach is to store draft and published versions separately.

## PageVersion

```text
id
page_id
version_number
template_id
sections_snapshot_json
settings_snapshot_json
change_summary
published_by
published_at
rollback_expires_at
is_active
created_at
```

## Project

```text
id
title
slug
summary
description
start_date
end_date
status
thumbnail_url
cover_image_url
category
problem
solution
role_description
features_json
architecture_description
challenges_json
solutions_json
testing_description
results_description
lessons_learned
live_url
github_url
report_url
documentation_url
video_url
is_featured
show_on_homepage
show_on_timeline
is_published
display_order
seo_title
seo_description
created_at
updated_at
deleted_at
```

## Technology

```text
id
name
slug
category
logo_url
description
experience_label
display_order
show_in_stack
show_in_game
is_active
created_at
updated_at
deleted_at
```

## ProjectTechnology

```text
project_id
technology_id
```

## ProjectImage

```text
id
project_id
image_url
alt_text
caption
display_order
created_at
```

## TimelineEntry

```text
id
title
start_date
end_date
description
image_url
project_id
links_json
is_visible
display_order
created_at
updated_at
deleted_at
```

## Education

```text
id
institution
qualification
start_date
end_date
description
grade
logo_url
modules_json
is_visible
display_order
created_at
updated_at
deleted_at
```

## Experience

```text
id
organization
role
start_date
end_date
is_current
description
responsibilities_json
logo_url
location_text
work_type
is_visible
display_order
created_at
updated_at
deleted_at
```

## ContactMessage

```text
id
name
email
subject
message
status
created_at
updated_at
deleted_at
```

## MediaAsset

```text
id
filename
original_filename
url
mime_type
size_bytes
alt_text
uploaded_by
created_at
updated_at
deleted_at
```

## GameSetting

```text
id
is_enabled
mode
difficulty
ball_count
fall_speed
sound_enabled
leaderboard_enabled
instructions
background_style
selected_technologies_json
updated_at
```

## GameScore

```text
id
player_name
score
created_at
```

Only store game scores if leaderboard mode is enabled.

## AuditLog

```text
id
user_id
action
entity_type
entity_id
before_json
after_json
ip_address
created_at
```

---

# 18. API Requirements

Suggested API structure:

```text
/api/auth
/api/site-settings
/api/templates
/api/pages
/api/page-sections
/api/page-versions
/api/projects
/api/technologies
/api/timeline
/api/education
/api/experience
/api/media
/api/messages
/api/game-settings
/api/publish
/api/rollback
/api/audit
```

Every protected API must:

- Verify authentication
- Verify authorization
- Validate input
- Return clear status codes
- Return useful error messages
- Prevent unauthorized access
- Handle database failures
- Log sensitive actions where appropriate

Use Zod schemas for request validation.

---

# 19. Authentication and Security

Requirements:

- Secure admin login
- Protected admin routes
- Server-side authorization
- HTTP-only secure cookies where possible
- CSRF protection where relevant
- Login rate limiting
- Contact-form rate limiting
- Input sanitization
- Strong validation
- Password hashing if local authentication is used
- Session expiration
- Logout
- File validation
- Maximum upload size
- Safe URL validation
- Audit logs
- No admin secrets in client code
- No public access to draft content
- No public access to contact messages
- No public access to unpublished media where restricted

Optional:

- Two-factor authentication
- Password re-entry before publishing
- Email notification after publication
- Email notification after rollback

---

# 20. User Experience Requirements

## Admin Experience

The admin panel must be easy to use.

Use:

- Clear labels
- Form validation near fields
- Tooltips where needed
- Searchable selectors
- Image previews
- Autosave indicators for long forms
- Unsaved-changes warnings
- Loading states
- Empty states
- Success messages
- Error messages
- Confirmation dialogs
- Mobile-friendly basic access
- Desktop-optimized page builder

## Public Experience

Use:

- Smooth but moderate animation
- Fast page load
- Clear navigation
- Readable typography
- Strong project visuals
- Accessible contrast
- Keyboard navigation
- Responsive layouts
- Reduced-motion support
- Lazy-loaded 3D content
- Skeleton loading for dynamic content
- Clear external-link icons

Avoid:

- Long loading introductions
- Excessive particles
- Constant screen movement
- Fake skill percentages
- Too many neon effects
- Broken project links
- Large blocks of text
- Animations that block content
- Autoplay audio
- Unnecessary cursor effects

---

# 21. Responsive Design

Support:

- Desktop
- Laptop
- Tablet
- Mobile

Requirements:

- Responsive navigation
- Stacked mobile sections
- Touch-friendly buttons
- Mobile project timeline layout
- Mobile technology filters
- Mobile-safe 3D fallback
- Responsive project galleries
- Admin forms usable on tablet
- Page builder optimized mainly for desktop, with a simplified mobile notice if needed

---

# 22. Accessibility

Implement:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Proper button labels
- Alternative text for images
- Form labels
- Error descriptions
- Color contrast
- Reduced-motion support
- ARIA only where required
- Skip-to-content link
- Accessible dialogs
- Accessible drag-and-drop alternatives such as move up and move down buttons

---

# 23. SEO

Implement:

- Dynamic page titles
- Meta descriptions
- Open Graph metadata
- Social preview images
- Canonical URLs
- Sitemap
- Robots configuration
- Structured data where useful
- Project-specific metadata
- No indexing for admin and preview routes
- Clean project slugs

---

# 24. Performance

Requirements:

- Optimize images
- Use WebP or modern formats where appropriate
- Lazy-load galleries
- Lazy-load the 3D section
- Code-split heavy components
- Cache public data
- Revalidate content after publication
- Avoid large client-side bundles
- Provide a low-performance fallback for 3D
- Use loading and error boundaries

---

# 25. Testing

Include tests for critical workflows.

## Unit Tests

Test:

- Validation schemas
- Section ordering
- Template selection
- Version creation
- Rollback-time calculations
- Permission checks
- Data formatting

## Integration Tests

Test:

- Project CRUD
- Technology CRUD
- Page section CRUD
- Draft saving
- Publishing
- Template switching
- Rollback
- Media upload
- Contact form submission

## End-to-End Tests

Test:

1. Admin logs in
2. Admin adds a project
3. Admin adds a homepage project section
4. Admin drags the section
5. Admin selects another template
6. Admin saves a draft
7. Admin previews changes
8. Admin passes first confirmation
9. Admin enters the second confirmation word
10. Admin publishes
11. Public site updates
12. Rollback countdown appears
13. Admin performs rollback
14. Previous version returns

Also test:

- Unauthorized admin access
- Expired rollback window
- Invalid publish confirmation word
- Broken image upload
- Mobile navigation
- Contact-form validation

---

# 26. Error Handling

Provide friendly errors.

Examples:

- Unable to save draft
- Unable to publish
- Upload failed
- Session expired
- Invalid file type
- Project slug already exists
- Rollback window expired
- Template unavailable
- Section type unsupported
- Network connection lost

Do not show raw database or server stack traces to users.

---

# 27. Suggested Folder Structure

```text
src/
├── app/
│   ├── page.tsx
│   ├── about/
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [slug]/
│   ├── contact/
│   ├── admin/
│   │   ├── login/
│   │   ├── page.tsx
│   │   ├── page-builder/
│   │   ├── templates/
│   │   ├── projects/
│   │   ├── technologies/
│   │   ├── timeline/
│   │   ├── education/
│   │   ├── experience/
│   │   ├── media/
│   │   ├── messages/
│   │   ├── game/
│   │   ├── settings/
│   │   ├── versions/
│   │   └── preview/
│   └── api/
│       ├── auth/
│       ├── publish/
│       ├── rollback/
│       ├── projects/
│       ├── technologies/
│       ├── sections/
│       ├── templates/
│       ├── versions/
│       ├── media/
│       └── messages/
├── components/
│   ├── public/
│   ├── templates/
│   │   ├── professional-minimal/
│   │   ├── modern-glass/
│   │   └── interactive-3d/
│   ├── sections/
│   │   ├── HeroSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── TechStackSection.tsx
│   │   ├── FeaturedProjectsSection.tsx
│   │   ├── ProjectTimelineSection.tsx
│   │   ├── EducationSection.tsx
│   │   ├── ExperienceSection.tsx
│   │   ├── StackGameSection.tsx
│   │   ├── ContactSection.tsx
│   │   └── CustomContentSection.tsx
│   ├── admin/
│   │   ├── AdminSidebar.tsx
│   │   ├── PageBuilder.tsx
│   │   ├── ComponentLibrary.tsx
│   │   ├── SortableSection.tsx
│   │   ├── SectionSettings.tsx
│   │   ├── PublishReview.tsx
│   │   ├── FirstConfirmation.tsx
│   │   ├── SecondConfirmation.tsx
│   │   └── RollbackBanner.tsx
│   ├── game/
│   │   ├── StackScene.tsx
│   │   ├── TechBall.tsx
│   │   ├── PlayerBasket.tsx
│   │   └── GameControls.tsx
│   └── ui/
├── lib/
│   ├── auth.ts
│   ├── database.ts
│   ├── permissions.ts
│   ├── validation.ts
│   ├── storage.ts
│   ├── publishing.ts
│   ├── rollback.ts
│   └── section-registry.ts
├── services/
├── repositories/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
└── public/
```

---

# 28. Implementation Phases

## Phase 1: Foundation

- Create Next.js project
- Configure TypeScript
- Configure Tailwind
- Configure database
- Configure Prisma
- Configure authentication
- Create base public and admin layouts

## Phase 2: Core Content

- Projects CRUD
- Technologies CRUD
- Timeline CRUD
- Education CRUD
- Experience CRUD
- Media uploads
- Contact messages

## Phase 3: Public Portfolio

- Homepage sections
- Projects listing
- Project details
- About page
- Contact page
- Responsive layout

## Phase 4: Page Builder

- Section registry
- Add section
- Edit section
- Hide section
- Duplicate section
- Delete section
- Drag-and-drop ordering
- Draft saving
- Preview

## Phase 5: Templates

- Professional Minimal
- Modern Glass
- Interactive 3D
- Template preview
- Admin template selection
- Shared content renderer

## Phase 6: Publishing Safety

- Change review
- First confirmation
- Second typed confirmation
- Version snapshots
- Publication
- One-hour rollback timer
- Rollback
- Version history
- Audit logs

## Phase 7: 3D Interaction

- Basic rotating stack sphere
- Clickable technology balls
- Linked project modal
- Optional falling-ball game
- Mobile fallback
- Reduced-motion fallback

## Phase 8: Quality

- Validation
- Security review
- Testing
- Accessibility
- SEO
- Performance
- Deployment
- Documentation

---

# 29. Acceptance Criteria

The project is complete only when all of the following work.

## Public Website

- Public homepage loads from database-managed content
- Section order follows admin configuration
- Hidden sections do not appear
- Project pages work
- Technology images work
- Project timeline works
- Project links work
- 3D section works or falls back safely
- Contact form works
- Mobile design works

## Admin Panel

- Admin login works
- Unauthorized users cannot access admin pages
- Projects can be added, edited, hidden, archived, deleted, and restored
- Technologies can be managed
- Timeline can be managed
- Images can be uploaded
- Homepage sections can be added
- Homepage sections can be edited
- Homepage sections can be duplicated
- Homepage sections can be hidden
- Homepage sections can be deleted
- Homepage sections can be rearranged by drag-and-drop
- All three templates can be previewed
- Admin can select the live template through the publish workflow
- Draft changes do not affect the live site
- Preview displays draft content
- Change review displays pending updates
- First confirmation is required
- Second typed confirmation is required
- Publishing creates a new version
- One-hour rollback countdown appears
- Rollback works during the valid period
- Rollback expires correctly
- Older versions remain available
- Destructive actions are protected
- Audit logs record major changes

---

# 30. Deliverables

Provide:

1. Complete frontend
2. Complete backend
3. Database schema
4. Prisma migrations
5. Authentication
6. Admin panel
7. Visual page builder
8. Three public templates
9. Project management
10. Technology management
11. Timeline management
12. Media library
13. Contact-message manager
14. 3D technology interaction
15. Draft and preview system
16. Two-step confirmation workflow
17. One-hour rollback system
18. Version history
19. Tests
20. README
21. Environment variable example
22. Setup instructions
23. Deployment instructions
24. Sample placeholder data
25. Architecture diagram
26. API documentation

---

# 31. README Requirements

The README must include:

- Project overview
- Main features
- Architecture
- Technology stack
- Folder structure
- Local setup
- Environment variables
- Database migration
- Seeding
- Running development mode
- Running tests
- Building production
- Deployment
- Admin login setup
- Publishing workflow
- Rollback behavior
- Template system
- 3D fallback behavior
- Security notes

---

# 32. Final Development Rules

- Use clean and understandable code suitable for a final-year Software Engineering student.
- Keep the architecture professional but not unnecessarily complex.
- Use reusable components.
- Separate UI, business logic, database access, validation, and authentication.
- Do not hard-code portfolio content into components.
- Do not allow unvalidated arbitrary code through the page builder.
- Do not publish draft changes automatically.
- Do not allow a single-click public publish.
- Always use the two-step confirmation workflow for publishing.
- Always create a version before changing the live site.
- Always provide the one-hour quick rollback window.
- Keep older versions available after the quick rollback timer expires.
- Ensure template changes preserve all content.
- Ensure project and technology links are reusable across sections.
- Use placeholders instead of invented personal information.
- Do not include CaloriQ.
- Prioritize a stable MVP before adding advanced 3D physics.
- Build the rotating 3D technology sphere before the full falling-ball game.
- Make the system easy for the portfolio owner to manage after deployment.
