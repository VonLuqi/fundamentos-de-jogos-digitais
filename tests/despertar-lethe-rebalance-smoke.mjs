/**
 * Smoke — recalculo de óbolos/essência pós-rebalance Lethe (Trono do Mestre).
 * Uso: node tests/despertar-lethe-rebalance-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmp, money } from '../js/hades-despertar/core/decimal.js';
import {
  mnemosyneFromObolsGain,
  obolsFromRunSouls,
  prestigeBonus,
} from '../js/hades-despertar/core/formulas.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const phpFormulas = read('backend/src/Services/Despertar/DespertarFormulas.php');
const phpService = read('backend/src/Services/Despertar/DespertarService.php');
const phpController = read('backend/src/Controllers/DespertarController.php');
const apiJs = read('js/api.js');
const dashJs = read('js/dashboard.js');
const dashHtml = read('pages/dashboard.html');

assert.match(phpFormulas, /function planLetheWalletRebalance/);
assert.match(phpService, /function rebalanceStudentLetheWallets/);
assert.match(phpController, /rebalanceLetheWallets/);
assert.match(apiJs, /despertarRebalanceLetheWallets/);
assert.match(dashHtml, /btn-rebalance-lethe/);
assert.match(dashJs, /despertarRebalanceLetheWallets/);

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

console.log('despertar-lethe-rebalance-smoke: OK');
