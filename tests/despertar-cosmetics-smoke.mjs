/**
 * Smoke Fase E / E1 — upgrade cosmetics + coverage mask.
 * Uso: node tests/despertar-cosmetics-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  UPGRADE_COSMETICS,
  UPGRADE_COSMETIC_IDS,
  activeCosmetics,
  applyReapCosmeticClasses,
  cosmeticCoverageIndices,
  cosmeticCoverageMask,
  cosmeticsForGenerator,
  cosmeticsForReap,
  indexMatchesCoverage,
  reapCosmeticClassNames,
  resolveCosmeticLayers,
} from '../js/hades-despertar/config/upgrade-cosmetics.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const cfgPath = path.join(root, 'js/hades-despertar/config/upgrade-cosmetics.js');
staticAssert(fs.existsSync(cfgPath), 'upgrade-cosmetics.js existe');
const cfgSrc = fs.readFileSync(cfgPath, 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(cfgSrc.includes('moeda_no_barquinho'), 'exemplo Servos');
staticAssert(cfgSrc.includes('foice_afilada'), 'exemplo Foice');
staticAssert(cfgSrc.includes('hat_charon'), 'accessory hat');
staticAssert(cfgSrc.includes('blade_glow'), 'accessory blade');
staticAssert(cfgSrc.includes('indexMatchesCoverage'), 'mask helper');
staticAssert(cfgSrc.includes('activeCosmetics'), 'activeCosmetics export');
staticAssert(pkg.includes('despertar-cosmetics-smoke.mjs'), 'check inclui cosmetics smoke');
staticAssert(UPGRADE_COSMETIC_IDS.includes('moeda_no_barquinho'), 'ids list');
staticAssert(UPGRADE_COSMETICS.moeda_no_barquinho.coverage === 0.5, 'coverage 0.5');
staticAssert(UPGRADE_COSMETICS.foice_afilada.coverage === 1, 'coverage 1 foice');

if (errors.length) {
  console.error('despertar-cosmetics-smoke (estático):');
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

run('qty 10 + coverage 0.5 → ~5 índices espalhados (não faixas)', () => {
  const salt = 'moeda_no_barquinho';
  const indices = cosmeticCoverageIndices(10, 0.5, salt);
  assert.ok(indices.length >= 3 && indices.length <= 7, `got ${indices.length}`);
  assert.equal(indices.length, cosmeticCoverageMask(10, 0.5, salt).filter(Boolean).length);
  // Não pode ser a antiga regra Bresenham (ímpares = faixas na grade coluna-major).
  assert.notDeepEqual(indices, [1, 3, 5, 7, 9]);
  // Espalhamento: não concentrar só em linhas ímpares (row = i % 4 ∈ {1,3}).
  const oddRows = indices.filter((i) => i % 4 === 1 || i % 4 === 3).length;
  assert.ok(oddRows < indices.length, 'deve haver chapéu também em linhas pares');
});

run('mask determinística (±0 em re-runs)', () => {
  const a = cosmeticCoverageIndices(40, 0.5, 'hat_charon');
  const b = cosmeticCoverageIndices(40, 0.5, 'hat_charon');
  assert.deepEqual(a, b);
  assert.ok(a.length >= 14 && a.length <= 26, `~20 got ${a.length}`);
  for (let i = 0; i < 40; i += 1) {
    assert.equal(
      indexMatchesCoverage(i, 0.5, 'hat_charon'),
      a.includes(i),
    );
  }
});

run('coverage 0 / 1 extremos', () => {
  assert.deepEqual(cosmeticCoverageIndices(10, 0), []);
  assert.deepEqual(cosmeticCoverageIndices(10, 1), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(indexMatchesCoverage(99, 1), true);
  assert.equal(indexMatchesCoverage(0, 0), false);
});

run('activeCosmetics filtra por upgrades owned', () => {
  const empty = activeCosmetics({ upgrades: [] });
  assert.equal(empty.length, 0);

  const onlyBoat = activeCosmetics({ upgrades: ['moeda_no_barquinho'] });
  assert.equal(onlyBoat.length, 1);
  assert.equal(onlyBoat[0].accessory, 'hat_charon');
  assert.equal(onlyBoat[0].targetGeneratorId, 'charon_servants');

  const both = activeCosmetics({
    upgrades: ['foice_afilada', 'moeda_no_barquinho', 'umbras_despertas'],
  });
  assert.equal(both.length, 2);
  assert.ok(cosmeticsForGenerator(both, 'charon_servants').some((c) => c.accessory === 'hat_charon'));
  assert.ok(cosmeticsForReap(both).some((c) => c.accessory === 'blade_glow'));
  assert.equal(cosmeticsForGenerator(both, 'wandering_shade').length, 0);
});

run('activeCosmetics via GameState', () => {
  const state = new GameState({
    souls: '2000',
    generators: { charon_servants: 1 },
  });
  assert.equal(activeCosmetics(state).length, 0);
  assert.equal(state.buyUpgrade('moeda_no_barquinho').ok, true);
  const active = activeCosmetics(state);
  assert.equal(active.length, 1);
  assert.equal(active[0].upgradeId, 'moeda_no_barquinho');
});

run('resolveCosmeticLayers — mesma layer vence por priority', () => {
  const resolved = resolveCosmeticLayers([
    {
      upgradeId: 'a',
      targetGeneratorId: 'charon_servants',
      target: null,
      accessory: 'hat_old',
      coverage: 0.5,
      layer: 'hat',
      priority: 1,
    },
    {
      upgradeId: 'b',
      targetGeneratorId: 'charon_servants',
      target: null,
      accessory: 'hat_new',
      coverage: 0.5,
      layer: 'hat',
      priority: 2,
    },
    {
      upgradeId: 'c',
      targetGeneratorId: 'charon_servants',
      target: null,
      accessory: 'tool_x',
      coverage: 1,
      layer: 'tool',
      priority: 1,
    },
  ]);
  assert.equal(resolved.length, 2);
  assert.ok(resolved.some((c) => c.accessory === 'hat_new'));
  assert.ok(resolved.some((c) => c.accessory === 'tool_x'));
  assert.equal(resolved.some((c) => c.accessory === 'hat_old'), false);
});

run('E3: classes blade_glow na Foice', () => {
  assert.deepEqual(reapCosmeticClassNames({ upgrades: [] }), []);
  assert.deepEqual(
    reapCosmeticClassNames({ upgrades: ['foice_afilada'] }),
    ['has-cosmetic-blade_glow'],
  );
  const el = {
    classList: {
      _on: new Set(['other', 'has-cosmetic-blade_glow']),
      add(n) { this._on.add(n); },
      remove(n) { this._on.delete(n); },
      values() { return this._on.values(); },
      [Symbol.iterator]() { return this._on[Symbol.iterator](); },
    },
  };
  applyReapCosmeticClasses(el, { upgrades: [] });
  assert.equal(el.classList._on.has('has-cosmetic-blade_glow'), false);
  assert.equal(el.classList._on.has('other'), true);
  applyReapCosmeticClasses(el, { upgrades: ['foice_afilada'] });
  assert.equal(el.classList._on.has('has-cosmetic-blade_glow'), true);
});

console.log(`\ndespertar-cosmetics-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
