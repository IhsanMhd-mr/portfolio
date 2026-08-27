import { Suspense } from "react";
import { requireAdmin } from "@/lib/require-admin";
import { currentPathname } from "@/lib/current-pathname";
import AdminPageSkeleton from "@/components/admin/AdminPageSkeleton";
import { ProjectService } from "@/services/project.service";
import { TechnologyService } from "@/services/technology.service";
import Link from "next/link";
import {
  Briefcase, Plus, Trash2, Eye, EyeOff, Edit,
  Copy, Star, ArrowUp, ArrowDown, Search
} from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import { formatDateTime } from "@/lib/format-date";
import PendingButton from "@/components/ui/PendingButton";
import {
  toggleProjectVisibilityAction,
  softDeleteProjectAction,
  restoreProjectAction,
  permanentlyDeleteProjectAction,
  createProjectAction,
  duplicateProjectAction,
  moveProjectOrderAction
} from "./actions";

const PAGE_SIZE = 20;
// "Draft Changes" detection requires diffing ~30 fields (including long-form
// Text/Json columns) between the draft and published version — not something
// that can be expressed as a Prisma `where` clause, so it can't be paginated
// at the database boundary like the other filter tabs. We instead scan a
// capped window (large enough to cover realistic project counts) and paginate
// the filtered result in memory. All other tabs paginate normally.
const DRAFT_FILTER_SCAN_LIMIT = 500;

interface PageProps {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    category?: string;
    status?: string;
    tech?: string;
    page?: string;
  }>;
}

/**
 * Protected content for this route.
 *
 * Authorization runs FIRST, before any protected read. That ordering is the
 * security mechanism; the Suspense boundary below exists only to satisfy
 * cacheComponents, which rejects uncached data accessed outside a boundary.
 */
async function ProtectedContent(props: PageProps) {
  await requireAdmin(await currentPathname());

  const params = await props.searchParams;
  const q = params.q || "";
  const filter = params.filter || "all";
  const categoryFilter = params.category || "";
  const statusFilter = params.status || "";
  const techFilter = params.tech || "";
  const rawPage = parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  // Search, filtering, pagination and each row's draft-vs-published change
  // state now live in ProjectService.listAdminPage. The change-state diff in
  // particular was a hand-written field list here that had drifted from
  // PROMOTED_FIELDS by five columns — see publish-diff.service.projectChangeState.
  const [
    { totalCount, totalPages, items: filteredProjects },
    allTechs,
  ] = await Promise.all([
    ProjectService.listAdminPage({
      page,
      pageSize: PAGE_SIZE,
      q,
      filter,
      category: categoryFilter,
      status: statusFilter,
      tech: techFilter,
      scanLimit: DRAFT_FILTER_SCAN_LIMIT,
    }),
    TechnologyService.listForPicker(),
  ]);

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
  async function handleMove(id: string, direction: "up" | "down") {
    "use server";
    await moveProjectOrderAction(id, direction);
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
          <PendingButton variant="icon"
            
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
          >
            <Plus size={14} />
            Create Project
          </PendingButton>
        </form>
      </div>

      {/* Filters Bar */}
      <div className="p-4 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)]">
        <form method="GET" className="grid gap-4 sm:grid-cols-5">
          {/* Search */}
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-2.5 text-[var(--a-faint)]" size={14} />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by title..."
              className="w-full pl-9 pr-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
            />
          </div>

          {/* Category */}
          <div>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
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
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
            >
              <option value="">All Statuses</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              {/* MAINTAINED and ARCHIVED were offered here but are not members of
                  the ProjectStatus enum (COMPLETED | IN_PROGRESS | PLANNED), so
                  selecting either sent an invalid value into the where clause. */}
            </select>
          </div>

          {/* Tech */}
          <div>
            <select
              name="tech"
              defaultValue={techFilter}
              className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
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

          {/* Invisible submit so Enter submits this GET filter form */}
          <button type="submit" className="hidden" />
        </form>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-solid border-[var(--a-line)] text-[11px] font-semibold text-[var(--a-faint)]">
          <Link
            href={`/admin/projects?filter=all&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "all" ? "bg-[var(--a-primary)] text-white" : "hover:bg-[var(--a-inset)]"
            }`}
          >
            All
          </Link>
          <Link
            href={`/admin/projects?filter=published&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "published" ? "bg-[var(--a-primary)] text-white" : "hover:bg-[var(--a-inset)]"
            }`}
          >
            Published
          </Link>
          <Link
            href={`/admin/projects?filter=draft&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "draft" ? "bg-[var(--a-primary)] text-white" : "hover:bg-[var(--a-inset)]"
            }`}
          >
            Draft Changes
          </Link>
          <Link
            href={`/admin/projects?filter=featured&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "featured" ? "bg-[var(--a-primary)] text-white" : "hover:bg-[var(--a-inset)]"
            }`}
          >
            Featured
          </Link>
          <Link
            href={`/admin/projects?filter=hidden&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "hidden" ? "bg-[var(--a-primary)] text-white" : "hover:bg-[var(--a-inset)]"
            }`}
          >
            Hidden
          </Link>
          {/* No "Archived" tab: ProjectStatus has no ARCHIVED member, so the
              filter could never match anything. Use Trash Bin for soft-deleted. */}
          <Link
            href={`/admin/projects?filter=trash&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}`}
            className={`px-3 py-1 rounded-[var(--a-r-sm)] transition-colors ${
              filter === "trash" ? "bg-[var(--a-primary)] text-white" : "hover:bg-[var(--a-inset)]"
            }`}
          >
            Trash Bin
          </Link>
        </div>
      </div>

      {/* Projects List Card Container */}
      <div className="border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
        <div className="p-4 border-b border-solid border-[var(--a-line)] bg-[var(--a-inset)] flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
          <Briefcase size={14} />
          <span>PROJECTS REGISTRY ({totalCount})</span>
        </div>

        <div className="divide-y divide-solid divide-[var(--a-line)]">
          {filteredProjects.map((proj, idx) => {
            const draft = proj.draft;
            if (!draft) return null;
            const isFirstOnPage = page === 1 && idx === 0;
            const isLastOnPage = page === totalPages && idx === filteredProjects.length - 1;

            return (
              <div key={proj.id} className="p-5 hover:bg-[var(--a-inset)]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info block */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[var(--a-ink)]">{draft.title}</span>
                    {proj.published && proj.published.title !== draft.title && (
                      <span className="text-[10px] text-[var(--a-warn-ink)] bg-[var(--a-warn-bg)] px-1.5 py-0.5 rounded border border-solid border-[var(--a-warn-ink)]/20">
                        Live: {proj.published.title}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-[var(--a-faint)] uppercase bg-[var(--a-inset)] px-2 py-0.5 rounded">
                      {draft.category}
                    </span>
                    <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                      {draft.status}
                    </span>

                    {/* Change Indicator */}
                    {proj.changeState === "DRAFT_ONLY" && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[var(--a-warn-bg)] text-[var(--a-warn-ink)] uppercase tracking-wide">
                        Draft Only
                      </span>
                    )}
                    {proj.changeState === "DRAFT_CHANGES" && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                        Draft Changes Pending
                      </span>
                    )}
                    {proj.changeState === "SYNC" && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[var(--a-success-bg)] text-[var(--a-success-ink)] uppercase tracking-wide">
                        In Sync
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--a-soft)] max-w-lg truncate">{draft.summary}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-[var(--a-faint)]">
                    <span>Slug: /{proj.slug}</span>
                    <span>Order: {draft.manualOrder}</span>
                    <span>Technologies: {proj._count.technologies}</span>
                    <span>Gallery: {proj._count.images}</span>
                    {draft.featured && (
                      <span className="flex items-center gap-0.5 text-[var(--a-warn-ink)] font-bold">
                        <Star size={10} fill="currentColor" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] text-[var(--a-faint)] flex gap-4 pt-1">
                    <span>Modified: {formatDateTime(proj.updatedAt)}</span>
                    {proj.published?.publishedAt && (
                      <span>Published: {formatDateTime(proj.published.publishedAt)}</span>
                    )}
                  </div>
                </div>

                {/* Operations */}
                <div className="flex items-center gap-2.5 self-end md:self-auto">
                  {/* manual order shift */}
                  {filter !== "trash" && (
                    <div className="flex flex-col gap-0.5">
                      <form action={handleMove.bind(null, proj.id, "up")}>
                        <PendingButton
                          variant="icon"
                          disabled={isFirstOnPage}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowUp size={12} />
                        </PendingButton>
                      </form>
                      <form action={handleMove.bind(null, proj.id, "down")}>
                        <PendingButton variant="icon"
                          
                          disabled={isLastOnPage}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowDown size={12} />
                        </PendingButton>
                      </form>
                    </div>
                  )}

                  {filter !== "trash" ? (
                    <>
                      {/* Visibility Toggle */}
                      <form action={handleToggleVisibility.bind(null, proj.id, draft.visible)}>
                        <PendingButton variant="icon"
                          
                          className="p-2 hover:bg-[var(--a-inset)] text-[var(--a-soft)] rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent"
                          title={draft.visible ? "Hide project draft" : "Show project draft"}
                        >
                          {draft.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-[var(--a-danger-ink)]" />}
                        </PendingButton>
                      </form>

                      {/* Duplicate */}
                      <form action={handleDuplicate.bind(null, proj.id)}>
                        <PendingButton variant="icon"
                          
                          className="p-2 hover:bg-[var(--a-inset)] text-[var(--a-soft)] rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent"
                          title="Duplicate project draft configuration"
                        >
                          <Copy size={14} />
                        </PendingButton>
                      </form>

                      {/* Edit */}
                      <Link
                        href={`/admin/projects/${proj.id}/edit`}
                        className="p-2 hover:bg-[var(--a-inset)] text-[var(--a-soft)] rounded-[var(--a-r-sm)] border border-solid border-transparent bg-transparent block"
                        title="Edit detailed case study"
                      >
                        <Edit size={14} />
                      </Link>

                      {/* Soft Delete */}
                      <form action={handleSoftDelete.bind(null, proj.id)}>
                        <PendingButton variant="icon"
                          
                          className="p-2 hover:bg-[var(--a-danger-bg)] text-[var(--a-danger-ink)] rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent"
                          title="Move project to trash"
                        >
                          <Trash2 size={14} />
                        </PendingButton>
                      </form>
                    </>
                  ) : (
                    <>
                      {/* Restore */}
                      <form action={handleRestore.bind(null, proj.id)}>
                        <PendingButton variant="icon"
                          
                          className="px-3 py-1 bg-[var(--a-success)] hover:opacity-90 text-white text-[10px] font-bold rounded cursor-pointer border-none"
                        >
                          Restore
                        </PendingButton>
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
                        <PendingButton variant="icon"
                          
                          className="p-2 hover:bg-[var(--a-danger-bg)] text-[var(--a-danger-ink)] rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent"
                          title="Permanently delete project"
                        >
                          <Trash2 size={14} />
                        </PendingButton>
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

        <div className="px-4 pb-4">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            buildHref={(p) => `/admin/projects?filter=${filter}&q=${q}&category=${categoryFilter}&status=${statusFilter}&tech=${techFilter}&page=${p}`}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminProjectsPage(props: PageProps) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <ProtectedContent {...props} />
    </Suspense>
  );
}
