import { TimelineService } from "@/services/timeline.service";
import { ProjectService } from "@/services/project.service";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Milestone } from "lucide-react";
import PendingButton from "@/components/ui/PendingButton";
import { updateTimelineEntryAction } from "../../actions";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));

const inputCls =
  "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]";

function dateInputValue(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().substring(0, 10) : "";
}

interface EditTimelinePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTimelinePage({ params }: EditTimelinePageProps) {
  const { id } = await params;

  // Read the DRAFT version, plus projects for the "linked project" selector.
  const [found, projects] = await Promise.all([
    TimelineService.getDraftById(id),
    ProjectService.listForPicker(),
  ]);

  if (!found) notFound();
  const { entry, draft } = found;

  async function handleUpdate(formData: FormData) {
    "use server";
    const title = (formData.get("title") as string)?.trim();
    const startDateInput = formData.get("startDate") as string;
    if (!title || !startDateInput) return;

    const endDateInput = formData.get("endDate") as string;

    await updateTimelineEntryAction(id, {
      title,
      entryType: formData.get("entryType") as any,
      startDate: new Date(startDateInput),
      endDate: endDateInput ? new Date(endDateInput) : null,
      description: (formData.get("description") as string) || null,
      linkedProjectId: (formData.get("linkedProjectId") as string) || null,
      imageId: (formData.get("imageId") as string) || null,
    });

    redirect("/admin/timeline");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/timeline"
          className="p-2 border border-solid border-[var(--a-line)] hover:bg-[var(--a-inset)] rounded-[var(--a-r-sm)] text-[var(--a-soft)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Edit Timeline Entry</h1>
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
          <Milestone size={16} className="text-[var(--a-primary)]" />
          {draft.title}
        </h3>

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Title</label>
          <input type="text" name="title" required defaultValue={draft.title} className={inputCls} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Entry Type</label>
            <select name="entryType" defaultValue={draft.entryType} className={inputCls}>
              <option value="PROJECT">Project Launch</option>
              <option value="ACADEMIC">Academic Milestone</option>
              <option value="MILESTONE">Career Milestone</option>
              <option value="PERSONAL">Personal Milestone</option>
              <option value="RELEASE">Release</option>
              <option value="ACHIEVEMENT">Achievement</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Start Date</label>
            <input type="date" name="startDate" required defaultValue={dateInputValue(draft.startDate)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">End Date</label>
            <input type="date" name="endDate" defaultValue={dateInputValue(draft.endDate)} className={inputCls} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Linked Project</label>
          <select name="linkedProjectId" defaultValue={entry.linkedProjectId || ""} className={inputCls}>
            <option value="">None</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.versions[0]?.title || proj.slug}
              </option>
            ))}
          </select>
        </div>

        <MediaPickerModal
          name="imageId"
          label="Milestone Icon Asset"
          mode="single"
          defaultValue={draft.imageId}
          defaultPreview={draft.image}
        />

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Short Description</label>
          <textarea name="description" rows={3} defaultValue={draft.description || ""} className={`${inputCls} resize-y`} />
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
            href="/admin/timeline"
            className="flex items-center justify-center gap-2 px-6 py-2.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:bg-[var(--a-inset)] transition-colors text-xs font-semibold no-underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
