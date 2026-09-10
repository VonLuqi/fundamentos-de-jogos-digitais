/**
 * Valida a cadeia de módulos do minigame (sem browser).
 * node scripts/minigame-module-graph-smoke.mjs
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const importMap = {
  three: "https://unpkg.com/three@0.185.1/build/three.module.js",
  "three/addons/": "https://unpkg.com/three@0.185.1/examples/jsm/",
};

const visited = new Set();
const failures = [];

function resolveSpecifier(specifier, parentFile) {
  if (specifier.startsWith("three/addons/")) {
    return importMap["three/addons/"] + specifier.slice("three/addons/".length);
  }
  if (specifier === "three") return importMap.three;
  if (specifier.startsWith("http://") || specifier.startsWith("https://")) return specifier;
  if (specifier.startsWith(".")) {
    return resolve(dirname(parentFile), specifier).replace(/\\/g, "/");
  }
  return null; // bare ignorado (não three)
}

async function loadLocal(absPath) {
  const text = await readFile(absPath, "utf8");
  return text;
}

async function loadRemote(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const importRe = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/g;
const dynImportRe = /import\s*\(\s*["']([^"']+)["']\s*\)/g;

async function walk(specifier, parentFile) {
  const resolved = resolveSpecifier(specifier, parentFile);
  if (!resolved) return;
  if (visited.has(resolved)) return;
  visited.add(resolved);

  try {
    let source;
    let nextParent = resolved;
    if (resolved.startsWith("http")) {
      source = await loadRemote(resolved);
      console.log("OK remote", resolved.slice(0, 90));
      // não percorre dependências remotas profundas (three é enorme)
      if (resolved.includes("unpkg.com/three")) return;
    } else {
      const file = resolved.endsWith(".js") ? resolved : `${resolved}.js`;
      source = await loadLocal(file);
      nextParent = file;
      console.log("OK local", file.replace(root, ""));
    }

    const specs = new Set();
    for (const re of [importRe, dynImportRe]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(source))) specs.add(m[1]);
    }
    for (const spec of specs) {
      await walk(spec, nextParent);
    }
  } catch (error) {
    failures.push({ resolved, parentFile, error: String(error.message || error) });
    console.error("FAIL", resolved, error.message || error);
  }
}

const entry = join(root, "js/minigame/main.js");
await walk("./systems/RenderSystem.js", join(root, "js/minigame/main.js"));
await walk("./engine/GameEngine.js", join(root, "js/minigame/main.js"));

console.log("\nvisited", visited.size, "failures", failures.length);
if (failures.length) {
  console.log(failures);
  process.exit(1);
}
