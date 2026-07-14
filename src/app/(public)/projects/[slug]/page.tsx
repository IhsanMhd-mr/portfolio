import db from "@/lib/database";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Calendar, User, CheckCircle2, Link2, Globe, FileText, ChevronRight } from "lucide-react";
import { Github } from "@/components/public/Icons";

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  
  const headersList = await headers();
  const isPreview = headersList.get("x-preview") === "true";

  const project = await db.project.findUnique({
    where: { slug },
    include: {
      technologies: {
        include: { technology: true },
        orderBy: { order: "asc" },
      },
      thumbnail: true,
      coverImage: true,
      architectureImage: true,
    },
  });

  // Verify project existence and visibility
  if (!project || project.deletedAt) {
    notFound();
  }

  // Hide draft projects from general public
  if (project.publishState === "DRAFT" && !isPreview) {
    notFound();
  }

  // Fetch related projects (same category, excluding current project)
  const relatedProjects = await db.project.findMany({
    where: {
      category: project.category,
      id: { not: project.id },
      publishState: isPreview ? undefined : "PUBLISHED",
      visible: true,
      deletedAt: null,
    },
    take: 3,
  });

  const categoryLabel = project.category.replace("_", " ");
  const startDateStr = project.startDate
    ? project.startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;
  const endDateStr = project.endDate
    ? project.endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Present";

  return (
    <div
      className="flex-1 w-full px-[var(--gutter)] py-12 transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div className="max-w-[var(--w-prose)] mx-auto space-y-12">
        {/* 1. Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-[var(--ink-soft)] font-mono">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">HOME</Link>
          <ChevronRight size={10} className="text-[var(--ink-faint)]" />
          <Link href="/projects" className="hover:text-[var(--accent)] transition-colors">PROJECTS</Link>
          <ChevronRight size={10} className="text-[var(--ink-faint)]" />
          <span className="text-[var(--ink-faint)] truncate max-w-[150px]">{project.title.toUpperCase()}</span>
        </nav>

        {/* 2. Project Hero */}
        <div className="space-y-4">
          <span className="text-mono-label text-[var(--accent)]" style={{ fontSize: "10px" }}>
            // {categoryLabel} CASE STUDY
          </span>
          <h1 className="text-display" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 56px)" }}>
            {project.title}
          </h1>
          {project.summary && (
            <p className="text-body-lg text-[var(--ink-soft)] leading-relaxed">
              {project.summary}
            </p>
          )}
        </div>

        {/* 3. Date, Status, and Meta Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-5 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] bg-[var(--bg-raised)] text-small text-[var(--ink-soft)]">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[var(--accent)]" />
            <div>
              <p className="text-[10px] font-mono uppercase text-[var(--ink-faint)]">Timeline</p>
              <p className="font-semibold text-[var(--ink)] mt-0.5">
                {startDateStr} - {project.status === "COMPLETED" ? endDateStr : "In Progress"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--accent)]" />
            <div>
              <p className="text-[10px] font-mono uppercase text-[var(--ink-faint)]">Status</p>
              <p className="font-semibold text-[var(--ink)] mt-0.5">{project.status}</p>
            </div>
          </div>
          {project.myRole && (
            <div className="flex items-center gap-2 col-span-2 md:col-span-1">
              <User size={16} className="text-[var(--accent)]" />
              <div>
                <p className="text-[10px] font-mono uppercase text-[var(--ink-faint)]">My Role</p>
                <p className="font-semibold text-[var(--ink)] mt-0.5">{project.myRole}</p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Main Cover Image */}
        {project.coverImage?.url && (
          <div className="w-full aspect-video rounded-[var(--radius-md)] overflow-hidden border border-solid border-[var(--line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={project.coverImage.url} 
              alt={project.title} 
              className="w-full h-full object-cover" 
            />
          </div>
        )}

        {/* 5. Technology Stack */}
        {project.technologies.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-mono-label text-[var(--ink-faint)]" style={{ fontSize: "11px" }}>// TECHNOLOGY WORKED WITH</h4>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((t) => (
                <span 
                  key={t.technology.id} 
                  className="px-3 py-1 text-xs border border-solid border-[var(--line)] rounded-[var(--radius-sm)] bg-[var(--bg-raised)] text-[var(--ink)] font-mono"
                >
                  {t.technology.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic content rendering for Case Study fields */}
        <div className="space-y-10 pt-4">
          {/* Problem */}
          {project.problem && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>The Problem</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{project.problem}</p>
            </section>
          )}

          {/* Solution */}
          {project.solution && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>The Solution</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{project.solution}</p>
            </section>
          )}

          {/* Key Features */}
          {project.mainFeatures && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Key Features</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed whitespace-pre-line">{project.mainFeatures}</p>
            </section>
          )}

          {/* Architecture */}
          {(project.systemArchitecture || project.architectureImage) && (
            <section className="space-y-4">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>System Architecture</h2>
              {project.systemArchitecture && (
                <p className="text-body text-[var(--ink-soft)] leading-relaxed">{project.systemArchitecture}</p>
              )}
              {project.architectureImage?.url && (
                <div className="w-full aspect-video rounded-[var(--radius-sm)] overflow-hidden border border-solid border-[var(--line)] p-4 bg-[var(--bg-inset)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={project.architectureImage.url} 
                    alt="System Architecture Diagram" 
                    className="w-full h-full object-contain" 
                  />
                </div>
              )}
            </section>
          )}

          {/* Development Process */}
          {project.developmentProcess && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Development Process</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{project.developmentProcess}</p>
            </section>
          )}

          {/* Challenges & Solutions */}
          {project.challenges && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Challenges & Solutions</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{project.challenges}</p>
              {project.solutionsDetail && (
                <p className="text-body text-[var(--ink-soft)] leading-relaxed mt-2">{project.solutionsDetail}</p>
              )}
            </section>
          )}

          {/* Testing */}
          {project.testing && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Testing & Quality Assurance</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{project.testing}</p>
            </section>
          )}

          {/* Results */}
          {project.results && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Results & Metrics</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{project.results}</p>
            </section>
          )}

          {/* Lessons Learned */}
          {project.lessonsLearned && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Lessons Learned</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{project.lessonsLearned}</p>
            </section>
          )}
        </div>

        {/* 6. External Links / Actions */}
        <div className="pt-8 border-t border-solid border-[var(--line)] flex flex-wrap gap-4 items-center">
          {project.liveDemoUrl && (
            <a 
              href={project.liveDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-[var(--bg)] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--accent-hover)] transition-colors text-small"
            >
              <Globe size={16} />
              Visit Live Site
            </a>
          )}
          {project.githubUrl && (
            <a 
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 border border-solid border-[var(--line)] text-[var(--ink)] font-semibold rounded-[var(--radius-sm)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors text-small bg-[var(--bg-raised)]"
            >
              <Github size={16} />
              GitHub Repository
            </a>
          )}
          {project.reportUrl && (
            <a 
              href={project.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 border border-solid border-[var(--line)] text-[var(--ink-soft)] font-semibold rounded-[var(--radius-sm)] hover:text-[var(--ink)] transition-colors text-small"
            >
              <FileText size={16} />
              Read Technical Report
            </a>
          )}
        </div>

        {/* 7. Related Projects */}
        {relatedProjects.length > 0 && (
          <div className="pt-12 border-t border-solid border-[var(--line)] space-y-6">
            <h3 className="text-mono-label text-[var(--ink-faint)]" style={{ fontSize: "11px" }}>// RELATED PROJECTS</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {relatedProjects.map((rp) => (
                <div 
                  key={rp.id}
                  className="p-5 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] bg-[var(--bg-raised)] hover:border-[var(--accent)] transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[9px] text-[var(--accent)] font-semibold uppercase">{rp.category.replace("_", " ")}</span>
                    <h4 className="font-semibold text-body text-[var(--ink)] mt-1 mb-2" style={{ fontFamily: "var(--font-display)" }}>
                      <Link href={`/projects/${rp.slug}`}>{rp.title}</Link>
                    </h4>
                    <p className="text-xs text-[var(--ink-soft)] line-clamp-2 leading-relaxed">{rp.summary}</p>
                  </div>
                  <Link 
                    href={`/projects/${rp.slug}`}
                    className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline mt-4"
                  >
                    View Project
                    <ChevronRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Back navigation */}
        <div className="pt-8 border-t border-solid border-[var(--line)]">
          <Link 
            href="/projects"
            className="inline-flex items-center gap-2 text-small font-semibold text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Projects Archive
          </Link>
        </div>
      </div>
    </div>
  );
}
