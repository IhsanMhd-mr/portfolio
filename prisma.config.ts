import { defineConfig } from "prisma/config";

// Prisma 7 does not auto-load .env when a config file is present.
// Node 20.12+ can load it natively so every `npx prisma ...` command works
// without wrapper scripts having to inject DATABASE_URL themselves.
try {
  process.loadEnvFile(".env");
} catch {
  // .env may legitimately be absent (e.g. CI provides real env vars).
}

/**
 * Prisma 7 Configuration file
 * Connection URLs and paths are managed here instead of schema.prisma.
 */
export default defineConfig({
  schema: "src/prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "src/prisma/migrations",
    seed: "node node_modules/tsx/dist/cli.mjs src/prisma/seed.ts",
  },
});
