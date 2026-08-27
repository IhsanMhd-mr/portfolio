import { revalidateTag, updateTag } from "next/cache";

/**
 * One cache domain for data that can change what an anonymous visitor sees.
 *
 * It covers published content and live-on-write public chrome/content. A
 * deliberately broad domain makes a missed invalidation a cache miss at worst,
 * rather than a public stale-content bug.
 */
export const PUBLIC_CONTENT_TAG = "portfolio-public";

/** Call only from a Server Action after a public-output mutation. */
export function updatePublicContentCache() {
  updateTag(PUBLIC_CONTENT_TAG);
}

/** Call from a Route Handler after a public-output mutation. */
export function revalidatePublicContentCache() {
  // A publish must not use stale-while-revalidate: the next request needs the
  // newly live content, not a stale response while it refreshes.
  revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 });
}
