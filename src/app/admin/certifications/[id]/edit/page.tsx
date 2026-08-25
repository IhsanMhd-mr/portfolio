import db from "@/lib/database";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Save, Award } from "lucide-react";
import PendingButton from "@/components/ui/PendingButton";
import { getValidatedOwner } from "@/lib/require-admin";
import { CertificationService } from "@/services/certification.service";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));

const inputCls =
  "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]";

function dateInputValue(d: Date | null | undefined) {
  return d ? new Date(d).toISOString().substring(0, 10) : "";
}

interface EditCertificationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCertificationPage({ params }: EditCertificationPageProps) {
  const { id } = await params;

  // Certifications are unversioned — edits apply immediately, matching the
  // create flow on the list page.
  const cert = await db.certification.findUnique({
    where: { id },
    include: { media: { select: { filename: true, url: true } } },
  });

  if (!cert) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    const owner = await getValidatedOwner();
    if (!owner) return;

    const title = String(formData.get("title") || "").trim();
    const issuer = String(formData.get("issuer") || "").trim();
    if (!title || !issuer) return;

    const dateRaw = String(formData.get("issueDate") || "");

    await CertificationService.update(
      id,
      {
        title: title.slice(0, 160),
        issuer: issuer.slice(0, 160),
        issueDate: dateRaw ? new Date(dateRaw) : null,
        description: String(formData.get("description") || "").trim().slice(0, 2000) || null,
        credentialId: String(formData.get("credentialId") || "").trim().slice(0, 120) || null,
        credentialUrl: String(formData.get("credentialUrl") || "").trim().slice(0, 2000) || null,
        mediaId: String(formData.get("mediaId") || "") || null,
      },
      { actorId: owner.userId, loginMethod: owner.loginMethod, loginAccountId: owner.loginAccountId }
    );

    revalidatePath("/admin/certifications");
    revalidatePath("/");
    redirect("/admin/certifications");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/certifications"
          className="p-2 border border-solid border-[var(--a-line)] hover:bg-[var(--a-inset)] rounded-[var(--a-r-sm)] text-[var(--a-soft)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Edit Certification</h1>
          <p className="text-sm text-[var(--a-soft)] mt-1">Changes apply immediately to the public site.</p>
        </div>
      </div>

      <form
        action={handleUpdate}
        className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6"
        style={{ boxShadow: "var(--a-shadow)" }}
      >
        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 flex items-center gap-2">
          <Award size={16} className="text-[var(--a-primary)]" />
          {cert.title}
        </h3>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Title *</label>
            <input name="title" required defaultValue={cert.title} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Issuer *</label>
            <input name="issuer" required defaultValue={cert.issuer} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Issue date</label>
            <input name="issueDate" type="date" defaultValue={dateInputValue(cert.issueDate)} className={inputCls} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Credential ID</label>
            <input name="credentialId" defaultValue={cert.credentialId || ""} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Credential URL</label>
            <input name="credentialUrl" type="url" defaultValue={cert.credentialUrl || ""} className={inputCls} />
          </div>
        </div>

        <MediaPickerModal
          name="mediaId"
          label="Certificate file (Media Library)"
          mode="single"
          defaultValue={cert.mediaId}
          defaultPreview={cert.media}
        />

        <div className="space-y-1.5">
          <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Description</label>
          <textarea name="description" rows={3} defaultValue={cert.description || ""} className={`${inputCls} resize-y`} />
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
            href="/admin/certifications"
            className="flex items-center justify-center gap-2 px-6 py-2.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:bg-[var(--a-inset)] transition-colors text-xs font-semibold no-underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
