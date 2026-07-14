import db from "@/lib/database";
import { revalidatePath } from "next/cache";
import { Briefcase, Plus, Trash2, Save, Eye, EyeOff } from "lucide-react";

export default async function AdminExperiencePage() {
  const experiences = await db.experience.findMany({
    where: { deletedAt: null },
    orderBy: { order: "asc" },
  });

  // Create new experience qualification
  async function createExperience(formData: FormData) {
    "use server";
    const organization = formData.get("organization") as string;
    const role = formData.get("role") as string;
    const startDateInput = formData.get("startDate") as string;
    const locationText = formData.get("locationText") as string;
    const description = formData.get("description") as string;

    if (!organization || !role || !startDateInput) return;
    const count = await db.experience.count({ where: { deletedAt: null } });

    await db.experience.create({
      data: {
        organization,
        role,
        startDate: new Date(startDateInput),
        locationText,
        description,
        visible: true,
        order: count + 1,
      },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/experience");
  }

  // Toggle visible status
  async function toggleVisibility(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const currentVisible = formData.get("value") === "true";

    await db.experience.update({
      where: { id },
      data: { visible: !currentVisible },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/experience");
  }

  // Delete experience entry
  async function deleteExperience(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await db.experience.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/experience");
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Experience Manager</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5 font-sans">
          Manage your professional employment history, roles, organizations, and details.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left List Grid */}
        <div className="lg:col-span-8 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-slate-50 flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <Briefcase size={14} />
            <span>EMPLOYERS LIST ({experiences.length})</span>
          </div>

          <div className="divide-y divide-solid divide-[var(--a-line)] text-xs">
            {experiences.map((exp) => (
              <div key={exp.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30">
                <div>
                  <h3 className="font-bold text-sm text-[var(--a-ink)]">{exp.role}</h3>
                  <p className="text-xs text-[var(--a-primary)] font-medium mt-0.5">{exp.organization}</p>
                  {exp.locationText && (
                    <p className="text-[10px] text-[var(--a-soft)] mt-0.5">Location: {exp.locationText}</p>
                  )}
                  <p className="text-[10px] text-[var(--a-faint)] mt-1">
                    Started: {exp.startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Visibility */}
                  <form action={toggleVisibility}>
                    <input type="hidden" name="id" value={exp.id} />
                    <input type="hidden" name="value" value={String(exp.visible)} />
                    <button
                      type="submit"
                      className="p-1.5 hover:bg-slate-100 rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                    >
                      {exp.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                    </button>
                  </form>

                  {/* Delete */}
                  <form action={deleteExperience}>
                    <input type="hidden" name="id" value={exp.id} />
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

            {experiences.length === 0 && (
              <p className="text-center py-12 text-[var(--a-faint)] font-mono">// NO EXPERIENCE ENTRIES SEEDED</p>
            )}
          </div>
        </div>

        {/* Right Quick Add Form */}
        <div className="lg:col-span-4 p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Plus size={16} className="text-[var(--a-primary)]" />
            Add Experience
          </h3>

          <form action={createExperience} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Organization</label>
              <input
                type="text"
                name="organization"
                required
                placeholder="e.g. Acme Corporation"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Role</label>
              <input
                type="text"
                name="role"
                required
                placeholder="e.g. Software Engineer Intern"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Location</label>
                <input
                  type="text"
                  name="locationText"
                  placeholder="e.g. London, Remote"
                  className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Description / Responsibilities</label>
              <textarea
                name="description"
                rows={4}
                placeholder="Developed features, led stack, optimized page speeds by 40%..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
            >
              <Save size={14} />
              Add Experience
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
