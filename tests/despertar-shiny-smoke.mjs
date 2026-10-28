/**
 * Smoke Task G4.1 + G4.2 + G4.3 — shinyCounts / lineSPS / render / persistência.
 * Uso: node tests/despertar-shiny-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOLD_CHANCE, GOLD_MULT, NEGATIVO_CHANCE, NEGATIVO_MULT, SHINY_CHANCE, SHINY_MULT } from '../js/hades-despertar/config/constants.js';
import { cmp, mul } from '../js/hades-despertar/core/decimal.js';
import {
  calculateTotalSPS,
  lineSPS,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const formulasSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/formulas.js'), 'utf8');
const stateSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8');
const worldSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/WorldView.js'), 'utf8');
const altarSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/AltarOrbit.js'), 'utf8');
const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
const setupSql = fs.readFileSync(path.join(root, 'db/setup.sql'), 'utf8');
const migrateShiny = path.join(root, 'db/migrate-2026-09-22-despertar-shiny-counts.sql');
const migrateSrc = fs.existsSync(migrateShiny) ? fs.readFileSync(migrateShiny, 'utf8') : '';
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(formulasSrc.includes('lineSPS'), 'lineSPS export');
staticAssert(formulasSrc.includes('shinyCounts'), 'calculateTotalSPS usa shinyCounts');
staticAssert(stateSrc.includes('SHINY_CHANCE'), 'GameState rola shiny no buy');
staticAssert(stateSrc.includes('_shinyCounts'), 'GameState guarda shinyCounts');
staticAssert(worldSrc.includes('shinyOpts') || worldSrc.includes('opts.shiny'), 'shelf pinta shiny');
staticAssert(altarSrc.includes('markShinyPlacements'), 'órbita marca shiny');
staticAssert(indexSrc.includes('announceShinyFirst'), 'ticker one-shot no buy');
staticAssert(indexSrc.includes('shinyGained'), 'buy → shinyGained');
staticAssert(fs.existsSync(migrateShiny), 'migration shiny_counts existe');
const migrateGold = path.join(root, 'db/migrate-2026-09-22-despertar-gold-counts.sql');
staticAssert(fs.existsSync(migrateGold), 'migration gold_counts existe');
staticAssert(migrateSrc.includes('shiny_counts'), 'migration coluna shiny_counts');
staticAssert(migrateSrc.includes('INFORMATION_SCHEMA.COLUMNS'), 'migration consulta information_schema');
staticAssert(!migrateSrc.includes("v_patch ? 'shiny_counts'"), 'sem CASE plpgsql');
staticAssert(setupSql.includes('shiny_counts jsonb'), 'setup.sql coluna shiny_counts');
staticAssert(setupSql.includes('gold_counts jsonb'), 'setup.sql coluna gold_counts');
staticAssert(setupSql.includes("v_patch ? 'shiny_counts'"), 'setup.sql RPC shiny_counts');
staticAssert(NEGATIVO_MULT === '15' && NEGATIVO_CHANCE === 0.005, 'negativo ×15 / 0,5%');
staticAssert(GOLD_MULT === '2' && GOLD_CHANCE === 0.02, 'gold ×2 / 2%');
staticAssert(SHINY_MULT === NEGATIVO_MULT && SHINY_CHANCE === NEGATIVO_CHANCE, 'alias shiny=negativo');
staticAssert(worldSrc.includes('shinyGlitch') || worldSrc.includes('shinyTearBands') || worldSrc.includes('unitRarityAt'), 'shelf raridade');
staticAssert(worldSrc.includes('drawImageAsGold'), 'shelf gold usa drawImageAsGold');
const goldJuiceSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/goldJuice.js'), 'utf8');
staticAssert(goldJuiceSrc.includes('recolorImageDataToGold'), 'goldJuice remapeia pixels');
staticAssert(altarSrc.includes('unitRarityAt') || altarSrc.includes('rarity'), 'órbita raridade');
staticAssert(stateSrc.includes('_goldCounts') || stateSrc.includes('goldCounts'), 'GameState goldCounts');

if (errors.length) {
  console.error('despertar-shiny-smoke (estático):');
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

function eqMoney(actual, expected, message) {
  assert.equal(cmp(actual, expected), 0, message || `${actual} ≠ ${expected}`);
}

run('lineSPS sem shiny = qty × base × upgrade', () => {
  eqMoney(lineSPS({ qty: 10, shiny: 0, baseRate: '0.1', upgradeMult: '1' }), '1');
  eqMoney(lineSPS({ qty: 5, shiny: 0, baseRate: '0.8', upgradeMult: '2' }), '8');
});

run('lineSPS: (qty-shiny)*u + shiny*u*SHINY_MULT', () => {
  // 8 normal + 2 shiny ×15 = 8*0.1 + 2*0.1*15 = 0.8 + 3.0 = 3.8
  eqMoney(lineSPS({ qty: 10, shiny: 2, baseRate: '0.1', upgradeMult: '1' }), '3.8');
  // shiny capped to qty → 3 × 0.1 × 15 = 4.5
  eqMoney(lineSPS({ qty: 3, shiny: 9, baseRate: '0.1', upgradeMult: '1' }), '4.5');
});

run('calculateTotalSPS com shinyCounts', () => {
  const base = calculateTotalSPS({ generators: { wandering_shade: 10 } });
  eqMoney(base, '1');
  const boosted = calculateTotalSPS({
    generators: { wandering_shade: 10 },
    shinyCounts: { wandering_shade: 2 },
  });
  eqMoney(boosted, '3.8');
});

run('buyGenerator rola negativo / gold (RNG injetável)', () => {
  // 0: hit negativo primeiro (0,5%, mais raro)
  const alwaysNeg = new GameState(
    { souls: '10000', generators: {} },
    { random: () => 0 },
  );
  const lot = alwaysNeg.buyGenerator('wandering_shade', '10');
  assert.equal(lot.ok, true);
  assert.equal(lot.bought, 10);
  assert.equal(lot.shinyGained, 10);
  assert.equal(lot.goldGained, 0);
  assert.equal(alwaysNeg.shinyCounts().wandering_shade, 10);

  // 0.015: miss negativo (0,5%), hit gold (2%)
  const alwaysGold = new GameState(
    { souls: '10000', generators: {} },
    { random: () => 0.015 },
  );
  const lotGold = alwaysGold.buyGenerator('wandering_shade', '10');
  assert.equal(lotGold.goldGained, 10);
  assert.equal(lotGold.shinyGained, 0);
  assert.equal(alwaysGold.goldCounts().wandering_shade, 10);

  const never = new GameState(
    { souls: '10000', generators: {} },
    { random: () => 0.99 },
  );
  const lot2 = never.buyGenerator('wandering_shade', '10');
  assert.equal(lot2.shinyGained, 0);
  assert.equal(lot2.goldGained, 0);
  assert.equal(never.shinyCounts().wandering_shade, undefined);
});

run('Lethe zera negativo e gold com geradores (Q12)', () => {
  const state = new GameState({
    souls: '0',
    runSouls: '4000000000',
    lifetimeSouls: '4000000000',
    generators: { wandering_shade: 5 },
    shinyCounts: { wandering_shade: 2 },
    goldCounts: { wandering_shade: 1 },
  });
  assert.equal(state.shinyCounts().wandering_shade, 2);
  assert.equal(state.goldCounts().wandering_shade, 1);
  assert.equal(state.applyPrestige().ok, true);
  assert.deepEqual(state.shinyCounts(), {});
  assert.deepEqual(state.goldCounts(), {});
  assert.equal(Object.keys(state.quantities()).length, 0);
});

run('snapshot round-trip preserva shinyCounts', () => {
  const state = new GameState({
    souls: '100',
    generators: { charon_servants: 4 },
    shinyCounts: { charon_servants: 1 },
  });
  const snap = state.toSnapshot();
  assert.equal(snap.shinyCounts.charon_servants, 1);
  const restored = GameState.fromSnapshot(snap);
  assert.equal(restored.shinyCounts().charon_servants, 1);
  eqMoney(restored.sps(), state.sps());
});

run('chance defaults negativo ×15 / gold ×2', () => {
  assert.equal(SHINY_CHANCE, 0.005);
  assert.equal(SHINY_MULT, '15');
  assert.equal(NEGATIVO_MULT, '15');
  assert.equal(NEGATIVO_CHANCE, 0.005);
  assert.equal(GOLD_MULT, '2');
  assert.equal(GOLD_CHANCE, 0.02);
  assert.equal(mul('0.1', SHINY_MULT), '1.5');
  assert.equal(mul('0.1', GOLD_MULT), '0.2');
});

run('G4.2: sync shelf marca shinyCount e repinta', () => {
  // WorldView sync path — shinyCountFromState já coberto; assert paint flags via código.
  assert.ok(worldSrc.includes('shinyChanged') || worldSrc.includes('nextShiny'));
  assert.ok(worldSrc.includes('reducedMotion'));
});

if (failed) {
  console.error(`\n${failed} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`\nAll ${passed} checks passed.`);
