import React, { Suspense } from "react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { resolveRenderableSections, type HomepageData, type SectionRow } from "@/components/sections/render-sections";

interface TemplateProps extends HomepageData {
  sections: SectionRow[];
}

export default function Interactive3DTemplate({ sections, ...data }: TemplateProps) {
  const renderable = resolveRenderableSections(sections, data);

  return (
    <div className="w-full min-h-screen bg-[var(--bg)] text-[var(--accent)] font-mono threed-theme-wrapper transition-colors duration-500 py-10 relative overflow-hidden">
      {/* Visual background wireframe grids */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--accent) 1px, transparent 1px), linear-gradient(to bottom, var(--accent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-[1200px] mx-auto px-6 space-y-20 relative z-10">
        {renderable.map(({ id, key, Component, props }, index) => {
          // This template gives education-experience a solid panel and no
          // Suspense boundary, unlike every other section. Preserved as-is.
          if (key === "education-experience") {
            return (
              <ScrollReveal key={id} index={index}>
                <div className="border border-solid border-[var(--accent-tint)] p-8 rounded bg-[var(--panel)]">
                  <Component {...props} />
                </div>
              </ScrollReveal>
            );
          }

          return (
            <ScrollReveal key={id} index={index}>
              <div className="border border-solid border-transparent hover:border-[var(--accent-tint)] p-6 rounded bg-[var(--bg-2)] transition-all duration-300">
                {/* Note: sectionRegistry uses static imports, so nothing below
                    this boundary actually suspends today. Kept because removing
                    it is a visual/behavioural decision, not a typing one. */}
                <Suspense fallback={<div className="text-xs text-[var(--ink-faint)] font-mono">// LAZY LOADING SECTION COMPONENTS...</div>}>
                  <Component {...props} />
                </Suspense>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
