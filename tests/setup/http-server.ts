import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import { assertIsTestDatabase } from "./test-db-url";

/**
 * Builds and starts a real Next server against the test database.
 *
 * Some invariants cannot be observed from the service layer because they live
 * in route files or presentation components — a published-but-hidden project is
 * filtered correctly by PublicContentService yet still rendered by
 * `/projects/[slug]`, and section ordering is re-sorted inside components after
 * the service already ordered it. Only a real response exposes those.
 *
 * Production build, never `next dev`: dev-mode compilation dominates timings
 * and Turbopack recompiles per route, which makes failures flaky and slow.
 */
let server: ChildProcess | null = null;

export async function startHttpServer(testUrl: string): Promise<string> {
  assertIsTestDatabase(testUrl);

  const port = await freePort();
  const env = { ...process.env, DATABASE_URL: testUrl, NODE_ENV: "production" as const };

  console.log("[http] building (production build — this takes a minute)");
  execFileSync("npx", ["next", "build"], {
    env,
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  console.log(`[http] starting on :${port}`);
  server = spawn("npx", ["next", "start", "--port", String(port)], {
    env,
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForReady(baseUrl);
  console.log(`[http] ready at ${baseUrl}`);
  return baseUrl;
}

export function stopHttpServer() {
  if (!server) return;
  // On Windows the npx wrapper spawns a child; killing the wrapper alone
  // orphans the actual server and leaves the port held.
  if (process.platform === "win32" && server.pid) {
    try {
      execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      /* already gone */
    }
  } else {
    server.kill("SIGTERM");
  }
  server = null;
}

async function waitForReady(baseUrl: string, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseUrl, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Next server did not become ready within ${timeoutMs}ms`);
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}
