/**
 * scripts/database-setup.js — Controlled database operations with MANDATORY
 * initialization follow-up.
 *
 * Every database-changing workflow must go through this orchestrator so that
 * initialize.js and verify-initialization.js always run after the schema
 * operation succeeds:
 *
 *   Database operation → initialize.js → verify-initialization.js
 *
 * Usage (via package.json):
 *   npm run db:migrate   → prisma migrate dev      + initialize + verify
 *   npm run db:setup     → prisma migrate deploy   + initialize + verify
 *   npm run db:push      → prisma db push          + initialize + verify
 *   npm run db:reset     → prisma migrate reset -f + initialize + verify
 *
 * Rules:
 *   - Only allowlisted operation names are accepted (no arbitrary shell input).
 *   - If the Prisma step fails, initialization does NOT run.
 *   - If initialization or verification fails, the whole command exits
 *     non-zero — never report success when the database is not ready.
 */

const { spawnSync } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

// Allowlist ONLY — operation names map to fixed argument arrays.
//
// `reset` destroys all data and re-applies migrations. It does NOT seed: the
// demo seeder is deliberately unwired in prisma.config.ts (see the comment
// there — it used to write a fictional identity into production on every
// reset, and Prisma 7 removed the `--skip-seed` flag that would have stopped
// it). initialize.js runs immediately after and creates what is required.
const ALLOWED_OPERATIONS = {
  migrate: ["prisma", "migrate", "dev"],
  deploy: ["prisma", "migrate", "deploy"],
  push: ["prisma", "db", "push"],
  reset: ["prisma", "migrate", "reset", "--force"],
};

function run(label, command, args) {
  console.log(`\n[database-setup] ${label}: ${command} ${args.join(" ")}\n`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    // Required on Windows to resolve npx.cmd / node from PATH; args come only
    // from the fixed allowlist above, never from user input.
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(`[database-setup] ${label} failed to start:`, result.error.message);
    return 1;
  }
  return result.status ?? 1;
}

function main() {
  const op = process.argv[2];

  if (!op || !Object.prototype.hasOwnProperty.call(ALLOWED_OPERATIONS, op)) {
    console.error("Usage: node scripts/database-setup.js <operation>\n");
    console.error("Allowed operations:");
    for (const name of Object.keys(ALLOWED_OPERATIONS)) {
      console.error(`  ${name}`);
    }
    process.exitCode = 1;
    return;
  }

  // Extra safety: prisma migrate reset destroys ALL data. Require explicit
  // confirmation via flag so `npm run db:reset` can't be triggered blindly.
  if (op === "reset" && !process.argv.includes("--yes")) {
    console.error("db:reset DESTROYS ALL DATA in the development database.");
    console.error("If you are sure, run:  npm run db:reset -- --yes\n");
    process.exitCode = 1;
    return;
  }

  // Optional migration name (migrate only): --name <slug>, strictly validated
  const prismaArgs = [...ALLOWED_OPERATIONS[op]];
  const nameIdx = process.argv.indexOf("--name");
  if (op === "migrate" && nameIdx !== -1) {
    const name = process.argv[nameIdx + 1] || "";
    if (!/^[a-z0-9_]{1,64}$/i.test(name)) {
      console.error("Invalid migration name. Use letters, digits, underscore.");
      process.exitCode = 1;
      return;
    }
    prismaArgs.push("--name", name);
  }

  // 1. Prisma operation
  const prismaExit = run("prisma", "npx", prismaArgs);
  if (prismaExit !== 0) {
    console.error("\n[database-setup] Prisma operation failed. Initialization was NOT run.\n");
    process.exitCode = prismaExit;
    return;
  }

  // 2. Mandatory initialization
  const initExit = run("initialize", "node", ["--env-file=.env", "scripts/initialize.js"]);
  if (initExit !== 0) {
    console.error("\nDatabase migration completed, but initialization failed.\n");
    console.error("The application has not been marked ready.");
    console.error("Review the error above and rerun:\n");
    console.error("  npm run initialize\n");
    process.exitCode = initExit;
    return;
  }

  // 3. Verification
  const verifyExit = run("verify", "node", ["--env-file=.env", "scripts/verify-initialization.js"]);
  if (verifyExit !== 0) {
    console.error("\n[database-setup] Verification failed — the database is not ready.\n");
    process.exitCode = verifyExit;
    return;
  }

  console.log("\n[database-setup] Database operation, initialization, and verification all succeeded.\n");
}

main();
