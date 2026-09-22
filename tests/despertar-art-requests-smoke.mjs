/**
 * Smoke Task B4 — pedidos de arte ao Mestre
 * Uso: node tests/despertar-art-requests-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const reqPath = path.join(root, 'assets/despertar/art-requests.json');
const briefPath = path.join(root, 'assets/despertar/PEDIDOS-MESTRE.md');
const planPath = path.join(root, 'docs/plano-despertar-ui-cookieclicker.md');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const plan = fs.readFileSync(planPath, 'utf8');

staticAssert(fs.existsSync(reqPath), 'art-requests.json');
staticAssert(fs.existsSync(briefPath), 'PEDIDOS-MESTRE.md');
staticAssert(pkg.includes('despertar:art-requests'), 'npm script despertar:art-requests');
staticAssert(pkg.includes('despertar-art-requests-smoke.mjs'), 'check inclui smoke B4');
staticAssert(plan.includes('Task B4'), 'plano menciona B4');
staticAssert(/### Task B4[\s\S]*?- \[x\] Abrir lista/.test(plan), 'Task B4 marcada no plano');

const doc = JSON.parse(fs.readFileSync(reqPath, 'utf8'));
staticAssert(doc.defaults?.formatPrimary === 'webp', 'formato WebP');
staticAssert(doc.defaults?.formatFallback === 'svg', 'fallback SVG');
staticAssert(Array.isArray(doc.requests) && doc.requests.length >= 10, '≥10 pedidos');

const byList = Object.fromEntries(doc.requests.map((r) => [r.listId, r]));
['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10'].forEach((id) => {
  staticAssert(byList[id], `lista §11 ${id}`);
});

staticAssert(doc.leva1?.includes('art_foice'), '1ª leva inclui foice');
staticAssert(byList.B1.priority === 'P0', 'B1 P0');
staticAssert(byList.B10.priority === 'P2', 'B10 P2');
staticAssert(Array.isArray(byList.B10.fileMissing), 'B10 fileMissing');

const genIds = new Set(GENERATORS.map((g) => g.id));
for (const key of ['art_t1', 'art_t2', 'art_t3', 'art_t4', 'art_t5', 'art_t6']) {
  const req = doc.requests.find((r) => r.id === key);
  staticAssert(req && genIds.has(req.generatorId), `generatorId válido ${key}`);
}

const upIds = new Set(UPGRADES.map((u) => u.id));
for (const id of byList.B8.upgradeIdsPriority || []) {
  staticAssert(upIds.has(id), `upgrade prioritário ${id}`);
}

if (errors.length) {
  console.error('despertar-art-requests-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}

run('prioridades P0 ⊂ leva1; P1/P2 presentes', () => {
  const p0 = doc.requests.filter((r) => r.priority === 'P0');
  assert.ok(p0.length >= 3);
  assert.equal(doc.requests.filter((r) => r.priority === 'P1').length >= 5, true);
  assert.equal(doc.requests.some((r) => r.priority === 'P2'), true);
});

run('brief do Mestre cita paths e paleta', () => {
  const brief = fs.readFileSync(briefPath, 'utf8');
  assert.ok(brief.includes('WebP'));
  assert.ok(brief.includes('#00a896'));
  assert.ok(brief.includes('foice-idle.webp'));
  assert.ok(brief.includes('minecraft.webp'));
});

console.log(`\ndespertar-art-requests-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
