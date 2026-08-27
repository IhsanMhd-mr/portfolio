import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Database access is confined to the service layer.
 *
 * architecture.md rule 1 has always said routes call a service rather than
 * Prisma. It had drifted to 37 violating files because nothing checked it.
 * Now that `src/app/` is clean, this keeps it that way — a new route reaching
 * for `db` fails lint instead of being noticed in review, or not.
 *
 * The allowed importers are configured per-directory below:
 *   src/services/  — owns queries
 *   src/lib/       — the Prisma singleton itself, plus auth/audit infrastructure
 *   src/prisma/    — seed script
 *   tests/         — assert against the database directly
 */
const NO_DIRECT_DB = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "@/lib/database",
          message:
            "Routes, pages, actions and components must call a service instead of Prisma. See architecture.md rule 1.",
        },
      ],
      patterns: [
        {
          group: ["**/lib/database"],
          message:
            "Routes, pages, actions and components must call a service instead of Prisma. See architecture.md rule 1.",
        },
      ],
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The architectural boundary. Applied to everything that is not the
    // service layer, lib, prisma or tests.
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: NO_DIRECT_DB,
  },
  {
    rules: {
      // ── Re-enabled: these had zero violations, so they cost nothing and
      // ── stop the corresponding mistakes from being reintroduced.
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/immutability": "error",
      "@next/next/no-html-link-for-pages": "error",

      // ── Re-enabled after fixing the existing violations.
      // no-unused-vars in particular caught real dead code during the
      // service-layer migration — imports and destructured bindings left
      // behind when their usage moved into a service.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          // `catch (e)` where the error is deliberately swallowed is idiomatic
          // and reads worse as `catch (_e)`.
          caughtErrors: "none",
        },
      ],
      "prefer-const": "error",
      "react/no-unescaped-entities": "error",

      // ── Still off, with the outstanding count recorded so the debt is
      // ── visible rather than forgotten. Each needs its own pass.
      "@typescript-eslint/no-explicit-any": "off", // 127 — mostly section/template props
      "react/jsx-no-comment-textnodes": "off", // 22
      "@next/next/no-img-element": "off", // 15 — needs next/image migration
      "react-hooks/set-state-in-effect": "off", // 7
    },
  },
  {
    // Plain Node CLI scripts (CommonJS by design, and not part of the app).
    // Must come AFTER the general rules block — in flat config the later
    // entry wins, and placing this first meant the block below re-enabled
    // the very rules it exempts.
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-const": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
