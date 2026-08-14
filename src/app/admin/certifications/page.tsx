import { requireAdmin, getValidatedOwner } from "@/lib/require-admin";
import { CertificationService } from "@/services/certification.service";
import db from "@/lib/database";
import { revalidatePath } from "next/cache";
import { Award, Plus, Trash2, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";

export const metadata = { title: "Certifications — Admin" };

const inputCls =
  "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]";

export default async function AdminCertificationsPage() {
  await requireAdmin({ pathname: "/admin/certifications" });

  const [certs, media] = await Promise.all([
    CertificationService.list(),
    db.mediaAsset.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } }),
  ]);

  async function createAction(formData: FormData) {
    "use server";
    const owner = await getValidatedOwner();
    if (!owner) return;
    const title = String(formData.get("title") || "").trim();
    const issuer = String(formData.get("issuer") || "").trim();
    if (!title || !issuer) return;
    const dateRaw = String(formData.get("issueDate") || "");
    await CertificationService.create(
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
  }

  async function rowAction(formData: FormData) {
    "use server";
    const owner = await getValidatedOwner();
    if (!owner) return;
    const ctx = { actorId: owner.userId, loginMethod: owner.loginMethod, loginAccountId: owner.loginAccountId };
    const id = String(formData.get("id") || "");
    const op = String(formData.get("op") || "");
    const all = await CertificationService.list();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) return;

    if (op === "delete") await CertificationService.remove(id, ctx);
    else if (op === "toggle")
      await CertificationService.update(id, { title: all[idx].title, issuer: all[idx].issuer, visible: !all[idx].visible }, ctx);
    else if (op === "up" || op === "down") {
      const swap = op === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= all.length) return;
      const ids = all.map((c) => c.id);
      [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
      await CertificationService.reorder(ids, ctx);
    }
    revalidatePath("/admin/certifications");
    revalidatePath("/");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Certifications & Achievements</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5">Awards, certificates, and credentials shown on the public site. Changes apply immediately.</p>
      </div>

      {/* Add form */}
      <form action={createAction} className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 flex items-center gap-2">
          <Plus size={16} className="text-[var(--a-primary)]" /> Add Certification
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Title *</label><input name="title" required className={inputCls} /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Issuer *</label><input name="issuer" required className={inputCls} /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Issue date</label><input name="issueDate" type="date" className={inputCls} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Credential ID</label><input name="credentialId" className={inputCls} /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Credential URL</label><input name="credentialUrl" type="url" className={inputCls} /></div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Certificate file (Media Library)</label>
            <select name="mediaId" className={inputCls}>
              <option value="">-- None --</option>
              {media.map((m) => (<option key={m.id} value={m.id}>{m.filename}</option>))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Description</label><textarea name="description" rows={2} className={`${inputCls} resize-y`} /></div>
        <button type="submit" className="px-5 py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] cursor-pointer border-none">Add Certification</button>
      </form>

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
            {[
              { op: "up", icon: <ArrowUp size={14} />, disabled: i === 0, label: `Move ${c.title} up` },
              { op: "down", icon: <ArrowDown size={14} />, disabled: i === certs.length - 1, label: `Move ${c.title} down` },
              { op: "toggle", icon: c.visible ? <Eye size={14} /> : <EyeOff size={14} />, disabled: false, label: c.visible ? `Hide ${c.title}` : `Show ${c.title}` },
              { op: "delete", icon: <Trash2 size={14} />, disabled: false, label: `Delete ${c.title}` },
            ].map((b) => (
              <form key={b.op} action={rowAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="op" value={b.op} />
                <button type="submit" disabled={b.disabled} aria-label={b.label}
                  className={`p-1.5 border-none bg-transparent cursor-pointer disabled:opacity-30 ${b.op === "delete" ? "text-[var(--a-danger)]" : "text-[var(--a-soft)] hover:text-[var(--a-ink)]"}`}>
                  {b.icon}
                </button>
              </form>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
