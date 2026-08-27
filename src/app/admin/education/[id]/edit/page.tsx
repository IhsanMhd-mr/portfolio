import { EducationService } from "@/services/education.service";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, GraduationCap } from "lucide-react";
import PendingButton from "@/components/ui/PendingButton";
import { updateEducationAction } from "../../actions";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));

const inputCls =
  "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]";

/** yyyy-mm-dd for <input type="date">, or "" when unset. */
function dateInputValue(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().substring(0, 10) : "";
}

interface EditEducationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEducationPage({ params }: EditEducationPageProps) {
  const { id } = await params;

  // Read the DRAFT version — edits stay unpublished until a publish.
  const found = await EducationService.getDraftById(id);
  if (!found) notFound();
  const { education, draft } = found;

  async function handleUpdate(formData: FormData) {
    "use server";
    const institution = (formData.get("institution") as string)?.trim();
    const qualification = (formData.get("qualification") as string)?.trim();
    const startDateInput = formData.get("startDate") as string;
    if (!institution || !qualification || !startDateInput) return;

    const endDateInput = formData.get("endDate") as string;

    await updateEducationAction(id, {
      institution,
      qualification,
      startDate: new Date(startDateInput),
      endDate: endDateInput ? new Date(endDateInput) : null,
      grade: (formData.get("grade") as string) || null,
      description: (formData.get("description") as string) || null,
      logoId: (formData.get("logoId") as string) || null,
    });

    redirect("/admin/education");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/education"
          className="p-2 border border-solid border-[var(--a-line)] hover:bg-[var(--a-inset)] rounded-[var(--a-r-sm)] text-[var(--a-soft)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Edit Qualification</h1>
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
          <GraduationCap size={16} className="text-[var(--a-primary)]" />
          {draft.qualification}
        </h3>

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Institution</label>
          <input type="text" name="institution" required defaultValue={draft.institution} className={inputCls} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Qualification</label>
          <input type="text" name="qualification" required defaultValue={draft.qualification} className={inputCls} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Start Date</label>
            <input type="date" name="startDate" required defaultValue={dateInputValue(draft.startDate)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">End Date</label>
            <input type="date" name="endDate" defaultValue={dateInputValue(draft.endDate)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">GPA / Grade</label>
            <input type="text" name="grade" defaultValue={draft.grade || ""} className={inputCls} />
          </div>
        </div>

        <MediaPickerModal
          name="logoId"
          label="Institution Logo"
          mode="single"
          defaultValue={draft.logoId}
          defaultPreview={draft.logo}
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
            href="/admin/education"
            className="flex items-center justify-center gap-2 px-6 py-2.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:bg-[var(--a-inset)] transition-colors text-xs font-semibold no-underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
