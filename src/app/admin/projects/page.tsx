import db from "@/lib/database";
import Link from "next/link";
import { 
  Briefcase, Plus, Trash2, Eye, EyeOff, Check, Edit, 
  Copy, RefreshCw, Star, ArrowUp, ArrowDown, Search, Filter 
} from "lucide-react";
import { 
  toggleProjectVisibilityAction, 
  softDeleteProjectAction, 
  restoreProjectAction, 
  permanentlyDeleteProjectAction, 
  createProjectAction, 
  duplicateProjectAction,
  reorderProjectsAction
} from "./actions";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    category?: string;
    status?: string;
    tech?: string;
  }>;
}

export default async function AdminProjectsPage(props: PageProps) {
  const params = await props.searchParams;
  const q = params.q || "";
  const filter = params.filter || "all";
  const categoryFilter = params.category || "";
  const statusFilter = params.status || "";
  const techFilter = params.tech || "";

  // Fetch technologies for filter dropdown
  const allTechs = await db.technology.findMany({
    where: { deletedAt: null },
    include: { versions: { where: { state: "DRAFT" } } },
  });

  // Query database
  const projectsRaw = await db.project.findMany({
    where: {
      deletedAt: filter === "trash" ? { not: null } : null,
      versions: {
        some: {
          state: "DRAFT",
          title: q ? { contains: q, mode: "insensitive" } : undefined,
          category: categoryFilter ? (categoryFilter as any) : undefined,
          status: filter === "archived" ? "ARCHIVED" : (statusFilter ? (statusFilter as any) : undefined),
          featured: filter === "featured" ? true : undefined,
          visible: filter === "hidden" ? false : (filter === "visible" ? true : undefined),
        },
      },
      technologies: techFilter ? {
        some: {
          technologyId: techFilter,
        },
      } : undefined,
    },
    include: {
      versions: true,
      technologies: {
        include: {
          technology: {
            include: {
              versions: { where: { state: "DRAFT" } },
            },
          },
        },
      },
      images: {
        include: {
          media: true,
        },
      },
    },
  });

  // Map to find draft / published versions and detect changes
  const projects = projectsRaw.map((proj) => {
    const draft = proj.versions.find((v) => v.state === "DRAFT");
    const published = proj.versions.find((v) => v.state === "PUBLISHED");

    let changeState: "SYNC" | "DRAFT_ONLY" | "DRAFT_CHANGES" = "SYNC";
    if (!published) {
      changeState = "DRAFT_ONLY";
    } else if (draft) {
      // Check field differences
      const fields = [
        "title", "summary", "fullDescription", "category", "status",
        "startDate", "endDate", "featured", "visible", "myRole",
        "problem", "solution", "mainFeatures", "systemArchitecture",
        "developmentProcess", "challenges", "solutionsDetail", "testing",
        "results", "lessonsLearned", "liveDemoUrl", "githubUrl",
        "reportUrl", "documentationUrl", "videoUrl", "presentationUrl",
        "seoTitle", "seoDescription", "thumbnailId", "coverImageId",
        "architectureImageId"
      ];
      const hasDiff = fields.some((f) => {
        const val1 = (draft as any)[f];
        const val2 = (published as any)[f];
        if (val1 instanceof Date || val2 instanceof Date) {
          return new Date(val1).getTime() !== new Date(val2).getTime();
        }
        return val1 !== val2;
      });
      if (hasDiff) {
        changeState = "DRAFT_CHANGES";
      }
    }

    return {
      ...proj,
      draft,
      published,
      changeState,
    };
  });

  // Sort by manualOrder of draft version
  projects.sort((a, b) => (a.draft?.manualOrder || 0) - (b.draft?.manualOrder || 0));

  // Custom filters in memory if required
  let filteredProjects = projects;
  if (filter === "draft") {
    filteredProjects = projects.filter((p) => p.changeState === "DRAFT_CHANGES" || p.changeState === "DRAFT_ONLY");
  } else if (filter === "published") {
    filteredProjects = projects.filter((p) => p.published);
  }

  // Create Project action
  async function handleCreateProject() {
    "use server";
    await createProjectAction({
      title: "New Project",
      slug: `new-project-${Date.now()}`,
      summary: "Draft summary of the work.",
    });
  }

  // Manual reordering action
  async function handleMoveUp(index: number) {
    "use server";
    if (index === 0) return;
    const ids = filteredProjects.map((p) => p.id);
    const temp = ids[index];
    ids[index] = ids[index - 1];
    ids[index - 1] = temp;
    await reorderProjectsAction(ids);
  }

  async function handleMoveDown(index: number) {
    "use server";
    if (index === filteredProjects.length - 1) return;
    const ids = filteredProjects.map((p) => p.id);
    const temp = ids[index];
    ids[index] = ids[index + 1];
    ids[index + 1] = temp;
    await reorderProjectsAction(ids);
  }

  // Wrapper local actions returning void to compile in React 19 forms
  async function handleToggleVisibility(id: string, visible: boolean) {
    "use server";
    await toggleProjectVisibilityAction(id, visible);
  }

  async function handleDuplicate(id: string) {
    "use server";
    await duplicateProjectAction(id);
  }

  async function handleSoftDelete(id: string) {
    "use server";
    await softDeleteProjectAction(id);
  }

  async function handleRestore(id: string) {
    "use server";
    await restoreProjectAction(id);
  }

  async function handlePermanentDelete(id: string) {
    "use server";
    await permanentlyDeleteProjectAction(id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Projects Registry</h1>
          <p className="text-sm text-[var(--a-soft)] mt-1.5">
            Manage your case studies, draft content, visibility settings, and category filters.
          </p>
        </div>

        <form action={handleCreateProject}>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
          >
            <Plus size={14} />
            Create Project
          </button>
        </form>
      </div>

      {/* Filters Bar */}
      <div className="p-4 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)]">
        <form method="GET" className="grid gap-4 sm:grid-cols-5">
          {/* Search */}
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by title..."
              className="w-full pl-9 pr-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-slate-50"
            />
          </div>

          {/* Category */}
          <div>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-slate-50 focus:outline-none focus:border-[var(--a-primary)]"
            >
              <option value="">All Categories</option>
              <option value="WEB">Web Platform</option>
              <option value="FULL_STACK">Full-Stack System</option>
              <option value="MACHINE_LEARNING">AI / ML</option>
              <option value="JAVA">Java Platform</option>
              <option value="ACADEMIC">Academic Project</option>
              <option value="OTHER">Other Type</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-slate-50 focus:outline-none focus:border-[var(--a-primary)]"
            >
              <option value="">All Statuses</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="MAINTAINED">Maintained</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Tech */}
          <div>
            <select
              name="tech"
              defaultValue={techFilter}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-slate-50 focus:outline-none focus:border-[var(--a-primary)]"
            >
              <option value="">All Technologies</option>
              {allTechs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.versions.find((v) => v.state === "DRAFT")?.name || t.slug}
                </option>
              ))}
            </select>
          </div>

          {/* Keep filters query param */}
          <input type="hidden" name="filter" value={filter} />

          <button type="submit" className="hidden" />
        </form>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-solid border-[var(--a-line)] text-[11px] font-semibold text-slate-500">
          <Link
            href={`/admin/projects?filter=all&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "all" ? "bg-[var(--a-primary)] text-white" : "hover:bg-slate-100"
            }`}
          >
            All
          </Link>
          <Link
            href={`/admin/projects?filter=published&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "published" ? "bg-[var(--a-primary)] text-white" : "hover:bg-slate-100"
            }`}
          >
            Published
          </Link>
          <Link
            href={`/admin/projects?filter=draft&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "draft" ? "bg-[var(--a-primary)] text-white" : "hover:bg-slate-100"
            }`}
          >
            Draft Changes
          </Link>
          <Link
            href={`/admin/projects?filter=featured&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "featured" ? "bg-[var(--a-primary)] text-white" : "hover:bg-slate-100"
            }`}
          >
            Featured
          </Link>
          <Link
            href={`/admin/projects?filter=hidden&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "hidden" ? "bg-[var(--a-primary)] text-white" : "hover:bg-slate-100"
            }`}
          >
            Hidden
          </Link>
          <Link
            href={`/admin/projects?filter=archived&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "archived" ? "bg-[var(--a-primary)] text-white" : "hover:bg-slate-100"
            }`}
          >
            Archived
          </Link>
          <Link
            href={`/admin/projects?filter=trash&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "trash" ? "bg-[var(--a-primary)] text-white" : "hover:bg-slate-100"
            }`}
          >
            Trash Bin
          </Link>
        </div>
      </div>

      {/* Projects List Card Container */}
      <div className="border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
        <div className="p-4 border-b border-solid border-[var(--a-line)] bg-slate-50 flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
          <Briefcase size={14} />
          <span>PROJECTS REGISTRY ({filteredProjects.length})</span>
        </div>

        <div className="divide-y divide-solid divide-[var(--a-line)]">
          {filteredProjects.map((proj, idx) => {
            const draft = proj.draft;
            if (!draft) return null;

            const isPublished = !!proj.published;

            return (
              <div key={proj.id} className="p-5 hover:bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info block */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[var(--a-ink)]">{draft.title}</span>
                    {proj.published && proj.published.title !== draft.title && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-solid border-amber-200">
                        Live: {proj.published.title}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-[var(--a-faint)] uppercase bg-slate-100 px-2 py-0.5 rounded">
                      {draft.category}
                    </span>
                    <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                      {draft.status}
                    </span>

                    {/* Change Indicator */}
                    {proj.changeState === "DRAFT_ONLY" && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                        Draft Only
                      </span>
                    )}
                    {proj.changeState === "DRAFT_CHANGES" && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                        Draft Changes Pending
                      </span>
                    )}
                    {proj.changeState === "SYNC" && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-green-100 text-green-800 uppercase tracking-wide">
                        In Sync
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--a-soft)] max-w-lg truncate">{draft.summary}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-[var(--a-faint)]">
                    <span>Slug: /{proj.slug}</span>
                    <span>Order: {draft.manualOrder}</span>
                    <span>Technologies: {proj.technologies.length}</span>
                    <span>Gallery: {proj.images.length}</span>
                    {draft.featured && (
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star size={10} fill="currentColor" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 flex gap-4 pt-1">
                    <span>Modified: {new Date(proj.updatedAt).toLocaleString()}</span>
                    {proj.published?.publishedAt && (
                      <span>Published: {new Date(proj.published.publishedAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {/* Operations */}
                <div className="flex items-center gap-2.5 self-end md:self-auto">
                  {/* manual order shift */}
                  {filter !== "trash" && (
                    <div className="flex flex-col gap-0.5">
                      <form action={handleMoveUp.bind(null, idx)}>
                        <button
                          type="submit"
                          disabled={idx === 0}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowUp size={12} />
                        </button>
                      </form>
                      <form action={handleMoveDown.bind(null, idx)}>
                        <button
                          type="submit"
                          disabled={idx === filteredProjects.length - 1}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </form>
                    </div>
                  )}

                  {filter !== "trash" ? (
                    <>
                      {/* Visibility Toggle */}
                      <form action={handleToggleVisibility.bind(null, proj.id, draft.visible)}>
                        <button
                          type="submit"
                          className="p-2 hover:bg-slate-100 text-[var(--a-soft)] rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent"
                          title={draft.visible ? "Hide project draft" : "Show project draft"}
                        >
                          {draft.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                        </button>
                      </form>

                      {/* Duplicate */}
                      <form action={handleDuplicate.bind(null, proj.id)}>
                        <button
                          type="submit"
                          className="p-2 hover:bg-slate-100 text-[var(--a-soft)] rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent"
                          title="Duplicate project draft configuration"
                        >
                          <Copy size={14} />
                        </button>
                      </form>

                      {/* Edit */}
                      <Link
                        href={`/admin/projects/${proj.id}/edit`}
                        className="p-2 hover:bg-slate-100 text-[var(--a-soft)] rounded-[var(--a-r-sm)] border border-solid border-transparent bg-transparent block"
                        title="Edit detailed case study"
                      >
                        <Edit size={14} />
                      </Link>

                      {/* Soft Delete */}
                      <form action={handleSoftDelete.bind(null, proj.id)}>
                        <button
                          type="submit"
                          className="p-2 hover:bg-red-50 text-red-500 rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent"
                          title="Move project to trash"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      {/* Restore */}
                      <form action={handleRestore.bind(null, proj.id)}>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold rounded cursor-pointer border-none"
                        >
                          Restore
                        </button>
                      </form>

                      {/* Permanent delete */}
                      <form
                        action={handlePermanentDelete.bind(null, proj.id)}
                        onSubmit={(e) => {
                          if (!confirm("Are you absolutely sure you want to permanently delete this project? This action cannot be undone.")) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <button
                          type="submit"
                          className="p-2 hover:bg-red-50 text-red-600 rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent"
                          title="Permanently delete project"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProjects.length === 0 && (
            <div className="text-center py-20 text-xs font-mono text-[var(--a-faint)]">// NO PROJECTS MATCH FILTER</div>
          )}
        </div>
      </div>
    </div>
  );
}
