import React from "react";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4">
        <div className="h-6 w-48 bg-[var(--a-line)] rounded" />
        <div className="h-4 w-72 bg-[var(--a-line)] rounded" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-3">
            <div className="h-3 w-20 bg-[var(--a-line)] rounded" />
            <div className="h-8 w-12 bg-[var(--a-line)] rounded" />
          </div>
        ))}
      </div>

      {/* Panels Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-[var(--a-surface)] border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] p-6 space-y-4">
            <div className="h-4 w-32 bg-[var(--a-line)] rounded" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-[var(--a-line)] rounded" />
              <div className="h-3 w-5/6 bg-[var(--a-line)] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
