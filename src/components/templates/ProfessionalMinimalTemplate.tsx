import React from "react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { resolveRenderableSections, type HomepageData, type SectionRow } from "@/components/sections/render-sections";

interface TemplateProps extends HomepageData {
  sections: SectionRow[];
}

export default function ProfessionalMinimalTemplate({ sections, ...data }: TemplateProps) {
  const renderable = resolveRenderableSections(sections, data);

  return (
    <div className="w-full min-h-screen bg-[var(--bg)] text-[var(--ink)] font-sans antialiased minimal-theme-wrapper transition-colors duration-500 py-6">
      <div className="max-w-[1200px] mx-auto px-6 space-y-16">
        {renderable.map(({ id, key, Component, props }, index) => (
          <ScrollReveal key={id} index={index}>
            {/* education-experience deliberately omits `first:` resets, matching
                the wrapper this template has always given that section. */}
            <div
              className={
                key === "education-experience"
                  ? "border-t border-solid border-slate-200 pt-12"
                  : "border-t border-solid border-slate-200 pt-12 first:border-none first:pt-0"
              }
            >
              <Component {...props} />
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
