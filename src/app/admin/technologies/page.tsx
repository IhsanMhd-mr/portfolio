import db from "@/lib/database";
import { revalidatePath } from "next/cache";
import { Cpu, Plus, Trash2, Save, Eye, EyeOff } from "lucide-react";

export default async function AdminTechnologiesPage() {
  const technologies = await db.technology.findMany({
    where: { deletedAt: null },
    orderBy: { order: "asc" },
  });

  // Create new technology skill
  async function createTech(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const category = formData.get("category") as any;
    const experienceLabel = formData.get("experienceLabel") as any;
    const description = formData.get("description") as string;
    
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const count = await db.technology.count({ where: { deletedAt: null } });

    await db.technology.create({
      data: {
        name,
        slug,
        category: category || "OTHER",
        experienceLabel: experienceLabel || "WORKING_KNOWLEDGE",
        description,
        showInStack: true,
        showOnResume: true,
        visible: true,
        order: count + 1,
      },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/technologies");
  }

  // Update specific tech flags (inline checkbox form action)
  async function toggleTechFlag(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const field = formData.get("field") as string;
    const currentValue = formData.get("value") === "true";

    await db.technology.update({
      where: { id },
      data: { [field]: !currentValue },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/technologies");
  }

  // Delete technology
  async function deleteTech(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await db.technology.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await db.page.update({
      where: { key: "home" },
      data: { hasUnpublishedChanges: true },
    });

    revalidatePath("/admin/technologies");
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Technologies Manager</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5 font-sans">
          Organize your core programming skills, categories, years of comfort, and display properties.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left: Technologies List Grid */}
        <div className="lg:col-span-8 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-slate-50 flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <Cpu size={14} />
            <span>TECHNOLOGIES STACK ({technologies.length})</span>
          </div>

          <div className="divide-y divide-solid divide-[var(--a-line)] text-xs">
            {technologies.map((tech) => (
              <div key={tech.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--a-ink)]">{tech.name}</span>
                    <span className="bg-slate-100 text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 rounded text-[var(--a-faint)]">
                      {tech.category}
                    </span>
                  </div>
                  {tech.description && (
                    <p className="text-[var(--a-soft)] mt-1 max-w-sm line-clamp-1">{tech.description}</p>
                  )}
                  <p className="text-[10px] font-mono text-[var(--a-faint)] mt-1">Level: {tech.experienceLabel.replace("_", " ")}</p>
                </div>

                {/* Inline Toggle Switches */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex gap-4">
                    {/* Show in Stack */}
                    <form action={toggleTechFlag} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={tech.id} />
                      <input type="hidden" name="field" value="showInStack" />
                      <input type="hidden" name="value" value={String(tech.showInStack)} />
                      <input
                        type="checkbox"
                        checked={tech.showInStack}
                        onChange={(e) => e.target.form?.requestSubmit()}
                        className="cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-[var(--a-soft)] uppercase font-mono">Stack</span>
                    </form>

                    {/* Show in Game */}
                    <form action={toggleTechFlag} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={tech.id} />
                      <input type="hidden" name="field" value="showInGame" />
                      <input type="hidden" name="value" value={String(tech.showInGame)} />
                      <input
                        type="checkbox"
                        checked={tech.showInGame}
                        onChange={(e) => e.target.form?.requestSubmit()}
                        className="cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-[var(--a-soft)] uppercase font-mono">Sandbox</span>
                    </form>

                    {/* Show on Resume */}
                    <form action={toggleTechFlag} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={tech.id} />
                      <input type="hidden" name="field" value="showOnResume" />
                      <input type="hidden" name="value" value={String(tech.showOnResume)} />
                      <input
                        type="checkbox"
                        checked={tech.showOnResume}
                        onChange={(e) => e.target.form?.requestSubmit()}
                        className="cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-[var(--a-soft)] uppercase font-mono">Resume</span>
                    </form>
                  </div>

                  {/* Visibility */}
                  <form action={toggleTechFlag}>
                    <input type="hidden" name="id" value={tech.id} />
                    <input type="hidden" name="field" value="visible" />
                    <input type="hidden" name="value" value={String(tech.visible)} />
                    <button
                      type="submit"
                      className="p-1 hover:bg-slate-100 rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                    >
                      {tech.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                    </button>
                  </form>

                  {/* Delete */}
                  <form action={deleteTech}>
                    <input type="hidden" name="id" value={tech.id} />
                    <button
                      type="submit"
                      className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer border-none bg-transparent"
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </div>
            ))}

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

          <form action={createTech} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Skill Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Next.js, Rust"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Category</label>
              <select
                name="category"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-white focus:outline-none focus:border-[var(--a-primary)]"
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
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Comfort Level</label>
              <select
                name="experienceLabel"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-white focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="STRONG">Strong expertise (comfortable to lead)</option>
                <option value="COMFORTABLE">Comfortable (independent work)</option>
                <option value="WORKING_KNOWLEDGE">Working Knowledge (under supervision)</option>
                <option value="LEARNING">Learning (gaining experience)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Short Description</label>
              <textarea
                name="description"
                rows={2}
                placeholder="Brief summary of usage"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] resize-y"
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
