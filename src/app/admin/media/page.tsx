import db from "@/lib/database";
import MediaLibraryClient from "@/components/admin/MediaLibraryClient";

export default async function AdminMediaPage() {
  const mediaAssets = await db.mediaAsset.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Media Assets Library</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5 font-sans">
          Upload and manage images, PDFs, CV files, and technology icons securely.
        </p>
      </div>

      <MediaLibraryClient mediaAssets={mediaAssets} />
    </div>
  );
}
