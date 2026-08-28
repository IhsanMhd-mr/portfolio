/**
 * scripts/dev-start.js — Development startup guard.
 *
 * Checks database connectivity, runs verification, and initializes the database
 * with missing records in development before booting the Next.js dev server.
 */

const { spawn, execSync, spawnSync } = require("child_process");
const { Client } = require("pg");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

if (process.env.DB_TARGET === "local") {
  if (!process.env.DATABASE_URL_LOCAL) {
    console.error("[dev-start] DB_TARGET=local but DATABASE_URL_LOCAL is not set in .env");
    process.exit(1);
  }
  process.env.DATABASE_URL = process.env.DATABASE_URL_LOCAL;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[dev-start] DATABASE_URL is not configured");
  process.exit(1);
}

const isLocalDatabase = /localhost|127\.0\.0\.1/.test(connectionString);

async function checkConnectivity() {
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch (err) {
    return false;
  }
}

async function main() {
  console.log("[dev-start] Cleaning Next.js port 3000...");
  try {
    execSync("npm run clean", { stdio: "inherit", cwd: projectRoot });
  } catch (e) {
    // Ignore clean script failures
  }

  console.log("[dev-start] Checking database connectivity...");
  let connected = await checkConnectivity();

  if (!connected && isLocalDatabase) {
    console.log("[dev-start] Database not responding. Attempting to start local PostgreSQL service...");
    try {
      execSync(`C:\\PROGRA~1\\PostgreSQL\\17\\bin\\pg_ctl.exe start -D C:\\PROGRA~1\\PostgreSQL\\17\\data`, { stdio: "inherit" });
      console.log("[dev-start] Waiting for PostgreSQL service to start...");
      await new Promise((resolve) => setTimeout(resolve, 2500));
    } catch (e) {
      console.error("[dev-start] Failed to run pg_ctl command:", e.message);
    }

    connected = await checkConnectivity();
  }

  if (!connected) {
    console.error("\n[dev-start] CRITICAL ERROR: Could not connect to PostgreSQL database.");
    console.error("Please make sure your database server is running and DATABASE_URL in .env is correct.\n");
    process.exit(1);
  }

  console.log("[dev-start] Database connection established.");

  // Check initialization
  console.log("[dev-start] Checking database initialization status...");
  const verifyResult = spawnSync("node", ["scripts/verify-initialization.js"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });

  if (verifyResult.status !== 0) {
    console.log("[dev-start] Missing database records. Running initialization...");
    const initResult = spawnSync("node", ["scripts/initialize.js"], {
      cwd: projectRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env
    });

    if (initResult.status !== 0) {
      console.error("[dev-start] Database initialization failed. Development server cannot start.");
      process.exit(1);
    }

    console.log("[dev-start] Re-verifying database initialization...");
    const verifyResult2 = spawnSync("node", ["scripts/verify-initialization.js"], {
      cwd: projectRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env
    });

    if (verifyResult2.status !== 0) {
      console.error("[dev-start] Database verification failed after initialization. Development server cannot start.");
      process.exit(1);
    }
  }

  console.log("[dev-start] Database verified successfully. Starting Next.js dev server...");
  // --webpack: this pinned Next.js build's Turbopack dev mode fails to resolve
  // next/font/google (Module not found: '@vercel/turbopack-next/internal/font/google/font'
  // — a package that doesn't exist on the public npm registry, not just missing
  // locally). Production builds (next build / next start) are unaffected, this
  // is Turbopack-dev-specific. Falls back to the working webpack dev path.
  const nextDev = spawn("npx", ["next", "dev", "--webpack"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });

  nextDev.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error("[dev-start] Unexpected error in startup guard:", err);
  process.exit(1);
});
