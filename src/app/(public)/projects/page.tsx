import type { Metadata } from "next";
import { PublicContentService } from "@/services/public-content.service";
import ProjectsFilterWrapper from "@/components/public/ProjectsFilterWrapper";
import { text } from "@/lib/text";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await PublicContentService.getSiteProfile();
  const fullName = text(profile?.fullName);
  const heading = fullName ? `Projects — ${fullName}` : "Projects";
  const description =
    "A comprehensive list of engineering projects, case studies, academic milestones, and open-source contributions.";

  return {
    title: heading,
    description,
    openGraph: { title: heading, description, type: "website" },
  };
}

export default async function ProjectsPage() {
  const { projects: projectList, technologies } =
    await PublicContentService.getProjectsPageData();

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
