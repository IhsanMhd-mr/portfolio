import db from "@/lib/database";

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
  gameSettings: any;
  templateKey: string;
}

export class PublicContentService {
  /**
   * Shared chrome data for the public layout (navbar/footer): site profile
   * plus footer-visible social links, ordered.
   */
  static async getPublicChrome() {
    const [profile, socialLinksRaw] = await Promise.all([
      db.siteProfile.findFirst({
        include: { cvFile: true, logoImage: true },
      }),
      db.socialLink.findMany({
        where: { visible: true, showInFooter: true },
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
    };
  }

  /**
   * Full homepage dataset for the active template, resolved for the given
   * publish state.
   */
  static async getHomePageData(isPreview: boolean): Promise<HomePageData> {
    const state = isPreview ? ("DRAFT" as const) : ("PUBLISHED" as const);

    const [
      profile,
      technologiesRaw,
      projectsRaw,
      timelineEntriesRaw,
      educationRaw,
      experienceRaw,
      gameSettings,
    ] = await Promise.all([
      db.siteProfile.findFirst({
        include: {
          profileImage: true,
          cvFile: true,
        },
      }),
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
      gameSettings,
      templateKey,
    };
  }

  /** Layout sections: draft rows in preview, active snapshot otherwise. */
  private static async resolveSections(isPreview: boolean): Promise<SectionData[]> {
    let sections: SectionData[] = [];
    try {
      if (isPreview) {
        const page = await db.page.findUnique({
          where: { key: "home" },
          include: { sections: { orderBy: { order: "asc" } } },
        });
        sections = (page?.sections || []).map(PublicContentService.toSectionData);
      } else {
        const page = await db.page.findUnique({
          where: { key: "home" },
          include: { versions: { where: { isActive: true }, take: 1 } },
        });
        const activeVersion = page?.versions?.[0];
        if (activeVersion && activeVersion.snapshot) {
          const snapshot =
            typeof activeVersion.snapshot === "string"
              ? JSON.parse(activeVersion.snapshot)
              : activeVersion.snapshot;
          if (Array.isArray(snapshot)) sections = snapshot;
        } else {
          // Fallback to draft sections if no published version exists
          const draftSections = await db.pageSection.findMany({
            where: { pageId: page?.id || "" },
            orderBy: { order: "asc" },
          });
          sections = draftSections.map(PublicContentService.toSectionData);
        }
      }
    } catch (error) {
      console.error("Failed to load sections:", error);
    }

    return sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);
  }

  /** Active template: draft pointer in preview, published version key otherwise. */
  private static async resolveTemplateKey(isPreview: boolean): Promise<string> {
    let templateKey = "MODERN_GLASS";
    try {
      if (isPreview) {
        const page = await db.page.findUnique({
          where: { key: "home" },
          include: { draftTemplate: true },
        });
        if (page?.draftTemplate?.key) templateKey = page.draftTemplate.key;
      } else {
        const page = await db.page.findUnique({
          where: { key: "home" },
          include: {
            versions: { where: { isActive: true }, take: 1 },
            draftTemplate: true,
          },
        });
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
  }

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
