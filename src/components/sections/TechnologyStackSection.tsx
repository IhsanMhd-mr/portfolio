interface TechnologyStackSectionProps {
  technologies: any[];
  settings?: any;
  isPreview?: boolean;
}

export default function TechnologyStackSection({ technologies, settings, isPreview = false }: TechnologyStackSectionProps) {
  // Option to filter by ID list if configured in builder
  const selectedIds = settings?.selectedTechIds;
  const filtered = Array.isArray(selectedIds) && selectedIds.length > 0
    ? technologies.filter(t => selectedIds.includes(t.id))
    : technologies;

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
  
  filtered.forEach((tech) => {
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
        <div className="mb-10 text-center md:text-left">
          <h2
            className="text-h2 text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Technical Stack
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {activeCategories.map((catKey) => {
            const displayTitle = categoriesMap[catKey] || catKey;
            const items = grouped[catKey];

            return (
              <div key={catKey} className="space-y-3">
                <h3
                  className="text-mono-label text-[var(--ink-faint)]"
                  style={{ fontSize: "12px" }}
                >
                  {displayTitle.toUpperCase()}
                </h3>

                <div className="flex flex-wrap gap-2">
                  {items.map((tech) => {
                    const badgeStyles = getExperienceColor(tech.experienceLabel);
                    return (
                      <span
                        key={tech.id}
                        title={formatLabel(tech.experienceLabel)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))] text-[var(--ink)] text-sm hover:border-[var(--accent)] transition-colors"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: badgeStyles.text }}
                          aria-hidden
                        />
                        {tech.name}
                      </span>
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
