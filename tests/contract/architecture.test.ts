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
