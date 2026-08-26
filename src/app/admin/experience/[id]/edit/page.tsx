import db from "@/lib/database";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Briefcase } from "lucide-react";
import PendingButton from "@/components/ui/PendingButton";
import TechnologyPicker from "@/components/admin/TechnologyPicker";
import { TechnologyService } from "@/services/technology.service";
import { updateExperienceAction } from "../../actions";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));

const inputCls =
  "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]";

function dateInputValue(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().substring(0, 10) : "";
}

interface EditExperiencePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExperiencePage({ params }: EditExperiencePageProps) {
  const { id } = await params;

  // Read the DRAFT version, plus the technology list for the skills checklist.
  const [experience, allTechs] = await Promise.all([
    db.experience.findUnique({
      where: { id },
      include: {
        versions: {
          where: { state: "DRAFT" },
          take: 1,
          include: { logo: { select: { filename: true, url: true } } },
        },
        technologies: { select: { technologyId: true } },
      },
    }),
    db.technology.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { state: "DRAFT" }, take: 1, orderBy: { createdAt: "desc" } } },
    }),
  ]);

  if (!experience || experience.deletedAt) notFound();
  const draft = experience.versions[0];
  if (!draft) notFound();

  const linkedTechIds = new Set(experience.technologies.map((t) => t.technologyId));

  async function handleUpdate(formData: FormData) {
    "use server";
    const organization = (formData.get("organization") as string)?.trim();
    const role = (formData.get("role") as string)?.trim();
    const startDateInput = formData.get("startDate") as string;
    if (!organization || !role || !startDateInput) return;

    const endDateInput = formData.get("endDate") as string;

    // Read from the submitted form, not from allTechs — the picker can create a
    // skill inline, and that one is absent from the server-rendered list.
    const technologyIds = await TechnologyService.resolveSelectedIds(formData);

    await updateExperienceAction(id, {
      organization,
      role,
      startDate: new Date(startDateInput),
      endDate: endDateInput ? new Date(endDateInput) : null,
      locationText: (formData.get("locationText") as string) || null,
      // Empty string means "not specified" — the column is nullable, and the
      // values must match the WorkType enum in schema.prisma.
      workType: (formData.get("workType") as string) || null,
      description: (formData.get("description") as string) || null,
      logoId: (formData.get("logoId") as string) || null,
      technologyIds,
    });

    redirect("/admin/experience");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/experience"
          className="p-2 border border-solid border-[var(--a-line)] hover:bg-[var(--a-inset)] rounded-[var(--a-r-sm)] text-[var(--a-soft)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Edit Experience</h1>
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
          <Briefcase size={16} className="text-[var(--a-primary)]" />
          {draft.role} — {draft.organization}
        </h3>

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Organization</label>
          <input type="text" name="organization" required defaultValue={draft.organization} className={inputCls} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Role</label>
          <input type="text" name="role" required defaultValue={draft.role} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Start Date</label>
            <input type="date" name="startDate" required defaultValue={dateInputValue(draft.startDate)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">End Date</label>
            <input type="date" name="endDate" defaultValue={dateInputValue(draft.endDate)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Location</label>
            <input type="text" name="locationText" defaultValue={draft.locationText || ""} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Employment Type</label>
            <select name="workType" defaultValue={draft.workType ?? ""} className={inputCls}>
              <option value="">— Not specified —</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="FREELANCE">Freelance</option>
              <option value="VOLUNTEER">Volunteer</option>
            </select>
          </div>
        </div>

        <MediaPickerModal
          name="logoId"
          label="Company Logo"
          mode="single"
          defaultValue={draft.logoId}
          defaultPreview={draft.logo}
        />

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block font-bold">Skills / Tech Used</label>
          <TechnologyPicker
            variant="compact"
            technologies={allTechs.map((tech) => ({
              id: tech.id,
              name: tech.versions[0]?.name || tech.slug,
            }))}
            selectedIds={[...linkedTechIds]}
          />
        </div>

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
            href="/admin/experience"
            className="flex items-center justify-center gap-2 px-6 py-2.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:bg-[var(--a-inset)] transition-colors text-xs font-semibold no-underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
