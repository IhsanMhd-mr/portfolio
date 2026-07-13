import { defineConfig } from "prisma/config";

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
  },
});
