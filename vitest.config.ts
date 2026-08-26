import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest configuration.
 *
 * Tests run against a DEDICATED `portfolio_test` database, never the dev one.
 * `tests/setup/global.ts` provisions and seeds it once per run; `DATABASE_URL`
 * is rewritten there before any module imports `@/lib/database`, because that
 * module builds its pg Pool at import time from whatever the env holds then.
 *
 * Two suites with different costs:
 *   tests/contract/** — service-level, no server, fast (the default run)
 *   tests/http/**     — fetch against a real `next start`, opt-in via TEST_HTTP=1
 *
 * The HTTP suite exists because some invariants live in route files rather
 * than services (see tests/http/public-visibility.test.ts), and a service-level
 * test structurally cannot observe those.
 */
export default defineConfig({
  test: {
    globalSetup: ["./tests/setup/global.ts"],
    setupFiles: ["./tests/setup/env.ts"],
    // Prisma writes to a shared database; parallel files would race on the
    // same rows. The suite is small enough that serial is not a real cost.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
