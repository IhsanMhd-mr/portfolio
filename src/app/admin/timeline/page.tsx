import db from "@/lib/database";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Milestone, Trash2, Save, Eye, EyeOff, ArrowUp, ArrowDown, Edit } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import PendingButton from "@/components/ui/PendingButton";
import {
  createTimelineEntryAction,
  updateTimelineEntryAction,
  deleteTimelineEntryAction,
  moveTimelineEntryOrderAction,
} from "./actions";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));
const AddItemModal = dynamic(() => import("@/components/admin/AddItemModal"));

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminTimelinePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  // Query TimelineEntryVersion (DRAFT) directly so `order` can be sorted/paginated
  // at the database boundary — Prisma can't orderBy a to-many relation's field
  // on the parent TimelineEntry model.
  const [total, draftVersions, projects] = await Promise.all([
    db.timelineEntryVersion.count({ where: { state: "DRAFT" } }),
    db.timelineEntryVersion.findMany({
      where: { state: "DRAFT" },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        image: { select: { url: true } },
        timelineEntry: {
          include: {
            linkedProject: {
              include: {
                versions: { where: { state: "DRAFT" }, take: 1 },
              },
            },
          },
        },
      },
    }),
    db.project.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
      orderBy: { slug: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const entries = draftVersions.map((draft) => {
    const entry = draft.timelineEntry;
    const projectTitle = entry.linkedProject?.versions[0]?.title || entry.linkedProject?.slug || "";
    return {
      id: entry.id,
      draft,
      projectTitle,
    };
  });

  async function handleCreateMilestone(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const entryType = formData.get("entryType") as any;
    const startDateInput = formData.get("startDate") as string;
    const description = formData.get("description") as string;
    const linkedProjectId = formData.get("linkedProjectId") as string || null;
    const imageId = formData.get("imageId") as string || null;

    if (!title || !startDateInput) return;

    await createTimelineEntryAction({
      title,
      entryType,
      startDate: new Date(startDateInput),
      description,
      linkedProjectId,
      imageId,
      visible: true,
    });
  }

  async function handleToggleVisibility(id: string, currentVisible: boolean) {
    "use server";
    await updateTimelineEntryAction(id, { visible: !currentVisible });
  }

  async function handleDeleteEntry(id: string) {
    "use server";
    await deleteTimelineEntryAction(id);
  }

  async function handleMove(id: string, direction: "up" | "down") {
    "use server";
    await moveTimelineEntryOrderAction(id, direction);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Timeline Manager</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5 font-sans">
          List your chronological career roadmap, product launches, academic credentials, and link them to projects.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left List Grid */}
        <div className="lg:col-span-8 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-[var(--a-inset)] flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <Milestone size={14} />
            <span>TIMELINE EVENTS ({total})</span>
          </div>

          <div className="divide-y divide-solid divide-[var(--a-line)] text-xs">
            {entries.map((entry, idx) => {
              const draft = entry.draft;
              const isFirstOnPage = page === 1 && idx === 0;
              const isLastOnPage = page === totalPages && idx === entries.length - 1;

              return (
                <div key={entry.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--a-inset)]/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-[var(--a-inset)] border border-solid border-[var(--a-line)] overflow-hidden flex items-center justify-center flex-shrink-0">
                      {draft.image ? (
                        <img src={draft.image.url} alt={draft.title} className="w-full h-full object-contain" />
                      ) : (
                        <Milestone size={14} className="text-[var(--a-faint)]" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--a-ink)]">{draft.title}</span>
                        <span className="bg-[var(--a-inset)] text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 rounded text-[var(--a-faint)]">
                          {draft.entryType}
                        </span>
                      </div>
                      {draft.description && (
                        <p className="text-[var(--a-soft)] max-w-sm line-clamp-1">{draft.description}</p>
                      )}
                      <p className="text-[10px] text-[var(--a-faint)]">
                        Date: {new Date(draft.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        {entry.projectTitle && ` · Linked Project: ${entry.projectTitle}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Shift order */}
                    <div className="flex items-center gap-0.5">
                      <form action={handleMove.bind(null, entry.id, "up")}>
                        <PendingButton variant="icon"
                          
                          disabled={isFirstOnPage}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowUp size={12} />
                        </PendingButton>
                      </form>
                      <form action={handleMove.bind(null, entry.id, "down")}>
                        <PendingButton variant="icon"
                          
                          disabled={isLastOnPage}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowDown size={12} />
                        </PendingButton>
                      </form>
                    </div>

                    {/* Edit */}
                    <Link
                      href={`/admin/timeline/${entry.id}/edit`}
                      className="p-1.5 hover:bg-[var(--a-inset)] rounded text-[var(--a-soft)] block"
                      title="Edit timeline entry"
                    >
                      <Edit size={14} />
                    </Link>

                    {/* Visibility */}
                    <form action={handleToggleVisibility.bind(null, entry.id, draft.visible)}>
                      <PendingButton variant="icon"
                        
                        className="p-1.5 hover:bg-[var(--a-inset)] rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                      >
                        {draft.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-[var(--a-danger-ink)]" />}
                      </PendingButton>
                    </form>

                    {/* Delete */}
                    <form action={handleDeleteEntry.bind(null, entry.id)}>
                      <PendingButton variant="icon"
                        
                        className="p-1.5 hover:bg-[var(--a-danger-bg)] text-[var(--a-danger-ink)] rounded cursor-pointer border-none bg-transparent"
                      >
                        <Trash2 size={14} />
                      </PendingButton>
                    </form>
                  </div>
                </div>
              );
            })}

            {entries.length === 0 && (
              <p className="text-center py-12 text-[var(--a-faint)] font-mono">// NO TIMELINE EVENTS SEEDED</p>
            )}
          </div>

          <div className="px-4 pb-4">
            <Pagination currentPage={page} totalPages={totalPages} buildHref={(p) => `/admin/timeline?page=${p}`} />
          </div>
        </div>

        {/* Right Quick Add */}
        <div className="lg:col-span-4">
          <AddItemModal triggerLabel="Add Milestone" title="Add Milestone">
          <form action={handleCreateMilestone} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Title</label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Launched Beta, Internship"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Entry Type</label>
              <select
                name="entryType"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="PROJECT">Project Launch</option>
                <option value="ACADEMIC">Academic Milestone</option>
                <option value="MILESTONE">Career Milestone</option>
                <option value="PERSONAL">Personal Milestone</option>
                <option value="RELEASE">Release</option>
                <option value="ACHIEVEMENT">Achievement</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Start Date</label>
              <input
                type="date"
                name="startDate"
                required
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Linked Project</label>
              <select
                name="linkedProjectId"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="">None</option>
                {projects.map((proj) => {
                  const title = proj.versions.find((v) => v.state === "DRAFT")?.title || proj.slug;
                  return (
                    <option key={proj.id} value={proj.id}>
                      {title}
                    </option>
                  );
                })}
              </select>
            </div>

            <MediaPickerModal name="imageId" label="Milestone Icon Asset" mode="single" />

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Short Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Description of the milestone..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
              />
            </div>

            <PendingButton variant="icon"
              
              className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
            >
              <Save size={14} />
              Add Timeline Event
            </PendingButton>
          </form>
          </AddItemModal>
        </div>
      </div>
    </div>
  );
}
