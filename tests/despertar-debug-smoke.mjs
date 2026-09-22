/**
 * Smoke — debug do Mestre (reset / grant presets).
 * Uso: node tests/despertar-debug-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import {
  DEBUG_GRANT_PRESETS,
  DEBUG_ZERO_PATCH,
  buildDebugGrantPatch,
  cloneDebugPatch,
  stripDespertarAchievements,
} from '../api/_lib/despertar-debug.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
const apiSrc = fs.readFileSync(path.join(root, 'api/despertar.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(html.includes('id="despertar-debug-reset"'), 'botão Zerar');
staticAssert(html.includes('data-debug-grant="souls_1k"'), 'grant +1K almas');
staticAssert(html.includes('data-debug-grant="obols_10"'), 'grant óbolos');
staticAssert(html.includes('data-debug-grant="verdicts_5"'), 'grant vereditos');
staticAssert(apiSrc.includes("action === 'debugReset'"), 'API debugReset');
staticAssert(apiSrc.includes("action === 'debugGrant'"), 'API debugGrant');
staticAssert(pkg.includes('despertar-debug-smoke.mjs'), 'check inclui este smoke');

if (errors.length) {
  console.error('despertar-debug-smoke (estático):');
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

run('zero patch limpa carteira e progressão', () => {
  const patch = cloneDebugPatch(DEBUG_ZERO_PATCH);
  assert.equal(patch.souls, '0.00');
  assert.equal(patch.verdicts, 0);
  assert.deepEqual(patch.generators_state, {});
});

run('grant soma almas + lifetime + run', () => {
  const result = buildDebugGrantPatch(
    { souls: '100', lifetime_souls: '200', run_souls: '50', obols: '1', mnemosyne: '0', verdicts: 2 },
    'souls_1k',
  );
  assert.equal(result.ok, true);
  assert.equal(cmp(result.patch.souls, '1100'), 0);
  assert.equal(cmp(result.patch.lifetime_souls, '1200'), 0);
  assert.equal(cmp(result.patch.run_souls, '1050'), 0);
});

run('grant vereditos e preset inválido', () => {
  const ok = buildDebugGrantPatch({ verdicts: 3 }, 'verdicts_5');
  assert.equal(ok.ok, true);
  assert.equal(ok.patch.verdicts, 8);
  const bad = buildDebugGrantPatch({}, 'nope');
  assert.equal(bad.ok, false);
});

run('presets cobrem almas/óbolos/essência/vereditos', () => {
  assert.ok(DEBUG_GRANT_PRESETS.souls_1m);
  assert.ok(DEBUG_GRANT_PRESETS.obols_25);
  assert.ok(DEBUG_GRANT_PRESETS.mnemosyne_50);
  assert.ok(DEBUG_GRANT_PRESETS.verdicts_40);
});

run('strip remove só família despertar', () => {
  const stripped = stripDespertarAchievements(
    { xp: 100, conquistas: ['despertar_primeira_alma', 'aula1_inicio'] },
    (id) => (id.startsWith('despertar_') ? 10 : 0),
  );
  assert.deepEqual(stripped.conquistas, ['aula1_inicio']);
  assert.equal(stripped.xp, 90);
});

console.log(`\ndespertar-debug-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
