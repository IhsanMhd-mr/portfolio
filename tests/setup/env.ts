import { resolveTestDatabaseUrl } from "./test-db-url";

/**
 * Per-worker environment. Runs before each test file's imports.
 *
 * globalSetup provisions the database in its own process; workers do not
 * inherit the DATABASE_URL it set there. src/lib/database.ts builds its pg Pool
 * at module load, so the variable has to be correct before the first import of
 * anything that reaches it — which is what setupFiles guarantees.
 */
process.loadEnvFile(".env");
process.env.DATABASE_URL = resolveTestDatabaseUrl();
