/**
 * Smoke Task C3 — áudio deferido (Q18)
 * Uso: node tests/despertar-audio-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SFX_ENABLED, SFX_IDS, playSfx, preloadSfx } from '../js/hades-despertar/ui/audio.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const audioSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/audio.js'), 'utf8');
const plan = fs.readFileSync(path.join(root, 'docs/plano-despertar-ui-cookieclicker.md'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const indexJs = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');

staticAssert(fs.existsSync(path.join(root, 'js/hades-despertar/ui/audio.js')), 'audio.js existe');
staticAssert(audioSrc.includes('Q18') || audioSrc.includes('deferido'), 'documenta decisão Q18');
staticAssert(pkg.includes('despertar-audio-smoke.mjs'), 'check inclui audio smoke');
staticAssert(pkg.includes('js/hades-despertar/ui/audio.js'), 'check cobre audio.js');
staticAssert(/### Task C3[\s\S]*?- \[x\] Decidir/.test(plan), 'Task C3 marcada no plano');
staticAssert(!indexJs.includes('playSfx('), 'index não dispara SFX nesta leva');

if (errors.length) {
  console.error('despertar-audio-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}

await run('SFX desligado nesta reformulação', () => {
  assert.equal(SFX_ENABLED, false);
  assert.equal(playSfx(SFX_IDS.reap), false);
  assert.equal(playSfx(SFX_IDS.buy), false);
  assert.equal(playSfx(SFX_IDS.juizoHit), false);
});

await run('preload no-op e IDs reservados', async () => {
  await preloadSfx();
  assert.ok(SFX_IDS.reap);
  assert.ok(SFX_IDS.upgrade);
  assert.ok(SFX_IDS.lethe);
});

console.log(`\ndespertar-audio-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
