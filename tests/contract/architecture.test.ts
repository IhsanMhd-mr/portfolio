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

  it("no component imports the database or Prisma types", () => {
    const root = path.resolve(__dirname, "../../src/components");
    const offenders = filesUnder(root).filter((file) => {
      const src = readFileSync(file, "utf8");
      return src.includes("@/lib/database");
    });
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});
