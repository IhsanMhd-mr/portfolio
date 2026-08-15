import db from "@/lib/database";
import dynamic from "next/dynamic";
import { GraduationCap, Trash2, Save, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import {
  createEducationAction,
  updateEducationAction,
  deleteEducationAction,
  moveEducationOrderAction,
} from "./actions";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));
const AddItemModal = dynamic(() => import("@/components/admin/AddItemModal"));

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminEducationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  // Query EducationVersion (DRAFT) directly so `order` can be sorted/paginated
  // at the database boundary — Prisma can't orderBy a to-many relation's field
  // on the parent Education model.
  const [total, draftVersions] = await Promise.all([
    db.educationVersion.count({ where: { state: "DRAFT" } }),
    db.educationVersion.findMany({
      where: { state: "DRAFT" },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { education: true, logo: { select: { url: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const education = draftVersions.map((draft) => ({
    id: draft.education.id,
    draft,
  }));

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

  async function handleMove(id: string, direction: "up" | "down") {
    "use server";
    await moveEducationOrderAction(id, direction);
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
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-[var(--a-inset)] flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <GraduationCap size={14} />
            <span>QUALIFICATIONS ({total})</span>
          </div>

          <div className="divide-y divide-solid divide-[var(--a-line)] text-xs">
            {education.map((edu, idx) => {
              const draft = edu.draft;
              const isFirstOnPage = page === 1 && idx === 0;
              const isLastOnPage = page === totalPages && idx === education.length - 1;

              return (
                <div key={edu.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--a-inset)]/30">
                  <div className="flex items-start gap-3">
                    {/* Logo Display */}
                    <div className="w-8 h-8 rounded bg-[var(--a-inset)] border border-solid border-[var(--a-line)] overflow-hidden flex items-center justify-center flex-shrink-0">
                      {draft.logo ? (
                        <img src={draft.logo.url} alt={draft.institution} className="w-full h-full object-contain" />
                      ) : (
                        <GraduationCap size={14} className="text-[var(--a-faint)]" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h3 className="font-bold text-sm text-[var(--a-ink)]">{draft.qualification}</h3>
                      <p className="text-xs text-[var(--a-primary)] font-medium mt-0.5">{draft.institution}</p>
                      {draft.grade && (
                        <span className="inline-block bg-[var(--a-inset)] text-[9px] font-mono px-2 py-0.5 rounded text-[var(--a-soft)] mt-1">
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
                      <form action={handleMove.bind(null, edu.id, "up")}>
                        <button
                          type="submit"
                          disabled={isFirstOnPage}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowUp size={12} />
                        </button>
                      </form>
                      <form action={handleMove.bind(null, edu.id, "down")}>
                        <button
                          type="submit"
                          disabled={isLastOnPage}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </form>
                    </div>

                    {/* Visibility */}
                    <form action={handleToggleVisibility.bind(null, edu.id, draft.visible)}>
                      <button
                        type="submit"
                        className="p-1.5 hover:bg-[var(--a-inset)] rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                      >
                        {draft.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-[var(--a-danger-ink)]" />}
                      </button>
                    </form>

                    {/* Delete */}
                    <form action={handleDelete.bind(null, edu.id)}>
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

            {education.length === 0 && (
              <p className="text-center py-12 text-[var(--a-faint)] font-mono">// NO QUALIFICATIONS SEEDED</p>
            )}
          </div>

          <div className="px-4 pb-4">
            <Pagination currentPage={page} totalPages={totalPages} buildHref={(p) => `/admin/education?page=${p}`} />
          </div>
        </div>

        {/* Right Quick Add */}
        <div className="lg:col-span-4">
          <AddItemModal triggerLabel="Add Qualification" title="Add Qualification">
          <form action={handleCreateEducation} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Institution</label>
              <input
                type="text"
                name="institution"
                required
                placeholder="e.g. Stanford University"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Qualification</label>
              <input
                type="text"
                name="qualification"
                required
                placeholder="e.g. B.Sc. in Computer Science"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">GPA / Grade</label>
                <input
                  type="text"
                  name="grade"
                  placeholder="e.g. First Class, 3.8"
                  className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
                />
              </div>
            </div>

            <MediaPickerModal name="logoId" label="Institution Logo" mode="single" />

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Short Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Courses, honors, extra curriculars..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
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
          </AddItemModal>
        </div>
      </div>
    </div>
  );
}
