/**
 * Smoke Task 19 — Bancada do Juiz (verdictBuy + efeitos + log_juizo)
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-verdict-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyVerdictBuy } from '../api/_lib/despertar-validate.js';
import { evaluateDespertarAchievementIds } from '../api/_lib/despertar-achievements.js';
import {
  VERDICT_SHOP,
  VERDICT_SHOP_IDS,
} from '../js/hades-despertar/config/verdict-shop.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  calculateTotalSPS,
  clickPower,
  economyEffects,
} from '../js/hades-despertar/core/formulas.js';
import { cmp, mul } from '../js/hades-despertar/core/decimal.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const html = read('pages/despertar.html');
const indexJs = read('js/hades-despertar/index.js');
const apiJs = read('js/api.js');
const despertarApi = read('api/despertar.js');
const validateSrc = read('api/_lib/despertar-validate.js');
const pkg = read('package.json');

staticAssert(fs.existsSync(path.join(root, 'js/hades-despertar/config/verdict-shop.js')), 'verdict-shop.js');
staticAssert(VERDICT_SHOP.length === 4, `4 itens na Bancada (tem ${VERDICT_SHOP.length})`);
staticAssert(VERDICT_SHOP_IDS.includes('selo_do_juiz'), 'selo_do_juiz');
staticAssert(VERDICT_SHOP_IDS.includes('memoria_classind'), 'memoria_classind');
staticAssert(VERDICT_SHOP_IDS.includes('olho_do_tartarus'), 'olho_do_tartarus');
staticAssert(VERDICT_SHOP_IDS.includes('pacto_duplo'), 'pacto_duplo');

staticAssert(html.includes('id="tab-bancada"'), 'aba Bancada no HTML');
staticAssert(html.includes('id="panel-bancada"'), 'painel Bancada no HTML');
staticAssert(html.includes('id="bancada-list"'), 'lista Bancada');
staticAssert(indexJs.includes('onBuyVerdict'), 'index wire onBuyVerdict');
staticAssert(indexJs.includes('verdictBuy'), 'index chama verdictBuy');
staticAssert(apiJs.includes('despertarVerdictBuy'), 'cliente despertarVerdictBuy');
staticAssert(despertarApi.includes("action === 'verdictBuy'"), 'API verdictBuy');
staticAssert(validateSrc.includes('applyVerdictBuy'), 'applyVerdictBuy no validate');
staticAssert(pkg.includes('despertar-verdict-smoke.mjs'), 'check inclui este smoke');

if (errors.length) {
  console.error('despertar-verdict-smoke (estático):');
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

run('compra debita Vereditos e libera log_juizo', () => {
  const state = new GameState({ verdicts: 3 });
  const before = state.clickPower();
  const result = state.buyVerdict('selo_do_juiz');
  assert.equal(result.ok, true);
  assert.equal(state.verdicts, 0);
  assert.deepEqual(state.verdictPurchases, ['selo_do_juiz']);
  assert.ok(state.eduLogsSeen.includes('log_juizo'));
  assert.ok(cmp(state.clickPower(), before) > 0);
});

run('olho_do_tartarus sobe SPS', () => {
  const gens = { wandering_shade: 10 };
  const base = calculateTotalSPS({ generators: gens });
  const boosted = calculateTotalSPS({
    generators: gens,
    verdictPurchases: ['olho_do_tartarus'],
  });
  assert.equal(boosted, mul(base, '1.02'));
});

run('selo_do_juiz sobe clique', () => {
  const args = { generators: { wandering_shade: 5 }, upgrades: [], talents: [], obols: '0' };
  const base = clickPower(args);
  const boosted = clickPower({ ...args, verdictPurchases: ['selo_do_juiz'] });
  assert.ok(cmp(boosted, base) > 0);
});

run('memoria_classind estende offline', () => {
  const effects = economyEffects([], ['memoria_classind']);
  assert.equal(effects.offlineHours, 8.5);
});

run('pacto_duplo barateia 1º gerador; Lethe não reseta Bancada', () => {
  const state = new GameState({
    souls: '100000',
    runSouls: '10000000000',
    verdicts: 12,
    verdictPurchases: [],
  });
  assert.ok(state.buyVerdict('pacto_duplo').ok);
  const costFirst = state.costMult();
  assert.equal(cmp(costFirst, '0.90'), 0);
  state.buyGenerator('wandering_shade', 1);
  assert.equal(cmp(state.costMult(), '1'), 0);

  assert.ok(state.canPrestige());
  state.applyPrestige();
  assert.deepEqual(state.verdictPurchases, ['pacto_duplo']);
  assert.equal(state.verdicts, 0);
});

run('applyVerdictBuy server-authoritative', () => {
  const row = {
    souls: '0.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '0.00',
    run_souls: '0.00',
    prestige_count: 0,
    generators_state: {},
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
    verdicts: 3,
    verdict_purchases: [],
  };
  const ok = applyVerdictBuy(row, 'selo_do_juiz');
  assert.equal(ok.ok, true);
  assert.equal(ok.next.verdicts, 0);
  assert.deepEqual(ok.next.verdictPurchases, ['selo_do_juiz']);
  assert.equal(ok.patch.verdicts, 0);

  const again = applyVerdictBuy({ ...row, ...ok.patch, verdict_purchases: ok.next.verdictPurchases }, 'selo_do_juiz');
  assert.equal(again.ok, false);

  const poor = applyVerdictBuy({ ...row, verdicts: 1 }, 'selo_do_juiz');
  assert.equal(poor.ok, false);
});

run('conquistas juizo + veredito', () => {
  const base = {
    lifetimeSouls: '0',
    souls: '0',
    generators: {},
    upgrades: [],
    talents: [],
    prestigeCount: 0,
    juizoBestStreak: 5,
    verdictPurchases: [],
  };
  const at5 = evaluateDespertarAchievementIds(base, { unlocked: [] });
  assert.ok(at5.includes('despertar_juizo_5'));
  assert.ok(!at5.includes('despertar_juizo_25'));
  assert.ok(!at5.includes('despertar_veredito'));

  const at25 = evaluateDespertarAchievementIds(
    { ...base, juizoBestStreak: 25 },
    { unlocked: [] },
  );
  assert.ok(at25.includes('despertar_juizo_25'));

  const bought = evaluateDespertarAchievementIds(
    { ...base, juizoBestStreak: 0, verdictPurchases: ['selo_do_juiz'] },
    { unlocked: [] },
  );
  assert.ok(bought.includes('despertar_veredito'));
});

console.log(`\ndespertar-verdict-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
