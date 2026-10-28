/**
 * Smoke — recalculo de óbolos/essência pós-rebalance Lethe (Trono do Mestre) + V2/softcap.
 * O heal V2 é do servidor (a82f1fd): roda no PHP real; o GameState só devolve no-op.
 * Uso: node tests/despertar-lethe-rebalance-smoke.mjs
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OBOL_BONUS_PER } from '../js/hades-despertar/config/constants.js';
import { cmp, money } from '../js/hades-despertar/core/decimal.js';
import {
  mnemosyneFromObolsGain,
  obolsFromRunSouls,
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
assert.match(phpCatalog, /LETHE_REBALANCE_V2_MILESTONE = 'letheRebalanceV2'/);
assert.match(phpCatalog, /OBOL_BONUS_PER = '0\.01'/);
assert.match(apiJs, /despertarRebalanceLetheWallets/);
assert.match(dashHtml, /btn-rebalance-lethe/);
assert.match(dashJs, /despertarRebalanceLetheWallets/);

assert.equal(OBOL_BONUS_PER, '0.01');

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
assert.equal(money('3'), '3.00');

// Potência de prestígio vem da escada heavenlyPower (Segredo do Óbolo…); sem ela o óbolo não rende.
const FULL_POWER = { heavenlyPower: 1 };
assert.equal(cmp(prestigeBonus('3', []), '1'), 0);
assert.ok(cmp(prestigeBonus('3', [], FULL_POWER), '1') > 0);

// Softcap: 1e6 óbolos → raw=10000 → 1+100+25*log10(100)=151 ≪ linear 10001
const soft = Number(prestigeBonus('1000000', [], FULL_POWER));
const linearPure = 1 + 1e6 * 0.01;
assert.ok(soft < 200, `softcap ${soft}`);
assert.ok(soft < linearPure / 10, `soft ${soft} ≪ linear ${linearPure}`);
assert.equal(cmp(prestigeBonus('1', [], FULL_POWER), '1.01'), 0);
assert.equal(cmp(prestigeBonus('100', [], FULL_POWER), '2'), 0); // raw=1 → ainda linear sob start=100

// Heal V2 (PHP): save fake com 1e10 óbolos/essência → carteira ≤ alvo, milestone, idempotente.
const inflated = {
  obols: '10000000000.00',
  mnemosyne: '10000000000.00',
  lifetimeSouls: '48000000000.00',
  runSouls: '0.00',
  prestigeCount: 3,
  talents: [],
  milestones: { letheRebalanceV1: true },
};
const phpScript = `<?php
  require 'backend/src/Core/Database.php';
  require 'backend/src/Core/GameCatalog.php';
  require 'backend/src/Services/Despertar/DespertarDecimal.php';
  require 'backend/src/Services/Despertar/DespertarCatalog.php';
  require 'backend/src/Services/Despertar/DespertarFormulas.php';
  use App\\Services\\Despertar\\DespertarFormulas;
  $state = json_decode(${JSON.stringify(JSON.stringify(inflated))}, true);
  $healed = DespertarFormulas::applyLetheRebalanceV2ToState($state);
  $again = DespertarFormulas::applyLetheRebalanceV2ToState($healed['state']);
  echo json_encode(['healed' => $healed, 'again' => $again]);
`;
const res = spawnSync('php', [], { cwd: root, input: phpScript, encoding: 'utf8' });
assert.equal(res.status, 0, `PHP falhou:\n${res.stdout}\n${res.stderr}\n${res.error || ''}`);
const { healed, again } = JSON.parse(res.stdout);
assert.equal(healed.applied, true);
assert.equal(healed.plan.skipped, false);
assert.ok(healed.state.milestones.letheRebalanceV2);
assert.ok(cmp(healed.state.obols, inflated.obols) <= 0);
assert.ok(cmp(healed.state.mnemosyne, inflated.mnemosyne) <= 0);
assert.equal(again.applied, false);
assert.equal(again.plan.reason, 'already_rebalanced_v2');

// Cliente não reescreve carteira: o servidor é dono do heal.
const gs = new GameState(inflated);
const ens = gs.ensureLetheRebalanceV2();
assert.equal(ens.applied, false);
assert.equal(ens.plan.reason, 'server_owned');
assert.equal(cmp(gs.obols, inflated.obols), 0);

console.log('despertar-lethe-rebalance-smoke: OK');
