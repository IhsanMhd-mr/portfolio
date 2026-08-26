import React from "react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { resolveRenderableSections, type HomepageData, type SectionRow } from "@/components/sections/render-sections";

interface TemplateProps extends HomepageData {
  sections: SectionRow[];
}

export default function ModernGlassTemplate({ sections, ...data }: TemplateProps) {
  // Section selection, de-duplication and prop routing are shared across all
  // three templates — see render-sections.ts. What stays here is this
  // template's chrome and nothing else.
  const renderable = resolveRenderableSections(sections, data);

  return (
    <div className="w-full min-h-screen bg-[var(--bg)] text-[var(--ink)] glass-theme-wrapper transition-colors duration-500 relative overflow-hidden">
      {/* Dynamic Aurora background */}
      <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-6 relative z-10 space-y-24 py-12">
        {renderable.map(({ id, Component, props }, index) => (
          <ScrollReveal key={id} index={index}>
            <div className="transition-transform duration-300 hover:scale-[1.002]">
              <Component {...props} />
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
