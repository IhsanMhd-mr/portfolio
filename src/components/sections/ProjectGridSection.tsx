import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Github } from "@/components/public/Icons";

interface ProjectGridSectionProps {
  projects: any[];
  settings?: any;
  isPreview?: boolean;
}

export default function ProjectGridSection({ projects, settings, isPreview = false }: ProjectGridSectionProps) {
  const selectedIds = settings?.selectedProjectIds;
  let items = Array.isArray(selectedIds) && selectedIds.length > 0
    ? projects.filter(p => selectedIds.includes(p.id))
    : projects;

  if (settings?.limit) {
    items = items.slice(0, settings.limit);
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-20 px-[var(--gutter)] bg-[var(--bg)] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto">
        <div className="mb-12 text-center md:text-left">
          <h2
            className="text-h2 text-[var(--ink)]" 
            style={{ fontFamily: "var(--font-display)" }}
          >
            All Projects
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {items.map((project) => {
            const thumbnail = project.thumbnail?.url;
            const category = project.category || "WEB";

            return (
              <div 
                key={project.id}
                className="pm-project-card group flex flex-col rounded-[var(--radius-sm)] overflow-hidden border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))] hover:border-[var(--accent)] transition-all duration-300"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-[var(--bg-inset)] border-b border-solid border-[var(--line)]">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={thumbnail} 
                      alt={project.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[var(--ink-faint)] p-6">
                      <span className="text-mono-label">{category.replace("_", " ")}</span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    <span className="text-[10px] text-[var(--accent)] font-semibold tracking-wider uppercase">
                      {category.replace("_", " ")}
                    </span>
                    <h3 className="font-semibold text-body text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                      <Link href={`/projects/${project.slug}`}>{project.title}</Link>
                    </h3>
                    <p className="text-xs text-[var(--ink-soft)] leading-relaxed line-clamp-2">
                      {project.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-solid border-[var(--line)] text-xs">
                    <Link 
                      href={`/projects/${project.slug}`}
                      className="flex items-center gap-1 font-bold text-[var(--ink)] hover:text-[var(--accent)]"
                    >
                      View Project
                      <ArrowRight size={12} />
                    </Link>

                    <div className="flex items-center gap-3">
                      {project.githubUrl && (
                        <a 
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--ink-soft)] hover:text-[var(--accent)]"
                        >
                          <Github size={16} />
                        </a>
                      )}
                      {project.liveDemoUrl && (
                        <a 
                          href={project.liveDemoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--ink-soft)] hover:text-[var(--accent)]"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
