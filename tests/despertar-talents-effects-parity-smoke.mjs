/**
 * Smoke — talentEffects / prestige / blades JS ≡ PHP.
 * Uso: node tests/despertar-talents-effects-parity-smoke.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALENTS } from '../js/hades-despertar/config/talents.js';
import { cmp, mul } from '../js/hades-despertar/core/decimal.js';
import {
  heavenlyPowerFromUpgrades,
  prestigeBonus,
  talentEffects,
  thousandBladesBonusPerUnit,
} from '../js/hades-despertar/core/formulas.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function phpTalentPayload(talentIds, extra = {}) {
  const php = `
    require ${JSON.stringify(path.join(root, 'backend/bootstrap.php'))};
    use App\\Services\\Despertar\\DespertarFormulas;
    use App\\Services\\Despertar\\DespertarDecimal;
    $in = json_decode($argv[1], true);
    $ids = $in['talents'];
    $extra = $in['extra'] ?? [];
    $fx = DespertarFormulas::talentEffects($ids);
    echo json_encode([
      'effects' => $fx,
      'prestige' => DespertarFormulas::prestigeBonus($in['obols'] ?? '10', $ids, $extra),
      'blades' => DespertarDecimal::money(DespertarFormulas::thousandBladesBonusPerUnit(
        $in['upgrades'] ?? ['mil_foices'],
        $in['generators'] ?? ['wandering_shade' => 50],
        $ids
      )),
      'heavenlyPower' => DespertarFormulas::heavenlyPowerFromUpgrades($in['hpUpgrades'] ?? [], $extra),
    ]);
  `;
  const out = execFileSync('php', ['-r', php, JSON.stringify({ talents: talentIds, ...extra })], {
    cwd: root,
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

function normalizeEffects(fx) {
  const o = { ...fx };
  o.offlineHours = Number(o.offlineHours);
  o.permanentSlot = Number(o.permanentSlot || 0);
  o.synergyVolUnlock = Number(o.synergyVolUnlock || 0);
  o.softPrestigeStyxCount = Number(o.softPrestigeStyxCount || 0);
  if (Array.isArray(o.startingGenerators) && o.startingGenerators.length === 0) {
    o.startingGenerators = {};
  } else {
    o.startingGenerators = o.startingGenerators || {};
  }
  if (Array.isArray(o.unshackledGenerators) && o.unshackledGenerators.length === 0) {
    o.unshackledGenerators = {};
  } else {
    o.unshackledGenerators = o.unshackledGenerators || {};
  }
  o.cosmetics = o.cosmetics || [];
  return o;
}

function assertEffectsParity(ids, label) {
  const js = normalizeEffects(talentEffects(ids));
  const php = normalizeEffects(phpTalentPayload(ids).effects);
  assert.deepEqual(php, js, label);
}

const phpCheck = spawnSync('php', ['-r', 'echo 1;'], { encoding: 'utf8' });
if (phpCheck.status !== 0) {
  console.log('[SKIP] PHP CLI indisponível');
  process.exit(0);
}

const samples = [
  [],
  ['legado'],
  ['legado', 'portoes_gemeos', 'angels'],
  ['permanent_slot_i', 'permanent_slot_ii'],
  ['sinergias_vol_i'],
  ['belphegor', 'mamon', 'abadao'],
  ['unshackled_cursors'],
  ['contabilidade_genial'],
  ['quimera'],
];

for (const ids of samples) {
  assertEffectsParity(ids, ids.join(',') || 'empty');
}

// edge: random subsets
for (let i = 0; i < 8; i += 1) {
  const pick = [];
  const n = 3 + (i % 5);
  for (let j = 0; j < n; j += 1) {
    pick.push(TALENTS[(i * 17 + j * 11) % TALENTS.length].id);
  }
  const uniq = [...new Set(pick)];
  assertEffectsParity(uniq, `random ${i}`);
}

const gens = { wandering_shade: 50, charon_servants: 10 };
const bladeIds = ['mil_foices'];
const withUnshackle = ['unshackled_cursors'];
const jsBase = thousandBladesBonusPerUnit(bladeIds, gens, []);
const jsUnsh = thousandBladesBonusPerUnit(bladeIds, gens, withUnshackle);
assert.equal(cmp(jsUnsh, mul(jsBase, '25')), 0, 'unshackleFingers ×25');
const phpBlades = phpTalentPayload(withUnshackle, {
  upgrades: bladeIds,
  generators: gens,
});
assert.equal(cmp(phpBlades.blades, jsUnsh), 0, 'blades parity unshackle');

const hpUps = UPGRADES.filter((u) => u.kind === 'heavenlyPower').slice(0, 2).map((u) => u.id);
const opts = { milestones: { heavenlyPowerLegacy: true } };
const jsPb = prestigeBonus('100', ['legado'], { upgrades: hpUps, ...opts });
const phpPb = phpTalentPayload(['legado'], { obols: '100', hpUpgrades: hpUps, extra: opts });
assert.equal(cmp(phpPb.prestige, jsPb), 0, 'prestigeBonus legacy power');

const jsHp = heavenlyPowerFromUpgrades(hpUps, opts);
assert.equal(cmp(phpPb.heavenlyPower, jsHp), 0, 'heavenlyPower');

console.log('[PASS] despertar-talents-effects-parity-smoke');
