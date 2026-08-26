import { cache } from "react";
import db from "@/lib/database";
import { SectionGroupService } from "./section-group.service";

/**
 * PublicContentService — the STABLE CORE of the public site.
 *
 * Owns the entire "what does a visitor see" resolution: version selection,
 * visibility filtering, section snapshot loading, and template-key resolution.
 * Routes and layouts must not query the database for public content directly —
 * they call this service and render.
 *
 * Contract: the public site renders PUBLISHED content and nothing else —
 * PUBLISHED entity versions plus the active PageVersion snapshot. There is no
 * draft-preview path; the admin previews by publishing. Anything unpublished
 * or `visible: false` is filtered out in SQL and can never reach a response.
 *
 * Every resolver here is wrapped in React `cache()`. Next.js runs
 * generateMetadata() and the page component as separate passes over the same
 * request, and the root/public layouts resolve chrome independently — without
 * deduping, one homepage render issued the identical `site_profiles`/`pages`
 * lookups a dozen-plus times. `cache()` is strictly request-scoped (same
 * semantics as requireAdmin in lib/require-admin.ts): it collapses repeat
 * calls within a single request and never persists across requests or users.
 */

/**
 * The shape templates consume for one rendered section.
 *
 * `order` is deliberately ABSENT. In the database it is CONTAINER-scoped —
 * every group restarts at 0 and the ungrouped bucket has its own sequence, so
 * three sections on one page can all be `order: 0`. Render order is the
 * sequence SectionGroupService.flattenOrdered produces and nothing else, and a
 * downstream `.sort((a, b) => a.order - b.order)` silently scrambles the page.
 *
 * Branding the field was tried first and does not work: `number & {...}` is
 * still assignable to `number`, so arithmetic on it type-checks fine. Removing
 * it from the view model is what actually prevents the mistake — the value has
 * no consumer here (it is still written into the publish snapshot from the raw
 * rows, where it belongs).
 */
export interface SectionData {
  id: string;
  type: string;
  internalLabel: string;
  settings: any;
  visible: boolean;
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
  static getHomePageData = cache(async (): Promise<HomePageData> => {
    const state = "PUBLISHED" as const;

    // Visibility is filtered in SQL rather than by a JS pass over every row.
    // `@@unique([entityId, state])` guarantees at most one version per state,
    // so an entity whose only version is hidden simply comes back with an
    // empty `versions` array and is dropped by the `.filter()` passes below.
    const versionWhere = { state, visible: true };

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
        select: {
          id: true,
          // Homepage renders name/category/experienceLabel and the game reads
          // showInGame/showInStack. `description`, `logo`, `slug` are unused
          // here, so they are not selected.
          versions: {
            where: versionWhere,
            select: {
              name: true,
              category: true,
              experienceLabel: true,
              showInStack: true,
              showInGame: true,
              visible: true,
              order: true,
            },
          },
        },
      }),
      db.project.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          slug: true,
          // Only the join rows — the technology names are resolved in memory
          // from the full technology list fetched above, instead of a third
          // nested `technology -> versions` round trip per project.
          technologies: { select: { technologyId: true }, orderBy: { order: "asc" } },
          // `images` is deliberately NOT selected: no homepage section renders
          // a project gallery, only `thumbnail` below.
          versions: {
            where: versionWhere,
            select: {
              title: true,
              summary: true,
              category: true,
              featured: true,
              githubUrl: true,
              liveDemoUrl: true,
              visible: true,
              manualOrder: true,
              // The card image actually rendered by the sections. This lives on
              // ProjectVersion and was previously never fetched, so
              // `project.thumbnail` was always undefined.
              thumbnail: { select: { url: true } },
            },
          },
        },
      }),
      db.timelineEntry.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          // `linkedProject` is reduced to its slug — the only field the
          // timeline renders. Previously this pulled the whole related project
          // plus a second full ProjectVersion row.
          linkedProject: { select: { slug: true } },
          versions: {
            where: versionWhere,
            select: {
              title: true,
              entryType: true,
              startDate: true,
              endDate: true,
              description: true,
              visible: true,
              order: true,
            },
          },
        },
      }),
      db.education.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          versions: {
            where: versionWhere,
            select: {
              institution: true,
              qualification: true,
              startDate: true,
              endDate: true,
              isCurrent: true,
              grade: true,
              description: true,
              visible: true,
              order: true,
            },
          },
        },
      }),
      db.experience.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          // `technologies` is deliberately NOT selected: EducationExperience
          // renders no technology chips, so the 3-level join was dead weight.
          versions: {
            where: versionWhere,
            select: {
              organization: true,
              role: true,
              startDate: true,
              endDate: true,
              isCurrent: true,
              locationText: true,
              description: true,
              visible: true,
              order: true,
            },
          },
        },
      }),
      // Certifications apply immediately (no draft state, like social links).
      // `media` is not selected: the section renders no certificate image.
      db.certification.findMany({
        where: { visible: true },
        orderBy: { order: "asc" },
      }),
      db.gameSettings.findFirst(),
    ]);

    const technologies = technologiesRaw
      .map((tech) => ({ ...tech, ...tech.versions[0] }))
      .filter((t) => t.name);
    technologies.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Index once so projects can resolve their technology chips in memory.
    // The full technology list is already loaded above, so re-querying the same
    // rows through each project's nested include would be pure duplication.
    const technologyById = new Map(technologies.map((t) => [t.id, t]));

    const projects = projectsRaw
      .map((proj) => {
        const pub = proj.versions[0];
        const projectTechnologies = proj.technologies
          .map((pt) => technologyById.get(pt.technologyId))
          .filter((t): t is (typeof technologies)[number] => Boolean(t));
        return { ...proj, ...pub, technologies: projectTechnologies };
      })
      .filter((p) => p.title);
    projects.sort((a, b) => (a.manualOrder || 0) - (b.manualOrder || 0));

    const timelineEntries = timelineEntriesRaw
      .map((entry) => ({ ...entry, ...entry.versions[0] }))
      .filter((t) => t.title);
    timelineEntries.sort((a, b) => (a.order || 0) - (b.order || 0));

    const education = educationRaw
      .map((edu) => ({ ...edu, ...edu.versions[0] }))
      .filter((e) => e.institution);
    education.sort((a, b) => (a.order || 0) - (b.order || 0));

    const experience = experienceRaw
      .map((exp) => ({ ...exp, ...exp.versions[0] }))
      .filter((e) => e.organization);
    experience.sort((a, b) => (a.order || 0) - (b.order || 0));

    const sections = await PublicContentService.resolveSections();
    const templateKey = await PublicContentService.resolveTemplateKey();

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
  private static resolveSections = cache(async (): Promise<SectionData[]> => {
    let sections: SectionData[] = [];

    // Deliberately NOT wrapped in try/catch. It used to be, logging the error
    // and returning [] — which rendered a 200 response with an empty page,
    // indistinguishable from "the owner has not configured any sections yet".
    // A database failure during a homepage render is not a blank homepage; it
    // is an error, and it belongs in Next's error boundary where it is visible
    // and reportable. The legitimate empty cases are still handled explicitly
    // below (no page row, no snapshot, nothing visible).
    const page = await PublicContentService.getHomePageRecord();
    if (!page) return [];

    const activeVersion = page.versions?.[0];
    if (activeVersion && activeVersion.snapshot) {
      const snapshot =
        typeof activeVersion.snapshot === "string"
          ? JSON.parse(activeVersion.snapshot)
          : activeVersion.snapshot;
      if (Array.isArray(snapshot)) sections = snapshot;
    } else {
      // Fallback when no published version exists yet: derive the order live
      // with the same algorithm the publish route bakes into the snapshot,
      // filtered to visible groups. Hidden groups behave like hidden
      // sections — the trailing .filter(s.visible) below handles the
      // individually-hidden case, and group visibility must be consistent.
      const flattened = await SectionGroupService.flattenOrdered(page.id, { visibleGroupsOnly: true });
      sections = flattened.map(PublicContentService.toSectionData);
    }

    return sections.filter((s) => s.visible);
  });

  /**
   * Active template: the published version's key, falling back to the draft
   * pointer when nothing has been published yet.
   * Public because the root layout needs the same value to stamp
   * `data-template` on <html>; it must resolve identically (and share the
   * cached page read) rather than reimplementing the lookup.
   */
  static resolveTemplateKey = cache(async (): Promise<string> => {
    // The MODERN_GLASS default below covers a real, legitimate state: no
    // published version and no draft pointer. It must not also cover "the
    // database is unreachable" — the previous try/catch conflated the two, so
    // an infrastructure failure silently rendered the site in the wrong skin
    // instead of surfacing. The optional chaining already handles the
    // legitimate case; errors now propagate.
    const page = await PublicContentService.getHomePageRecord();
    if (page?.versions?.[0]?.templateKey) return page.versions[0].templateKey;
    if (page?.draftTemplate?.key) return page.draftTemplate.key;
    return "MODERN_GLASS";
  });

  private static toSectionData(s: any): SectionData {
    return {
      id: s.id,
      type: s.type,
      internalLabel: s.internalLabel,
      settings: typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings || {},
      visible: s.visible,
    };
  }
}
