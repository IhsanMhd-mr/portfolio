import db from "@/lib/database";
import MediaLibraryClient from "@/components/admin/MediaLibraryClient";

const PAGE_SIZE = 24;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminMediaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const [total, mediaAssets] = await Promise.all([
    db.mediaAsset.count({ where: { deletedAt: null } }),
    db.mediaAsset.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--a-ink)]">Media Assets Library</h1>
        <p className="text-sm text-[var(--a-soft)] mt-1.5 font-sans">
          Upload and manage images, PDFs, CV files, and technology icons securely.
        </p>
      </div>

      <MediaLibraryClient mediaAssets={mediaAssets} total={total} page={page} totalPages={totalPages} />
    </div>
  );
}
