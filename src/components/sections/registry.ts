import type { SectionType } from "@prisma/client";
import HeroSection from "./HeroSection";
import AboutSummarySection from "./AboutSummarySection";
import TechnologyStackSection from "./TechnologyStackSection";
import FeaturedProjectsSection from "./FeaturedProjectsSection";
import ProjectGridSection from "./ProjectGridSection";
import ProjectTimelineSection from "./ProjectTimelineSection";
import EducationExperienceSection from "./EducationExperienceSection";
import OtherProjectsSection from "./OtherProjectsSection";
import StackGameSection from "./StackGameSection";
import ContactCTASection from "./ContactCTASection";
import CustomContentSection from "./CustomContentSection";
import CertificationsSection from "./CertificationsSection";

/**
 * Registry key → component. The key is an internal, stable identifier; several
 * SectionType enum values can point at the same one (see dbEnumToRegistryKey).
 */
export const sectionRegistry = {
  "hero": HeroSection,
  "about": AboutSummarySection,
  "tech-stack": TechnologyStackSection,
  "featured-projects": FeaturedProjectsSection,
  "project-grid": ProjectGridSection,
  "project-timeline": ProjectTimelineSection,
  "education-experience": EducationExperienceSection,
  "other-projects": OtherProjectsSection,
  "stack-game": StackGameSection,
  "contact": ContactCTASection,
  "custom-content": CustomContentSection,
  "certifications": CertificationsSection,
};

export type RegistryKey = keyof typeof sectionRegistry;

/**
 * SectionType (database enum) → registry key, or `null` for a type that
 * deliberately renders nothing.
 *
 * Typed as a total `Record<SectionType, ...>` on purpose: adding a value to
 * the SectionType enum without deciding what it renders is now a compile
 * error rather than a section that silently disappears at runtime. The four
 * dead paths this file used to carry — an unmapped enum, a registry entry no
 * enum pointed at, and two metadata omissions — all existed because these
 * maps were typed as `Record<string, string>`.
 *
 * The mapping is deliberately many-to-one in two places (EDUCATION/EXPERIENCE,
 * CONTACT/CALL_TO_ACTION); see COLLIDING_KEYS below for what that implies at
 * render time.
 */
export const dbEnumToRegistryKey: Record<SectionType, RegistryKey | null> = {
  HERO: "hero",
  ABOUT: "about",
  TECH_STACK: "tech-stack",
  FEATURED_PROJECTS: "featured-projects",
  PROJECT_GRID: "project-grid",
  PROJECT_TIMELINE: "project-timeline",
  EDUCATION: "education-experience",
  EXPERIENCE: "education-experience",
  STACK_GAME: "stack-game",
  CONTACT: "contact",
  CALL_TO_ACTION: "contact",
  CUSTOM_CONTENT: "custom-content",
  CERTIFICATIONS: "certifications",
  // Renders nothing. Retained because existing rows may still carry it, and
  // createModuleAction already refuses to create new ones.
  FOOTER_SPACER: null,
};

/**
 * `other-projects` is in sectionRegistry but no SectionType maps to it, so it
 * is unreachable from the database today. Left in place rather than deleted:
 * removal is a legacy-cleanup decision, and deleting a working component to
 * satisfy a type is the wrong order of operations. This assertion exists so
 * the situation is stated rather than merely true.
 */
export const UNREACHABLE_REGISTRY_KEYS = ["other-projects"] as const satisfies readonly RegistryKey[];

/**
 * Registry keys that more than one SectionType maps to.
 *
 * These are the only keys where a repeated section is a mistake rather than a
 * legitimate choice. `education-experience` is reachable from both EDUCATION
 * and EXPERIENCE, and its component renders BOTH lists, so a page carrying
 * both rows would render the whole block twice. `contact` has the same shape
 * via CONTACT and CALL_TO_ACTION — that collision was never de-duplicated,
 * which is why the contact block could appear twice.
 *
 * Derived from the map rather than hand-listed, so mapping a third enum onto
 * an existing key cannot forget to update it. Keys with a 1:1 mapping are
 * deliberately excluded: two CUSTOM_CONTENT blocks, or two PROJECT_GRIDs with
 * different settings, are a reasonable thing to want.
 */
export const COLLIDING_KEYS: ReadonlySet<RegistryKey> = (() => {
  const seen = new Map<RegistryKey, number>();
  for (const key of Object.values(dbEnumToRegistryKey)) {
    if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([key]) => key));
})();

/**
 * Authoritative module metadata for the Page Builder's Add Module dialog
 * (Phase 5, §17). Keyed by the SectionType DB enum — this IS the single
 * source of truth for "which module types can be added"; the builder must
 * never maintain a second, hand-written list that can drift from this one.
 * FOOTER_SPACER is intentionally omitted: it has no registry component and
 * is not currently addable (matches pre-existing behavior).
 */
export const sectionMeta: Record<SectionType, { label: string; description: string } | null> = {
  HERO: { label: "Hero Banner", description: "Name, title, intro, and primary/secondary CTAs." },
  ABOUT: { label: "About Summary", description: "Editorial bio, interests, approach, and current focus." },
  TECH_STACK: { label: "Technology Stack", description: "Grouped technologies by category." },
  FEATURED_PROJECTS: { label: "Featured Projects", description: "Highlighted project showcase." },
  PROJECT_GRID: { label: "Project Grid", description: "Full project archive grid." },
  PROJECT_TIMELINE: { label: "Project Timeline", description: "Chronological project history." },
  EDUCATION: { label: "Education", description: "Education & experience timeline (shared with Experience)." },
  EXPERIENCE: { label: "Experience", description: "Education & experience timeline (shared with Education)." },
  CERTIFICATIONS: { label: "Certifications", description: "Awards, certificates, and credentials." },
  STACK_GAME: { label: "3D Stack Game", description: "Interactive technology visualization." },
  CONTACT: { label: "Contact", description: "Contact form and connect links." },
  CUSTOM_CONTENT: { label: "Custom Content", description: "Freeform heading + body text block." },
  // Not offered in the Add Module dialog. CALL_TO_ACTION renders the same
  // component as CONTACT, so offering both would let an owner add two rows
  // that collapse to one section. FOOTER_SPACER renders nothing at all.
  // Both omissions were previously implicit; the total Record makes them a
  // decision the type system requires.
  CALL_TO_ACTION: null,
  FOOTER_SPACER: null,
};

export type ConfigFieldType = "text" | "textarea" | "number" | "select";

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  options?: string[];
  placeholder?: string;
}

/**
 * Validated configuration fields per module, keyed by registry key — derived
 * ONLY from fields the section components actually read (verified against
 * source), per the project's "don't invent fields" rule. Fields not listed
 * here (mostly array-valued selections like selectedProjectIds) remain
 * editable via the Advanced (JSON) escape hatch in the config form, rather
 * than inventing a picker UI for them in this milestone.
 */
export const sectionConfigSchema: Partial<Record<RegistryKey, ConfigField[]>> = {
  "hero": [
    { key: "title", label: "Title override", type: "text" },
    { key: "fullName", label: "Name override", type: "text" },
    { key: "tagline", label: "Tagline override", type: "text" },
    { key: "heroIntro", label: "Intro override", type: "textarea" },
  ],
  "about": [
    { key: "aboutBio", label: "Bio override", type: "textarea" },
    { key: "technicalInterests", label: "Interests override", type: "textarea" },
    { key: "developmentApproach", label: "Approach override", type: "textarea" },
    { key: "currentGoals", label: "Focus override", type: "textarea" },
  ],
  "project-grid": [{ key: "limit", label: "Max items", type: "number" }],
  "project-timeline": [{ key: "limit", label: "Max items", type: "number", placeholder: "3" }],
  "other-projects": [{ key: "limit", label: "Max items", type: "number" }],
  "stack-game": [
    { key: "mode", label: "Mode", type: "select", options: ["ROTATING_SPHERE", "FLOATING_BALLS", "FALLING_GAME", "STATIC_FALLBACK"] },
    { key: "ballCount", label: "Ball count", type: "number" },
    { key: "ballSize", label: "Ball size", type: "number" },
    { key: "fallingSpeed", label: "Falling speed", type: "number" },
  ],
  "custom-content": [
    { key: "heading", label: "Heading", type: "text" },
    { key: "subheading", label: "Subheading", type: "text" },
    { key: "bodyText", label: "Body text", type: "textarea" },
    { key: "align", label: "Alignment", type: "select", options: ["left", "center", "right"] },
  ],
};

/**
 * Safe lookups for callers holding a plain `string`.
 *
 * Section rows arrive from the database and from JSON snapshots, so their
 * `type` is a string at the boundary rather than a `SectionType`. These
 * accessors do the narrowing once, in one place, instead of every call site
 * indexing the maps with `any` — which is how the dead paths went unnoticed.
 * An unrecognised type returns null and the caller renders nothing.
 */
export function registryKeyFor(type: string): RegistryKey | null {
  return (dbEnumToRegistryKey as Record<string, RegistryKey | null>)[type] ?? null;
}

export function sectionMetaFor(type: string): { label: string; description: string } | null {
  return (sectionMeta as Record<string, { label: string; description: string } | null>)[type] ?? null;
}

export function configFieldsFor(key: string | null): ConfigField[] {
  if (!key) return [];
  return (sectionConfigSchema as Record<string, ConfigField[] | undefined>)[key] ?? [];
}

/** SectionTypes offered in the Add Module dialog, in declaration order. */
export function addableSectionTypes(): Array<{ type: SectionType; label: string; description: string }> {
  return (Object.entries(sectionMeta) as Array<[SectionType, { label: string; description: string } | null]>)
    .filter((entry): entry is [SectionType, { label: string; description: string }] => entry[1] !== null)
    .map(([type, meta]) => ({ type, ...meta }));
}
