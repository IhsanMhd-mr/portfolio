import { resolveTestDatabaseUrl } from "./test-db-url";
import { existsSync } from "node:fs";
import { vi } from "vitest";

// Service contract tests execute modules directly, outside Next's Cache
// Components runtime. Cache directives are production behavior verified by the
// production build; here they must be inert so tests can exercise service data
// semantics without a request cache.
vi.mock("next/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/cache")>();
  return {
    ...actual,
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
    revalidateTag: vi.fn(),
    updateTag: vi.fn(),
  };
});

/**
 * Per-worker environment. Runs before each test file's imports.
 *
 * globalSetup provisions the database in its own process; workers do not
 * inherit the DATABASE_URL it set there. src/lib/database.ts builds its pg Pool
 * at module load, so the variable has to be correct before the first import of
 * anything that reaches it — which is what setupFiles guarantees.
 */
if (existsSync(".env")) process.loadEnvFile(".env");
process.env.DATABASE_URL = resolveTestDatabaseUrl();
