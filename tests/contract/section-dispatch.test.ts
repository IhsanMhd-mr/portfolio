import { describe, it, expect } from "vitest";
import { resolveRenderableSections } from "@/components/sections/render-sections";
import { COLLIDING_KEYS, dbEnumToRegistryKey, sectionMeta, sectionRegistry } from "@/components/sections/registry";

/**
 * Section dispatch — the logic that used to be copy-pasted into all three
 * templates.
 */
const data = {
  profile: { fullName: "Test" },
  projects: [],
  technologies: [],
  timelineEntries: [],
  education: [],
  experience: [],
  certifications: [],
  gameSettings: null,
};

const row = (id: string, type: string) => ({ id, type, settings: {} });

describe("registry integrity", () => {
  it("maps every SectionType to a component or explicit null", () => {
    for (const [type, key] of Object.entries(dbEnumToRegistryKey)) {
      if (key === null) continue;
      expect(sectionRegistry[key], `${type} -> ${key} has no component`).toBeDefined();
    }
  });

  it("has a metadata decision for every SectionType", () => {
    const metaKeys = Object.keys(sectionMeta).sort();
    const mapKeys = Object.keys(dbEnumToRegistryKey).sort();
    // Both are typed Record<SectionType, ...>, so this catches a value added
    // to one map and forgotten in the other.
    expect(metaKeys).toEqual(mapKeys);
  });

  it("derives colliding keys from the map rather than a hand-written list", () => {
    expect([...COLLIDING_KEYS].sort()).toEqual(["contact", "education-experience"]);
  });
});

describe("de-duplication", () => {
  it("renders education-experience once when EDUCATION and EXPERIENCE both exist", () => {
    const out = resolveRenderableSections(
      [row("1", "EDUCATION"), row("2", "EXPERIENCE")],
      data
    );
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe("education-experience");
  });

  it("renders contact once when CONTACT and CALL_TO_ACTION both exist", () => {
    // Previously not de-duplicated: the two enums map to one component, so a
    // page carrying both rendered the contact block twice.
    const out = resolveRenderableSections(
      [row("1", "CONTACT"), row("2", "CALL_TO_ACTION")],
      data
    );
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe("contact");
  });

  it("keeps the FIRST of a colliding pair, preserving page order", () => {
    const out = resolveRenderableSections(
      [row("exp", "EXPERIENCE"), row("edu", "EDUCATION")],
      data
    );
    expect(out[0].id).toBe("exp");
  });

  it("does NOT de-duplicate a key only one SectionType maps to", () => {
    // Two custom-content blocks, or two project grids with different settings,
    // are a legitimate thing to configure. Only many-to-one keys collapse.
    const out = resolveRenderableSections(
      [row("1", "CUSTOM_CONTENT"), row("2", "CUSTOM_CONTENT")],
      data
    );
    expect(out).toHaveLength(2);
  });

  it("skips a type that maps to nothing", () => {
    expect(resolveRenderableSections([row("1", "FOOTER_SPACER")], data)).toHaveLength(0);
  });

  it("skips an unrecognised type instead of throwing", () => {
    expect(resolveRenderableSections([row("1", "NOT_A_REAL_TYPE")], data)).toHaveLength(0);
  });
});

describe("prop routing", () => {
  it("gives education-experience both datasets", () => {
    const [s] = resolveRenderableSections([row("1", "EDUCATION")], data);
    expect(s.props).toHaveProperty("education");
    expect(s.props).toHaveProperty("experience");
  });

  it("gives stack-game technologies and gameSettings", () => {
    const [s] = resolveRenderableSections([row("1", "STACK_GAME")], data);
    expect(s.props).toHaveProperty("technologies");
    expect(s.props).toHaveProperty("gameSettings");
  });

  it("always passes settings through", () => {
    const out = resolveRenderableSections([{ id: "1", type: "HERO", settings: { title: "X" } }], data);
    expect(out[0].props.settings).toEqual({ title: "X" });
  });
});
