import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Github } from "@/components/public/Icons";

interface FeaturedProjectsSectionProps {
  projects: any[];
  settings?: any;
  isPreview?: boolean;
}

export default function FeaturedProjectsSection({ projects, settings, isPreview = false }: FeaturedProjectsSectionProps) {
  const selectedIds = settings?.selectedProjectIds;
  const featured = Array.isArray(selectedIds) && selectedIds.length > 0
    ? projects.filter(p => selectedIds.includes(p.id))
    : projects.filter((p) => p.featured);

  if (featured.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-20 px-[var(--gutter)] bg-[var(--bg-2, var(--bg))] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
          <div>
            <p className="text-mono-label mb-2 text-[var(--accent)]">// 03 — FEATURED WORKS</p>
            <h2 
              className="text-h2 text-[var(--ink)]" 
              style={{ fontFamily: "var(--font-display)" }}
            >
              Selected Projects
            </h2>
          </div>
          <Link 
            href="/projects" 
            className="flex items-center gap-1 text-small font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Browse all projects
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {featured.map((project) => {
            const thumbnail = project.thumbnail?.url;
            const category = project.category || "WEB";
            
            return (
              <div 
                key={project.id}
                className="group flex flex-col rounded-[var(--radius-md)] overflow-hidden border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {/* Thumbnail image placeholder/image */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900 border-b border-solid border-[var(--line)]">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={thumbnail} 
                      alt={project.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[var(--ink-faint)] p-6">
                      <span className="text-mono-label">// {category}</span>
                      <p className="text-xs mt-2">No thumbnail uploaded</p>
                    </div>
                  )}
                </div>

                {/* Info and links */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3 mb-6">
                    <span 
                      className="text-mono-label text-[var(--accent)]" 
                      style={{ fontSize: "10px" }}
                    >
                      {category.replace("_", " ")}
                    </span>
                    
                    <h3 
                      className="text-h3 text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      <Link href={`/projects/${project.slug}`}>
                        {project.title}
                      </Link>
                    </h3>
                    
                    <p className="text-small text-[var(--ink-soft)] leading-relaxed line-clamp-3">
                      {project.summary}
                    </p>

                    {/* Tech tag list */}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {project.technologies.map((t: any) => {
                          const tech = t.technology || t;
                          return (
                            <span 
                              key={tech.id} 
                              className="px-2 py-0.5 text-[10px] font-medium border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg-inset)] text-[var(--ink-soft)]"
                            >
                              {tech.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-solid border-[var(--line)] text-small">
                    <Link 
                      href={`/projects/${project.slug}`}
                      className="flex items-center gap-1.5 font-bold text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
                    >
                      View Case Study
                      <ArrowRight size={14} />
                    </Link>

                    <div className="flex items-center gap-4">
                      {project.githubUrl && (
                        <a 
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors"
                          aria-label="GitHub Repository"
                        >
                          <Github size={18} />
                        </a>
                      )}
                      {project.liveDemoUrl && (
                        <a 
                          href={project.liveDemoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors"
                          aria-label="Live Demo"
                        >
                          <ExternalLink size={18} />
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
