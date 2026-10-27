/**
 * Smoke — cadeia Mil Foices (12 elos Thousand→Undecillion) JS ≡ PHP.
 * Uso: node tests/despertar-mil-foices-smoke.mjs
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPGRADES, UPGRADE_BY_ID } from '../js/hades-despertar/config/upgrades.js';
import { money } from '../js/hades-despertar/core/decimal.js';
import {
  meetsUpgradeRequirement,
  thousandBladesBonusPerUnit,
} from '../js/hades-despertar/core/formulas.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const EXPECTED = Object.freeze([
  { id: 'mil_foices', kind: 'thousandBlades', factor: '0.1', qty: 25 },
  { id: 'milhao_de_foices', kind: 'thousandBladesMult', factor: '5', qty: 50 },
  { id: 'bilhao_de_foices', kind: 'thousandBladesMult', factor: '10', qty: 100 },
  { id: 'trilhao_de_foices', kind: 'thousandBladesMult', factor: '20', qty: 150 },
  { id: 'quadrilhao_de_foices', kind: 'thousandBladesMult', factor: '20', qty: 200 },
  { id: 'quintilhao_de_foices', kind: 'thousandBladesMult', factor: '20', qty: 250 },
  { id: 'sextilhao_de_foices', kind: 'thousandBladesMult', factor: '20', qty: 300 },
  { id: 'septilhao_de_foices', kind: 'thousandBladesMult', factor: '20', qty: 350 },
  { id: 'octilhao_de_foices', kind: 'thousandBladesMult', factor: '20', qty: 400 },
  { id: 'nonilhao_de_foices', kind: 'thousandBladesMult', factor: '20', qty: 450 },
  { id: 'decilhao_de_foices', kind: 'thousandBladesMult', factor: '20', qty: 500 },
  { id: 'undecilhao_de_foices', kind: 'thousandBladesMult', factor: '20', qty: 550 },
]);

const chain = UPGRADES.filter(
  (u) => u.kind === 'thousandBlades' || u.kind === 'thousandBladesMult',
);
assert.equal(chain.length, 12, `12 elos (got ${chain.length})`);

for (let i = 0; i < EXPECTED.length; i += 1) {
  const exp = EXPECTED[i];
  const u = UPGRADE_BY_ID[exp.id];
  assert.ok(u, `missing ${exp.id}`);
  assert.equal(u.kind, exp.kind);
  assert.equal(String(u.factor), exp.factor);
  assert.equal(u.requires.quantity, exp.qty);
  if (i > 0) {
    assert.equal(u.requires.upgradeId, EXPECTED[i - 1].id);
  }
  assert.equal(
    meetsUpgradeRequirement(u, {
      generators: { wandering_shade: exp.qty - 1 },
      upgrades: i > 0 ? [EXPECTED[i - 1].id] : [],
    }),
    false,
    `${exp.id} fail qty-1`,
  );
  assert.equal(
    meetsUpgradeRequirement(u, {
      generators: { wandering_shade: exp.qty },
      upgrades: i > 0 ? [EXPECTED[i - 1].id] : [],
    }),
    true,
    `${exp.id} pass qty`,
  );
}

const gens = { wandering_shade: 50, charon_servants: 10, cerberian_hound: 5, tartarus_judge: 5 };
const ids = EXPECTED.map((e) => e.id);
// 0.1×5×10×20^9 × 20 não-Sombras = 5.12e13
assert.equal(thousandBladesBonusPerUnit(ids, gens), '51200000000000');

const phpCheck = spawnSync('php', ['-r', 'echo 1;'], { encoding: 'utf8' });
if (phpCheck.status !== 0) {
  console.log('[SKIP] PHP CLI indisponível — só asserts JS.');
} else {
  const phpScript = `
if (!defined('STDERR')) { define('STDERR', fopen('php://stderr', 'w')); }
require ${JSON.stringify(path.join(root, 'backend/bootstrap.php'))};
use App\\Services\\Despertar\\DespertarCatalog;
use App\\Services\\Despertar\\DespertarDecimal;
use App\\Services\\Despertar\\DespertarFormulas;
$js = json_decode(${JSON.stringify(JSON.stringify(EXPECTED.map((e) => e.id)))}, true);
$php = [];
foreach (DespertarCatalog::UPGRADES as $u) {
  if (($u['kind'] ?? '') === 'thousandBlades' || ($u['kind'] ?? '') === 'thousandBladesMult') {
    $php[] = $u['id'];
  }
}
$gens = json_decode(${JSON.stringify(JSON.stringify(gens))}, true);
$out = [
  'count' => count($php),
  'ids' => $php,
  'bonus' => DespertarDecimal::money(DespertarFormulas::thousandBladesBonusPerUnit($js, $gens)),
];
echo json_encode($out);
`;
  const res = spawnSync('php', [], { input: `<?php\n${phpScript}`, encoding: 'utf8' });
  assert.equal(res.status, 0, `PHP falhou:\n${res.stderr}\n${res.stdout}`);
  const php = JSON.parse(res.stdout);
  assert.equal(php.count, 12);
  assert.deepEqual(php.ids, ids);
  assert.equal(php.bonus, money(thousandBladesBonusPerUnit(ids, gens)));
}

console.log('despertar-mil-foices-smoke: OK');
