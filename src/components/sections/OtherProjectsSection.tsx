import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Github } from "@/components/public/Icons";

interface OtherProjectsSectionProps {
  projects: any[];
  isPreview?: boolean;
}

export default function OtherProjectsSection({ projects, isPreview = false }: OtherProjectsSectionProps) {
  // Filter out featured projects
  const otherProjects = projects.filter((p) => !p.featured);

  if (otherProjects.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-20 px-[var(--gutter)] bg-[var(--bg)] border-t border-solid border-[var(--line)] transition-colors duration-300">
      <div className="max-w-[var(--w-content)] mx-auto">
        <div className="mb-12 text-center md:text-left">
          <p className="text-mono-label mb-2 text-[var(--accent)]">// 05 — EXPERIMENTAL & UTILITY WORK</p>
          <h2 
            className="text-h2 text-[var(--ink)]" 
            style={{ fontFamily: "var(--font-display)" }}
          >
            Other Projects
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {otherProjects.map((project) => {
            const category = project.category || "OTHER";

            return (
              <div 
                key={project.id}
                className="group flex flex-col justify-between p-6 rounded-[var(--radius-sm)] border border-solid border-[var(--line)] bg-[var(--bg-raised, var(--bg))] hover:border-[var(--accent)] transition-all duration-300"
              >
                <div className="space-y-3 mb-6">
                  <span className="text-[10px] text-[var(--accent)] font-semibold tracking-wider uppercase">
                    {category.replace("_", " ")}
                  </span>
                  <h3 className="font-semibold text-body text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                    <Link href={`/projects/${project.slug}`}>{project.title}</Link>
                  </h3>
                  <p className="text-xs text-[var(--ink-soft)] leading-relaxed line-clamp-3">
                    {project.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-solid border-[var(--line)] text-xs">
                  <Link 
                    href={`/projects/${project.slug}`}
                    className="flex items-center gap-1 font-bold text-[var(--ink)] hover:text-[var(--accent)]"
                  >
                    View Details
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
