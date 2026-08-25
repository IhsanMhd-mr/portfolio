/**
 * Shared date formatting.
 *
 * Every formatter here pins an explicit locale. Calling `.toLocaleString()`
 * with no locale makes Node format with the *server OS* locale while the
 * browser formats with the *user's* — so server-rendered markup never matches
 * the client render and React throws a hydration mismatch:
 *
 *   server: 25/08/2026, 15:06:22   (en-GB)
 *   client: 8/25/2026, 3:06:22 PM  (en-US)
 *
 * Note this pins the *locale*, not the *timezone*. A server in UTC still
 * renders a different clock time than a viewer in IST. For timestamps that are
 * server-rendered, add `suppressHydrationWarning` to the element so React
 * accepts the client's local-time correction on hydration.
 */

const DATE_TIME_LOCALE = "en-US";

/** Full date + time — audit entries, activity feeds, session timestamps. */
export function formatDateTime(value: Date | string | number): string {
  return new Date(value).toLocaleString(DATE_TIME_LOCALE);
}

/** Date only, no time — message lists and similar. */
export function formatDate(value: Date | string | number): string {
  return new Date(value).toLocaleDateString(DATE_TIME_LOCALE);
}

/** "Aug 2026" — timeline/education/experience ranges across public + admin. */
export function formatMonthYear(value: Date | string | number): string {
  return new Date(value).toLocaleDateString(DATE_TIME_LOCALE, {
    month: "short",
    year: "numeric",
  });
}
