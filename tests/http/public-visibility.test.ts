import { describe, it, expect, beforeAll } from "vitest";
import { FIXTURE } from "../fixtures/seed";
import { stripScripts } from "./dom";

/**
 * Route-level behaviour. Requires TEST_HTTP=1 (see tests/setup/global.ts).
 *
 * These assertions cannot be made at the service layer: PublicContentService
 * filters hidden rows correctly, yet `/projects/[slug]` runs its own query and
 * can still serve them. That gap is exactly what this file exists to observe.
 */
const baseUrl = process.env.TEST_BASE_URL;
const suite = baseUrl ? describe : describe.skip;

async function get(path: string) {
  const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  // Compare rendered DOM, not the RSC flight payload — see ./dom.ts.
  return { status: res.status, html: stripScripts(await res.text()) };
}

suite("public routes — published-only contract", () => {
  beforeAll(() => {
    if (!baseUrl) throw new Error("TEST_BASE_URL unset");
  });

  it("serves the visible project's detail page", async () => {
    const { status, html } = await get(`/projects/${FIXTURE.visibleProjectSlug}`);
    expect(status).toBe(200);
    expect(html).toContain("Visible Project");
  });

  it("404s a draft-only project", async () => {
    const { status } = await get(`/projects/${FIXTURE.draftOnlyProjectSlug}`);
    expect(status).toBe(404);
  });

  /**
   * B1. The project is PUBLISHED but `visible: false`. It is correctly absent
   * from `/projects` and `/`, so the admin has every reason to believe it is
   * hidden — but `getProjectBySlug` filters only on `state`, so the detail page
   * still renders it to anonymous visitors.
   *
   * Fixed: `getProjectBySlug` now filters on `visible` as well as `state`.
   * This test carried an `it.fails` marker while the leak existed; the marker
   * came off when the fix landed, which is the point of using `.fails` rather
   * than skipping.
   */
  it("404s a published project marked not-visible", async () => {
    const { status } = await get(`/projects/${FIXTURE.hiddenProjectSlug}`);
    expect(status).toBe(404);
  });

  it("omits the hidden project from the projects list", async () => {
    const { html } = await get("/projects");
    expect(html).not.toContain("Hidden Project");
  });

  it("omits the hidden project from the homepage", async () => {
    const { html } = await get("/");
    expect(html).not.toContain("Hidden Project");
  });

  it("omits hidden education from /about", async () => {
    const { html } = await get("/about");
    expect(html).not.toContain("Hidden Institution");
  });
});

suite("public routes — all render", () => {
  for (const path of ["/", "/projects", "/about", "/resume", "/timeline", "/contact"]) {
    it(`GET ${path} responds 200`, async () => {
      const { status } = await get(path);
      expect(status).toBe(200);
    });
  }
});

suite("admin routes — unauthenticated", () => {
  it("redirects /admin away for anonymous visitors", async () => {
    const { status } = await get("/admin");
    expect([302, 307, 308]).toContain(status);
  });
});

suite("admin API — unauthenticated", () => {
  it("rejects GET /api/templates without a session", async () => {
    // B5: this handler was public while the POST beside it required an owner.
    const res = await fetch(`${baseUrl}/api/templates`, { redirect: "manual" });
    expect(res.status).toBe(401);
  });
});

suite("showOnResume separates /about from /resume", () => {
  it("shows a resume-excluded qualification on /about", async () => {
    const { html } = await get("/about");
    expect(html).toContain(FIXTURE.resumeExcludedInstitution);
  });

  it("omits it from /resume", async () => {
    // showOnResume previously filtered technologies only, so clearing it on a
    // qualification or a job had no effect anywhere.
    const { html } = await get("/resume");
    expect(html).not.toContain(FIXTURE.resumeExcludedInstitution);
  });

  it("still renders resume-flagged content on /resume", async () => {
    const { html } = await get("/resume");
    expect(html).toContain(FIXTURE.olderInstitution);
  });
});
