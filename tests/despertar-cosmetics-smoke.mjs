/**
 * Smoke Fase E / E1 — upgrade cosmetics + coverage mask + Bancada/Lethe.
 * Uso: node tests/despertar-cosmetics-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COSMETIC_LAYERS,
  P0_COSMETIC_ACCESSORIES,
  UPGRADE_COSMETICS,
  UPGRADE_COSMETIC_IDS,
  activeCosmetics,
  applyReapCosmeticClasses,
  cosmeticCoverageIndices,
  cosmeticCoverageMask,
  cosmeticsForAltar,
  cosmeticsForGenerator,
  cosmeticsForReap,
  indexMatchesCoverage,
  reapCosmeticClassNames,
  resolveCosmeticLayers,
} from '../js/hades-despertar/config/upgrade-cosmetics.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  applyShelfCosmeticClasses,
  drawAccessory,
  drawOrbitHalo,
} from '../js/hades-despertar/ui/world/WorldView.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const cfgPath = path.join(root, 'js/hades-despertar/config/upgrade-cosmetics.js');
staticAssert(fs.existsSync(cfgPath), 'upgrade-cosmetics.js existe');
const cfgSrc = fs.readFileSync(cfgPath, 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const plan = fs.readFileSync(
  path.join(root, 'docs/plano-despertar-producao-profundo.md'),
  'utf8',
);

staticAssert(cfgSrc.includes('moeda_no_barquinho'), 'exemplo Servos');
staticAssert(cfgSrc.includes('foice_afilada'), 'exemplo Foice');
staticAssert(cfgSrc.includes('hat_charon'), 'accessory hat');
staticAssert(cfgSrc.includes('blade_glow'), 'accessory blade');
staticAssert(cfgSrc.includes("source: 'verdict'"), 'source verdict E1');
staticAssert(cfgSrc.includes("target: 'altar'"), 'target altar E1');
staticAssert(cfgSrc.includes('cosmeticsForAltar'), 'cosmeticsForAltar export');
staticAssert(cfgSrc.includes('indexMatchesCoverage'), 'mask helper');
staticAssert(cfgSrc.includes('activeCosmetics'), 'activeCosmetics export');
staticAssert(pkg.includes('despertar-cosmetics-smoke.mjs'), 'check inclui cosmetics smoke');
staticAssert(UPGRADE_COSMETIC_IDS.includes('moeda_no_barquinho'), 'ids list');
staticAssert(UPGRADE_COSMETICS.moeda_no_barquinho.coverage === 0.5, 'coverage 0.5');
staticAssert(UPGRADE_COSMETICS.foice_afilada.coverage === 1, 'coverage 1 foice');
staticAssert(UPGRADE_COSMETIC_IDS.length === 12, `P0 = 12 defs (tem ${UPGRADE_COSMETIC_IDS.length})`);
staticAssert(P0_COSMETIC_ACCESSORIES.length === 12, '12 accessories');
staticAssert(COSMETIC_LAYERS.includes('blade') && COSMETIC_LAYERS.includes('shelf_fx'), 'layers 0E');
staticAssert(UPGRADE_COSMETICS.selo_do_juiz?.source === 'verdict', 'selo é verdict');
staticAssert(UPGRADE_COSMETICS.colheita_eterna?.target === 'altar', 'colheita → altar');
staticAssert(plan.includes('0E congelada') || plan.includes('Task 0E'), 'plano 0E');

const expectedAccessories = [
  'blade_glow',
  'blade_runes',
  'reap_ripple',
  'blade_ember',
  'orbit_halo',
  'hat_charon',
  'boat_wake',
  'shade_wisp',
  'hound_chain',
  'hound_triple_aura',
  'judge_scale_fx',
  'blade_seal',
];
for (const acc of expectedAccessories) {
  staticAssert(P0_COSMETIC_ACCESSORIES.includes(acc), `accessory ${acc}`);
}

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
  assert.notDeepEqual(indices, [1, 3, 5, 7, 9]);
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
  assert.equal(both.length, 3);
  assert.ok(cosmeticsForGenerator(both, 'charon_servants').some((c) => c.accessory === 'hat_charon'));
  assert.ok(cosmeticsForReap(both).some((c) => c.accessory === 'blade_glow'));
  assert.ok(cosmeticsForGenerator(both, 'wandering_shade').some((c) => c.accessory === 'shade_wisp'));
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

run('cadeia Foice: blade priority + trail + altar', () => {
  const chain = activeCosmetics({
    upgrades: [
      'foice_afilada',
      'juramento_acheron',
      'pacto_das_margens',
      'ceifador_ctoniano',
      'colheita_eterna',
    ],
  });
  const reap = cosmeticsForReap(chain);
  assert.ok(reap.some((c) => c.accessory === 'blade_ember'), 'ember vence blade');
  assert.equal(reap.some((c) => c.accessory === 'blade_glow'), false);
  assert.equal(reap.some((c) => c.accessory === 'blade_runes'), false);
  assert.ok(reap.some((c) => c.accessory === 'reap_ripple'), 'trail empilha');
  assert.ok(
    cosmeticsForAltar(chain).some((c) => c.accessory === 'orbit_halo'),
    'orbit_halo no altar',
  );
});

run('Bancada selo_do_juiz ativa blade_seal', () => {
  const active = activeCosmetics({
    upgrades: [],
    verdictPurchases: ['selo_do_juiz'],
  });
  assert.equal(active.length, 1);
  assert.equal(active[0].accessory, 'blade_seal');
  assert.equal(active[0].source, 'verdict');
  assert.deepEqual(reapCosmeticClassNames({
    upgrades: [],
    verdictPurchases: ['selo_do_juiz'],
  }), ['has-cosmetic-blade_seal']);
});

run('selo vence blade Styx na mesma layer', () => {
  const active = activeCosmetics({
    upgrades: ['foice_afilada', 'ceifador_ctoniano'],
    verdictPurchases: ['selo_do_juiz'],
  });
  const blades = cosmeticsForReap(active).filter((c) => c.layer === 'blade');
  assert.equal(blades.length, 1);
  assert.equal(blades[0].accessory, 'blade_seal');
});

run('Lethe: Styx some; Bancada permanece', () => {
  const state = new GameState({
    souls: '100000',
    runSouls: '4000000000',
    lifetimeSouls: '4000000000',
    generators: { charon_servants: 1, wandering_shade: 1 },
    upgrades: ['foice_afilada', 'moeda_no_barquinho'],
    verdictPurchases: ['selo_do_juiz'],
    verdicts: 10,
  });
  assert.deepEqual(
    state.upgrades.sort(),
    ['foice_afilada', 'moeda_no_barquinho'].sort(),
  );
  const before = activeCosmetics(state);
  // selo (pri 4) vence blade_glow na layer blade — hat ainda Styx
  assert.ok(before.some((c) => c.accessory === 'blade_seal'));
  assert.ok(before.some((c) => c.accessory === 'hat_charon'));
  assert.equal(before.some((c) => c.accessory === 'blade_glow'), false);

  const ritual = state.applyPrestige();
  assert.equal(ritual.ok, true, 'Lethe ok');
  assert.deepEqual(state.upgrades, []);
  assert.ok(state.verdictPurchases.includes('selo_do_juiz'));

  const after = activeCosmetics(state);
  assert.equal(after.some((c) => c.accessory === 'hat_charon'), false, 'Styx some');
  assert.ok(after.some((c) => c.accessory === 'blade_seal'), 'selo persiste');
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

run('E2: drawAccessory P0 shelves + orbit_halo', () => {
  const ops = [];
  const ctx = {
    save() { ops.push('save'); },
    restore() { ops.push('restore'); },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() { ops.push('fill'); },
    stroke() { ops.push('stroke'); },
    arc() { ops.push('arc'); },
    ellipse() { ops.push('ellipse'); },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: '',
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
  };
  for (const id of [
    'boat_wake',
    'shade_wisp',
    'hound_chain',
    'hound_triple_aura',
    'judge_scale_fx',
  ]) {
    assert.equal(drawAccessory(ctx, id, 0, 0, 36, 0, { reducedMotion: true }), true, id);
  }
  assert.equal(drawOrbitHalo(ctx, 50, 50, 40, { reducedMotion: true }), true);

  const shelfEl = {
    classList: {
      _on: new Set(),
      add(n) { this._on.add(n); },
      remove(n) { this._on.delete(n); },
      values() { return this._on.values(); },
      [Symbol.iterator]() { return this._on[Symbol.iterator](); },
    },
  };
  const active = activeCosmetics({ upgrades: ['moeda_no_barquinho', 'frota_de_caronte'] });
  applyShelfCosmeticClasses(shelfEl, active, 'charon_servants');
  assert.ok(shelfEl.classList._on.has('has-cosmetic-hat_charon'));
  assert.ok(shelfEl.classList._on.has('has-cosmetic-boat_wake'));
});

run('E2: CSS Foice trail/ember + reduced-motion', () => {
  const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
  assert.ok(css.includes('has-cosmetic-blade_ember'));
  assert.ok(css.includes('has-cosmetic-reap_ripple'));
  assert.ok(css.includes('has-cosmetic-blade_seal'));
  assert.ok(css.includes('has-cosmetic-blade_runes'));
  assert.ok(css.includes('has-cosmetic-orbit_halo'));
  assert.ok(css.includes('despertarBladeEmber'));
  assert.ok(css.includes('despertarReapRipple'));
  const altarSrc = fs.readFileSync(
    path.join(root, 'js/hades-despertar/ui/world/AltarOrbit.js'),
    'utf8',
  );
  assert.ok(altarSrc.includes('drawOrbitHalo'));
  assert.ok(altarSrc.includes('cosmeticsForAltar'));
  assert.ok(altarSrc.includes('_shadeCosmetics'));
});

run('E3: pedidos arte 12 accessories + CosmeticsAtlas', () => {
  const brief = fs.readFileSync(path.join(root, 'assets/despertar/PEDIDOS-MESTRE.md'), 'utf8');
  const req = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'),
  );
  const art = req.requests.find((r) => r.id === 'art_cosmetics');
  assert.ok(art);
  assert.equal(art.accessoryIds.length, 12);
  assert.equal(art.status, 'open');
  for (const id of P0_COSMETIC_ACCESSORIES) {
    assert.ok(art.accessoryIds.includes(id), id);
    assert.ok(brief.includes(id), `brief ${id}`);
  }
  const atlas = fs.readFileSync(
    path.join(root, 'js/hades-despertar/ui/world/CosmeticsAtlas.js'),
    'utf8',
  );
  assert.ok(atlas.includes('loadCosmeticImage'));
  assert.ok(atlas.includes('prefetchCosmeticImages'));
  assert.ok(fs.existsSync(path.join(root, 'assets/despertar/cosmetics/README.md')));
});

console.log(`\ndespertar-cosmetics-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
