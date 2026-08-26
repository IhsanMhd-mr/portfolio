/**
 * Ordering for admin-curated content lists.
 *
 * The admin can drag education, experience and timeline entries into a
 * deliberate sequence, stored in each version's `order` column. That intent
 * has to win over any implicit chronological ordering, otherwise the reorder
 * UI in the admin promises control it does not actually have — which is
 * exactly what happened: PublicContentService sorted by `order`, then the
 * homepage section components re-sorted the same arrays by `startDate`
 * descending and discarded it.
 *
 * `order` first, most-recent-first as the tiebreak. The tiebreak matters more
 * than it looks: `order` defaults to 0, so on a site where nothing has been
 * explicitly reordered every row ties, and without a secondary key the result
 * would be whatever sequence Postgres happened to return. Falling back to
 * newest-first keeps that case both sensible and deterministic.
 *
 * `|| 0` on the dates is deliberate too — a null `startDate` previously
 * produced `NaN` from the comparator, which makes the sort result
 * implementation-defined rather than merely wrong.
 *
 * This mirrors the comparator already used by src/app/(public)/about/page.tsx
 * and /resume; those read `order` off a nested `pub` object, so they keep
 * their local copy until Section 5 moves their data access into the service.
 */
export function byOrderThenNewest<T extends { order?: number | null; startDate?: Date | string | null }>(
  a: T,
  b: T
): number {
  const orderDiff = (a.order || 0) - (b.order || 0);
  if (orderDiff !== 0) return orderDiff;
  return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
}
