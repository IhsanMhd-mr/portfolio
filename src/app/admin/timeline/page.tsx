import db from "@/lib/database";
import { Milestone, Plus, Trash2, Save, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { 
  createTimelineEntryAction, 
  updateTimelineEntryAction, 
  deleteTimelineEntryAction, 
  reorderTimelineEntriesAction 
} from "./actions";

export default async function AdminTimelinePage() {
  const [entriesRaw, projects, allMedia] = await Promise.all([
    db.timelineEntry.findMany({
      where: { deletedAt: null },
      include: {
        versions: true,
        linkedProject: {
          include: {
            versions: { where: { state: "DRAFT" }, take: 1 },
          },
        },
      },
    }),
    db.project.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
      orderBy: { slug: "asc" },
    }),
    db.mediaAsset.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Resolve draft details
  const entries = entriesRaw.map((entry) => {
    const draft = entry.versions.find((v) => v.state === "DRAFT");
    const published = entry.versions.find((v) => v.state === "PUBLISHED");
    const projectTitle = entry.linkedProject?.versions[0]?.title || entry.linkedProject?.slug || "";

    return {
      ...entry,
      draft,
      published,
      projectTitle,
    };
  });

  // Sort by manualOrder of draft versions
  entries.sort((a, b) => (a.draft?.order || 0) - (b.draft?.order || 0));

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

  async function handleMoveUp(index: number) {
    "use server";
    if (index === 0) return;
    const ids = entries.map((e) => e.id);
    const temp = ids[index];
    ids[index] = ids[index - 1];
    ids[index - 1] = temp;
    await reorderTimelineEntriesAction(ids);
  }

  async function handleMoveDown(index: number) {
    "use server";
    if (index === entries.length - 1) return;
    const ids = entries.map((e) => e.id);
    const temp = ids[index];
    ids[index] = ids[index + 1];
    ids[index + 1] = temp;
    await reorderTimelineEntriesAction(ids);
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
            <span>TIMELINE EVENTS ({entries.length})</span>
          </div>

          <div className="divide-y divide-solid divide-[var(--a-line)] text-xs">
            {entries.map((entry, idx) => {
              const draft = entry.draft;
              if (!draft) return null;

              // Logo preview
              const logoAsset = allMedia.find((m) => m.id === draft.imageId);

              return (
                <div key={entry.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--a-inset)]/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-[var(--a-inset)] border border-solid border-[var(--a-line)] overflow-hidden flex items-center justify-center flex-shrink-0">
                      {logoAsset ? (
                        <img src={logoAsset.url} alt={draft.title} className="w-full h-full object-contain" />
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
                      <form action={handleMoveUp.bind(null, idx)}>
                        <button
                          type="submit"
                          disabled={idx === 0}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowUp size={12} />
                        </button>
                      </form>
                      <form action={handleMoveDown.bind(null, idx)}>
                        <button
                          type="submit"
                          disabled={idx === entries.length - 1}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </form>
                    </div>

                    {/* Visibility */}
                    <form action={handleToggleVisibility.bind(null, entry.id, draft.visible)}>
                      <button
                        type="submit"
                        className="p-1.5 hover:bg-[var(--a-inset)] rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                      >
                        {draft.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-[var(--a-danger-ink)]" />}
                      </button>
                    </form>

                    {/* Delete */}
                    <form action={handleDeleteEntry.bind(null, entry.id)}>
                      <button
                        type="submit"
                        className="p-1.5 hover:bg-[var(--a-danger-bg)] text-[var(--a-danger-ink)] rounded cursor-pointer border-none bg-transparent"
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}

            {entries.length === 0 && (
              <p className="text-center py-12 text-[var(--a-faint)] font-mono">// NO TIMELINE EVENTS SEEDED</p>
            )}
          </div>
        </div>

        {/* Right Quick Add Form */}
        <div className="lg:col-span-4 p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Plus size={16} className="text-[var(--a-primary)]" />
            Add Milestone
          </h3>

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

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Milestone Icon Asset</label>
              <select
                name="imageId"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="">-- No Icon Selected --</option>
                {allMedia.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.filename}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Short Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Description of the milestone..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
            >
              <Save size={14} />
              Add Timeline Event
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
