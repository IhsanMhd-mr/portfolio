import { chromium } from "file:///C:/Users/ihsan/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
import fs from "fs";

const BASE = "http://localhost:3000";
const OUT = "_verify_shots";
fs.mkdirSync(OUT, { recursive: true });

const consoleErrors = [];
const hydrationErrors = [];

function log(...a) { console.log(...a); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
const page = await ctx.newPage();

page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    const t = m.text();
    consoleErrors.push(t);
    if (/hydrat|did not match|server rendered|Text content/i.test(t)) hydrationErrors.push(t);
  }
});
page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

// ── Login ───────────────────────────────────────────────────────────────
log("→ login");
await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector('input', { timeout: 120000 });

// Inputs are React-controlled and use id= (no name=), so target by id and
// confirm the values actually landed before submitting.
await page.fill("#identifier", "superadmin");
await page.fill("#password", "Pass@123#");
const gotId = await page.inputValue("#identifier");
const gotPw = await page.inputValue("#password");
log(`   filled identifier="${gotId}" password=${gotPw ? "(set)" : "(EMPTY)"}`);
await page.click('button[type="submit"]:visible');

await page.waitForURL(/\/admin\/(dashboard|settings)/, { timeout: 120000 }).catch(() => {});
log("   landed:", page.url());
await shot("01-after-login");

if (!/\/admin\/dashboard/.test(page.url())) {
  log("!! did not reach dashboard; body snippet:");
  log((await page.locator("body").innerText().catch(() => "")).slice(0, 400));
}

// ── 1. Dashboard hydration ──────────────────────────────────────────────
log("\n→ dashboard (hydration check)");
consoleErrors.length = 0; hydrationErrors.length = 0;
await page.goto(`${BASE}/admin/dashboard`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(2500);
await shot("02-dashboard");
log(`   hydration errors: ${hydrationErrors.length}`);
hydrationErrors.slice(0, 3).forEach((e) => log("   ! " + e.slice(0, 200)));

// grab a rendered timestamp to eyeball the locale
const ts = await page.locator("text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/").first().innerText().catch(() => "(none found)");
log("   sample timestamp:", ts);

// ── 2. Edit routes ──────────────────────────────────────────────────────
const entities = ["technologies", "education", "experience", "timeline", "certifications", "navigation"];
const results = {};

for (const ent of entities) {
  log(`\n→ ${ent}`);
  consoleErrors.length = 0;
  await page.goto(`${BASE}/admin/${ent}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2000);
  await shot(`10-${ent}-list`);

  const editLinks = page.locator(`a[href*="/admin/${ent}/"][href$="/edit"]`);
  const n = await editLinks.count();
  log(`   edit links found: ${n}`);
  if (n === 0) { results[ent] = "NO EDIT LINK"; continue; }

  const href = await editLinks.first().getAttribute("href");
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);
  await shot(`11-${ent}-edit`);

  // are fields prefilled?
  const vals = await page.locator("form input[type='text'], form input:not([type]), form textarea").evaluateAll(
    (els) => els.map((e) => (e).value).filter((v) => v && v.length)
  );
  const prefilled = vals.length > 0;
  log(`   prefilled fields: ${vals.length} ${prefilled ? "✓" : "✗"}  e.g. ${JSON.stringify(vals.slice(0, 2))}`);
  results[ent] = prefilled ? `OK (${vals.length} prefilled)` : "NOT PREFILLED";

  const errs = consoleErrors.filter((e) => !/metadataBase|favicon/i.test(e));
  if (errs.length) log(`   console errors: ${errs.length} — ${errs[0].slice(0, 150)}`);
}

log("\n════ SUMMARY ════");
for (const [k, v] of Object.entries(results)) log(`  ${k.padEnd(16)} ${v}`);
log(`  dashboard hydration errors: ${hydrationErrors.length}`);

await browser.close();
