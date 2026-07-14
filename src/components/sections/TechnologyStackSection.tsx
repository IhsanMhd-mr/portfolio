interface TechnologyStackSectionProps {
  technologies: any[];
  isPreview?: boolean;
}

export default function TechnologyStackSection({ technologies, isPreview = false }: TechnologyStackSectionProps) {
  // Group technologies by category
  const categoriesMap: Record<string, string> = {
    FRONTEND: "Frontend Development",
    BACKEND: "Backend & APIs",
    DATABASE: "Databases & Storage",
    AI_ML: "AI & Machine Learning",
    MOBILE: "Mobile Engineering",
    TOOLS: "Developer Tools",
    DEVOPS: "DevOps & Cloud",
    OTHER: "Other Tech",
  };

  const grouped: Record<string, any[]> = {};
  
  technologies.forEach((tech) => {
    const catKey = tech.category || "OTHER";
    if (!grouped[catKey]) {
      grouped[catKey] = [];
    }
    grouped[catKey].push(tech);
  });

  const activeCategories = Object.keys(grouped).sort();

  function getExperienceColor(label: string) {
    switch (label) {
      case "STRONG":
        return { bg: "rgba(34, 211, 238, 0.1)", text: "#22D3EE" }; // cyan
      case "COMFORTABLE":
        return { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" }; // violet
      case "WORKING_KNOWLEDGE":
        return { bg: "rgba(52, 211, 153, 0.1)", text: "#34D399" }; // emerald
      default:
        return { bg: "rgba(251, 191, 36, 0.1)", text: "#FBBF24" }; // amber
    }
  }

  function formatLabel(label: string) {
    return label.replace("_", " ").toLowerCase();
  }

  if (technologies.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-20 px-[var(--gutter)] bg-[var(--bg)] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto">
        <div className="mb-12 text-center md:text-left">
          <p className="text-mono-label mb-2 text-[var(--accent)]">// 02 — CAPABILITIES</p>
          <h2 
            className="text-h2 text-[var(--ink)]" 
            style={{ fontFamily: "var(--font-display)" }}
          >
            Technical Stack
          </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          {activeCategories.map((catKey) => {
            const displayTitle = categoriesMap[catKey] || catKey;
            const items = grouped[catKey];

            return (
              <div key={catKey} className="space-y-6">
                <h3 
                  className="text-mono-label border-b border-solid border-[var(--line)] pb-2 text-[var(--ink-faint)]"
                  style={{ fontSize: "12px" }}
                >
                  // {displayTitle.toUpperCase()}
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {items.map((tech) => {
                    const badgeStyles = getExperienceColor(tech.experienceLabel);
                    return (
                      <div 
                        key={tech.id} 
                        className="p-5 rounded-[var(--radius-sm)] border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))] hover:border-[var(--accent)] transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <h4 className="font-semibold text-[var(--ink)] text-body">
                              {tech.name}
                            </h4>
                            <span 
                              className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-full"
                              style={{
                                backgroundColor: badgeStyles.bg,
                                color: badgeStyles.text
                              }}
                            >
                              {formatLabel(tech.experienceLabel)}
                            </span>
                          </div>
                          {tech.description && (
                            <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                              {tech.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
