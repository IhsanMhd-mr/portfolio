import db from "@/lib/database";
import { revalidatePath } from "next/cache";
import { GraduationCap, Plus, Trash2, Save, Eye, EyeOff, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import { 
  createEducationAction, 
  updateEducationAction, 
  deleteEducationAction, 
  reorderEducationAction 
} from "./actions";

export default async function AdminEducationPage() {
  const [educationRaw, allMedia] = await Promise.all([
    db.education.findMany({
      where: { deletedAt: null },
      include: { versions: true },
    }),
    db.mediaAsset.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Resolve draft versions
  const education = educationRaw.map((edu) => {
    const draft = edu.versions.find((v) => v.state === "DRAFT");
    const published = edu.versions.find((v) => v.state === "PUBLISHED");
    return {
      ...edu,
      draft,
      published,
    };
  });

  // Sort by manualOrder of draft versions
  education.sort((a, b) => (a.draft?.order || 0) - (b.draft?.order || 0));

  async function handleCreateEducation(formData: FormData) {
    "use server";
    const institution = formData.get("institution") as string;
    const qualification = formData.get("qualification") as string;
    const startDateInput = formData.get("startDate") as string;
    const grade = formData.get("grade") as string;
    const description = formData.get("description") as string;
    const logoId = formData.get("logoId") as string || null;

    if (!institution || !qualification || !startDateInput) return;

    await createEducationAction({
      institution,
      qualification,
      startDate: new Date(startDateInput),
      grade,
      description,
      logoId,
      visible: true,
    });
  }

  async function handleToggleVisibility(id: string, currentVisible: boolean) {
    "use server";
    await updateEducationAction(id, { visible: !currentVisible });
  }

  async function handleDelete(id: string) {
    "use server";
    await deleteEducationAction(id);
  }

  async function handleMoveUp(index: number) {
    "use server";
    if (index === 0) return;
    const ids = education.map((e) => e.id);
    const temp = ids[index];
    ids[index] = ids[index - 1];
    ids[index - 1] = temp;
    await reorderEducationAction(ids);
  }

  async function handleMoveDown(index: number) {
    "use server";
    if (index === education.length - 1) return;
    const ids = education.map((e) => e.id);
    const temp = ids[index];
    ids[index] = ids[index + 1];
    ids[index + 1] = temp;
    await reorderEducationAction(ids);
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
            {education.map((edu, idx) => {
              const draft = edu.draft;
              if (!draft) return null;

              // Find logo
              const logoAsset = allMedia.find((m) => m.id === draft.logoId);

              return (
                <div key={edu.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30">
                  <div className="flex items-start gap-3">
                    {/* Logo Display */}
                    <div className="w-8 h-8 rounded bg-slate-100 border border-solid border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {logoAsset ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoAsset.url} alt={draft.institution} className="w-full h-full object-contain" />
                      ) : (
                        <GraduationCap size={14} className="text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h3 className="font-bold text-sm text-[var(--a-ink)]">{draft.qualification}</h3>
                      <p className="text-xs text-[var(--a-primary)] font-medium mt-0.5">{draft.institution}</p>
                      {draft.grade && (
                        <span className="inline-block bg-slate-100 text-[9px] font-mono px-2 py-0.5 rounded text-[var(--a-soft)] mt-1">
                          Grade: {draft.grade}
                        </span>
                      )}
                      <p className="text-[10px] text-[var(--a-faint)] mt-1">
                        Enrolled: {new Date(draft.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
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
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowUp size={12} />
                        </button>
                      </form>
                      <form action={handleMoveDown.bind(null, idx)}>
                        <button
                          type="submit"
                          disabled={idx === education.length - 1}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </form>
                    </div>

                    {/* Visibility */}
                    <form action={handleToggleVisibility.bind(null, edu.id, draft.visible)}>
                      <button
                        type="submit"
                        className="p-1.5 hover:bg-slate-100 rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                      >
                        {draft.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                      </button>
                    </form>

                    {/* Delete */}
                    <form action={handleDelete.bind(null, edu.id)}>
                      <button
                        type="submit"
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded cursor-pointer border-none bg-transparent"
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}

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

          <form action={handleCreateEducation} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Institution</label>
              <input
                type="text"
                name="institution"
                required
                placeholder="e.g. Stanford University"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Qualification</label>
              <input
                type="text"
                name="qualification"
                required
                placeholder="e.g. B.Sc. in Computer Science"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  required
                  className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">GPA / Grade</label>
                <input
                  type="text"
                  name="grade"
                  placeholder="e.g. First Class, 3.8"
                  className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Institution Logo</label>
              <select
                name="logoId"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-slate-50 focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="">-- No Logo Selected --</option>
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
                placeholder="Courses, honors, extra curriculars..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-slate-50 resize-y"
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
