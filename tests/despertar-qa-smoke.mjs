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
import {
  DESPERTAR_HIDDEN_IDS,
  DESPERTAR_PUBLIC_IDS,
  evaluateDespertarAchievementIds,
  sanitizeEduLogsSeen,
} from '../api/_lib/despertar-achievements.js';
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
const apiSrc = read('api/despertar.js');
const validateSrc = read('api/_lib/despertar-validate.js');
const shellSrc = read('js/app-shell.js');
const dashboardHtml = read('pages/dashboard.html');
const pkg = read('package.json');
const apiJs = read('js/api.js');

// —— Funcional ——
staticAssert(html.includes('id="despertar-reap"'), 'altar Ceifar');
staticAssert(GENERATORS.length === 6, '6 geradores T1–T6');
staticAssert(COST_MULTIPLIER === '1.15', 'curva 1.15');
staticAssert(UPGRADES.length >= 1, 'juramentos Styx');
staticAssert(TALENTS.length === 8, '8 talentos do Panteão');
staticAssert(OFFLINE_MAX_HOURS_BASE === 8, 'offline base 8 h');
staticAssert(OFFLINE_MAX_HOURS_TALENT === 12, 'offline talento 12 h');
staticAssert(cmp(OFFLINE_EFFICIENCY_BASE, '0.80') === 0, 'eficiência offline 80%');
staticAssert(TICK_FPS === 60, 'loop alvo 60 Hz');
staticAssert(loopSrc.includes('panicUpdates') || loopSrc.includes('LOOP_PANIC'), 'panic no GameLoop');
staticAssert(SYNC_HEARTBEAT_MS === 30_000, 'sync heartbeat 30 s');
staticAssert(validateSrc.includes('validateSync'), 'validateSync autoritativo');
staticAssert(apiSrc.includes('JUDGES_REFUSED') || apiSrc.includes('recus') || validateSrc.includes('teto') || validateSrc.includes('1.05'), 'anti-cheat no validate');
staticAssert(html.includes('despertar-layout'), 'três colunas no markup');
staticAssert(html.includes('tab-codex') || html.includes('panel-codex'), 'Códice na UI');
staticAssert(EDU_LOG_IDS.length === 16, '16 logs do Códice');
staticAssert(!rendererSrc.includes('innerHTML'), 'UIRenderer sem innerHTML');

// —— Ecossistema ——
staticAssert(indexJs.includes('requireSession'), 'login obrigatório');
staticAssert(!html.includes('/submundo/'), 'Despertar não vive em /submundo');
staticAssert(typeof ROUTES.despertar === 'function', 'ROUTES.despertar');
staticAssert(apiJs.includes("despertar:"), 'rota despertar no cliente');
staticAssert(shellSrc.includes('despertar') && shellSrc.includes('syncDespertarNavFromToken'), 'nav O Despertar com gate');
staticAssert(!shellSrc.toLowerCase().includes('minigame'), 'sem Minigame no shell');
staticAssert(dashboardHtml.includes('id="despertar-preview"'), 'preview no Painel');
staticAssert(DESPERTAR_PUBLIC_IDS.length === 11, '11 conquistas públicas');
staticAssert(DESPERTAR_HIDDEN_IDS.includes('despertar_arquiteto_do_loop'), 'Arquiteto hidden');
staticAssert(pkg.includes('despertar-qa-smoke.mjs'), 'npm run check inclui QA');
staticAssert(pkg.includes('despertar-sync-smoke.mjs'), 'check inclui sync smoke');
staticAssert(pkg.includes('despertar-achievements-smoke.mjs'), 'check inclui conquistas smoke');
staticAssert(pkg.includes('despertar-verdict-smoke.mjs'), 'check inclui Bancada smoke');

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

await run('SPS HUD = 2 geradores + 1 juramento + 1 óbolo', () => {
  // 10 sombras × 0.1 = 1; ×2 umbras = 2; + 1 servo ×0.8 = 2.8; × prestige(1 óbolo)=1.05 → 2.94
  const sps = calculateTotalSPS({
    generators: { wandering_shade: 10, charon_servants: 1 },
    upgrades: ['umbras_despertas'],
    talents: [],
    obols: '1',
  });
  assert.equal(cmp(sps, '2.94'), 0, `SPS esperado 2.94, got ${sps}`);
  assert.equal(cmp(prestigeBonus('1', []), '1.05'), 0);
});

await run('Juramentos ×2 no alvo; resetam no Lethe', () => {
  const state = new GameState({
    souls: '1000',
    runSouls: '1000000000',
    lifetimeSouls: '1000000000',
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
  const ripe = new GameState({
    runSouls: '1000000000',
    souls: '0',
    lifetimeSouls: '1000000000',
    generators: { wandering_shade: 2 },
    upgrades: ['foice_afilada'],
    talents: ['memoria_das_sombras'],
    obols: '3',
    mnemosyne: '2',
  });
  assert.equal(ripe.canPrestige(), true);
  const beforeObols = ripe.obols;
  const beforeMnemo = ripe.mnemosyne;
  assert.equal(ripe.applyPrestige().ok, true);
  assert.ok(cmp(ripe.obols, beforeObols) > 0);
  assert.ok(cmp(ripe.mnemosyne, beforeMnemo) > 0);
  assert.deepEqual(ripe.talents, ['memoria_das_sombras']);
  assert.equal(Object.keys(ripe.quantities()).length, 0);
});

await run('Números grandes formatados (sem 1e+21 cru)', () => {
  const huge = formatSouls('1000000000000000000000');
  assert.doesNotMatch(huge, /e\+/i);
  assert.ok(huge.length < 24);
});

await run('Arquiteto hidden só com Códice legítimo', () => {
  const poor = {
    lifetimeSouls: '1',
    souls: '1',
    runSouls: '1',
    prestigeCount: 0,
    generators: {},
    upgrades: [],
    talents: [],
    milestones: {},
    eduLogsSeen: [...EDU_LOG_IDS],
  };
  const sanitized = sanitizeEduLogsSeen(poor.eduLogsSeen, poor, { syncOk: true });
  assert.ok(sanitized.length < 16);
  assert.ok(
    !evaluateDespertarAchievementIds(poor, { unlocked: [], syncOk: true })
      .includes('despertar_arquiteto_do_loop'),
  );
});

await run('Smokes do checklist estão no npm run check', () => {
  const required = [
    'despertar-formulas-smoke.mjs',
    'despertar-gamestate-smoke.mjs',
    'despertar-gameloop-smoke.mjs',
    'despertar-offline-smoke.mjs',
    'despertar-sync-smoke.mjs',
    'despertar-codex-smoke.mjs',
    'despertar-achievements-smoke.mjs',
    'despertar-a11y-smoke.mjs',
    'despertar-juice-smoke.mjs',
    'despertar-pages-smoke.mjs',
    'despertar-qa-smoke.mjs',
    'despertar-verdict-smoke.mjs',
  ];
  for (const name of required) {
    assert.ok(pkg.includes(name), `check inclui ${name}`);
  }
});

console.log(`\ndespertar-qa-smoke: ${passed} passed, ${failed} failed`);
console.log('Manual restante: playtest visual no device (Performance 60 fps, F5 anti-cheat vivo).');
console.log('Fase 7 (Juízo/Placar) fora do aceite do clicker — não coberta aqui.');
if (failed) process.exitCode = 1;
