import db from "@/lib/database";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Cpu } from "lucide-react";
import PendingButton from "@/components/ui/PendingButton";
import { updateTechnologyAction } from "../../actions";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));

const inputCls =
  "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]";

interface EditTechnologyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTechnologyPage({ params }: EditTechnologyPageProps) {
  const { id } = await params;

  // Read the DRAFT version — edits stay unpublished until a publish, matching
  // the create flow and projects/[id]/edit.
  const tech = await db.technology.findUnique({
    where: { id },
    include: {
      versions: {
        where: { state: "DRAFT" },
        take: 1,
        include: { logo: { select: { filename: true, url: true } } },
      },
    },
  });

  if (!tech || tech.deletedAt) notFound();
  const draft = tech.versions[0];
  if (!draft) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string)?.trim();
    if (!name) return;

    await updateTechnologyAction(id, {
      name,
      category: formData.get("category") as any,
      experienceLabel: formData.get("experienceLabel") as any,
      description: (formData.get("description") as string) || null,
      logoId: (formData.get("logoId") as string) || null,
    });

    redirect("/admin/technologies");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/technologies"
          className="p-2 border border-solid border-[var(--a-line)] hover:bg-[var(--a-inset)] rounded-[var(--a-r-sm)] text-[var(--a-soft)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Edit Technology</h1>
          <p className="text-sm text-[var(--a-soft)] mt-1">
            Changes are saved to the draft and go live on the next publish.
          </p>
        </div>
      </div>

      <form
        action={handleUpdate}
        className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6"
        style={{ boxShadow: "var(--a-shadow)" }}
      >
        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 flex items-center gap-2">
          <Cpu size={16} className="text-[var(--a-primary)]" />
          {draft.name}
        </h3>

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Skill Name</label>
          <input type="text" name="name" required defaultValue={draft.name} className={inputCls} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Category</label>
            <select name="category" defaultValue={draft.category} className={inputCls}>
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
            <select name="experienceLabel" defaultValue={draft.experienceLabel} className={inputCls}>
              <option value="STRONG">Strong expertise (comfortable to lead)</option>
              <option value="COMFORTABLE">Comfortable (independent work)</option>
              <option value="WORKING_KNOWLEDGE">Working Knowledge (under supervision)</option>
              <option value="LEARNING">Learning (gaining experience)</option>
            </select>
          </div>
        </div>

        <MediaPickerModal
          name="logoId"
          label="Tech Logo Asset"
          mode="single"
          defaultValue={draft.logoId}
          defaultPreview={draft.logo}
        />

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Short Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={draft.description || ""}
            className={`${inputCls} resize-y`}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <PendingButton
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none disabled:opacity-60"
            pendingLabel="Saving…"
          >
            <Save size={14} />
            Save Changes
          </PendingButton>
          <Link
            href="/admin/technologies"
            className="flex items-center justify-center gap-2 px-6 py-2.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:bg-[var(--a-inset)] transition-colors text-xs font-semibold no-underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
