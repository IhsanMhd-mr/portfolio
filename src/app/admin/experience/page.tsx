import db from "@/lib/database";
import { Briefcase, Plus, Trash2, Save, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { 
  createExperienceAction, 
  updateExperienceAction, 
  deleteExperienceAction, 
  reorderExperienceAction 
} from "./actions";

export default async function AdminExperiencePage() {
  const [experiencesRaw, allMedia, allTechs] = await Promise.all([
    db.experience.findMany({
      where: { deletedAt: null },
      include: {
        versions: true,
        technologies: {
          include: {
            technology: {
              include: {
                versions: { where: { state: "DRAFT" }, take: 1 },
              },
            },
          },
        },
      },
    }),
    db.mediaAsset.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    db.technology.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "DRAFT" }, take: 1 } },
    }),
  ]);

  // Resolve draft versions
  const experiences = experiencesRaw.map((exp) => {
    const draft = exp.versions.find((v) => v.state === "DRAFT");
    const published = exp.versions.find((v) => v.state === "PUBLISHED");
    return {
      ...exp,
      draft,
      published,
    };
  });

  // Sort by manualOrder of draft versions
  experiences.sort((a, b) => (a.draft?.order || 0) - (b.draft?.order || 0));

  async function handleCreateExperience(formData: FormData) {
    "use server";
    const organization = formData.get("organization") as string;
    const role = formData.get("role") as string;
    const startDateInput = formData.get("startDate") as string;
    const locationText = formData.get("locationText") as string;
    const description = formData.get("description") as string;
    const logoId = formData.get("logoId") as string || null;
    const workType = formData.get("workType") as any || "ON_SITE";

    if (!organization || !role || !startDateInput) return;

    // Parse technology selections
    const technologyIds: string[] = [];
    allTechs.forEach((t) => {
      if (formData.get(`tech_${t.id}`) === "on") {
        technologyIds.push(t.id);
      }
    });

    await createExperienceAction({
      organization,
      role,
      startDate: new Date(startDateInput),
      locationText,
      description,
      logoId,
      workType,
      technologyIds,
      visible: true,
    });
  }

  async function handleToggleVisibility(id: string, currentVisible: boolean) {
    "use server";
    await updateExperienceAction(id, { visible: !currentVisible });
  }

  async function handleDelete(id: string) {
    "use server";
    await deleteExperienceAction(id);
  }

  async function handleMoveUp(index: number) {
    "use server";
    if (index === 0) return;
    const ids = experiences.map((e) => e.id);
    const temp = ids[index];
    ids[index] = ids[index - 1];
    ids[index - 1] = temp;
    await reorderExperienceAction(ids);
  }

  async function handleMoveDown(index: number) {
    "use server";
    if (index === experiences.length - 1) return;
    const ids = experiences.map((e) => e.id);
    const temp = ids[index];
    ids[index] = ids[index + 1];
    ids[index + 1] = temp;
    await reorderExperienceAction(ids);
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
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-[var(--a-inset)] flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <Briefcase size={14} />
            <span>EMPLOYERS LIST ({experiences.length})</span>
          </div>

          <div className="divide-y divide-solid divide-[var(--a-line)] text-xs">
            {experiences.map((exp, idx) => {
              const draft = exp.draft;
              if (!draft) return null;

              // Find logo
              const logoAsset = allMedia.find((m) => m.id === draft.logoId);

              // Technologies linked
              const linkedTechNames = exp.technologies.map(
                (et) => et.technology.versions.find((v) => v.state === "DRAFT")?.name || et.technology.slug
              );

              return (
                <div key={exp.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--a-inset)]/30">
                  <div className="flex items-start gap-3">
                    {/* Logo display */}
                    <div className="w-8 h-8 rounded bg-[var(--a-inset)] border border-solid border-[var(--a-line)] overflow-hidden flex items-center justify-center flex-shrink-0">
                      {logoAsset ? (
                        <img src={logoAsset.url} alt={draft.organization} className="w-full h-full object-contain" />
                      ) : (
                        <Briefcase size={14} className="text-[var(--a-faint)]" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h3 className="font-bold text-sm text-[var(--a-ink)]">{draft.role}</h3>
                      <p className="text-xs text-[var(--a-primary)] font-medium mt-0.5">{draft.organization}</p>
                      {draft.locationText && (
                        <p className="text-[10px] text-[var(--a-soft)] mt-0.5">Location: {draft.locationText} ({draft.workType})</p>
                      )}
                      {linkedTechNames.length > 0 && (
                        <p className="text-[9px] font-mono text-[var(--a-faint)]">Skills: {linkedTechNames.join(", ")}</p>
                      )}
                      <p className="text-[10px] text-[var(--a-faint)] mt-1">
                        Started: {new Date(draft.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
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
                          disabled={idx === experiences.length - 1}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </form>
                    </div>

                    {/* Visibility */}
                    <form action={handleToggleVisibility.bind(null, exp.id, draft.visible)}>
                      <button
                        type="submit"
                        className="p-1.5 hover:bg-[var(--a-inset)] rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                      >
                        {draft.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-[var(--a-danger-ink)]" />}
                      </button>
                    </form>

                    {/* Delete */}
                    <form action={handleDelete.bind(null, exp.id)}>
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

          <form action={handleCreateExperience} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Organization</label>
              <input
                type="text"
                name="organization"
                required
                placeholder="e.g. Acme Corporation"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Role</label>
              <input
                type="text"
                name="role"
                required
                placeholder="e.g. Software Engineer Intern"
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
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Location</label>
                <input
                  type="text"
                  name="locationText"
                  placeholder="e.g. London, Remote"
                  className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Work Type</label>
                <select
                  name="workType"
                  className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none"
                >
                  <option value="ON_SITE">On Site</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="REMOTE">Remote</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Company Logo</label>
                <select
                  name="logoId"
                  className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none"
                >
                  <option value="">-- No Logo --</option>
                  {allMedia.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.filename}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tech tag choices */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Skills / Tech Used</label>
              <div className="p-2.5 border border-solid border-[var(--a-line)] rounded bg-[var(--a-inset)]/50 max-h-28 overflow-y-auto grid grid-cols-2 gap-1.5">
                {allTechs.map((tech) => {
                  const name = tech.versions.find((v) => v.state === "DRAFT")?.name || tech.slug;
                  return (
                    <div key={tech.id} className="flex items-center gap-1.5">
                      <input type="checkbox" name={`tech_${tech.id}`} id={`tech_${tech.id}`} className="cursor-pointer" />
                      <label htmlFor={`tech_${tech.id}`} className="text-[10px] text-[var(--a-ink)] truncate cursor-pointer">{name}</label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Short Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Developed features, led stack, optimized page speeds..."
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
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
