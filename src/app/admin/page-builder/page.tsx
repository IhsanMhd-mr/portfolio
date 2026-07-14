import db from "@/lib/database";
import PageBuilderClient from "@/components/admin/PageBuilderClient";

export default async function PageBuilderPage() {
  const page = await db.page.findUnique({
    where: { key: "home" },
    include: {
      sections: {
        orderBy: { order: "asc" },
      },
    },
  });

  const sectionsList = (page?.sections || []).map((s) => ({
    id: s.id,
    type: s.type,
    internalLabel: s.internalLabel,
    order: s.order,
    visible: s.visible,
    settings: typeof s.settings === "string" ? JSON.parse(s.settings) : s.settings || {},
    animationPresetSlug: s.animationPresetSlug || "fade-in",
    animationDelay: s.animationDelay || 0,
    animationStagger: s.animationStagger || 0.08,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Visual Page Builder</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5">
          Design and sequence your homepage layout. Changes will be saved as drafts until published.
        </p>
      </div>

      <PageBuilderClient initialSections={sectionsList} />
    </div>
  );
}
