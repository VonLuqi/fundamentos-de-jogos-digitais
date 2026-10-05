/**
 * Smoke Task F3 — UX Lethe: memória permanente + toast pós-ritual.
 * Uso: node tests/despertar-lethe-f3-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  countLethePermanents,
  describeLethe,
  formatLetheMemoryPreview,
  formatLetheMemoryToast,
} from '../js/hades-despertar/ui/UIRenderer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const plan = fs.readFileSync(path.join(root, 'docs/plano-despertar-producao-profundo.md'), 'utf8');

staticAssert(html.includes('id="lethe-memory"'), 'painel #lethe-memory');
staticAssert(html.includes('id="despertar-lethe-memory"'), 'modal #despertar-lethe-memory');
staticAssert(css.includes('.despertar-lethe-memory'), 'CSS memória painel');
staticAssert(css.includes('.despertar-modal__memory'), 'CSS memória modal');
staticAssert(uiSrc.includes('formatLetheMemoryPreview'), 'preview helper');
staticAssert(uiSrc.includes('formatLetheMemoryToast'), 'toast helper');
staticAssert(uiSrc.includes('memoryPreviewText'), 'describeLethe memory');
staticAssert(indexSrc.includes('formatLetheMemoryPreview'), 'modal open usa preview');
staticAssert(indexSrc.includes('formatLetheMemoryToast'), 'toast pós-ritual');
staticAssert(indexSrc.includes('showTutorialToast'), 'showTutorialToast no ritual');
staticAssert(pkg.includes('despertar-lethe-f3-smoke.mjs'), 'check inclui F3 smoke');
staticAssert(plan.includes('Memória que permanece'), 'copy 0F no plano');

if (errors.length) {
  console.error('despertar-lethe-f3-smoke (estático):');
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
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

run('copy congelada 0F', () => {
  assert.equal(
    formatLetheMemoryPreview({ talentCount: 2, verdictCount: 1 }),
    'Memória que permanece · Óbolos · 2 talentos · 1 sentenças da Bancada',
  );
  assert.equal(
    formatLetheMemoryToast({ talentCount: 2, verdictCount: 1 }),
    'Memória preservada: 2 talentos · 1 sentenças',
  );
});

run('countLethePermanents lê talents + Bancada', () => {
  assert.deepEqual(
    countLethePermanents({
      talents: ['a', 'b'],
      verdictPurchases: ['selo_do_juiz'],
    }),
    { talentCount: 2, verdictCount: 1 },
  );
  assert.deepEqual(countLethePermanents({}), { talentCount: 0, verdictCount: 0 });
});

run('describeLethe inclui bloco de memória', () => {
  const state = new GameState({
    souls: '200000000',
    runSouls: '200000000',
    talents: ['memoria_das_sombras', 'eco_do_styx'],
    verdictPurchases: ['selo_do_juiz', 'catalogo_vivo'],
  });
  const view = describeLethe(state);
  assert.equal(view.open, true);
  assert.equal(view.talentCount, 2);
  assert.equal(view.verdictCount, 2);
  assert.equal(
    view.memoryPreviewText,
    'Memória que permanece · Óbolos · 2 talentos · 2 sentenças da Bancada',
  );
  assert.equal(
    view.memoryToastText,
    'Memória preservada: 2 talentos · 2 sentenças',
  );
});

run('permanentes sobrevivem ao ritual (contagem)', () => {
  const state = new GameState({
    souls: '4000000000',
    runSouls: '4000000000',
    talents: ['olho_da_curva'],
    verdictPurchases: ['peso_das_faixas'],
  });
  const before = countLethePermanents(state);
  assert.equal(state.applyPrestige().ok, true);
  assert.deepEqual(countLethePermanents(state), before);
});

console.log(`\ndespertar-lethe-f3-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
