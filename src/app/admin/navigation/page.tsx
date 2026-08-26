import { requireAdmin } from "@/lib/require-admin";
import { createNavItemAction, navItemRowAction } from "./actions";
import Link from "next/link";
import { NavItemService } from "@/services/nav-item.service";
import { Navigation, Plus, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Edit } from "lucide-react";
import PendingButton from "@/components/ui/PendingButton";

export const metadata = { title: "Navigation — Admin" };

const inputCls =
  "w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-[var(--a-surface)] focus:outline-none focus:border-[var(--a-primary)]";

export default async function AdminNavigationPage() {
  await requireAdmin("/admin/navigation");
  const items = await NavItemService.list();

  async function createAction(formData: FormData) {
    "use server";
    await createNavItemAction({
      label: String(formData.get("label") || ""),
      target: String(formData.get("target") || ""),
    });
  }

  async function rowAction(formData: FormData) {
    "use server";
    await navItemRowAction(
      String(formData.get("id") || ""),
      String(formData.get("op") || "") as "delete" | "toggle" | "up" | "down"
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Navigation</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5">
          Public navigation items. When this list is empty, the site shows its built-in default navigation.
          Targets must be a route (<code className="font-mono">/projects</code>) or a homepage section (<code className="font-mono">#contact</code>).
        </p>
      </div>

      <form action={createAction} className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-4" style={{ boxShadow: "var(--a-shadow)" }}>
        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 flex items-center gap-2">
          <Plus size={16} className="text-[var(--a-primary)]" /> Add Item
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Label *</label><input name="label" required className={inputCls} placeholder="Projects" /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Target *</label><input name="target" required className={inputCls} placeholder="/projects or #contact" /></div>
        </div>
        <PendingButton variant="icon"  className="px-5 py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] cursor-pointer border-none">Add Item</PendingButton>
      </form>

      <div className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-2" style={{ boxShadow: "var(--a-shadow)" }}>
        <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
          <Navigation size={16} className="text-[var(--a-primary)]" /> Items ({items.length})
        </h3>
        {items.length === 0 && <p className="text-xs text-[var(--a-soft)] py-6 text-center">No custom items — the built-in default navigation is active.</p>}
        {items.map((n, i) => (
          <div key={n.id} className="flex items-center gap-3 p-3 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)]">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--a-ink)]">{n.label}</p>
              <p className="text-[10px] text-[var(--a-soft)] font-mono truncate">{n.target}</p>
            </div>
            <Link
              href={`/admin/navigation/${n.id}/edit`}
              className="p-1.5 text-[var(--a-soft)] hover:text-[var(--a-ink)] block"
              aria-label={`Edit ${n.label}`}
            >
              <Edit size={14} />
            </Link>
            {[
              { op: "up", icon: <ArrowUp size={14} />, disabled: i === 0, label: `Move ${n.label} up` },
              { op: "down", icon: <ArrowDown size={14} />, disabled: i === items.length - 1, label: `Move ${n.label} down` },
              { op: "toggle", icon: n.enabled ? <Eye size={14} /> : <EyeOff size={14} />, disabled: false, label: n.enabled ? `Disable ${n.label}` : `Enable ${n.label}` },
              { op: "delete", icon: <Trash2 size={14} />, disabled: false, label: `Delete ${n.label}` },
            ].map((b) => (
              <form key={b.op} action={rowAction}>
                <input type="hidden" name="id" value={n.id} />
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
