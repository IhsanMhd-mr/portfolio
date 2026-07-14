import db from "@/lib/database";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Briefcase, Plus, Trash2, Eye, EyeOff, Check, Edit, FileCode } from "lucide-react";

export default async function AdminProjectsPage() {
  const projects = await db.project.findMany({
    where: { deletedAt: null },
    orderBy: { manualOrder: "asc" },
  });

  // Toggle publish state
  async function togglePublishState(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const currentState = formData.get("publishState") as string;
    
    await db.project.update({
      where: { id },
      data: { publishState: currentState === "PUBLISHED" ? "DRAFT" : "PUBLISHED" },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/projects");
  }

  // Toggle visibility
  async function toggleVisibility(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const currentVisible = formData.get("visible") === "true";

    await db.project.update({
      where: { id },
      data: { visible: !currentVisible },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/projects");
  }

  // Delete project
  async function deleteProject(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    
    await db.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/projects");
  }

  // Create new project placeholder with defaults
  async function createProject() {
    "use server";
    const count = await db.project.count({ where: { deletedAt: null } });
    const slug = `new-project-${Date.now()}`;
    await db.project.create({
      data: {
        title: `Project #${count + 1}`,
        slug,
        summary: "This is a brief summary of the project work.",
        category: "WEB",
        status: "IN_PROGRESS",
        publishState: "DRAFT",
        visible: true,
        manualOrder: count + 1,
      },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/projects");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Projects Registry</h1>
          <p className="text-sm text-[var(--a-soft)] mt-1.5">
            Manage your case studies, project details, visual orders, and categories.
          </p>
        </div>

        <form action={createProject}>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
          >
            <Plus size={14} />
            Create Project
          </button>
        </form>
      </div>

      {/* Projects List */}
      <div className="border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
        <div className="p-4 border-b border-solid border-[var(--a-line)] bg-slate-50 flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
          <Briefcase size={14} />
          <span>PROJECTS LIST ({projects.length})</span>
        </div>

        <div className="divide-y divide-solid divide-[var(--a-line)]">
          {projects.map((proj) => {
            const isPublished = proj.publishState === "PUBLISHED";
            return (
              <div key={proj.id} className="p-5 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Title and Category */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--a-ink)]">{proj.title}</span>
                    <span className="text-[9px] font-mono text-[var(--a-faint)] uppercase bg-slate-100 px-2 py-0.5 rounded">
                      {proj.category}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--a-soft)] truncate max-w-lg">{proj.summary}</p>
                  <p className="text-[10px] font-mono text-[var(--a-faint)]">Slug: /{proj.slug}</p>
                </div>

                {/* Controls and States */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Publish state switch */}
                  <form action={togglePublishState}>
                    <input type="hidden" name="id" value={proj.id} />
                    <input type="hidden" name="publishState" value={proj.publishState} />
                    <button
                      type="submit"
                      className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full cursor-pointer border border-solid transition-colors ${
                        isPublished
                          ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                      }`}
                    >
                      {proj.publishState}
                    </button>
                  </form>

                  {/* Visibility toggle */}
                  <form action={toggleVisibility}>
                    <input type="hidden" name="id" value={proj.id} />
                    <input type="hidden" name="visible" value={String(proj.visible)} />
                    <button
                      type="submit"
                      className="p-2 hover:bg-slate-100 text-[var(--a-soft)] rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent"
                    >
                      {proj.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                    </button>
                  </form>

                  {/* Edit Case study */}
                  <Link 
                    href={`/admin/projects/${proj.id}/edit`}
                    className="p-2 hover:bg-slate-100 text-[var(--a-soft)] rounded-[var(--a-r-sm)] border-none bg-transparent block"
                    title="Edit Case Study details"
                  >
                    <Edit size={14} />
                  </Link>

                  {/* Delete project */}
                  <form action={deleteProject}>
                    <input type="hidden" name="id" value={proj.id} />
                    <button
                      type="submit"
                      className="p-2 hover:bg-red-50 text-red-500 rounded-[var(--a-r-sm)] cursor-pointer border-none bg-transparent"
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="text-center py-20 text-xs font-mono text-[var(--a-faint)]">// NO PROJECTS ADDED</div>
          )}
        </div>
      </div>
    </div>
  );
}
