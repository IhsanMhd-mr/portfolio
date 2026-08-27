import { requireAdmin } from "@/lib/require-admin";
import { createCertificationAction, certificationRowAction } from "./actions";
import { CertificationService } from "@/services/certification.service";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Award, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Edit } from "lucide-react";
import PendingButton from "@/components/ui/PendingButton";

const MediaPickerModal = dynamic(() => import("@/components/admin/MediaPickerModal"));
const AddItemModal = dynamic(() => import("@/components/admin/AddItemModal"));

export const metadata = { title: "Certifications — Admin" };

const inputCls =
  "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]";

export default async function AdminCertificationsPage() {
  await requireAdmin("/admin/certifications");

  const certs = await CertificationService.list();

  async function createAction(formData: FormData) {
    "use server";
    // Auth, validation, persistence and revalidation all live in the action.
    await createCertificationAction({
      title: String(formData.get("title") || ""),
      issuer: String(formData.get("issuer") || ""),
      issueDate: String(formData.get("issueDate") || ""),
      description: String(formData.get("description") || ""),
      credentialId: String(formData.get("credentialId") || ""),
      credentialUrl: String(formData.get("credentialUrl") || ""),
      mediaId: String(formData.get("mediaId") || ""),
    });
  }

  async function rowAction(formData: FormData) {
    "use server";
    await certificationRowAction(
      String(formData.get("id") || ""),
      String(formData.get("op") || "") as "delete" | "toggle" | "up" | "down"
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Certifications & Achievements</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5">Awards, certificates, and credentials shown on the public site. Changes apply immediately.</p>
      </div>

      {/* Add form */}
      <AddItemModal triggerLabel="Add Certification" title="Add Certification">
        <form action={createAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Title *</label><input name="title" required className={inputCls} /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Issuer *</label><input name="issuer" required className={inputCls} /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Issue date</label><input name="issueDate" type="date" className={inputCls} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Credential ID</label><input name="credentialId" className={inputCls} /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Credential URL</label><input name="credentialUrl" type="url" className={inputCls} /></div>
            <MediaPickerModal name="mediaId" label="Certificate file (Media Library)" mode="single" />
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Description</label><textarea name="description" rows={2} className={`${inputCls} resize-y`} /></div>
          <PendingButton variant="icon"  className="px-5 py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] cursor-pointer border-none">Add Certification</PendingButton>
        </form>
      </AddItemModal>

      {/* List */}
      <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-2" style={{ boxShadow: "var(--a-shadow)" }}>
        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
          <Award size={16} className="text-[var(--a-primary)]" /> Existing ({certs.length})
        </h3>
        {certs.length === 0 && <p className="text-xs text-[var(--a-soft)] py-6 text-center">No certifications yet. Add your first one above.</p>}
        {certs.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 p-3 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)]">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--a-ink)]">{c.title}</p>
              <p className="text-[10px] text-[var(--a-soft)] truncate">{c.issuer}{c.issueDate ? ` · ${new Date(c.issueDate).getFullYear()}` : ""}{c.credentialId ? ` · ${c.credentialId}` : ""}</p>
            </div>
            <Link
              href={`/admin/certifications/${c.id}/edit`}
              className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-ink)] block"
              aria-label={`Edit ${c.title}`}
            >
              <Edit size={14} />
            </Link>
            {[
              { op: "up", icon: <ArrowUp size={14} />, disabled: i === 0, label: `Move ${c.title} up` },
              { op: "down", icon: <ArrowDown size={14} />, disabled: i === certs.length - 1, label: `Move ${c.title} down` },
              { op: "toggle", icon: c.visible ? <Eye size={14} /> : <EyeOff size={14} />, disabled: false, label: c.visible ? `Hide ${c.title}` : `Show ${c.title}` },
              { op: "delete", icon: <Trash2 size={14} />, disabled: false, label: `Delete ${c.title}` },
            ].map((b) => (
              <form key={b.op} action={rowAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="op" value={b.op} />
                <PendingButton variant="icon"  disabled={b.disabled} aria-label={b.label}
                  className={`p-1.5 border-none bg-transparent cursor-pointer disabled:opacity-30 ${b.op === "delete" ? "text-[var(--a-danger)]" : "text-[var(--a-soft)] hover:text-[var(--a-ink)]"}`}>
                  {b.icon}
                </PendingButton>
              </form>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
