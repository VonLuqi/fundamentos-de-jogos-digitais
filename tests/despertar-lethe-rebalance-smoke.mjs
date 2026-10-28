/**
 * Smoke — recalculo de óbolos/essência pós-rebalance Lethe (Trono do Mestre) + V2/softcap.
 * Uso: node tests/despertar-lethe-rebalance-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OBOL_BONUS_PER, LETHE_REBALANCE_V2_MILESTONE } from '../js/hades-despertar/config/constants.js';
import { cmp, money } from '../js/hades-despertar/core/decimal.js';
import {
  applyLetheRebalanceV2ToState,
  mnemosyneFromObolsGain,
  obolsFromRunSouls,
  planLetheWalletRebalance,
  prestigeBonus,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const phpFormulas = read('backend/src/Services/Despertar/DespertarFormulas.php');
const phpService = read('backend/src/Services/Despertar/DespertarService.php');
const phpController = read('backend/src/Controllers/DespertarController.php');
const phpCatalog = read('backend/src/Services/Despertar/DespertarCatalog.php');
const apiJs = read('js/api.js');
const dashJs = read('js/dashboard.js');
const dashHtml = read('pages/dashboard.html');

assert.match(phpFormulas, /function planLetheWalletRebalance/);
assert.match(phpFormulas, /function applyLetheRebalanceV2ToState/);
assert.match(phpFormulas, /already_rebalanced_v2/);
assert.match(phpService, /function rebalanceStudentLetheWallets/);
assert.match(phpService, /persistLetheRebalanceV2IfNeeded|applyLetheRebalanceV2ToState/);
assert.match(phpController, /rebalanceLetheWallets/);
assert.match(phpCatalog, /LETHE_REBALANCE_V2_MILESTONE/);
assert.match(phpCatalog, /OBOL_BONUS_PER = '0\.01'/);
assert.match(apiJs, /despertarRebalanceLetheWallets/);
assert.match(dashHtml, /btn-rebalance-lethe/);
assert.match(dashJs, /despertarRebalanceLetheWallets/);

assert.equal(OBOL_BONUS_PER, '0.01');
assert.equal(LETHE_REBALANCE_V2_MILESTONE, 'letheRebalanceV2');

// Paridade: 3 catábases com corrida média 16e9 → óbolos novos somam com /(1+k).
const avgRun = '16000000000';
let target = '0';
for (let k = 0; k < 3; k += 1) {
  const gain = obolsFromRunSouls(avgRun, k);
  target = String(BigInt(target) + BigInt(gain));
}
assert.equal(obolsFromRunSouls(avgRun, 0), '2'); // floor(sqrt(16e9/4e9))=floor(sqrt(4))=2
assert.equal(obolsFromRunSouls(avgRun, 1), '1');
assert.equal(obolsFromRunSouls(avgRun, 2), '0');
assert.equal(target, '3');
assert.equal(mnemosyneFromObolsGain('2', []), '1');
assert.ok(cmp(prestigeBonus('3', []), '1') > 0);
assert.equal(money('3'), '3.00');

// Softcap: 1e6 óbolos → raw=10000 → 1+100+25*log10(100)=151 ≪ linear 10001
const soft = Number(prestigeBonus('1000000', []));
const linearPure = 1 + 1e6 * 0.01;
assert.ok(soft < 200, `softcap ${soft}`);
assert.ok(soft < linearPure / 10, `soft ${soft} ≪ linear ${linearPure}`);
assert.equal(cmp(prestigeBonus('1', []), '1.01'), 0);
assert.equal(cmp(prestigeBonus('100', []), '2'), 0); // raw=1 → ainda linear sob start=100

// Heal V2: save fake com 1e10 óbolos/essência → carteira ≤ alvo e milestone
const inflated = {
  obols: '10000000000.00',
  mnemosyne: '10000000000.00',
  lifetimeSouls: '48000000000.00',
  runSouls: '0.00',
  prestigeCount: 3,
  talents: [],
  milestones: { letheRebalanceV1: true },
};
const plan = planLetheWalletRebalance(inflated);
assert.equal(plan.skipped, false);
assert.ok(cmp(plan.obolsAfter, plan.obolsBefore) <= 0);
assert.ok(cmp(plan.mnemosyneAfter, plan.mnemosyneBefore) <= 0);

const healed = applyLetheRebalanceV2ToState(inflated);
assert.equal(healed.applied, true);
assert.ok(healed.state.milestones[LETHE_REBALANCE_V2_MILESTONE]);
assert.ok(cmp(healed.state.obols, inflated.obols) <= 0);
assert.ok(cmp(healed.state.mnemosyne, inflated.mnemosyne) <= 0);

const again = applyLetheRebalanceV2ToState(healed.state);
assert.equal(again.applied, false);
assert.equal(again.plan.reason, 'already_rebalanced_v2');

const gs = new GameState(inflated);
const ens = gs.ensureLetheRebalanceV2();
assert.equal(ens.applied, true);
assert.ok(gs.milestones[LETHE_REBALANCE_V2_MILESTONE]);
assert.ok(cmp(gs.obols, inflated.obols) <= 0);

console.log('despertar-lethe-rebalance-smoke: OK');
