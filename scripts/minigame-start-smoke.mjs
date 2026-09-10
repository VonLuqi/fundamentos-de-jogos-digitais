/**
 * Smoke: carrega a cadeia do minigame no Chromium headless e reporta o erro real.
 * Uso: node scripts/minigame-start-smoke.mjs
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".map": "application/json",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/pages/minigame.html";
    const filePath = normalize(join(root, pathname.replace(/^\//, "")));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const pageUrl = `http://127.0.0.1:${port}/pages/minigame.html`;

let playwright;
try {
  playwright = await import("playwright");
} catch {
  try {
    playwright = await import("playwright-core");
  } catch {
    console.error("Instale playwright: npm i -D playwright");
    process.exit(2);
  }
}

const browser = await playwright.chromium.launch({ headless: true });
const page = await browser.newPage();
const logs = [];
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));
page.on("requestfailed", (req) => {
  logs.push(`[requestfailed] ${req.url()} :: ${req.failure()?.errorText || "?"}`);
});

// Stub de sessão para não redirecionar ao auth
await page.addInitScript(() => {
  localStorage.setItem(
    "fjd_session",
    JSON.stringify({ token: "smoke-token", name: "Smoke", role: "admin" })
  );
});

await page.route("**/api/**", async (route) => {
  const url = route.request().url();
  if (url.includes("/api/auth")) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { id: 1, name: "Smoke", role: "admin" } }),
    });
    return;
  }
  if (url.includes("feature") || url.includes("progress") || url.includes("unlock")) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ unlocks: { arcane_survivors: true }, arcane_survivors: true }),
    });
    return;
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
});

await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);

const btnState = await page.evaluate(() => {
  const btn = document.getElementById("start-btn");
  return btn
    ? { text: btn.textContent, disabled: btn.disabled, sealed: document.getElementById("minigame-play")?.classList.contains("is-sealed") }
    : null;
});
console.log("button:", btnState);

const startResult = await page.evaluate(async () => {
  const btn = document.getElementById("start-btn");
  if (!btn) return { ok: false, error: "no button" };
  if (btn.disabled) return { ok: false, error: `button disabled: ${btn.textContent}` };
  btn.click();
  await new Promise((r) => setTimeout(r, 4000));
  const canvas = document.getElementById("game-canvas");
  const menu = document.getElementById("menu-layer");
  return {
    ok: canvas && getComputedStyle(canvas).display !== "none",
    canvasDisplay: canvas ? getComputedStyle(canvas).display : null,
    menuDisplay: menu ? getComputedStyle(menu).display : null,
    menuOpacity: menu ? menu.style.opacity : null,
  };
});

console.log("startResult:", startResult);
console.log("--- logs ---");
for (const line of logs.slice(-80)) console.log(line);

await browser.close();
server.close();
process.exit(startResult.ok ? 0 : 1);
