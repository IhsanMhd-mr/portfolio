import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Navigation } from "lucide-react";
import PendingButton from "@/components/ui/PendingButton";
import { NavItemService } from "@/services/nav-item.service";
import { updateNavItemAction } from "../../actions";

const inputCls =
  "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-inset)] focus:outline-none focus:border-[var(--a-primary)]";

interface EditNavItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditNavItemPage({ params }: EditNavItemPageProps) {
  const { id } = await params;

  // Nav items are unversioned — edits apply immediately.
  const item = await NavItemService.getById(id);
  if (!item) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    const result = await updateNavItemAction(id, {
      label: String(formData.get("label") || ""),
      target: String(formData.get("target") || ""),
    });
    if (result.success) redirect("/admin/navigation");
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/navigation"
          className="p-2 border border-solid border-[var(--a-line)] hover:bg-[var(--a-inset)] rounded-[var(--a-r-sm)] text-[var(--a-soft)]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Edit Navigation Item</h1>
          <p className="text-sm text-[var(--a-soft)] mt-1">Changes apply immediately to the public site.</p>
        </div>
      </div>

      <form
        action={handleUpdate}
        className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6"
        style={{ boxShadow: "var(--a-shadow)" }}
      >
        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 flex items-center gap-2">
          <Navigation size={16} className="text-[var(--a-primary)]" />
          {item.label}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Label *</label>
            <input name="label" required defaultValue={item.label} className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Target *</label>
            <input name="target" required defaultValue={item.target} className={inputCls} />
            <p className="text-[10px] text-[var(--a-faint)]">
              A route (<code className="font-mono">/projects</code>) or homepage section (
              <code className="font-mono">#contact</code>).
            </p>
          </div>
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
            href="/admin/navigation"
            className="flex items-center justify-center gap-2 px-6 py-2.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-[var(--a-soft)] hover:bg-[var(--a-inset)] transition-colors text-xs font-semibold no-underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
