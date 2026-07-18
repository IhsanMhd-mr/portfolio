import React, { Suspense } from "react";
import { sectionRegistry, dbEnumToRegistryKey } from "@/components/sections/registry";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface TemplateProps {
  profile: any;
  sections: any[];
  projects: any[];
  technologies: any[];
  timelineEntries: any[];
  education: any[];
  experience: any[];
  gameSettings: any;
  isPreview?: boolean;
  isOwner?: boolean;
}

export default function Interactive3DTemplate({
  profile,
  sections,
  projects,
  technologies,
  timelineEntries,
  education,
  experience,
  gameSettings,
  isPreview = false,
  isOwner = false,
}: TemplateProps) {
  // Pre-filter sections to avoid duplicate education-experience rendering without reassignment warnings
  let hasRenderedEduExp = false;
  const filteredSections = sections.filter((sec) => {
    const rKey = dbEnumToRegistryKey[sec.type];
    if (rKey === "education-experience") {
      if (hasRenderedEduExp) return false;
      hasRenderedEduExp = true;
    }
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[var(--bg)] text-[var(--accent)] font-mono threed-theme-wrapper transition-colors duration-500 py-10 relative overflow-hidden">
      {/* Visual background wireframe grids */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(to right, var(--accent) 1px, transparent 1px), linear-gradient(to bottom, var(--accent) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      <div className="max-w-[1200px] mx-auto px-6 space-y-20 relative z-10">
        {filteredSections.map((section, index) => {
          const registryKey = dbEnumToRegistryKey[section.type];
          if (!registryKey) return null;

          const SectionComponent = sectionRegistry[registryKey as keyof typeof sectionRegistry] as any;
          if (!SectionComponent) return null;

          if (registryKey === "education-experience") {
            return (
              <ScrollReveal key={section.id} index={index}>
                <div className="border border-solid border-[var(--accent-tint)] p-8 rounded bg-[var(--panel)]">
                  <SectionComponent
                    education={education}
                    experience={experience}
                    isPreview={isPreview}
                  />
                </div>
              </ScrollReveal>
            );
          }

          const props: any = {
            key: section.id,
            settings: section.settings,
            isPreview,
            isOwner,
          };

          if (registryKey === "hero" || registryKey === "about" || registryKey === "contact") {
            props.profile = profile;
          } else if (registryKey === "tech-stack") {
            props.technologies = technologies;
          } else if (registryKey === "featured-projects" || registryKey === "other-projects" || registryKey === "project-grid") {
            props.projects = projects;
          } else if (registryKey === "project-timeline") {
            props.timelineEntries = timelineEntries;
          } else if (registryKey === "stack-game") {
            props.technologies = technologies;
            props.gameSettings = gameSettings;
          }

          return (
            <ScrollReveal key={section.id} index={index}>
              <div className="border border-solid border-transparent hover:border-[var(--accent-tint)] p-6 rounded bg-[var(--bg-2)] transition-all duration-300">
                <Suspense fallback={<div className="text-xs text-[var(--ink-faint)] font-mono">// LAZY LOADING SECTION COMPONENTS...</div>}>
                  <SectionComponent {...props} />
                </Suspense>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
