import { describe, it, expect, afterAll } from "vitest";
import db from "@/lib/database";
import { FIXTURE } from "../fixtures/seed";
import { stripScripts } from "./dom";

/**
 * All three templates render.
 *
 * Section selection, de-duplication and prop routing are shared
 * (render-sections.ts), but each template wraps the result in its own chrome —
 * and two of them give education-experience a different wrapper from every
 * other section. Exercising only the default template would leave those
 * branches unverified.
 */
const baseUrl = process.env.TEST_BASE_URL;
const suite = baseUrl ? describe : describe.skip;

async function setActiveTemplate(key: string) {
  const template = await db.template.findFirstOrThrow({ where: { key: key as never } });
  const page = await db.page.findUniqueOrThrow({ where: { key: "home" } });
  // No active PageVersion exists in the fixture, so resolveTemplateKey falls
  // through to the draft pointer — which is what this sets.
  await db.page.update({ where: { id: page.id }, data: { draftTemplateId: template.id } });
}

async function homepage() {
  const res = await fetch(`${baseUrl}/`);
  return { status: res.status, dom: stripScripts(await res.text()) };
}

suite("every template renders the same sections", () => {
  afterAll(async () => {
    await setActiveTemplate("MODERN_GLASS");
  });

  for (const key of ["MODERN_GLASS", "PROFESSIONAL_MINIMAL", "INTERACTIVE_3D"]) {
    it(`${key} renders content and de-duplicates education/experience`, async () => {
      await setActiveTemplate(key);
      const { status, dom } = await homepage();

      expect(status).toBe(200);
      // Content actually rendered, not just a 200 with an empty shell.
      expect(dom).toContain(FIXTURE.olderInstitution);
      expect(dom).toContain(FIXTURE.olderOrganization);
      // The combined block appears once, whichever wrapper the template uses.
      expect(dom.split(FIXTURE.olderInstitution).length - 1).toBe(1);
      // Admin ordering still wins in every template.
      expect(dom.indexOf(FIXTURE.olderInstitution)).toBeLessThan(
        dom.indexOf(FIXTURE.newerInstitution)
      );
    });
  }
});
