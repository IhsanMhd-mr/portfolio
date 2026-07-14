import db from "@/lib/database";
import ProjectsFilterWrapper from "@/components/public/ProjectsFilterWrapper";

export default async function ProjectsPage() {
  const [projects, technologies] = await Promise.all([
    db.project.findMany({
      where: {
        publishState: "PUBLISHED",
        visible: true,
        deletedAt: null,
      },
      include: {
        technologies: {
          include: { technology: true },
          orderBy: { order: "asc" },
        },
        thumbnail: true,
      },
      orderBy: { manualOrder: "asc" },
    }),
    db.technology.findMany({
      where: { visible: true, deletedAt: null },
      orderBy: { order: "asc" },
    }),
  ]);

  // Clean the structure
  const projectList = projects.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    category: p.category,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    liveDemoUrl: p.liveDemoUrl,
    githubUrl: p.githubUrl,
    thumbnailUrl: p.thumbnail?.url || null,
    technologies: p.technologies.map((pt) => ({
      id: pt.technology.id,
      name: pt.technology.name,
    })),
  }));

  return (
    <div
      className="flex-1 w-full px-[var(--gutter)] py-16 transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div className="max-w-[var(--w-content)] mx-auto space-y-10">
        <div>
          <p className="text-mono-label mb-2 text-[var(--accent)]">// 02 — ARCHIVE</p>
          <h1 className="text-display mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Projects
          </h1>
          <p className="text-body-lg text-[var(--ink-soft)] max-w-xl">
            A comprehensive list of engineering projects, case studies, academic milestones, and open-source contributions.
          </p>
        </div>

        {/* Filter component */}
        <ProjectsFilterWrapper initialProjects={projectList} technologies={technologies} />
      </div>
    </div>
  );
}
