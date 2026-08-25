import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Prisma 7 Database Client Helper
 * Instantiates the PrismaClient using the PostgreSQL driver adapter (pg),
 * complying with Prisma 7's Rust-free driver architecture.
 * Implements a singleton pattern to avoid connection leaks during Next.js hot reloads.
 */
const prismaClientSingleton = () => {
  // Fail loudly when DATABASE_URL is missing in production.
  //
  // This used to fall back to localhost:5432 unconditionally. On a serverless
  // host nothing is listening there, so a forgotten environment variable did
  // not surface as "DATABASE_URL is not set" — it surfaced as
  // DatabaseNotReachable on every request, i.e. an opaque "A server error
  // occurred" page with no indication of the cause. Deleting and recreating a
  // Vercel project drops its environment variables, which makes this an easy
  // state to land in. The convenience default is only safe in development.
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString && process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. The application cannot start without it.\n" +
        "On Vercel: Project → Settings → Environment Variables → add DATABASE_URL " +
        "to the Production environment, then redeploy."
    );
  }

  const pool = new Pool({
    connectionString:
      connectionString || "postgresql://postgres:postgres@localhost:5432/portfolio?schema=public",
    // Kept modest deliberately: on a serverless host every warm instance holds
    // its own pool, so this is a per-instance ceiling and not a global one.
    // Point DATABASE_URL at Neon's -pooler endpoint so pgbouncer arbitrates.
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const db = globalThis.prismaGlobal ?? prismaClientSingleton();

export default db;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}
