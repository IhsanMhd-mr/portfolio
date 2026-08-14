import db from "@/lib/database";
import { requireAdmin } from "@/lib/require-admin";
import { SectionGroupService } from "@/services/section-group.service";
import PageBuilderBoard from "@/components/admin/page-builder/PageBuilderBoard";

export const metadata = { title: "Page Builder — Admin" };

function toModule(s: any) {
  return {
    id: s.id,
    type: s.type,
    internalLabel: s.internalLabel,
    groupId: s.groupId,
    visible: s.visible,
    settings: typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings || {},
    animationPresetSlug: s.animationPresetSlug || "fade-in",
    animationDelay: s.animationDelay ?? 0,
    animationStagger: s.animationStagger ?? 0.08,
  };
}

export default async function PageBuilderPage() {
  await requireAdmin({ pathname: "/admin/page-builder" });

  const page = await db.page.findUnique({ where: { key: "home" }, select: { id: true } });
  if (!page) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Page Builder</h1>
        <p className="text-sm text-[var(--a-danger)]">Homepage record not found. Run `npm run initialize` to repair.</p>
      </div>
    );
  }

  const { groups, ungrouped } = await SectionGroupService.getPageStructure(page.id);

  const initialGroups = groups.map((g) => ({
    id: g.id,
    title: g.title,
    subtitle: g.subtitle,
    visible: g.visible,
    sections: g.sections.map(toModule),
  }));
  const initialUngrouped = ungrouped.map(toModule);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Page Builder</h1>
          <p className="text-sm text-[var(--a-soft)] mt-1.5">
            Organize your homepage into groups, add and reorder modules, then preview and publish.
            Changes here are draft-only until published.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a href="/admin/preview" className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] border border-solid border-[var(--a-line)] text-[var(--a-soft)] hover:text-[var(--a-ink)] bg-[var(--a-surface)] no-underline">
            Preview
          </a>
          <a href="/admin/publish-confirmation" className="px-4 py-2 text-xs font-semibold rounded-[var(--a-r-sm)] bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white no-underline">
            Publish
          </a>
        </div>
      </div>

      <PageBuilderBoard initialGroups={initialGroups} initialUngrouped={initialUngrouped} />
    </div>
  );
}
