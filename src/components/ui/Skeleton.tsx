/**
 * Skeleton placeholder block.
 *
 * Server Component by design — `loading.tsx` files render on the server and
 * ship no JS for this.
 *
 * Defaults to the admin token `--a-line`. The public templates use a separate
 * token system (`--bg` / `--ink`, see src/styles/admin.css), so a public-side
 * skeleton should pass its own background via `className`.
 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[var(--a-line)] ${className}`} />;
}

/** Card-shaped skeleton wrapper matching the admin surface treatment. */
export function SkeletonCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`p-6 border border-solid border-[var(--a-line)] rounded-[var(--a-r-md)] bg-[var(--a-surface)] space-y-3 ${className}`}
    >
      {children}
    </div>
  );
}
