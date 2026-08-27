import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicContentService } from "@/services/public-content.service";
import Link from "next/link";
import { ArrowLeft, Calendar, User, CheckCircle2, Globe, FileText, ChevronRight } from "lucide-react";
import { Github } from "@/components/public/Icons";

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
}

/** The public site only ever renders published content. */
const PUBLIC_STATE = "PUBLISHED" as const;

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  // Mirrors the page body's lookup + visibility rules below, sharing the same
  // request-cached query.
  const data = await PublicContentService.getProjectDetail(slug);
  if (!data) notFound();

  const { pub, coverImage } = data;
  const description = pub.summary || `Case study: ${pub.title}`;
  const coverAsset = coverImage;

  return {
    title: `${pub.title} — Project`,
    description,
    openGraph: {
      title: pub.title,
      description,
      type: "article",
      images: coverAsset?.url ? [{ url: coverAsset.url }] : undefined,
    },
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  
  // Find project with active state version (request-cached — generateMetadata
  // above already resolved this exact query)
  const data = await PublicContentService.getProjectDetail(slug);
  if (!data) notFound();

  const { project, pub, relatedProjects, coverImage, architectureImage } = data;
  const coverAsset = coverImage;
  const architectureAsset = architectureImage;

  const categoryLabel = pub.category.replace("_", " ");

  // Whether there is any case-study content below the fold. Every field here is
  // already loaded, so this costs nothing. `architectureAsset` counts because
  // that section renders on the image alone; `solutionsDetail` does not,
  // because it only ever renders nested inside `challenges`.
  const hasCaseStudy = Boolean(
    pub.problem || pub.solution || pub.mainFeatures || pub.systemArchitecture ||
    architectureAsset?.url || pub.developmentProcess || pub.challenges ||
    pub.testing || pub.results || pub.lessonsLearned
  );
  const startDateStr = pub.startDate
    ? new Date(pub.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;
  const endDateStr = pub.endDate
    ? new Date(pub.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Present";

  return (
    <div
      className="pm-case flex-1 w-full px-[var(--gutter)] py-12 transition-colors duration-300 animate-fadeIn"
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
          <span className="text-[var(--ink-faint)] truncate max-w-[150px]">{pub.title.toUpperCase()}</span>
        </nav>

        {/* 2. Project Hero */}
        <div className="space-y-4">
          <span className="text-mono-label text-[var(--accent)]" style={{ fontSize: "10px" }}>
            {hasCaseStudy ? `${categoryLabel} Case Study` : categoryLabel}
          </span>
          <h1 className="text-display" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 56px)" }}>
            {pub.title}
          </h1>
          {pub.summary && (
            <p className="text-body-lg text-[var(--ink-soft)] leading-relaxed">
              {pub.summary}
            </p>
          )}
        </div>

        {/* 3. Date, Status, and Meta Row */}
        {/* The third cell (My Role) is conditional, so the column count follows it
            — otherwise a project without a role leaves a trailing empty column. */}
        <div className={`pm-case-meta grid grid-cols-2 ${pub.myRole ? "md:grid-cols-3" : ""} gap-6 p-5 border border-solid border-[var(--line)] rounded-[var(--radius-sm)] bg-[var(--bg-raised)] text-small text-[var(--ink-soft)]`}>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[var(--accent)]" />
            <div>
              <p className="text-[10px] font-mono uppercase text-[var(--ink-faint)]">Timeline</p>
              <p className="font-semibold text-[var(--ink)] mt-0.5">
                {startDateStr} - {pub.status === "COMPLETED" ? endDateStr : "In Progress"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--accent)]" />
            <div>
              <p className="text-[10px] font-mono uppercase text-[var(--ink-faint)]">Status</p>
              <p className="font-semibold text-[var(--ink)] mt-0.5">{pub.status}</p>
            </div>
          </div>
          {pub.myRole && (
            <div className="flex items-center gap-2 col-span-2 md:col-span-1">
              <User size={16} className="text-[var(--accent)]" />
              <div>
                <p className="text-[10px] font-mono uppercase text-[var(--ink-faint)]">My Role</p>
                <p className="font-semibold text-[var(--ink)] mt-0.5">{pub.myRole}</p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Main Cover Image */}
        {coverAsset?.url && (
          <div className="pm-case-media w-full aspect-video rounded-[var(--radius-md)] overflow-hidden border border-solid border-[var(--line)]">
            <img 
              src={coverAsset.url} 
              alt={pub.title} 
              className="w-full h-full object-cover" 
            />
          </div>
        )}

        {/* 5. Technology Stack */}
        {project.technologies.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-mono-label text-[var(--ink-faint)]" style={{ fontSize: "11px" }}>Technology Worked With</h4>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((t) => {
                const name = t.technology.versions.find((v) => v.state === PUBLIC_STATE)?.name || t.technology.slug;
                return (
                  <span 
                    key={t.technology.id} 
                    className="px-3 py-1 text-xs border border-solid border-[var(--line)] rounded-[var(--radius-sm)] bg-[var(--bg-raised)] text-[var(--ink)] font-mono"
                  >
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic content rendering for Case Study fields */}
        {hasCaseStudy && (
        <div className="pm-case-body space-y-10 pt-4">
          {pub.problem && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>The Problem</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{pub.problem}</p>
            </section>
          )}

          {pub.solution && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>The Solution</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{pub.solution}</p>
            </section>
          )}

          {pub.mainFeatures && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Key Features</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed whitespace-pre-line">{pub.mainFeatures}</p>
            </section>
          )}

          {(pub.systemArchitecture || architectureAsset?.url) && (
            <section className="space-y-4">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>System Architecture</h2>
              {pub.systemArchitecture && (
                <p className="text-body text-[var(--ink-soft)] leading-relaxed">{pub.systemArchitecture}</p>
              )}
              {architectureAsset?.url && (
                <div className="w-full aspect-video rounded-[var(--radius-sm)] overflow-hidden border border-solid border-[var(--line)] p-4 bg-[var(--bg-inset)]">
                  <img 
                    src={architectureAsset.url} 
                    alt="System Architecture Diagram" 
                    className="w-full h-full object-contain" 
                  />
                </div>
              )}
            </section>
          )}

          {pub.developmentProcess && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Development Process</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{pub.developmentProcess}</p>
            </section>
          )}

          {pub.challenges && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Challenges & Solutions</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{pub.challenges}</p>
              {pub.solutionsDetail && (
                <p className="text-body text-[var(--ink-soft)] leading-relaxed mt-2">{pub.solutionsDetail}</p>
              )}
            </section>
          )}

          {pub.testing && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Testing & Quality Assurance</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{pub.testing}</p>
            </section>
          )}

          {pub.results && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Results & Metrics</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{pub.results}</p>
            </section>
          )}

          {pub.lessonsLearned && (
            <section className="space-y-3">
              <h2 className="text-h3 font-semibold" style={{ fontFamily: "var(--font-display)" }}>Lessons Learned</h2>
              <p className="text-body text-[var(--ink-soft)] leading-relaxed">{pub.lessonsLearned}</p>
            </section>
          )}
        </div>
        )}

        {/* Visual Gallery grid */}
        {project.images.length > 0 && (
          <div className="pt-8 border-t border-solid border-[var(--line)] space-y-4">
            <h3 className="text-mono-label text-[var(--ink-faint)]" style={{ fontSize: "11px" }}>Case Study Gallery</h3>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {project.images.map((img) => (
                <div key={img.id} className="space-y-1.5 border border-solid border-slate-100 p-2 bg-slate-50/50 rounded">
                  <div className="aspect-video w-full rounded overflow-hidden bg-[var(--bg-inset)] border border-solid border-[var(--line)]">
                    <img src={img.media.url} alt={img.caption || "Gallery"} className="w-full h-full object-cover" />
                  </div>
                  {img.caption && (
                    <span className="text-[10px] text-slate-500 italic block pl-1">{img.caption}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. External Links / Actions */}
        <div className="pt-8 border-t border-solid border-[var(--line)] flex flex-wrap gap-4 items-center">
          {pub.liveDemoUrl && (
            <a 
              href={pub.liveDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-[var(--bg)] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--accent-hover)] transition-colors text-small"
            >
              <Globe size={16} />
              Visit Live Site
            </a>
          )}
          {pub.githubUrl && (
            <a 
              href={pub.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 border border-solid border-[var(--line)] text-[var(--ink)] font-semibold rounded-[var(--radius-sm)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors text-small bg-[var(--bg-raised)]"
            >
              <Github size={16} />
              GitHub Repository
            </a>
          )}
          {pub.reportUrl && (
            <a 
              href={pub.reportUrl}
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
            <h3 className="text-mono-label text-[var(--ink-faint)]" style={{ fontSize: "11px" }}>Related Projects</h3>
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
