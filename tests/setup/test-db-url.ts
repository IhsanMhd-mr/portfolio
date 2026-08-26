/**
 * Resolves the URL of the dedicated test database.
 *
 * Derived from DATABASE_URL_LOCAL (the local Postgres the dev server uses) by
 * swapping the database name for `<name>_test`. The dev database is never
 * touched: `assertIsTestDatabase` refuses any URL whose database name does not
 * end in `_test`, and every destructive step in tests/setup/global.ts calls it
 * first. A typo in .env therefore fails the run instead of dropping real data.
 */

const TEST_DB_SUFFIX = "_test";

export function resolveTestDatabaseUrl(): string {
  // Explicit override wins — lets CI point at its own throwaway database.
  const override = process.env.TEST_DATABASE_URL;
  if (override) return assertIsTestDatabase(override);

  const local = process.env.DATABASE_URL_LOCAL;
  if (!local) {
    throw new Error(
      "DATABASE_URL_LOCAL is not set, and TEST_DATABASE_URL was not provided.\n" +
        "Tests need a local Postgres to create a throwaway `_test` database in."
    );
  }

  const url = new URL(local);
  // pathname is "/portfolio"; strip the leading slash to get the db name.
  const name = url.pathname.replace(/^\//, "");
  if (!name) throw new Error(`DATABASE_URL_LOCAL has no database name: ${redact(local)}`);
  if (name.endsWith(TEST_DB_SUFFIX)) return assertIsTestDatabase(local);

  url.pathname = `/${name}${TEST_DB_SUFFIX}`;
  return assertIsTestDatabase(url.toString());
}

/** URL of the `postgres` maintenance database on the same server. */
export function resolveMaintenanceUrl(testUrl: string): string {
  const url = new URL(testUrl);
  url.pathname = "/postgres";
  return url.toString();
}

export function databaseNameOf(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

/**
 * The safety interlock. Every DROP/CREATE/push in the harness goes through
 * this, so no code path can operate on a database that is not clearly a test
 * database.
 */
export function assertIsTestDatabase(url: string): string {
  const name = databaseNameOf(url);
  if (!name.endsWith(TEST_DB_SUFFIX)) {
    throw new Error(
      `Refusing to run tests against database "${name}" — the name must end in ` +
        `"${TEST_DB_SUFFIX}". This guard exists so a misconfigured env cannot ` +
        `drop the development database.`
    );
  }
  return url;
}

/** Strips credentials so a URL can appear in logs and errors. */
export function redact(url: string): string {
  return url.replace(/:\/\/[^@]*@/, "://<credentials>@");
}
