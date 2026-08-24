import { cache } from "react";
import db from "@/lib/database";
import { SectionGroupService } from "./section-group.service";

/**
 * PublicContentService — the STABLE CORE of the public site.
 *
 * Owns the entire "what does a visitor (or previewing owner) see" resolution:
 * draft-vs-published version selection, visibility filtering, section snapshot
 * loading, and template-key resolution. Routes and layouts must not query the
 * database for public content directly — they call this service and render.
 *
 * Contract: `isPreview` is the ONLY switch. true → DRAFT versions + draft
 * sections/template (already authorized upstream via the httpOnly preview
 * cookie set by an admin-only action); false → PUBLISHED versions + the
 * active PageVersion snapshot.
 *
 * Every resolver here is wrapped in React `cache()`. Next.js runs
 * generateMetadata() and the page component as separate passes over the same
 * request, and the root/public layouts resolve chrome independently — without
 * deduping, one homepage render issued the identical `site_profiles`/`pages`
 * lookups a dozen-plus times. `cache()` is strictly request-scoped (same
 * semantics as requireAdmin in lib/require-admin.ts): it collapses repeat
 * calls within a single request and never persists across requests or users.
 */

export interface SectionData {
  id: string;
  type: string;
  internalLabel: string;
  settings: any;
  visible: boolean;
  order: number;
}

export interface HomePageData {
  profile: any;
  sections: SectionData[];
  projects: any[];
  technologies: any[];
  timelineEntries: any[];
  education: any[];
  experience: any[];
  certifications: any[];
  gameSettings: any;
  templateKey: string;
}

export class PublicContentService {
  /**
   * The single SiteProfile row, with every media relation any consumer needs.
   * One cached query instead of three near-identical `findFirst` calls that
   * differed only by `include` (root layout wanted defaultTheme, the chrome
   * wanted cvFile/logoImage, the homepage wanted profileImage/cvFile) — and
   * therefore could not dedupe.
   */
  static getSiteProfile = cache(async () => {
    return db.siteProfile.findFirst({
      include: {
        // Only the two relations anything actually renders. logoImage/favicon
        // are deliberately excluded: no view reads them (media.service.ts
        // touches their FK columns only), and each unused `include` costs an
        // extra round trip on every page — Prisma still issues the lookup even
        // when the FK is null.
        profileImage: true,
        cvFile: true,
      },
    });
  });

  /**
   * Shared chrome data for the public layout (navbar/footer): site profile
   * plus footer-visible social links, ordered.
   */
  static getPublicChrome = cache(async () => {
    const [profile, socialLinksRaw, navItemsRaw] = await Promise.all([
      PublicContentService.getSiteProfile(),
      db.socialLink.findMany({
        where: { visible: true, showInFooter: true },
        orderBy: { order: "asc" },
      }),
      // Empty result → Navbar falls back to its built-in default links.
      db.navItem.findMany({
        where: { enabled: true },
        orderBy: { order: "asc" },
      }),
    ]);

    return {
      profile,
      socialLinks: socialLinksRaw.map((s) => ({
        id: s.id,
        platform: s.platform,
        label: s.label,
        url: s.url,
      })),
      navLinks: navItemsRaw.map((n) => ({ label: n.label, href: n.target })),
    };
  });

  /**
   * Full homepage dataset for the active template, resolved for the given
   * publish state.
   */
  static getHomePageData = cache(async (isPreview: boolean): Promise<HomePageData> => {
    const state = isPreview ? ("DRAFT" as const) : ("PUBLISHED" as const);

    const [
      profile,
      technologiesRaw,
      projectsRaw,
      timelineEntriesRaw,
      educationRaw,
      experienceRaw,
      certificationsRaw,
      gameSettings,
    ] = await Promise.all([
      PublicContentService.getSiteProfile(),
      db.technology.findMany({
        where: { deletedAt: null },
        include: { versions: { where: { state } } },
      }),
      db.project.findMany({
        where: { deletedAt: null },
        include: {
          versions: { where: { state } },
          technologies: {
            include: {
              technology: {
                include: { versions: { where: { state } } },
              },
            },
            orderBy: { order: "asc" },
          },
          images: { include: { media: true }, orderBy: { order: "asc" } },
        },
      }),
      db.timelineEntry.findMany({
        where: { deletedAt: null },
        include: {
          versions: { where: { state } },
          linkedProject: {
            include: { versions: { where: { state } } },
          },
        },
      }),
      db.education.findMany({
        where: { deletedAt: null },
        include: { versions: { where: { state } } },
      }),
      db.experience.findMany({
        where: { deletedAt: null },
        include: {
          versions: { where: { state } },
          technologies: {
            include: {
              technology: {
                include: { versions: { where: { state } } },
              },
            },
          },
        },
      }),
      // Certifications apply immediately (no draft state, like social links) —
      // preview and published both see the same visible-filtered list.
      db.certification.findMany({
        where: isPreview ? undefined : { visible: true },
        include: { media: true },
        orderBy: { order: "asc" },
      }),
      db.gameSettings.findFirst(),
    ]);

    const technologies = technologiesRaw
      .map((tech) => ({ ...tech, ...tech.versions[0] }))
      .filter((t) => t.name && (isPreview || t.visible));
    technologies.sort((a, b) => (a.order || 0) - (b.order || 0));

    const projects = projectsRaw
      .map((proj) => {
        const pub = proj.versions[0];
        const resolvedTechs = proj.technologies
          .map((pt) => ({ ...pt.technology, ...pt.technology.versions[0] }))
          .filter((t) => t.name);
        return { ...proj, ...pub, resolvedTechs };
      })
      .filter((p) => p.title && (isPreview || p.visible));
    projects.sort((a, b) => (a.manualOrder || 0) - (b.manualOrder || 0));

    const timelineEntries = timelineEntriesRaw
      .map((entry) => {
        const pub = entry.versions[0];
        const projectTitle =
          entry.linkedProject?.versions[0]?.title || entry.linkedProject?.slug || "";
        return { ...entry, ...pub, projectTitle };
      })
      .filter((t) => t.title && (isPreview || t.visible));
    timelineEntries.sort((a, b) => (a.order || 0) - (b.order || 0));

    const education = educationRaw
      .map((edu) => ({ ...edu, ...edu.versions[0] }))
      .filter((e) => e.institution && (isPreview || e.visible));
    education.sort((a, b) => (a.order || 0) - (b.order || 0));

    const experience = experienceRaw
      .map((exp) => {
        const pub = exp.versions[0];
        const resolvedTechs = exp.technologies
          .map((et) => ({ ...et.technology, ...et.technology.versions[0] }))
          .filter((t) => t.name);
        return { ...exp, ...pub, resolvedTechs };
      })
      .filter((e) => e.organization && (isPreview || e.visible));
    experience.sort((a, b) => (a.order || 0) - (b.order || 0));

    const sections = await PublicContentService.resolveSections(isPreview);
    const templateKey = await PublicContentService.resolveTemplateKey(isPreview);

    return {
      profile,
      sections,
      projects,
      technologies,
      timelineEntries,
      education,
      experience,
      certifications: certificationsRaw,
      gameSettings,
      templateKey,
    };
  });

  /**
   * The `home` Page row with every relation the two resolvers below need.
   * Fetched as ONE cached query rather than letting resolveSections and
   * resolveTemplateKey each issue their own `findUnique` for the same row
   * with different `include` clauses — different includes are different
   * queries, so caching those two functions alone would not have collapsed
   * the underlying `pages`/`page_versions`/`templates` reads.
   */
  private static getHomePageRecord = cache(async () => {
    return db.page.findUnique({
      where: { key: "home" },
      include: {
        versions: { where: { isActive: true }, take: 1 },
        draftTemplate: true,
      },
    });
  });

  /**
   * Layout sections: draft (grouped) rows in preview, active snapshot
   * otherwise. Ordering comes from SectionGroupService.flattenOrdered — the
   * SAME algorithm the publish route uses to build the snapshot — so preview
   * and published ordering can never diverge (Phase 5 §11/§18/§19). The
   * array's own order IS the render order; it must never be re-sorted by a
   * flat `order` field afterward, since that field is now scoped per
   * container (per group, and separately for the ungrouped bucket) rather
   * than page-wide.
   */
  private static resolveSections = cache(async (isPreview: boolean): Promise<SectionData[]> => {
    let sections: SectionData[] = [];
    try {
      const page = await PublicContentService.getHomePageRecord();
      if (!page) return [];

      if (isPreview) {
        // Hidden groups behave like hidden sections: dropped in preview too
        // (the trailing .filter(s.visible) below already does this for
        // individually-hidden sections — group visibility must be consistent).
        const flattened = await SectionGroupService.flattenOrdered(page.id, { visibleGroupsOnly: true });
        sections = flattened.map(PublicContentService.toSectionData);
      } else {
        const activeVersion = page.versions?.[0];
        if (activeVersion && activeVersion.snapshot) {
          const snapshot =
            typeof activeVersion.snapshot === "string"
              ? JSON.parse(activeVersion.snapshot)
              : activeVersion.snapshot;
          if (Array.isArray(snapshot)) sections = snapshot;
        } else {
          // Fallback when no published version exists yet: use the same
          // live-ordering algorithm as preview, filtered to visible groups.
          const flattened = await SectionGroupService.flattenOrdered(page.id, { visibleGroupsOnly: true });
          sections = flattened.map(PublicContentService.toSectionData);
        }
      }
    } catch (error) {
      console.error("Failed to load sections:", error);
    }

    return sections.filter((s) => s.visible);
  });

  /**
   * Active template: draft pointer in preview, published version key otherwise.
   * Public because the root layout needs the same value to stamp
   * `data-template` on <html>; it must resolve identically (and share the
   * cached page read) rather than reimplementing the lookup.
   */
  static resolveTemplateKey = cache(async (isPreview: boolean): Promise<string> => {
    let templateKey = "MODERN_GLASS";
    try {
      const page = await PublicContentService.getHomePageRecord();
      if (isPreview) {
        if (page?.draftTemplate?.key) templateKey = page.draftTemplate.key;
      } else {
        if (page?.versions?.[0]?.templateKey) {
          templateKey = page.versions[0].templateKey;
        } else if (page?.draftTemplate?.key) {
          templateKey = page.draftTemplate.key;
        }
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    }
    return templateKey;
  });

  private static toSectionData(s: any): SectionData {
    return {
      id: s.id,
      type: s.type,
      internalLabel: s.internalLabel,
      settings: typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings || {},
      visible: s.visible,
      order: s.order,
    };
  }
}
