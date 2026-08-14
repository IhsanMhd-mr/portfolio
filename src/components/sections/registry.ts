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

// Map database enums to registry keys
export const dbEnumToRegistryKey: Record<string, string> = {
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
};

/**
 * Authoritative module metadata for the Page Builder's Add Module dialog
 * (Phase 5, §17). Keyed by the SectionType DB enum — this IS the single
 * source of truth for "which module types can be added"; the builder must
 * never maintain a second, hand-written list that can drift from this one.
 * FOOTER_SPACER is intentionally omitted: it has no registry component and
 * is not currently addable (matches pre-existing behavior).
 */
export const sectionMeta: Record<string, { label: string; description: string }> = {
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
export const sectionConfigSchema: Record<string, ConfigField[]> = {
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
