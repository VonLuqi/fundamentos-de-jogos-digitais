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
import {
  DEBUG_GRANT_PRESETS,
  DEBUG_ZERO_PATCH,
  buildDebugGrantPatch,
  buildDebugSetPatch,
  cloneDebugPatch,
  expandDebugSci,
  parseAbsoluteMoney,
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
staticAssert(html.includes('data-debug-set="souls"'), 'B1 setter almas');
staticAssert(html.includes('data-debug-set="obols"'), 'B1 setter óbolos');
staticAssert(html.includes('data-debug-set="mnemosyne"'), 'B1 setter essência');
staticAssert(html.includes('data-debug-set="verdicts"'), 'B1 setter vereditos');
staticAssert(html.includes('data-debug-apply="souls"'), 'B1 aplicar almas');
staticAssert(html.includes('data-debug-flag="freeShopping"'), 'B1 free shopping');
staticAssert(html.includes('data-debug-flag="forceShiny"'), 'B1 force shiny');
staticAssert(html.includes('data-debug-action="shinyHalf"'), 'B1 shiny 50%');
staticAssert(html.includes('data-debug-action="exitTestMode"'), 'B1 sair do modo teste');
staticAssert(html.includes('1%'), 'B1 nota chance natural 1%');
staticAssert(html.includes('id="despertar-debug"') && html.includes('hidden'), 'painel debug gated (hidden até admin)');
staticAssert(apiSrc.includes("action === 'debugReset'"), 'API debugReset');
staticAssert(apiSrc.includes("action === 'debugGrant'"), 'API debugGrant');
staticAssert(apiSrc.includes('buildDebugSetPatch'), 'B2 buildDebugSetPatch no handler');
staticAssert(apiSrc.includes('user.role !== \'admin\'') || apiSrc.includes('user.role !== "admin"'), 'debug gated admin');
staticAssert(pkg.includes('despertar-debug-smoke.mjs'), 'check inclui este smoke');
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

run('B2 set absoluto: 1e12 almas (não aditivo)', () => {
  assert.equal(expandDebugSci('1e12'), '1000000000000');
  assert.equal(cmp(parseAbsoluteMoney('1e12'), '1000000000000'), 0);

  const result = buildDebugSetPatch(
    { souls: '100', lifetime_souls: '200', run_souls: '50', obols: '9', mnemosyne: '3', verdicts: 7 },
    { souls: '1e12' },
  );
  assert.equal(result.ok, true);
  assert.equal(cmp(result.patch.souls, '1000000000000'), 0);
  assert.equal(cmp(result.patch.run_souls, '1000000000000'), 0);
  assert.equal(cmp(result.patch.lifetime_souls, '1000000000000'), 0);
  assert.equal(result.patch.obols, undefined, 'não toca óbolos se omitido');
  assert.equal(result.patch.generators_state, undefined);

  const obols = buildDebugSetPatch({}, { obols: '0', verdicts: 40 });
  assert.equal(obols.ok, true);
  assert.equal(cmp(obols.patch.obols, '0'), 0);
  assert.equal(obols.patch.verdicts, 40);

  const bad = buildDebugSetPatch({}, { souls: 'nope' });
  assert.equal(bad.ok, false);
  const empty = buildDebugSetPatch({}, {});
  assert.equal(empty.ok, false);
});

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

run('B4 set souls absoluto (fecho checklist)', () => {
  const result = buildDebugSetPatch(
    { souls: '999', lifetime_souls: '999', run_souls: '999' },
    { souls: '1000000000000' },
  );
  assert.equal(result.ok, true);
  assert.equal(cmp(result.patch.souls, '1000000000000'), 0);
  assert.notEqual(cmp(result.patch.souls, '1999'), 0, 'não é aditivo 999+1e12');
});

run('B4 force shiny → shinyGained === bought (fecho)', () => {
  const state = new GameState({ souls: '10000' });
  state.setDebugFlag('forceShiny', true);
  const lot = state.buyGenerator('wandering_shade', '7', { random: () => 0.99 });
  assert.equal(lot.ok, true);
  assert.equal(lot.shinyGained, lot.bought);
});

run('B4 free shopping: compra não chama requestSync / não suja ApiService', () => {
  const state = new GameState({ souls: '0' });
  state.setDebugFlag('freeShopping', true);
  let syncCalls = 0;
  const api = new ApiService({
    getToken: () => 'tok',
    getSnapshot: () => state.toSnapshot(),
    applyServerState: () => {},
    minIntervalMs: 60_000,
    now: () => 1_000_000,
    syncFn: async () => {
      syncCalls += 1;
      return { ok: true, state: {} };
    },
  });

  const result = state.buyGenerator('wandering_shade', '3');
  assert.equal(result.ok, true);
  // Espelha index.js: só sync se NÃO free shopping
  if (!state.isFreeShopping()) {
    api.requestSync();
  }
  assert.equal(api.isDirty, false, 'dirty permanece limpo');
  assert.equal(syncCalls, 0, 'syncFn não disparou');
  api.stop();
});

console.log(`\ndespertar-debug-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
