/**
 * Fetch a route and return only its rendered DOM.
 *
 * Next embeds the React Server Components flight payload in inline
 * `self.__next_f.push(...)` scripts, so every rendered string appears at least
 * twice in the raw response — once in the markup and once in that payload.
 * Asserting against the raw HTML therefore double-counts, and an occurrence
 * check like "renders exactly once" fails against correct code.
 *
 * Stripping <script> blocks leaves what a visitor actually sees, which is what
 * these assertions are about.
 */
export async function fetchDom(baseUrl: string, path: string): Promise<string> {
  const res = await fetch(`${baseUrl}${path}`);
  return stripScripts(await res.text());
}

export function stripScripts(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
}

/** Index of `needle` in the DOM, asserting it is present. */
export function domIndex(dom: string, needle: string): number {
  const i = dom.indexOf(needle);
  if (i === -1) throw new Error(`"${needle}" not found in rendered DOM`);
  return i;
}
