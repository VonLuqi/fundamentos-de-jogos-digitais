/**
 * Smoke — debug do Mestre (reset / grant presets).
 * Uso: node tests/despertar-debug-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { ApiService } from '../js/hades-despertar/services/ApiService.js';
import { describeGeneratorCard, describeUpgradeCard } from '../js/hades-despertar/ui/UIRenderer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(html.includes('id="despertar-debug-reset"'), 'botão Zerar');
staticAssert(html.includes('data-debug-grant="souls_1k"'), 'grant +1K almas');
staticAssert(html.includes('data-debug-grant="obols_10"'), 'grant óbolos');
staticAssert(html.includes('data-debug-grant="verdicts_5"'), 'grant vereditos');
staticAssert(html.includes('data-debug-set="souls"'), 'B1 setter almas');
staticAssert(html.includes('data-debug-set="mnemosyne"'), 'B1 setter essência');
staticAssert(html.includes('data-debug-set="verdicts"'), 'B1 setter vereditos');
staticAssert(html.includes('data-debug-apply="souls"'), 'B1 aplicar almas');
staticAssert(html.includes('data-debug-flag="freeShopping"'), 'B1 free shopping');
staticAssert(html.includes('data-debug-flag="forceShiny"'), 'B1 force shiny');
staticAssert(html.includes('data-debug-action="shinyHalf"'), 'B1 shiny 50%');
staticAssert(html.includes('data-debug-action="exitTestMode"'), 'B1 sair do modo teste');
staticAssert(html.includes('0,5%') && html.includes('2%'), 'B1 nota chance natural negativo 0,5% / gold 2%');
staticAssert(html.includes('data-debug-action="spawnShimmer"'), 'forçar Eco do Acheron');
staticAssert(html.includes('data-debug-action="spawnLeech"'), 'forçar Sanguessuga');
staticAssert(html.includes('data-debug-action="spawnShinyLeech"'), 'forçar Sanguessuga shiny');
staticAssert(html.includes('data-debug-action="openLetheUnlimited"'), 'Lethe sem limites');
staticAssert(html.includes('data-debug-action="catabase1"'), 'forçar Catábase');
staticAssert(html.includes('id="despertar-debug"') && html.includes('hidden'), 'painel debug gated (hidden até admin)');
staticAssert(
  fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8').includes('debugLocalPatch'),
  'GameState.debugLocalPatch para Estela do Mestre',
);
staticAssert(
  fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8').includes('openLetheUnlimited'),
  'index wire openLetheUnlimited',
);
staticAssert(
  fs.readFileSync(path.join(root, 'js/api.js'), 'utf8').includes('despertarDebugSet'),
  'B2 cliente despertarDebugSet',
);
staticAssert(
  fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8').includes('debugFlags'),
  'B3 GameState.debugFlags',
);
staticAssert(
  fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8').includes('setShinyCount'),
  'B3 setShinyCount',
);
staticAssert(
  fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8').includes('isFreeShopping'),
  'B3 index pula sync em free shopping',
);
const phpCtrl = fs.readFileSync(
  path.join(root, 'backend/src/Controllers/DespertarController.php'),
  'utf8',
);
staticAssert(
  /'strippedAchievements'\s*=>\s*\$removed/.test(phpCtrl),
  'debugReset/sandbox devolve conquistas removidas no DTO',
);
staticAssert(
  !/Number\.parseInt\([^)]*prestigeCount[^)]*\)\s*\|\|\s*this\.prestigeCount/
    .test(fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8')),
  'replace não usa || this.prestigeCount (0 é válido)',
);

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

run('B3 free shopping + force shiny + setShinyCount', () => {
  const state = new GameState({ souls: '0' });
  assert.equal(state.debugFlags.freeShopping, false);
  assert.equal('debugFlags' in state.toSnapshot(), false);

  state.setDebugFlag('freeShopping', true);
  state.setDebugFlag('forceShiny', true);
  const card = describeGeneratorCard(state, 'wandering_shade', '1');
  assert.equal(card.canBuy, true);
  assert.equal(cmp(card.cost, '0'), 0);

  const bought = state.buyGenerator('wandering_shade', '10');
  assert.equal(bought.ok, true);
  assert.equal(bought.bought, 10);
  assert.equal(bought.shinyGained, 10, 'force shiny → shinyGained === bought');
  assert.equal(cmp(state.souls, '0'), 0, 'free shopping não debita');
  assert.equal(state.quantities().wandering_shade, 10);

  const half = state.setShinyCount('wandering_shade', 5);
  assert.equal(half.ok, true);
  assert.equal(half.shiny, 5);
  assert.equal(state.shinyCounts().wandering_shade, 5);

  state.clearDebugFlags();
  assert.equal(state.debugFlags.freeShopping, false);
  assert.equal(state.debugFlags.forceShiny, false);

  // Styx upgrade free
  state.setDebugFlag('freeShopping', true);
  state.souls = '0';
  const upCard = describeUpgradeCard(state, 'foice_afilada');
  // may need styx unlock via generators — we have 10 shades
  assert.equal(upCard.revealed, true);
  assert.equal(upCard.canBuy, true);
  assert.equal(cmp(upCard.cost, '0'), 0);
  const up = state.buyUpgrade('foice_afilada');
  assert.equal(up.ok, true);
  assert.ok(state.upgrades.includes('foice_afilada'));
});

run('B4 force shiny → shinyGained === bought (fecho)', () => {
  const state = new GameState({ souls: '10000' });
  state.setDebugFlag('forceShiny', true);
  const lot = state.buyGenerator('wandering_shade', '7', { random: () => 0.99 });
  assert.equal(lot.ok, true);
  assert.equal(lot.shinyGained, lot.bought);
});

run('Estela ZERAR: prestigeCount 0 no replace (não reatribui despertar_catabase)', () => {
  const state = new GameState({
    souls: '1e20',
    runSouls: '1e20',
    lifetimeSouls: '1e20',
    prestigeCount: 3,
    achievements: ['despertar_catabase'],
  });
  assert.ok(state.achievements.includes('despertar_catabase'));

  // Espelha DTO do debugReset: prestige 0 + conquistas sem família Despertar.
  state.applyAuthoritativeState({
    souls: '0',
    runSouls: '0',
    lifetimeSouls: '0',
    prestigeCount: 0,
    generators: {},
    upgrades: [],
    talents: [],
    achievements: [],
  }, { mode: 'replace' });

  assert.equal(state.prestigeCount, 0, 'ZERAR zera Catábases no cliente');
  assert.equal(
    state.achievements.includes('despertar_catabase'),
    false,
    'não reatribui despertar_catabase com prestige 0',
  );
});

run('órfã despertar_catabase com prestige 0 é podada no sync local', () => {
  const state = new GameState({
    souls: '100',
    lifetimeSouls: '100',
    prestigeCount: 0,
    achievements: ['despertar_catabase', 'despertar_primeira_alma'],
  });
  // #syncAchievements roda no construtor / apply — órfã some, elegível fica.
  assert.equal(state.achievements.includes('despertar_catabase'), false);
  assert.ok(state.achievements.includes('despertar_primeira_alma'));
});

console.log(`\ndespertar-debug-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
