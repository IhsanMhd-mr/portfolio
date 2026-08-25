/**
 * Small helpers for rendering owner-authored text on the public site.
 *
 * The rule these exist to enforce: when a content field is empty, the site
 * renders *nothing*. It never substitutes invented prose. Fallback strings
 * baked into JSX read to a visitor as the site owner's own words — claims
 * about their skills, methods, or availability that they never wrote. A blank
 * section is honest; a fabricated one is not.
 *
 * Structural defaults (headings, button labels, nav text) are fine and are not
 * what this guards.
 */

/**
 * Normalises an optional content field to either real text or `null`.
 *
 * Callers use it to decide whether to render an element at all. A plain `||`
 * check is not enough: fields cleared by `scripts/clear-descriptions.js` are a
 * mix of `NULL` and `""` (NOT NULL columns can only be emptied), and a field
 * holding only whitespace is *truthy* — it would pass a `||` guard and render
 * as an unexplained blank gap.
 */
export function text(value?: string | null): string | null {
  return value?.trim() || null;
}

/**
 * Initials for the profile-image placeholder, derived from the owner's actual
 * name. Returns `null` rather than a stand-in when there is no name to work
 * from — the previous hardcoded "JD" was the initials of a fictional
 * "Jane Doe" placeholder.
 */
export function initials(fullName?: string | null): string | null {
  const name = text(fullName);
  if (!name) return null;
  const parts = name.split(/\s+/).filter(Boolean);
  const picked = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return picked.map((p) => p[0].toUpperCase()).join("");
}
