import type { ComponentType } from "react";
import { sectionRegistry, registryKeyFor, COLLIDING_KEYS, type RegistryKey } from "./registry";

/**
 * Turns a page's ordered section rows into a render list.
 *
 * This logic used to live inline in all three templates, byte-identical — the
 * de-duplication pass, the registry lookup, and the "which dataset does this
 * module need" chain. Those templates differ only in wrapper markup and
 * classNames, so the shared 60 lines had three copies to keep in sync, and
 * the prop-routing chain in particular is a data concern that had no business
 * being in the view layer.
 *
 * Templates keep their own chrome — they map over the result and wrap each
 * entry however they like.
 */

export interface HomepageData {
  profile: unknown;
  projects: unknown[];
  technologies: unknown[];
  timelineEntries: unknown[];
  education: unknown[];
  experience: unknown[];
  certifications: unknown[];
  gameSettings: unknown;
}

export interface SectionRow {
  id: string;
  type: string;
  settings?: unknown;
}

export interface ResolvedSection {
  id: string;
  key: RegistryKey;
  Component: ComponentType<Record<string, unknown>>;
  props: Record<string, unknown>;
}

/**
 * Which dataset each registry key needs. Keys absent here receive only
 * `settings` — that is the correct outcome for a purely settings-driven
 * module such as custom-content, not an oversight.
 */
function propsFor(key: RegistryKey, data: HomepageData): Record<string, unknown> {
  switch (key) {
    case "hero":
    case "about":
    case "contact":
      return { profile: data.profile };
    case "tech-stack":
      return { technologies: data.technologies };
    case "featured-projects":
    case "other-projects":
    case "project-grid":
      return { projects: data.projects };
    case "project-timeline":
      return { timelineEntries: data.timelineEntries };
    case "education-experience":
      return { education: data.education, experience: data.experience };
    case "stack-game":
      return { technologies: data.technologies, gameSettings: data.gameSettings };
    case "certifications":
      return { certifications: data.certifications };
    case "custom-content":
      return {};
  }
}

export function resolveRenderableSections(
  sections: SectionRow[],
  data: HomepageData
): ResolvedSection[] {
  const renderedCollidingKeys = new Set<RegistryKey>();
  const resolved: ResolvedSection[] = [];

  for (const section of sections) {
    const key = registryKeyFor(section.type);
    if (!key) continue; // unmapped type (e.g. FOOTER_SPACER) renders nothing

    // Only keys reachable from more than one SectionType are de-duplicated.
    // education-experience renders BOTH lists regardless of which enum
    // triggered it, so EDUCATION + EXPERIENCE on one page would otherwise
    // render the whole block twice; contact has the same shape via
    // CONTACT + CALL_TO_ACTION. Keys with a 1:1 mapping are left alone, so
    // two custom-content blocks still render twice, as intended.
    if (COLLIDING_KEYS.has(key)) {
      if (renderedCollidingKeys.has(key)) continue;
      renderedCollidingKeys.add(key);
    }

    const Component = sectionRegistry[key] as ComponentType<Record<string, unknown>> | undefined;
    if (!Component) continue;

    resolved.push({
      id: section.id,
      key,
      Component,
      props: { ...propsFor(key, data), settings: section.settings },
    });
  }

  return resolved;
}
