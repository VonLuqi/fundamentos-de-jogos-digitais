/**
 * Smoke Task 16 — QA / checklist de aceite do Despertar (clicker).
 * Espelha docs/plano-hades-despertar.md § Checklist de aceite (exceto Fase 7).
 *
 * Uso: node tests/despertar-qa-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COST_MULTIPLIER,
  OFFLINE_EFFICIENCY_BASE,
  OFFLINE_MAX_HOURS_BASE,
  OFFLINE_MAX_HOURS_TALENT,
  SYNC_HEARTBEAT_MS,
  TICK_FPS,
} from '../js/hades-despertar/config/constants.js';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { TALENTS } from '../js/hades-despertar/config/talents.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { EDU_LOG_IDS } from '../js/hades-despertar/config/edu-logs.js';
import { cmp, mul } from '../js/hades-despertar/core/decimal.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  calculateTotalSPS,
  generatorBatchCost,
  generatorPriceAt,
  prestigeBonus,
} from '../js/hades-despertar/core/formulas.js';
import { formatSouls } from '../js/hades-despertar/ui/NumberFormatter.js';

import { ROUTES } from '../js/api.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

const html = read('pages/despertar.html');
const css = read('css/despertar.css');
const indexJs = read('js/hades-despertar/index.js');
const rendererSrc = read('js/hades-despertar/ui/UIRenderer.js');
const loopSrc = read('js/hades-despertar/core/GameLoop.js');
const validateSrc = read('backend/src/Services/Despertar/DespertarService.php');
const controllerSrc = read('backend/src/Controllers/DespertarController.php');
const shellSrc = read('js/app-shell.js');
const dashboardHtml = read('pages/dashboard.html');
const pkg = read('package.json');
const apiJs = read('js/api.js');

// —— Funcional ——
staticAssert(html.includes('id="despertar-reap"'), 'altar Ceifar');
staticAssert(GENERATORS.length === 20, '20 geradores T1–T20');
staticAssert(COST_MULTIPLIER === '1.15', 'curva 1.15');
staticAssert(UPGRADES.length >= 396, 'juramentos Styx (≥396)');
staticAssert(TALENTS.length >= 100, `≥100 talentos Rio do Lethe (got ${TALENTS.length})`);
staticAssert(OFFLINE_MAX_HOURS_BASE === 8, 'offline base 8 h');
staticAssert(OFFLINE_MAX_HOURS_TALENT === 12, 'offline talento 12 h');
staticAssert(cmp(OFFLINE_EFFICIENCY_BASE, '0.80') === 0, 'eficiência offline 80%');
staticAssert(TICK_FPS === 60, 'loop alvo 60 Hz');
staticAssert(loopSrc.includes('panicUpdates') || loopSrc.includes('LOOP_PANIC'), 'panic no GameLoop');
staticAssert(SYNC_HEARTBEAT_MS === 30_000, 'sync heartbeat 30 s');
staticAssert(validateSrc.includes('function validateSync'), 'validateSync no backend PHP');
staticAssert(controllerSrc.includes('stateSync'), 'controller stateSync');
staticAssert(
  validateSrc.includes('confia no cliente') || !validateSrc.includes('SYNC_ABSURD_GAIN_FLOOR'),
  'sync confia no cliente (sem reject absurdo de ganho)'
);
staticAssert(html.includes('despertar-layout'), 'três colunas no markup');
staticAssert(html.includes('despertar-codex-book') || html.includes('despertar-codex-drawer'), 'Códice na UI');
staticAssert(EDU_LOG_IDS.length === 29, '29 logs do Códice');
staticAssert(!rendererSrc.includes('innerHTML'), 'UIRenderer sem innerHTML');

// —— Ecossistema ——
staticAssert(indexJs.includes('requireSession'), 'login obrigatório');
staticAssert(!html.includes('/submundo/'), 'Despertar não vive em /submundo');
staticAssert(typeof ROUTES.despertar === 'function', 'ROUTES.despertar');
staticAssert(apiJs.includes("despertar:"), 'rota despertar no cliente');
staticAssert(shellSrc.includes('despertar') && shellSrc.includes('syncDespertarNavFromToken'), 'nav O Despertar com gate');
staticAssert(!shellSrc.toLowerCase().includes('minigame'), 'sem Minigame no shell');
staticAssert(dashboardHtml.includes('id="despertar-preview"'), 'preview no Painel');

// —— Qualidade ——
staticAssert(css.includes('prefers-reduced-motion'), 'reduced-motion');
staticAssert(css.includes('touch-action: manipulation'), 'mobile touch-action');
staticAssert(html.includes('viewport'), 'viewport meta');

if (errors.length) {
  console.error('despertar-qa-smoke (estático):');
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
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

await run('Clique no Acheron aumenta Almas', () => {
  const state = new GameState();
  const before = state.souls;
  state.click();
  assert.ok(cmp(state.souls, before) > 0);
});

await run('Preço Base×1.15^n; lote 10 usa série', () => {
  const shade = GENERATORS[0];
  assert.equal(cmp(generatorPriceAt(shade.baseCost, 0), '15'), 0);
  assert.equal(cmp(generatorPriceAt(shade.baseCost, 1), mul('15', '1.15')), 0);
  const lot10 = generatorBatchCost(shade.baseCost, 0, 10);
  const naive = mul(shade.baseCost, '10');
  assert.ok(cmp(lot10, naive) > 0, 'lote 10 > 10×base');
});

const HEAVENLY_POWER_LADDER = [
  'segredo_do_obolo',
  'banca_do_obolo',
  'forja_do_obolo',
  'confeitaria_do_obolo',
  'chave_do_obolo',
];

await run('SPS HUD = 2 geradores + 1 juramento + 1 óbolo', () => {
  // 10 sombras × 0.1 = 1; ×2 umbras = 2; + 1 servo ×1 (F0) = 3;
  // × prestige(1 óbolo, escada heavenlyPower completa) = 1.01 → 3.03
  const sps = calculateTotalSPS({
    generators: { wandering_shade: 10, charon_servants: 1 },
    upgrades: ['umbras_despertas', ...HEAVENLY_POWER_LADDER],
    talents: [],
    obols: '1',
  });
  assert.equal(cmp(sps, '3.03'), 0, `SPS esperado 3.03, got ${sps}`);
  assert.equal(cmp(prestigeBonus('1', []), '1'), 0, 'sem escada heavenlyPower o óbolo não rende');
  assert.equal(cmp(prestigeBonus('1', [], { upgrades: HEAVENLY_POWER_LADDER }), '1.01'), 0);
});

await run('Juramentos ×2 no alvo; resetam no Lethe', () => {
  const state = new GameState({
    souls: '1000',
    runSouls: '4000000000',
    lifetimeSouls: '4000000000',
    generators: { wandering_shade: 1 },
  });
  assert.equal(state.buyUpgrade('umbras_despertas').ok, true);
  assert.ok(state.upgrades.includes('umbras_despertas'));
  assert.equal(state.applyPrestige().ok, true);
  assert.equal(state.upgrades.length, 0);
  assert.ok(cmp(state.obols, '0') > 0);
  assert.ok(cmp(state.lifetimeSouls, '0') > 0);
});

await run('Ritual só com obolsGain≥1; mantém óbolos/essência/talentos', () => {
  const poor = new GameState({ runSouls: '100000000' });
  assert.equal(poor.canPrestige(), false);
  // 16e9 → 2 óbolos → 1 essência (2:1)
  const ripe = new GameState({
    runSouls: '16000000000',
    souls: '0',
    lifetimeSouls: '16000000000',
    generators: { wandering_shade: 2 },
    upgrades: ['foice_afilada'],
    talents: ['legado'],
    obols: '3',
    mnemosyne: '2',
  });
  assert.equal(ripe.canPrestige(), true);
  const beforeObols = ripe.obols;
  const beforeMnemo = ripe.mnemosyne;
  assert.equal(ripe.applyPrestige().ok, true);
  assert.ok(cmp(ripe.obols, beforeObols) > 0);
  assert.ok(cmp(ripe.mnemosyne, beforeMnemo) > 0);
  assert.deepEqual(ripe.talents, ['legado']);
  assert.equal(Object.keys(ripe.quantities()).length, 0);
});

await run('Números grandes formatados (sem 1e+21 cru)', () => {
  const huge = formatSouls('1000000000000000000000');
  assert.doesNotMatch(huge, /e\+/i);
  assert.ok(huge.length < 24);
});

// npm run test:despertar descobre tests/despertar-*.mjs; basta o arquivo existir.
await run('Smokes do checklist existem (rodam no test:despertar)', () => {
  const required = [
    'despertar-formulas-smoke.mjs',
    'despertar-gamestate-smoke.mjs',
    'despertar-gameloop-smoke.mjs',
    'despertar-offline-smoke.mjs',
    'despertar-sync-smoke.mjs',
    'despertar-codex-smoke.mjs',
    'despertar-php-server-smoke.mjs',
    'despertar-a11y-smoke.mjs',
    'despertar-juice-smoke.mjs',
    'despertar-pages-smoke.mjs',
    'despertar-qa-smoke.mjs',
    'despertar-verdict-smoke.mjs',
  ];
  for (const name of required) {
    assert.ok(fs.existsSync(path.join(root, 'tests', name)), `tests/${name} existe`);
  }
  assert.ok(pkg.includes('run-despertar-tests.mjs'), 'test:despertar usa o runner');
});

console.log(`\ndespertar-qa-smoke: ${passed} passed, ${failed} failed`);
console.log('Manual restante: playtest visual no device (Performance 60 fps, F5 anti-cheat vivo).');
console.log('Fase 7 (Juízo/Placar) fora do aceite do clicker — não coberta aqui.');
if (failed) process.exitCode = 1;
