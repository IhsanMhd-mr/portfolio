"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, ExternalLink, SlidersHorizontal } from "lucide-react";
import { Github } from "@/components/public/Icons";

interface ProjectItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  startDate: string | null;
  liveDemoUrl: string | null;
  githubUrl: string | null;
  thumbnailUrl: string | null;
  technologies: { id: string; name: string }[];
}

interface ProjectsFilterWrapperProps {
  initialProjects: ProjectItem[];
  technologies: any[];
}

export default function ProjectsFilterWrapper({
  initialProjects,
  technologies,
}: ProjectsFilterWrapperProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [selectedTech, setSelectedTech] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");

  // Get unique categories present in the projects list
  const categories = useMemo(() => {
    const cats = new Set(initialProjects.map((p) => p.category));
    return ["ALL", ...Array.from(cats)];
  }, [initialProjects]);

  const filteredProjects = useMemo(() => {
    let result = [...initialProjects];

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (category !== "ALL") {
      result = result.filter((p) => p.category === category);
    }

    // Technology filter
    if (selectedTech !== "ALL") {
      result = result.filter((p) =>
        p.technologies.some((t) => t.id === selectedTech)
      );
    }

    // Sorting logic
    if (sortBy === "NEWEST") {
      result.sort((a, b) => {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0;
        const db = b.startDate ? new Date(b.startDate).getTime() : 0;
        return db - da;
      });
    } else if (sortBy === "OLDEST") {
      result.sort((a, b) => {
        const da = a.startDate ? new Date(a.startDate).getTime() : 0;
        const db = b.startDate ? new Date(b.startDate).getTime() : 0;
        return da - db;
      });
    } else if (sortBy === "TITLE_AZ") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "TITLE_ZA") {
      result.sort((a, b) => b.title.localeCompare(a.title));
    }

    return result;
  }, [initialProjects, search, category, selectedTech, sortBy]);

  return (
    <div className="space-y-8">
      {/* Filtering Toolbar */}
      <div 
        className="p-6 rounded-[var(--radius-sm)] border border-solid border-[var(--line)] bg-[var(--bg-raised)] grid gap-4 md:grid-cols-12 items-center"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Search */}
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg)] text-small text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Category selection */}
        <div className="md:col-span-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg)] text-small text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="ALL">All Categories</option>
            {categories.filter((c) => c !== "ALL").map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Technology selection */}
        <div className="md:col-span-3">
          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            className="w-full px-3 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg)] text-small text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="ALL">All Technologies</option>
            {technologies.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting */}
        <div className="md:col-span-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg)] text-small text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
            <option value="TITLE_AZ">Name A-Z</option>
            <option value="TITLE_ZA">Name Z-A</option>
          </select>
        </div>
      </div>

      {/* Grid Results */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="group flex flex-col rounded-[var(--radius-sm)] overflow-hidden border border-solid border-[var(--line)] bg-[var(--bg-raised)] hover:border-[var(--accent)] transition-all duration-300"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video w-full overflow-hidden bg-[var(--bg-inset)] border-b border-solid border-[var(--line)]">
              {project.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.thumbnailUrl}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--ink-faint)] p-6 text-center">
                  <span className="text-mono-label">{project.category.replace("_", " ")}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-3 mb-4">
                <span className="text-[10px] text-[var(--accent)] font-semibold tracking-wider uppercase">
                  {project.category.replace("_", " ")}
                </span>
                <h3 className="font-semibold text-body text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                  <Link href={`/projects/${project.slug}`}>{project.title}</Link>
                </h3>
                <p className="text-xs text-[var(--ink-soft)] leading-relaxed line-clamp-3">
                  {project.summary}
                </p>
                {/* Tech tags */}
                {project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech.id}
                        className="px-1.5 py-0.5 text-[9px] border border-solid border-[var(--line)] rounded-[var(--radius-xs)] bg-[var(--bg)] text-[var(--ink-soft)]"
                      >
                        {tech.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer links */}
              <div className="flex items-center justify-between pt-3 border-t border-solid border-[var(--line)] text-xs">
                <Link
                  href={`/projects/${project.slug}`}
                  className="flex items-center gap-1 font-bold text-[var(--ink)] hover:text-[var(--accent)]"
                >
                  Case Study
                  <ArrowRight size={12} />
                </Link>

                <div className="flex items-center gap-3">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--ink-soft)] hover:text-[var(--accent)]"
                      aria-label="GitHub Repository"
                    >
                      <Github size={15} />
                    </a>
                  )}
                  {project.liveDemoUrl && (
                    <a
                      href={project.liveDemoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--ink-soft)] hover:text-[var(--accent)]"
                      aria-label="Live Demo"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-20 text-[var(--ink-faint)] border border-dashed border-[var(--line)] rounded-[var(--radius-sm)]">
          No projects found matching filters.
        </div>
      )}
    </div>
  );
}
