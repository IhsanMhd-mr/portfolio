import db from "@/lib/database";
import { headers } from "next/headers";
import { sectionRegistry, dbEnumToRegistryKey } from "@/components/sections/registry";

interface SectionData {
  id: string;
  type: string;
  internalLabel: string;
  settings: any;
  visible: boolean;
  order: number;
}

export default async function HomePage() {
  const headersList = await headers();
  const isPreview = headersList.get("x-preview") === "true";

  // 1. Fetch site profile, technologies, projects, timeline, education, experience, gameSettings
  const [
    profile,
    technologies,
    projects,
    timelineEntries,
    education,
    experience,
    gameSettings,
  ] = await Promise.all([
    db.siteProfile.findFirst({
      include: {
        profileImage: true,
        cvFile: true,
      },
    }),
    db.technology.findMany({
      where: { visible: true, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    db.project.findMany({
      where: { visible: true, deletedAt: null },
      include: {
        technologies: {
          include: { technology: true },
          orderBy: { order: "asc" },
        },
        thumbnail: true,
      },
      orderBy: { manualOrder: "asc" },
    }),
    db.timelineEntry.findMany({
      where: { visible: true, deletedAt: null },
      include: { linkedProject: true },
      orderBy: { order: "asc" },
    }),
    db.education.findMany({
      where: { visible: true, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    db.experience.findMany({
      where: { visible: true, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    db.gameSettings.findFirst(),
  ]);

  // 2. Fetch layout sections (draft vs published)
  let sections: SectionData[] = [];

  try {
    if (isPreview) {
      // Load draft sections
      const page = await db.page.findUnique({
        where: { key: "home" },
        include: {
          sections: {
            orderBy: { order: "asc" },
          },
        },
      });
      sections = (page?.sections || []).map((s) => ({
        id: s.id,
        type: s.type,
        internalLabel: s.internalLabel,
        settings: typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings || {},
        visible: s.visible,
        order: s.order,
      }));
    } else {
      // Load published sections
      const page = await db.page.findUnique({
        where: { key: "home" },
        include: {
          versions: {
            where: { isActive: true },
            take: 1,
          },
        },
      });
      const activeVersion = page?.versions?.[0];
      if (activeVersion && activeVersion.snapshot) {
        const snapshot = typeof activeVersion.snapshot === "string"
          ? JSON.parse(activeVersion.snapshot)
          : activeVersion.snapshot;
        if (Array.isArray(snapshot)) {
          sections = snapshot;
        }
      } else {
        // Fallback to draft sections if no published version exists
        const draftSections = await db.pageSection.findMany({
          where: { pageId: page?.id || "" },
          orderBy: { order: "asc" },
        });
        sections = draftSections.map((s) => ({
          id: s.id,
          type: s.type,
          internalLabel: s.internalLabel,
          settings: typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings || {},
          visible: s.visible,
          order: s.order,
        }));
      }
    }
  } catch (error) {
    console.error("Failed to load sections:", error);
  }

  // Filter out hidden sections and sort by order index
  const visibleSections = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  // Prevent double rendering of combined EducationExperienceSection
  let eduExpRendered = false;

  return (
    <div className="w-full flex flex-col">
      {visibleSections.map((section) => {
        const registryKey = dbEnumToRegistryKey[section.type];
        if (!registryKey) {
          console.warn(`No registry mapping for section type: ${section.type}`);
          return null;
        }

        const SectionComponent = sectionRegistry[registryKey as keyof typeof sectionRegistry] as any;
        if (!SectionComponent) {
          console.warn(`Unknown section component: ${registryKey}`);
          return null;
        }

        // Special handling for Education & Experience layout
        if (registryKey === "education-experience") {
          if (eduExpRendered) return null; // Skip duplicate render
          eduExpRendered = true;

          return (
            <SectionComponent
              key={section.id}
              education={education}
              experience={experience}
              isPreview={isPreview}
            />
          );
        }

        // Standard section rendering with appropriate data passed
        const props: any = {
          key: section.id,
          settings: section.settings,
          isPreview,
        };

        if (registryKey === "hero" || registryKey === "about" || registryKey === "contact") {
          props.profile = profile;
        } else if (registryKey === "tech-stack") {
          props.technologies = technologies;
        } else if (registryKey === "featured-projects") {
          props.projects = projects;
        } else if (registryKey === "other-projects" || registryKey === "project-grid") {
          props.projects = projects;
        } else if (registryKey === "project-timeline") {
          props.timelineEntries = timelineEntries;
        } else if (registryKey === "stack-game") {
          props.technologies = technologies;
          props.gameSettings = gameSettings;
        }

        return <SectionComponent {...props} />;
      })}
    </div>
  );
}
