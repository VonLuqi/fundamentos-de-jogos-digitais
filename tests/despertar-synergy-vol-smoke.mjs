/**
 * Smoke — Sinergias Vol. I/II malha canónica (36) + gates Lethe + migração legado.
 * Uso: node tests/despertar-synergy-vol-smoke.mjs
 */

import assert from 'node:assert/strict';
import { UPGRADES, LEGACY_SYNERGY_COSTS, UPGRADE_BY_ID } from '../js/hades-despertar/config/upgrades.js';
import { TALENT_BY_ID } from '../js/hades-despertar/config/talents.js';
import { cmp, money } from '../js/hades-despertar/core/decimal.js';
import {
  meetsUpgradeRequirement,
  migrateUpgradeSave,
  synergyUpgradeMult,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';

const vol = UPGRADES.filter((u) => u.kind === 'synergyMult' && u.boostedBonusPerBase === '0.05');
const servos = UPGRADES.filter((u) => u.kind === 'synergyMult' && u.id.startsWith('servos_'));

assert.equal(vol.length, 36);
assert.equal(servos.length, 8);
assert.equal(Object.keys(LEGACY_SYNERGY_COSTS).length, 20);
assert.ok(TALENT_BY_ID.sinergias_vol_i);
assert.ok(TALENT_BY_ID.sinergias_vol_ii);
assert.deepEqual(TALENT_BY_ID.sinergias_vol_ii.requires?.talentIds, ['sinergias_vol_i']);

assert.ok(!UPGRADE_BY_ID.cortejo_das_margens_i);
assert.ok(UPGRADE_BY_ID.almanaques_do_destino_i);
assert.ok(UPGRADE_BY_ID.camundongos_clicando_ii);

const mig = migrateUpgradeSave(
  ['cortejo_das_margens_i', 'foice_afilada', 'brasa_cruzada_ii', 'ghost'],
  '100',
);
assert.deepEqual(mig.upgrades, ['foice_afilada']);
assert.equal(cmp(mig.refunded, money(addLegacy('150000', '21000000000000'))), 0);
assert.ok(cmp(mig.souls, '100') > 0);

const gs = new GameState({
  souls: '0',
  upgrades: ['cortejo_das_margens_i', 'mil_foices'],
});
assert.ok(!gs.upgrades.includes('cortejo_das_margens_i'));
assert.ok(gs.upgrades.includes('mil_foices'));
assert.ok(cmp(gs.souls, '0') > 0);

assert.equal(
  meetsUpgradeRequirement(UPGRADE_BY_ID.almanaques_do_destino_i, {
    generators: { cerberian_hound: 15, chronos_loom: 15 },
    talents: ['sinergias_vol_i'],
  }),
  true,
);

eqMoney(
  synergyUpgradeMult(
    'cerberian_hound',
    ['almanaques_do_destino_i'],
    { cerberian_hound: 10, chronos_loom: 20 },
  ),
  '2',
);

console.log('despertar-synergy-vol-smoke: OK');

function addLegacy(a, b) {
  return (BigInt(a) + BigInt(b)).toString();
}

function eqMoney(a, b) {
  assert.equal(money(a), money(b), `${a} !== ${b}`);
}
