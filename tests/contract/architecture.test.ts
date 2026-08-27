import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Architectural boundary, enforced rather than documented.
 *
 * architecture.md rule 1: "Routes, pages, layouts, and Server Actions do not
 * import @/lib/database. They call a service." That rule had drifted to 37
 * violating files, because nothing checked it. This test keeps the public
 * surface at zero once it gets there.
 *
 * Scoped to (public) deliberately — admin and API still carry known debt and
 * are migrated domain by domain. Widen the scope as those land, rather than
 * asserting something currently false.
 */
function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("public route boundary", () => {
  it("no route under (public) imports the database directly", () => {
    const root = path.resolve(__dirname, "../../src/app/(public)");
    const offenders = filesUnder(root).filter((file) =>
      readFileSync(file, "utf8").includes("@/lib/database")
    );
    expect(
      offenders.map((f) => path.relative(root, f)),
      "public routes must call a service, not Prisma"
    ).toEqual([]);
  });

  /**
   * Extended to the admin tree in Section 7.8, once the last three files
   * (game, messages, the layout) were migrated. Keeping this scoped to what is
   * actually true matters — a guard asserting something false gets deleted
   * rather than fixed.
   *
   * src/app/api/** is deliberately NOT covered yet; those handlers are the
   * remaining known debt.
   */
  it("no route under admin imports the database directly", () => {
    const root = path.resolve(__dirname, "../../src/app/admin");
    const offenders = filesUnder(root).filter((file) =>
      readFileSync(file, "utf8").includes("@/lib/database")
    );
    expect(
      offenders.map((f) => path.relative(root, f)),
      "admin routes and actions must call a service, not Prisma"
    ).toEqual([]);
  });

  it("no component imports the database or Prisma types", () => {
    const root = path.resolve(__dirname, "../../src/components");
    const offenders = filesUnder(root).filter((file) => {
      const src = readFileSync(file, "utf8");
      return src.includes("@/lib/database");
    });
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});

/**
 * Server Actions authorize themselves.
 *
 * A Server Action compiles to an independently invocable POST endpoint. The
 * admin layout's requireAdmin() guards page RENDERING and does nothing for a
 * direct invocation, so an inline action that mutates the database without its
 * own check is reachable by anyone who can obtain its action id.
 *
 * Three pages were in that state — settings, game and messages — and the
 * messages one soft-deleted any contact message by id.
 *
 * Delegating to an action in actions.ts counts: those call requireAdmin via
 * getAuditContext. Only actions that hit `db` directly must guard inline.
 */
describe("server action authorization", () => {
  const DB_MUTATION = /db\.[a-zA-Z]+\.(update|create|delete|upsert|updateMany|deleteMany|createMany)/;
  const AUTH = /requireAdmin|getValidatedOwner/;

  /**
   * Split a file into one chunk per inline action.
   *
   * Checking the file as a whole is not enough — and this test was written that
   * way first, then verified by deleting a guard: it still passed, because a
   * sibling action in the same file supplied the matching `requireAdmin`. Each
   * action body has to be inspected on its own.
   */
  function actionBodies(src: string): string[] {
    const parts = src.split('"use server"');
    return parts.slice(1); // everything before the first marker is module scope
  }

  it("every inline server action that writes to the database authorizes itself", () => {
    const root = path.resolve(__dirname, "../../src/app/admin");
    const offenders: string[] = [];

    for (const file of filesUnder(root)) {
      const src = readFileSync(file, "utf8");
      if (!src.includes('"use server"')) continue;
      actionBodies(src).forEach((body, i) => {
        if (DB_MUTATION.test(body) && !AUTH.test(body)) {
          offenders.push(`${path.relative(root, file)} (action #${i + 1})`);
        }
      });
    }

    expect(
      offenders,
      "inline server actions that write to the database must call requireAdmin()"
    ).toEqual([]);
  });
});

/**
 * Server-side authorization on admin routes.
 *
 * The rule is an ORDERING rule, not a presence rule:
 *
 *   authorization must complete BEFORE any protected data access.
 *
 * A page that reads first and authorizes afterwards is not protected even
 * though both calls exist. `/admin/messages` was exactly that — its
 * `requireAdmin` calls guarded its Server Actions while the render read
 * visitor names, emails and message bodies unchecked. A presence-only check
 * would have called it compliant.
 *
 * Server Action bodies are REMOVED before analysis rather than truncated at
 * the first one. Truncating skipped any page whose data read appears after an
 * inline action in source order — which silently excluded /admin/experience
 * and /admin/projects/[id]/edit from an earlier version of this guard.
 *
 * Client pages are excluded: they render no server data, and the `/api/*`
 * handlers they fetch from are covered by the Server-Action guard above.
 */
describe("admin route authorization", () => {
  const AUTH = /await\s+(requireAdmin|getValidatedOwner)\s*\(/;
  // Deliberately NOT anchored on a preceding `await`: reads are often wrapped
  // in Promise.all([Service.method(), ...]), which an await-anchored pattern
  // misses entirely — that is how /admin/experience escaped an earlier
  // version of this guard.
  const DATA_READ = /(?:[A-Z][A-Za-z]*Service\.[a-zA-Z]+|db\.[a-zA-Z]+\.[a-zA-Z]+)\s*\(/;

  /**
   * Blanks out every inline Server Action body, preserving offsets so the
   * ordering comparison below stays meaningful.
   */
  function withoutActionBodies(src: string): string {
    const chars = src.split("");
    let marker = src.indexOf('"use server"');

    while (marker !== -1) {
      // Walk back to the enclosing function's opening brace.
      const open = src.lastIndexOf("{", marker);
      if (open === -1) break;

      // Forward brace match to its close.
      let depth = 0;
      let end = open;
      for (let i = open; i < src.length; i++) {
        if (src[i] === "{") depth++;
        else if (src[i] === "}") {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      for (let i = open; i <= end; i++) chars[i] = " ";
      marker = src.indexOf('"use server"', end + 1);
    }

    return chars.join("");
  }

  function adminServerPages(): Array<{ rel: string; scope: string }> {
    const root = path.resolve(__dirname, "../../src/app/admin");
    return filesUnder(root)
      .filter((f) => f.endsWith("page.tsx"))
      .map((f) => ({
        rel: path.relative(root, f),
        src: readFileSync(f, "utf8"),
      }))
      .filter(({ src }) => !src.slice(0, 200).includes('"use client"'))
      .map(({ rel, src }) => ({ rel, scope: withoutActionBodies(src) }))
      .filter(({ scope }) => DATA_READ.test(scope));
  }

  it("every admin page that reads data authorizes first", () => {
    const offenders: string[] = [];

    for (const { rel, scope } of adminServerPages()) {
      const auth = scope.search(AUTH);
      const read = scope.search(DATA_READ);

      if (auth === -1) offenders.push(`${rel} — reads data with NO authorization`);
      else if (read !== -1 && auth > read) offenders.push(`${rel} — authorizes AFTER its first data read`);
    }

    expect(offenders, "admin pages must authorize before reading").toEqual([]);
  });

  it("covers every data-reading admin page, so the filter cannot silently shrink", () => {
    const covered = adminServerPages().map((p) => p.rel.split(path.sep).join("/"));
    // Named explicitly: a filter regression that drops pages would otherwise
    // leave this suite passing while checking fewer and fewer files.
    for (const required of [
      "experience/page.tsx",
      "projects/[id]/edit/page.tsx",
      "messages/page.tsx",
      "media/page.tsx",
    ]) {
      expect(covered, `${required} must be covered by the authorization guard`).toContain(required);
    }
    expect(covered.length).toBeGreaterThanOrEqual(18);
  });

  it("passes the request pathname, keeping one auth cache key per request", () => {
    // requireAdmin is React.cache-wrapped with `pathname` in the key. A bare
    // requireAdmin() creates a second entry and doubles the session queries —
    // measured as 14 queries against a 10-query baseline before this was fixed.
    const offenders = adminServerPages()
      .filter(({ scope }) => /await\s+requireAdmin\(\s*\)/.test(scope))
      .map(({ rel }) => `${rel} — requireAdmin() without a pathname`);

    expect(offenders, "pass currentPathname() so the auth cache key is shared").toEqual([]);
  });
});
