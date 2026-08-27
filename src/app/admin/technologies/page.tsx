import { TechnologyService } from "@/services/technology.service";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Cpu, Trash2, Save, Eye, EyeOff, ArrowUp, ArrowDown, Edit } from "lucide-react";
import AutoSubmitCheckbox from "@/components/admin/AutoSubmitCheckbox";
import Pagination from "@/components/admin/Pagination";
import PendingButton from "@/components/ui/PendingButton";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));
const AddItemModal = dynamic(() => import("@/components/admin/AddItemModal"));
import {
  createTechnologyAction,
  updateTechnologyAction,
  deleteTechnologyAction,
  moveTechnologyOrderAction,
} from "./actions";

const PAGE_SIZE = 20;

interface SearchParams {
  error?: string;
  page?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function AdminTechnologiesPage(props: PageProps) {
  const params = await props.searchParams;
  const error = params.error || "";
  const rawPage = parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const { total, totalPages, items: technologies } = await TechnologyService.listDraftPage(
    page,
    PAGE_SIZE
  );

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
      // This used to call revalidatePath with a query string. revalidatePath
      // takes a PATH — a query string makes it match nothing, so the call
      // silently did nothing and the page re-rendered with no `error` param.
      // The service throws a useful message here ("Deletion blocked.
      // Technology 'X' is actively used in: ...") and the owner never saw it.
      // redirect() is what the `?error=` the page reads actually needs.
      const msg = encodeURIComponent(e.message || "Failed to delete technology.");
      redirect(`/admin/technologies?error=${msg}`);
    }
  }

  async function handleMove(id: string, direction: "up" | "down") {
    "use server";
    await moveTechnologyOrderAction(id, direction);
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
        <div className="p-4 border border-solid border-[var(--a-danger-ink)]/20 bg-[var(--a-danger-bg)] text-[var(--a-danger-ink)] text-xs font-mono rounded-[var(--a-r-sm)] white-space-pre-wrap">
          ⚠️ {decodeURIComponent(error)}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left: Technologies List Grid */}
        <div className="lg:col-span-8 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-[var(--a-inset)] flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <Cpu size={14} />
            <span>TECHNOLOGIES STACK ({total})</span>
          </div>

          <div className="divide-y divide-solid divide-[var(--a-line)] text-xs">
            {technologies.map((tech, idx) => {
              const draft = tech.draft;
              const isFirstOnPage = page === 1 && idx === 0;
              const isLastOnPage = page === totalPages && idx === technologies.length - 1;

              return (
                <div key={tech.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--a-inset)]/30">
                  <div className="flex items-start gap-3">
                    {/* Logo display */}
                    <div className="w-8 h-8 rounded bg-[var(--a-inset)] border border-solid border-[var(--a-line)] overflow-hidden flex items-center justify-center flex-shrink-0">
                      {draft.logo ? (
                        <img src={draft.logo.url} alt={draft.name} className="w-full h-full object-contain" />
                      ) : (
                        <Cpu size={14} className="text-[var(--a-faint)]" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--a-ink)]">{draft.name}</span>
                        <span className="bg-[var(--a-inset)] text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 rounded text-[var(--a-faint)]">
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
                      <form action={handleMove.bind(null, tech.id, "up")}>
                        <PendingButton
                          variant="icon"
                          disabled={isFirstOnPage}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowUp size={12} />
                        </PendingButton>
                      </form>
                      <form action={handleMove.bind(null, tech.id, "down")}>
                        <PendingButton
                          variant="icon"
                          disabled={isLastOnPage}
                          className="p-1 hover:bg-[var(--a-inset)] text-[var(--a-faint)] hover:text-[var(--a-soft)] disabled:opacity-30 cursor-pointer border-none bg-transparent rounded"
                        >
                          <ArrowDown size={12} />
                        </PendingButton>
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

                    {/* Edit */}
                    <Link
                      href={`/admin/technologies/${tech.id}/edit`}
                      className="p-1 hover:bg-[var(--a-inset)] rounded text-[var(--a-soft)] block"
                      title="Edit technology"
                    >
                      <Edit size={14} />
                    </Link>

                    {/* Visibility */}
                    <form action={handleToggleFlag.bind(null, tech.id, "visible", draft.visible)}>
                      <PendingButton
                        variant="icon"
                        className="p-1 hover:bg-[var(--a-inset)] rounded text-[var(--a-soft)] cursor-pointer border-none bg-transparent"
                      >
                        {draft.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-[var(--a-danger-ink)]" />}
                      </PendingButton>
                    </form>

                    {/* Delete */}
                    <form action={handleDelete.bind(null, tech.id)}>
                      <PendingButton
                        variant="icon"
                        className="p-1 hover:bg-[var(--a-danger-bg)] text-[var(--a-danger-ink)] rounded cursor-pointer border-none bg-transparent"
                      >
                        <Trash2 size={14} />
                      </PendingButton>
                    </form>
                  </div>
                </div>
              );
            })}

            {technologies.length === 0 && (
              <p className="text-center py-12 text-[var(--a-faint)] font-mono">// NO TECHNOLOGIES SEEDED</p>
            )}
          </div>

          <div className="px-4 pb-4">
            <Pagination currentPage={page} totalPages={totalPages} buildHref={(p) => `/admin/technologies?page=${p}`} />
          </div>
        </div>

        {/* Right: Quick Add */}
        <div className="lg:col-span-4">
          <AddItemModal triggerLabel="Add New Skill" title="Add New Skill">
          <form action={handleCreateTech} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Skill Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Next.js, Rust"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Category</label>
              <select
                name="category"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
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
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="STRONG">Strong expertise (comfortable to lead)</option>
                <option value="COMFORTABLE">Comfortable (independent work)</option>
                <option value="WORKING_KNOWLEDGE">Working Knowledge (under supervision)</option>
                <option value="LEARNING">Learning (gaining experience)</option>
              </select>
            </div>

            <MediaPickerModal name="logoId" label="Tech Logo Asset" mode="single" />

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Short Description</label>
              <textarea
                name="description"
                rows={2}
                placeholder="Brief summary of usage"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)] bg-[var(--a-inset)] resize-y"
              />
            </div>

            <PendingButton
              className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none disabled:opacity-60"
              pendingLabel="Adding…"
            >
              <Save size={14} />
              Add Technology
            </PendingButton>
          </form>
          </AddItemModal>
        </div>
      </div>
    </div>
  );
}
