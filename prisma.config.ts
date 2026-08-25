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
    // NO automatic seed. `src/prisma/seed.ts` is a DEMO seeder: it writes a
    // fictional identity ("Jane Doe", contact address admin@portfolio.com and a
    // matching social link) plus demo content into whichever database
    // DATABASE_URL points at. Wired in here it ran on every `prisma migrate
    // reset` — including against production — and that data then renders
    // publicly as the site owner's own words. Prisma 7 removed the
    // `--skip-seed` flag, so omitting the key is the only way to stop it.
    //
    // scripts/database-setup.js runs initialize.js after every schema
    // operation, which creates everything actually required. To load the demo
    // dataset deliberately:
    //   node node_modules/tsx/dist/cli.mjs src/prisma/seed.ts
  },
});
