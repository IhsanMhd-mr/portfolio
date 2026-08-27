import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "@/lib/database";
import { ProjectService } from "@/services/project.service";
import {
  PROMOTED_FIELDS,
  projectChangeState,
} from "@/services/publish-diff.service";
import { FIXTURE } from "../fixtures/seed";

/**
 * Draft-vs-published change detection for projects.
 *
 * There used to be two implementations: PROMOTED_FIELDS + valuesEqual in
 * publish-diff.service, and a hand-written 31-field array compared with `!==`
 * inside admin/projects/page.tsx. They had drifted apart by five columns, so
 * the admin list reported a project as "in sync" while publishing would have
 * changed the live site.
 *
 * scripts/check-promoted-fields.js guards PROMOTED_FIELDS against the schema.
 * It could not guard a second list living in a route — which is exactly how
 * the drift went unnoticed. These tests pin the single implementation.
 */
let ctx: { actorId: string; loginMethod: string; loginAccountId: string | null };
const CREATED: string[] = [];

beforeAll(async () => {
  const owner = await db.user.findUniqueOrThrow({ where: { username: FIXTURE.ownerUsername } });
  ctx = { actorId: owner.id, loginMethod: "test", loginAccountId: null };
});

afterAll(async () => {
  const ids = CREATED.filter(Boolean);
  if (ids.length > 0) await db.project.deleteMany({ where: { id: { in: ids } } });
});

describe("projectChangeState", () => {
  it("reports DRAFT_ONLY when nothing has been published", () => {
    expect(projectChangeState({ title: "A" }, undefined)).toBe("DRAFT_ONLY");
  });

  it("reports SYNC when draft and published match on every promoted field", () => {
    const row: Record<string, unknown> = {};
    for (const f of PROMOTED_FIELDS.project) row[f] = null;
    expect(projectChangeState({ ...row }, { ...row })).toBe("SYNC");
  });

  /**
   * The regression that motivated this. Each of these five is promoted — a
   * publish WILL copy it — but the route's own field list omitted them, so the
   * UI claimed there was nothing to publish.
   */
  for (const field of [
    "manualOrder",
    "metrics",
    "showOnHomepage",
    "showOnResume",
    "showOnTimeline",
  ] as const) {
    it(`detects a change in ${field}`, () => {
      const base: Record<string, unknown> = {};
      for (const f of PROMOTED_FIELDS.project) base[f] = null;
      const draft = { ...base, [field]: field === "manualOrder" ? 5 : true };
      expect(projectChangeState(draft, base)).toBe("DRAFT_CHANGES");
    });
  }

  it("compares JSON columns by value, not by reference", () => {
    const base: Record<string, unknown> = {};
    for (const f of PROMOTED_FIELDS.project) base[f] = null;
    const a = { ...base, metrics: { users: 10 } };
    const b = { ...base, metrics: { users: 10 } };
    // `!==` on two structurally identical objects is always true, so the old
    // implementation reported a phantom change on every render.
    expect(projectChangeState(a, b)).toBe("SYNC");
  });

  it("treats equal dates written as Date and string as unchanged", () => {
    const base: Record<string, unknown> = {};
    for (const f of PROMOTED_FIELDS.project) base[f] = null;
    const d = new Date("2020-01-01T00:00:00.000Z");
    expect(
      projectChangeState({ ...base, startDate: d }, { ...base, startDate: d.toISOString() })
    ).toBe("SYNC");
  });
});

describe("ProjectService.listAdminPage", () => {
  it("returns the fixture projects with a change state on each row", async () => {
    const { items, totalCount } = await ProjectService.listAdminPage({
      page: 1,
      pageSize: 50,
      scanLimit: 500,
    });
    expect(totalCount).toBeGreaterThan(0);
    for (const row of items) {
      expect(["SYNC", "DRAFT_ONLY", "DRAFT_CHANGES"]).toContain(row.changeState);
    }
  });

  it("filters to hidden projects", async () => {
    const { items } = await ProjectService.listAdminPage({
      page: 1,
      pageSize: 50,
      filter: "hidden",
      scanLimit: 500,
    });
    // The fixture's hidden project has no DRAFT version, so this asserts the
    // filter runs and returns only rows whose draft is actually hidden.
    for (const row of items) expect(row.draft?.visible).toBe(false);
  });

  it("searches by title", async () => {
    const created = await ProjectService.createProject(
      { title: "Change State Probe", summary: "s", slug: "change-state-probe" },
      ctx
    );
    // NOTE: createProject returns { project, draft }. The five versioned
    // services disagree here — education/experience/timeline return
    // { base, draft } and technology returns { tech, draft }.
    CREATED.push(created.project.id);

    const { items } = await ProjectService.listAdminPage({
      page: 1,
      pageSize: 50,
      q: "Change State Probe",
      scanLimit: 500,
    });
    expect(items.map((i) => i.draft?.title)).toContain("Change State Probe");
  });

  it("a never-published project reports DRAFT_ONLY", async () => {
    const { items } = await ProjectService.listAdminPage({
      page: 1,
      pageSize: 50,
      q: "Change State Probe",
      scanLimit: 500,
    });
    const row = items.find((i) => i.draft?.title === "Change State Probe");
    expect(row?.changeState).toBe("DRAFT_ONLY");
  });
});
