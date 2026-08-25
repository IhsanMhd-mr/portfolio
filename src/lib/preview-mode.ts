import { cache } from "react";
import { cookies } from "next/headers";
import { getValidatedOwner } from "./require-admin";

/**
 * Is the CURRENT request authorized to see draft/preview content?
 *
 * The `portfolio_preview_mode` cookie is only ever *written* behind
 * requireAdmin() (see app/admin/preview/actions.ts), but a cookie is
 * client-supplied and trivially forgeable: `httpOnly` stops JavaScript from
 * reading it, it does not stop anyone from sending the header, and
 * `sameSite` is irrelevant to a non-browser client. Treating its presence as
 * proof of authorization let an unauthenticated request read unpublished
 * versions AND rows explicitly marked `visible: false`, because preview drops
 * the visibility filter (see PublicContentService's `versionWhere`).
 *
 * So the cookie is a *hint* and the session is the *authority*: every read
 * re-validates ownership here rather than trusting the flag.
 *
 * Cost: zero queries for anyone without the cookie — the overwhelmingly
 * common case — because we bail before touching the database. Only a request
 * actually carrying the cookie pays for validation.
 *
 * Wrapped in React `cache()` deliberately: getValidatedOwner() is NOT itself
 * cached, and this runs in the root layout, the page and generateMetadata
 * within a single request. Without deduping, previewing would multiply the
 * session lookup across every call site.
 */
export const resolvePreviewMode = cache(async (): Promise<boolean> => {
  const cookieStore = await cookies();
  if (cookieStore.get("portfolio_preview_mode")?.value !== "true") return false;
  return (await getValidatedOwner()) !== null;
});
