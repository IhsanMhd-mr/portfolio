import { Suspense } from "react";
import { requireAdmin } from "@/lib/require-admin";
import { currentPathname } from "@/lib/current-pathname";
import AdminPageSkeleton from "@/components/admin/AdminPageSkeleton";
import { MediaService } from "@/services/media.service";
import MediaLibraryClient from "@/components/admin/MediaLibraryClient";

const PAGE_SIZE = 24;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

/**
 * Protected content for this route.
 *
 * Authorization runs FIRST, before any protected read. That ordering is the
 * security mechanism; the Suspense boundary below exists only to satisfy
 * cacheComponents, which rejects uncached data accessed outside a boundary.
 */
async function ProtectedContent({ searchParams }: PageProps) {
  await requireAdmin(await currentPathname());

  const params = await searchParams;
  const rawPage = parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const { total, totalPages, assets: mediaAssets } = await MediaService.listPage(page, PAGE_SIZE);

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

export default function AdminMediaPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <ProtectedContent searchParams={searchParams} />
    </Suspense>
  );
}
