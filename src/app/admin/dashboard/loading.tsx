import Skeleton, { SkeletonCard } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header card */}
      <SkeletonCard>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </SkeletonCard>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-12" />
          </SkeletonCard>
        ))}
      </div>

      {/* Panels */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
