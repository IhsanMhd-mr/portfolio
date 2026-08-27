import { cache } from "react";
import { headers } from "next/headers";

/**
 * The current request's pathname, as set by `proxy.ts`.
 *
 * Exists so that every authorization call in a request shares **one**
 * `requireAdmin` cache key.
 *
 * `requireAdmin` is `React.cache`-wrapped with `pathname` in its key. When a
 * page passed a hard-coded literal (`"/admin/education"`) while layout chrome
 * called `getValidatedOwner()`, the two produced *different* cache entries and
 * the request paid for three separate session lookups instead of one — measured
 * as 14 queries where the baseline was 10.
 *
 * Sourcing the pathname from the header everywhere means page and chrome agree,
 * and dynamic routes work too: a literal like `"/admin/education/[id]/edit"`
 * could never match the real `/admin/education/abc123/edit` the layout sees.
 *
 * Wrapped in `cache()` so the header read itself is resolved once.
 */
export const currentPathname = cache(async (): Promise<string> => {
  const headersList = await headers();
  return headersList.get("x-pathname") ?? "";
});
