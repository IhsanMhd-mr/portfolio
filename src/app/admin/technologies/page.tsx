import db from "@/lib/database";
import { revalidatePath } from "next/cache";
import { Cpu, Plus, Trash2, Save, Eye, EyeOff, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import AutoSubmitCheckbox from "@/components/admin/AutoSubmitCheckbox";
import { 
  createTechnologyAction, 
  updateTechnologyAction, 
  deleteTechnologyAction, 
  reorderTechnologiesAction 
} from "./actions";

interface SearchParams {
  error?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function AdminTechnologiesPage(props: PageProps) {
  const params = await props.searchParams;
  const error = params.error || "";

  // Fetch technologies with draft version and project/experience usage links
  const technologiesRaw = await db.technology.findMany({
    where: { deletedAt: null },
    include: {
      versions: true,
      projects: true,
      experienceTech: true,
      timelineTech: true,
    },
  });

  // Map to resolve draft and count usages
  const technologies = technologiesRaw.map((tech) => {
    const draft = tech.versions.find((v) => v.state === "DRAFT");
    const published = tech.versions.find((v) => v.state === "PUBLISHED");
    const projectCount = tech.projects.length;
    const experienceCount = tech.experienceTech.length;
    const timelineCount = tech.timelineTech.length;

    return {
      ...tech,
      draft,
      published,
      projectCount,
      experienceCount,
      timelineCount,
    };
  });

  // Sort by order of draft version
  technologies.sort((a, b) => (a.draft?.order || 0) - (b.draft?.order || 0));

  // Load media assets (for logo selector dropdown)
  const allMedia = await db.mediaAsset.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  // Server action triggers
  async function handleCreateTech(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const category = formData.get("category") as any;
    const experienceLabel = formData.get("experienceLabel") as any;
    const description = formData.get("description") as string;
    const logoId = formData.get("logoId") as string || null;

    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    await createTechnologyAction({
      name,
      slug,
      category,
      experienceLabel,
      description,
      logoId,
      showInStack: true,
      showInGame: false,
      showOnResume: true,
      visible: true,
    });
  }

  async function handleToggleFlag(id: string, field: string, currentValue: boolean) {
    "use server";
    await updateTechnologyAction(id, { [field]: !currentValue });
  }

  async function handleDelete(id: string) {
    "use server";
    try {
      await deleteTechnologyAction(id);
    } catch (e: any) {
      // Redirect to same page with error message
      const msg = encodeURIComponent(e.message || "Failed to delete technology.");
      return void revalidatePath(`/admin/technologies?error=${msg}`);
    }
  }

  async function handleMoveUp(index: number) {
    "use server";
    if (index === 0) return;
    const ids = technologies.map((t) => t.id);
    const temp = ids[index];
    ids[index] = ids[index - 1];
    ids[index - 1] = temp;
    await reorderTechnologiesAction(ids);
  }

  async function handleMoveDown(index: number) {
    "use server";
    if (index === technologies.length - 1) return;
    const ids = technologies.map((t) => t.id);
    const temp = ids[index];
    ids[index] = ids[index + 1];
    ids[index + 1] = temp;
    await reorderTechnologiesAction(ids);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Technologies Manager</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5 font-sans">
          Organize your programming skills, categories, years of comfort, and display properties.
        </p>
      </div>

      {error && (
        <div className="p-4 border border-solid border-red-200 bg-red-50 text-red-700 text-xs font-mono rounded-[var(--a-r-sm)] white-space-pre-wrap">
          ⚠️ {decodeURIComponent(error)}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left: Technologies List Grid */}
        <div className="lg:col-span-8 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-slate-50 flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <Cpu size={14} />
            <span>TECHNOLOGIES STACK ({technologies.length})</span>
          </div>

          <div className="divide-y divide-solid divide-[var(--a-line)] text-xs">
            {technologies.map((tech, idx) => {
              const draft = tech.draft;
              if (!draft) return null;

              // Find logo if any
              const logoAsset = allMedia.find((m) => m.id === draft.logoId);

              return (
                <div key={tech.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30">
                  <div className="flex items-start gap-3">
                    {/* Logo display */}
                    <div className="w-8 h-8 rounded bg-slate-100 border border-solid border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {logoAsset ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoAsset.url} alt={draft.name} className="w-full h-full object-contain" />
                      ) : (
                        <Cpu size={14} className="text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--a-ink)]">{draft.name}</span>
                        <span className="bg-slate-100 text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 rounded text-[var(--a-faint)]">
                          {draft.category}
                        </span>
                      </div>
                      {draft.description && (
                        <p className="text-[var(--a-soft)] max-w-sm line-clamp-1">{draft.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 text-[10px] font-mono text-[var(--a-faint)]">
                        <span>Level: {draft.experienceLabel.replace("_", " ")}</span>
                        <span>Projects: {tech.projectCount}</span>
                        <span>Experience: {tech.experienceCount}</span>
                        <span>Timeline: {tech.timelineCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inline Toggle Switches and reorder */}
                  <div className="flex flex-wrap items-center gap-4">
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
                          disabled={idx === technologies.length - 1}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </form>
                    </div>

                    <div className="flex gap-4">
                      {/* Show in Stack */}
                      <form action={handleToggleFlag.bind(null, tech.id, "showInStack", draft.showInStack)}>
                        <AutoSubmitCheckbox checked={draft.showInStack} label="Stack" />
                      </form>

                      {/* Show in Game */}
                      <form action={handleToggleFlag.bind(null, tech.id, "showInGame", draft.showInGame)}>
                        <AutoSubmitCheckbox checked={draft.showInGame} label="Sandbox" />
                      </form>

                      {/* Show on Resume */}
                      <form action={handleToggleFlag.bind(null, tech.id, "showOnResume", draft.showOnResume)}>
                        <AutoSubmitCheckbox checked={draft.showOnResume} label="Resume" />
                      </form>
                    </div>

                    {/* Visibility */}
                    <form action={handleToggleFlag.bind(null, tech.id, "visible", draft.visible)}>
                      <button
                        type="submit"
                        className="p-1 hover:bg-slate-100 rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                      >
                        {draft.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                      </button>
                    </form>

                    {/* Delete */}
                    <form action={handleDelete.bind(null, tech.id)}>
                      <button
                        type="submit"
                        className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer border-none bg-transparent"
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}

            {technologies.length === 0 && (
              <p className="text-center py-12 text-[var(--a-faint)] font-mono">// NO TECHNOLOGIES SEEDED</p>
            )}
          </div>
        </div>

        {/* Right: Quick Add Form */}
        <div className="lg:col-span-4 p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Plus size={16} className="text-[var(--a-primary)]" />
            Add New Skill
          </h3>

          <form action={handleCreateTech} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Skill Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Next.js, Rust"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Category</label>
              <select
                name="category"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-slate-50 focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="FRONTEND">Frontend Development</option>
                <option value="BACKEND">Backend & APIs</option>
                <option value="DATABASE">Databases & Storage</option>
                <option value="AI_ML">AI & Machine Learning</option>
                <option value="MOBILE">Mobile Engineering</option>
                <option value="TOOLS">Developer Tools</option>
                <option value="DEVOPS">DevOps & Cloud</option>
                <option value="OTHER">Other Category</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Comfort Level</label>
              <select
                name="experienceLabel"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-slate-50 focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="STRONG">Strong expertise (comfortable to lead)</option>
                <option value="COMFORTABLE">Comfortable (independent work)</option>
                <option value="WORKING_KNOWLEDGE">Working Knowledge (under supervision)</option>
                <option value="LEARNING">Learning (gaining experience)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Tech Logo Asset</label>
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
                rows={2}
                placeholder="Brief summary of usage"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-slate-50 resize-y"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
            >
              <Save size={14} />
              Add Technology
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
