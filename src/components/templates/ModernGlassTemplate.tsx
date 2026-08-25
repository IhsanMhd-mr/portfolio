import React from "react";
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
  certifications: any[];
  gameSettings: any;
  isPreview?: boolean;
}

export default function ModernGlassTemplate({
  profile,
  sections,
  projects,
  technologies,
  timelineEntries,
  education,
  experience,
  certifications,
  gameSettings,
  isPreview = false,
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
    <div className="w-full min-h-screen bg-[var(--bg)] text-[var(--ink)] glass-theme-wrapper transition-colors duration-500 relative overflow-hidden">
      {/* Dynamic Aurora background */}
      <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-6 relative z-10 space-y-24 py-12">
        {filteredSections.map((section, index) => {
          const registryKey = dbEnumToRegistryKey[section.type];
          if (!registryKey) return null;

          const SectionComponent = sectionRegistry[registryKey as keyof typeof sectionRegistry] as any;
          if (!SectionComponent) return null;

          if (registryKey === "education-experience") {
            return (
              <ScrollReveal key={section.id} index={index}>
                <div className="transition-transform duration-300 hover:scale-[1.002]">
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
            settings: section.settings,
            isPreview,
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
          } else if (registryKey === "certifications") {
            props.certifications = certifications;
          }

          return (
            <ScrollReveal key={section.id} index={index}>
              <div className="transition-transform duration-300 hover:scale-[1.002]">
                <SectionComponent {...props} />
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
