/**
 * Loading fallback for a protected admin route.
 *
 * Rendered while `ProtectedContent` authorizes and loads. It MUST contain no
 * protected data — it is the one thing that can reach the browser before
 * authorization resolves. Generic shapes only: no counts, no names, no ids.
 *
 * Shared across every admin page rather than written per route, so the "no
 * protected data" rule is enforced in one place instead of twenty-two.
 */
export default function AdminPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* Heading block */}
      <div className="space-y-2">
        <div className="h-8 w-64 rounded bg-[var(--a-inset)]" />
        <div className="h-4 w-96 max-w-full rounded bg-[var(--a-inset)]" />
      </div>

      {/* Content rows */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-[var(--a-r-md)] border border-solid border-[var(--a-line)] bg-[var(--a-surface)]"
          />
        ))}
      </div>
    </div>
  );
}
