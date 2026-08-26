import { byOrderThenNewest } from "@/lib/content-order";

/**
 * Shared version-selection for public reads.
 *
 * Five entities (Project, Technology, TimelineEntry, Education, Experience)
 * store their content in a `*Version` sibling with `@@unique([entityId, state])`.
 * That constraint guarantees at most one row per state, which is what makes
 * `versions[0]` deterministic after filtering — the invariant every public read
 * depends on and none of them stated.
 *
 * The predicate below was hand-written at each call site, which is how the
 * variants drifted: one route filtered `state` but not `visible`, another
 * applied `showOnResume` to technologies but not to education or experience.
 * Both were real bugs. One definition removes the opportunity.
 */

/** Published AND visible. The default for anything a visitor can reach. */
export const PUBLISHED_VISIBLE = { state: "PUBLISHED", visible: true } as const;

/** Published, visible, and flagged for the resume page. */
export const PUBLISHED_VISIBLE_ON_RESUME = { ...PUBLISHED_VISIBLE, showOnResume: true } as const;

/** An entity row with its single resolved version attached as `pub`. */
export type WithPublished<T extends { versions: unknown[] }> = T & { pub: T["versions"][number] };

/**
 * Attaches the resolved version as `pub` and drops rows that have none.
 *
 * A row with no matching version is not an error — it is an entity whose only
 * version is a draft, or is hidden. Those simply do not appear publicly.
 *
 * The version type is derived from the row rather than taken as a separate
 * type parameter, so callers get the real Prisma payload type back instead of
 * `unknown`.
 */
export function attachPublished<T extends { versions: unknown[] }>(rows: T[]): WithPublished<T>[] {
  return rows
    .map((row) => ({ ...row, pub: row.versions[0] as T["versions"][number] }))
    .filter((row) => Boolean(row.pub));
}

/**
 * Sorts by the admin `order` column, newest-first as tiebreak, reading through
 * the nested `pub`. Same rule as byOrderThenNewest — see that function for why
 * the tiebreak matters when `order` is left at its default.
 */
export function sortPublished(
  rows: Array<{ pub: { order?: number | null; startDate?: Date | string | null } }>
): void {
  rows.sort((a, b) => byOrderThenNewest(a.pub, b.pub));
}
