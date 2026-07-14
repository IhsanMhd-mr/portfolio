import db from "@/lib/database";
import { revalidatePath } from "next/cache";
import { Milestone, Plus, Trash2, Save, Eye, EyeOff } from "lucide-react";

export default async function AdminTimelinePage() {
  const [entries, projects] = await Promise.all([
    db.timelineEntry.findMany({
      where: { deletedAt: null },
      include: { linkedProject: true },
      orderBy: { order: "asc" },
    }),
    db.project.findMany({
      where: { deletedAt: null },
      orderBy: { title: "asc" },
    }),
  ]);

  // Create new milestone entry
  async function createMilestone(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const entryType = formData.get("entryType") as any;
    const startDateInput = formData.get("startDate") as string;
    const description = formData.get("description") as string;
    const linkedProjectId = formData.get("linkedProjectId") as string;

    if (!title || !startDateInput) return;
    const count = await db.timelineEntry.count({ where: { deletedAt: null } });

    await db.timelineEntry.create({
      data: {
        title,
        entryType: entryType || "PROJECT",
        startDate: new Date(startDateInput),
        description,
        linkedProjectId: linkedProjectId || null,
        visible: true,
        order: count + 1,
      },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/timeline");
  }

  // Toggle visibility of entry
  async function toggleVisibility(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const currentVisible = formData.get("value") === "true";

    await db.timelineEntry.update({
      where: { id },
      data: { visible: !currentVisible },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/timeline");
  }

  // Delete timeline entry
  async function deleteEntry(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await db.timelineEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/timeline");
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
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-slate-50 flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <Milestone size={14} />
            <span>TIMELINE EVENTS ({entries.length})</span>
          </div>

          <div className="divide-y divide-solid divide-[var(--a-line)] text-xs">
            {entries.map((entry) => (
              <div key={entry.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--a-ink)]">{entry.title}</span>
                    <span className="bg-slate-100 text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 rounded text-[var(--a-faint)]">
                      {entry.entryType}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-[var(--a-soft)] mt-1 max-w-sm line-clamp-1">{entry.description}</p>
                  )}
                  <p className="text-[10px] text-[var(--a-faint)] mt-1">
                    Date: {entry.startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    {entry.linkedProject && ` · Linked: ${entry.linkedProject.title}`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Visibility */}
                  <form action={toggleVisibility}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="value" value={String(entry.visible)} />
                    <button
                      type="submit"
                      className="p-1.5 hover:bg-slate-100 rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                    >
                      {entry.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                    </button>
                  </form>

                  {/* Delete */}
                  <form action={deleteEntry}>
                    <input type="hidden" name="id" value={entry.id} />
                    <button
                      type="submit"
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded cursor-pointer border-none bg-transparent"
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </div>
            ))}

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

          <form action={createMilestone} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Title</label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Launched Beta, Internship"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Entry Type</label>
              <select
                name="entryType"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-white focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="PROJECT">Project Launch</option>
                <option value="ACADEMIC">Academic Milestone</option>
                <option value="MILESTONE">Career Milestone</option>
                <option value="PERSONAL">Personal Milestone</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Start Date</label>
              <input
                type="date"
                name="startDate"
                required
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Linked Project</label>
              <select
                name="linkedProjectId"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-white focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="">None</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Short Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Description of the milestone..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
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
