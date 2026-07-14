import db from "@/lib/database";
import { revalidatePath } from "next/cache";
import { GraduationCap, Plus, Trash2, Save, Eye, EyeOff } from "lucide-react";

export default async function AdminEducationPage() {
  const education = await db.education.findMany({
    where: { deletedAt: null },
    orderBy: { order: "asc" },
  });

  // Create new education qualification
  async function createEducation(formData: FormData) {
    "use server";
    const institution = formData.get("institution") as string;
    const qualification = formData.get("qualification") as string;
    const startDateInput = formData.get("startDate") as string;
    const grade = formData.get("grade") as string;
    const description = formData.get("description") as string;

    if (!institution || !qualification || !startDateInput) return;
    const count = await db.education.count({ where: { deletedAt: null } });

    await db.education.create({
      data: {
        institution,
        qualification,
        startDate: new Date(startDateInput),
        grade,
        description,
        visible: true,
        order: count + 1,
      },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/education");
  }

  // Toggle visible status
  async function toggleVisibility(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const currentVisible = formData.get("value") === "true";

    await db.education.update({
      where: { id },
      data: { visible: !currentVisible },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/education");
  }

  // Delete education entry
  async function deleteEducation(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await db.education.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/education");
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Education Registry</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5 font-sans">
          Manage your academic degrees, training workshops, and institutions.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left List Grid */}
        <div className="lg:col-span-8 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-slate-50 flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <GraduationCap size={14} />
            <span>QUALIFICATIONS ({education.length})</span>
          </div>

          <div className="divide-y divide-solid divide-[var(--a-line)] text-xs">
            {education.map((edu) => (
              <div key={edu.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30">
                <div>
                  <h3 className="font-bold text-sm text-[var(--a-ink)]">{edu.qualification}</h3>
                  <p className="text-xs text-[var(--a-primary)] font-medium mt-0.5">{edu.institution}</p>
                  {edu.grade && (
                    <span className="inline-block bg-slate-100 text-[9px] font-mono px-2 py-0.5 rounded text-[var(--a-soft)] mt-1">
                      Grade: {edu.grade}
                    </span>
                  )}
                  <p className="text-[10px] text-[var(--a-faint)] mt-1">
                    Enrolled: {edu.startDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Visibility */}
                  <form action={toggleVisibility}>
                    <input type="hidden" name="id" value={edu.id} />
                    <input type="hidden" name="value" value={String(edu.visible)} />
                    <button
                      type="submit"
                      className="p-1.5 hover:bg-slate-100 rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                    >
                      {edu.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                    </button>
                  </form>

                  {/* Delete */}
                  <form action={deleteEducation}>
                    <input type="hidden" name="id" value={edu.id} />
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

            {education.length === 0 && (
              <p className="text-center py-12 text-[var(--a-faint)] font-mono">// NO QUALIFICATIONS SEEDED</p>
            )}
          </div>
        </div>

        {/* Right Quick Add Form */}
        <div className="lg:col-span-4 p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Plus size={16} className="text-[var(--a-primary)]" />
            Add Qualification
          </h3>

          <form action={createEducation} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Institution</label>
              <input
                type="text"
                name="institution"
                required
                placeholder="e.g. Stanford University"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Qualification</label>
              <input
                type="text"
                name="qualification"
                required
                placeholder="e.g. B.Sc. in Computer Science"
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
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">GPA / Grade</label>
                <input
                  type="text"
                  name="grade"
                  placeholder="e.g. First Class, 3.8"
                  className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Short Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Courses, honors, extra curriculars..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
            >
              <Save size={14} />
              Add Qualification
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
