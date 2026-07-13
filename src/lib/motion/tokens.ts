/**
 * Motion Language & Tokens
 * See: frontend_design_spec.md §7
 *
 * Exported as constants for use with Framer Motion.
 * These are the ONLY motion values allowed in the project.
 */

/* ── Duration tokens (seconds) ── */
export const dur = {
  xs: 0.12,
  sm: 0.2,
  md: 0.3,
  lg: 0.5,
  xl: 0.7,
  hero: 0.9,
} as const;

/* ── Easing curves (cubic-bezier arrays) ── */
export const ease = {
  quiet: [0.22, 1, 0.36, 1] as const,   // Template 1
  glass: [0.16, 1, 0.3, 1] as const,    // Template 2
  hero: [0.83, 0, 0.17, 1] as const,    // Template 3 wipes
  inOut: [0.65, 0, 0.35, 1] as const,
} as const;

/* ── Spring configs ── */
export const spring = {
  pop: { type: "spring" as const, stiffness: 420, damping: 26 },
  magnetic: { type: "spring" as const, stiffness: 300, damping: 20 },
  drawer: { type: "spring" as const, stiffness: 260, damping: 30 },
} as const;

/* ── Stagger intervals (seconds) ── */
export const stagger = {
  tight: 0.04,
  base: 0.08,
  loose: 0.12,
} as const;

/* ── Template default preset map ── */
export const templateDefaultPreset = {
  minimal: "rise-quiet",
  glass: "rise-glass",
  threed: "wipe-bold",
} as const;

export type TemplateId = keyof typeof templateDefaultPreset;
