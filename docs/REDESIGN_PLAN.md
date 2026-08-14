# Frontend Redesign Plan — Spec Adapted to This Codebase

Working plan for the full "Frontend & Architecture Redesign" spec, adapted per
its own §27 rule: *don't rewrite working infrastructure*. The Phase-1 audit
found the content system largely exists; the real work is a visual redesign,
a two-level builder hierarchy, three missing content types, and builder UX.

**Decisions made (owner-confirmed):**
- Scope: full spec, phased across sessions.
- Templates: rebuild **Professional Minimal as the flagship default** per the
  spec's design direction (§18); Modern Glass and Interactive 3D remain as
  selectable alternatives, untouched.

## Audit result (Phase 1 — complete)

Already implemented and kept as-is: section-driven ordered homepage
(`Page/PageSection/PageVersion`), draft→preview→publish with one render path,
server-side guest/admin separation (TrackedSession-validated), per-section
`settings` module configuration, versioned content models, admin CRUD for all
existing types, layered service architecture (see ARCHITECTURE.md), slug URLs.

Gaps to build: Section→Module grouping, Certifications, structured Skills,
configurable navigation, non-project detail pages, drag-drop builder UX,
and the ground-up visual redesign of the flagship template.

## Phases

### Phase 2 — Design-system foundation (flagship) — COMPLETE
- Rework `src/styles/templates/minimal.css` into a full design system:
  type scale, spacing scale, refined palette, elevation, and shared component
  classes (`.pm-btn`, `.pm-card`, `.pm-input`, `.pm-section-header`,
  `.pm-badge`, `.pm-empty`) so every section renders consistently (§19).
- Make Professional Minimal the active + draft template.
- Direction (§18): minimal, typography-first, one accent, generous whitespace,
  subtle motion only. No glass, no gradients.

### Phase 3 — Public flagship polish — COMPLETE
- Audited every homepage section component against `minimal.css`'s design
  system; found it already consistently applied everywhere except
  `EducationExperienceSection`, which now uses the same `.pm-section-header`/
  `.pm-kicker` markup as every other section and the (previously unused)
  `.pm-empty` treatment for a partial-empty column (one of education/
  experience present, the other not). Full-empty behavior (section hides via
  `return null`) is unchanged — that's the established, deliberate pattern
  used by every section (see the comment in `CertificationsSection.tsx`).
- `StackGameSection`'s canvas game (sphere/floating-balls/falling-block modes)
  only had mouse listeners; added `touchmove`/`touchstart`/`touchend` mapped
  onto the same coordinate state the render loop already reads, so it's
  usable on touch devices. This was the one real "unintentional mobile
  layout" gap — everything else already used responsive Tailwind classes.
- Added `generateMetadata`/OG to every public route (home, about, contact,
  resume, timeline, projects, projects/[slug]) — previously zero pages had
  per-page metadata. The dynamic project route replicates the page body's
  draft/publish + `notFound()` visibility rules in its own lookup and omits
  `og:image` when a project has no cover asset (no image fabricated).
- **Descoped:** `/experience` and `/education` detail-page routes. The
  original phase-3 wording for these was scope invented in an earlier
  session — the actual spec (`inputs_/2_frontend_design_spec.md` §5.7) only
  describes Education/Experience as a homepage "ledger row" section, and
  those Prisma models have no `slug` field. Owner confirmed dropping this
  item rather than adding routes/fields the spec never called for.

### Phase 4 — Missing content types — COMPLETE
- `Certification` model (title, issuer, date, credentialId/Url, media) +
  service + admin CRUD + public module + section-registry entry (§9).
- Structured skills: extend `Technology` with `proficiency` and
  `isSkill` grouping OR dedicated `Skill` model — decide when building (§10).
- `NavItem` model (label, target, order, enabled) + admin editor + Navbar
  rendering from data with hardcoded fallback (§11).
- All via `npm run db:migrate` (never raw prisma), services per
  ARCHITECTURE.md rules.

### Phase 5 — Builder upgrade — COMPLETE
- Two-level hierarchy: add `SectionGroup` (title, subtitle, order, visible);
  `PageSection.groupId` nullable FK — ungrouped sections keep working, so
  migration is non-breaking (§1, §4, §13).
- Page Builder UI: dnd-kit drag-drop for groups and modules (pattern already
  proven in SocialHandlesManager), move-between-groups, add-module dialog,
  per-module config forms replacing raw settings JSON editing (§13, §14).
- Publish snapshot format gains groups; PublicContentService renders grouped
  sections with group headers.

### Phase 6 — Polish — next session
- Responsive/accessibility/empty-state/authorization test sweep, performance
  pass (images, code-splitting), visual consistency review (§28 Phase 6).

## Rules that govern all phases
- Public rendering stays one system: preview = same components (§16). ✅ exists
- Every new mutation: service + thin action + Zod + `requireAdmin`/owner check
  (§26; ARCHITECTURE.md rules 1–5).
- Never widen existing tables for a new feature — new entities reference by id
  (§21).
- Each phase ends with: tsc, lint, build, runtime smoke, checkpoint doc.
