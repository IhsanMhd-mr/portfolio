import { describe, it, expect } from "vitest";
import db from "@/lib/database";
import { FIXTURE } from "../fixtures/seed";

describe("test harness", () => {
  it("connects to the dedicated test database, not the dev one", async () => {
    const [{ current_database }] = await db.$queryRawUnsafe<{ current_database: string }[]>(
      "select current_database()"
    );
    expect(current_database).toMatch(/_test$/);
  });

  it("seeded the fixture", async () => {
    expect(await db.project.count()).toBe(3);
    expect(await db.education.count()).toBe(4);
    expect(await db.experience.count()).toBe(2);
    expect(await db.pageSection.count()).toBe(9);
    const page = await db.page.findUnique({ where: { key: "home" } });
    expect(page).not.toBeNull();
  });

  it("seeded order and date deliberately disagreeing", async () => {
    const rows = await db.educationVersion.findMany({
      where: { state: "PUBLISHED", visible: true },
      select: { institution: true, order: true, startDate: true },
    });
    const byOrder = [...rows].sort((a, b) => a.order - b.order)[0];
    const byDate = [...rows].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];
    expect(byOrder.institution).toBe(FIXTURE.olderInstitution);
    expect(byDate.institution).toBe(FIXTURE.newerInstitution);
    // If these ever coincide the ordering tests below stop proving anything.
    expect(byOrder.institution).not.toBe(byDate.institution);
  });
});
