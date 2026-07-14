import db from "@/lib/database";
import { revalidatePath } from "next/cache";
import { Image as ImageIcon, Plus, Trash2, Save, File } from "lucide-react";

export default async function AdminMediaPage() {
  const mediaAssets = await db.mediaAsset.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  // Create new media reference
  async function addMediaAsset(formData: FormData) {
    "use server";
    const filename = formData.get("filename") as string;
    const url = formData.get("url") as string;
    const kind = formData.get("kind") as any;
    const altText = formData.get("altText") as string;

    if (!filename || !url) return;

    await db.mediaAsset.create({
      data: {
        filename,
        url,
        kind: kind || "IMAGE",
        altText: altText || null,
      },
    });

    revalidatePath("/admin/media");
  }

  // Delete media asset (soft delete)
  async function deleteMediaAsset(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    
    await db.mediaAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/admin/media");
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Media Assets Library</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5 font-sans">
          Store and manage reusable image files, documents (PDF CVs), and tech logos used across the portfolio CMS.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left List Grid */}
        <div className="lg:col-span-8 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] overflow-hidden" style={{ boxShadow: "var(--a-shadow)" }}>
          <div className="p-4 border-b border-solid border-[var(--a-line)] bg-slate-50 flex items-center gap-2 text-xs font-mono text-[var(--a-faint)]">
            <ImageIcon size={14} />
            <span>LIBRARY ASSETS ({mediaAssets.length})</span>
          </div>

          <div className="p-6 grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {mediaAssets.map((asset) => {
              const isImage = asset.kind === "IMAGE" || asset.kind === "LOGO";
              return (
                <div 
                  key={asset.id} 
                  className="group relative flex flex-col justify-between border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] bg-[var(--a-bg)] overflow-hidden transition-all hover:border-[var(--a-primary)]"
                >
                  {/* Thumbnail Preview */}
                  <div className="aspect-square w-full bg-slate-900 overflow-hidden flex items-center justify-center relative border-b border-solid border-[var(--a-line)]">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={asset.url} 
                        alt={asset.altText || asset.filename} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <File size={32} className="text-[var(--a-faint)]" />
                    )}
                    
                    {/* Delete Hover Action */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <form action={deleteMediaAsset}>
                        <input type="hidden" name="id" value={asset.id} />
                        <button
                          type="submit"
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer border-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Details metadata */}
                  <div className="p-3 text-[10px] space-y-1">
                    <p className="font-bold text-[var(--a-ink)] truncate font-mono">{asset.filename}</p>
                    <p className="text-[9px] font-mono text-[var(--a-faint)] uppercase">{asset.kind}</p>
                  </div>
                </div>
              );
            })}

            {mediaAssets.length === 0 && (
              <div className="col-span-full text-center py-12 text-[var(--a-faint)] font-mono">// NO MEDIA ASSETS RECORDED</div>
            )}
          </div>
        </div>

        {/* Right Quick Add Form */}
        <div className="lg:col-span-4 p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-6" style={{ boxShadow: "var(--a-shadow)" }}>
          <h3 className="font-bold text-sm text-[var(--a-ink)] border-b border-solid border-[var(--a-line)] pb-3 mb-2 flex items-center gap-2">
            <Plus size={16} className="text-[var(--a-primary)]" />
            Add Media Reference
          </h3>

          <form action={addMediaAsset} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Filename</label>
              <input
                type="text"
                name="filename"
                required
                placeholder="e.g. cv-pdf-jane-doe.pdf"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">URL Path</label>
              <input
                type="text"
                name="url"
                required
                placeholder="e.g. /images/profile.png or URL"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Asset Type</label>
              <select
                name="kind"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] bg-white focus:outline-none focus:border-[var(--a-primary)]"
              >
                <option value="IMAGE">Image File (jpg, png, svg)</option>
                <option value="DOCUMENT">Document (PDF CV)</option>
                <option value="LOGO">Brand Logo / Tech Symbol</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[var(--a-soft)] uppercase block">Alt Text</label>
              <input
                type="text"
                name="altText"
                placeholder="e.g. Profile headshot photo"
                className="w-full px-3 py-1.5 border border-solid border-[var(--a-line)] rounded-[var(--a-r-sm)] text-xs text-[var(--a-ink)] focus:outline-none focus:border-[var(--a-primary)]"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--a-primary)] hover:bg-[var(--a-primary-hover)] text-white text-xs font-semibold rounded-[var(--a-r-sm)] transition-colors cursor-pointer border-none"
            >
              <Save size={14} />
              Add Asset Reference
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
