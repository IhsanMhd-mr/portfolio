import type { Metadata } from "next";
import db from "@/lib/database";
import ProjectsFilterWrapper from "@/components/public/ProjectsFilterWrapper";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await db.siteProfile.findFirst();
  const fullName = profile?.fullName || "Jane Doe";
  const description =
    "A comprehensive list of engineering projects, case studies, academic milestones, and open-source contributions.";

  return {
    title: `Projects — ${fullName}`,
    description,
    openGraph: { title: `Projects — ${fullName}`, description, type: "website" },
  };
}

export default async function ProjectsPage() {
  const [projectsRaw, technologiesRaw] = await Promise.all([
    db.project.findMany({
      where: { deletedAt: null },
      include: {
        versions: { where: { state: "PUBLISHED", visible: true } },
        technologies: {
          include: {
            technology: {
              include: { versions: { where: { state: "PUBLISHED", visible: true } } },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    }),
    db.technology.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "PUBLISHED", visible: true } } },
    }),
  ]);

  // Clean the technologies list
  const technologies = technologiesRaw
    .map((tech) => {
      const pub = tech.versions[0];
      return {
        id: tech.id,
        name: pub?.name || tech.slug,
        category: pub?.category || "OTHER",
      };
    })
    .filter((t) => t.name);

  // Clean projects structure to initialProjects formatting
  const projectList = projectsRaw
    .map((p) => {
      const pub = p.versions[0];
      if (!pub) return null;

      // Find thumbnail
      const thumbUrl = pub.thumbnailId ? `/uploads/` : null; // Wait! Let's lookup URL from media asset if loaded.
      // Wait, let's load media inside findMany include so we have the thumbnail url!
      return {
        id: p.id,
        title: pub.title,
        slug: p.slug,
        summary: pub.summary,
        category: pub.category,
        startDate: pub.startDate ? pub.startDate.toISOString() : null,
        liveDemoUrl: pub.liveDemoUrl,
        githubUrl: pub.githubUrl,
        manualOrder: pub.manualOrder,
        thumbnailUrl: null as string | null, // We'll populate below
        thumbnailId: pub.thumbnailId,
        technologies: p.technologies
          .map((pt) => ({
            id: pt.technology.id,
            name: pt.technology.versions[0]?.name || pt.technology.slug,
          }))
          .filter((t) => t.name),
      };
    })
    .filter((p) => p !== null);

  // Load all media assets for URL resolving
  const allMedia = await db.mediaAsset.findMany({
    where: { deletedAt: null },
  });

  // Resolve thumbnail URLs
  for (const proj of projectList) {
    if (proj.thumbnailId) {
      const media = allMedia.find((m) => m.id === proj.thumbnailId);
      if (media) proj.thumbnailUrl = media.url;
    }
  }

  // Sort by manualOrder
  projectList.sort((a, b) => (a.manualOrder || 0) - (b.manualOrder || 0));

  return (
    <div
      className="flex-1 w-full px-[var(--gutter)] py-16 transition-colors duration-300 animate-fadeIn"
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
        <ProjectsFilterWrapper initialProjects={projectList as any} technologies={technologies as any} />
      </div>
    </div>
  );
}
