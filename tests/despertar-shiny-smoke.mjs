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
import {
  applyPrestige,
  buildStateDto,
  canonicalToRowPatch,
  normalizeShinyCounts,
  rowToCanonical,
  validateSync,
} from '../api/_lib/despertar-validate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const formulasSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/formulas.js'), 'utf8');
const stateSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8');
const validateSrc = fs.readFileSync(path.join(root, 'api/_lib/despertar-validate.js'), 'utf8');
const worldSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/WorldView.js'), 'utf8');
const altarSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/AltarOrbit.js'), 'utf8');
const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
const apiSrc = fs.readFileSync(path.join(root, 'api/despertar.js'), 'utf8');
const setupSql = fs.readFileSync(path.join(root, 'db/setup.sql'), 'utf8');
const migrateShiny = path.join(root, 'db/migrate-2026-09-22-despertar-shiny-counts.sql');
const migrateSrc = fs.existsSync(migrateShiny) ? fs.readFileSync(migrateShiny, 'utf8') : '';
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(formulasSrc.includes('lineSPS'), 'lineSPS export');
staticAssert(formulasSrc.includes('shinyCounts'), 'calculateTotalSPS usa shinyCounts');
staticAssert(stateSrc.includes('SHINY_CHANCE'), 'GameState rola shiny no buy');
staticAssert(stateSrc.includes('_shinyCounts'), 'GameState guarda shinyCounts');
staticAssert(validateSrc.includes('normalizeShinyCounts'), 'validate normaliza shiny');
staticAssert(validateSrc.includes('shiny_counts:'), 'canonicalToRowPatch escreve shiny_counts');
staticAssert(worldSrc.includes('shinyOpts') || worldSrc.includes('opts.shiny'), 'shelf pinta shiny');
staticAssert(altarSrc.includes('markShinyPlacements'), 'órbita marca shiny');
staticAssert(indexSrc.includes('announceShinyFirst'), 'ticker one-shot no buy');
staticAssert(indexSrc.includes('shinyGained'), 'buy → shinyGained');
staticAssert(apiSrc.includes("'shiny_counts'"), 'ROW_SELECT inclui shiny_counts');
staticAssert(apiSrc.includes("'gold_counts'"), 'ROW_SELECT inclui gold_counts');
staticAssert(fs.existsSync(migrateShiny), 'migration shiny_counts existe');
const migrateGold = path.join(root, 'db/migrate-2026-09-22-despertar-gold-counts.sql');
staticAssert(fs.existsSync(migrateGold), 'migration gold_counts existe');
staticAssert(migrateSrc.includes('ADD COLUMN IF NOT EXISTS shiny_counts'), 'migration ADD COLUMN');
staticAssert(migrateSrc.includes("v_patch ? 'shiny_counts'"), 'RPC CASE shiny_counts');
staticAssert(setupSql.includes('shiny_counts jsonb'), 'setup.sql coluna shiny_counts');
staticAssert(setupSql.includes('gold_counts jsonb'), 'setup.sql coluna gold_counts');
staticAssert(setupSql.includes("v_patch ? 'shiny_counts'"), 'setup.sql RPC shiny_counts');
staticAssert(pkg.includes('despertar-shiny-smoke.mjs'), 'check inclui shiny smoke');
staticAssert(NEGATIVO_MULT === '15' && NEGATIVO_CHANCE === 0.005, 'negativo ×15 / 0,5%');
staticAssert(GOLD_MULT === '2' && GOLD_CHANCE === 0.02, 'gold ×2 / 2%');
staticAssert(SHINY_MULT === NEGATIVO_MULT && SHINY_CHANCE === NEGATIVO_CHANCE, 'alias shiny=negativo');
staticAssert(worldSrc.includes('shinyGlitch') || worldSrc.includes('shinyTearBands') || worldSrc.includes('unitRarityAt'), 'shelf raridade');
staticAssert(worldSrc.includes('drawImageAsGold'), 'shelf gold usa drawImageAsGold');
const goldJuiceSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/goldJuice.js'), 'utf8');
staticAssert(goldJuiceSrc.includes('recolorImageDataToGold'), 'goldJuice remapeia pixels');
staticAssert(altarSrc.includes('unitRarityAt') || altarSrc.includes('rarity'), 'órbita raridade');
staticAssert(stateSrc.includes('_goldCounts') || stateSrc.includes('goldCounts'), 'GameState goldCounts');
staticAssert(validateSrc.includes('normalizeGoldCounts') || validateSrc.includes('gold_counts'), 'validate gold');

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
    runSouls: '1000000000',
    lifetimeSouls: '1000000000',
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

run('lineSPS com gold ×2', () => {
  // 7 normal + 2 neg×15 + 1 gold×2 = 0.7 + 3.0 + 0.2 = 3.9
  eqMoney(lineSPS({ qty: 10, shiny: 2, gold: 1, baseRate: '0.1', upgradeMult: '1' }), '3.9');
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

run('normalizeShinyCounts rejeita OOB', () => {
  const ok = normalizeShinyCounts({ wandering_shade: 2 }, { wandering_shade: 5 });
  assert.equal(ok.ok, true);
  assert.equal(ok.shinyCounts.wandering_shade, 2);

  const bad = normalizeShinyCounts({ wandering_shade: 9 }, { wandering_shade: 5 });
  assert.equal(bad.ok, false);
  assert.equal(bad.error, 'shiny_bounds');

  const neg = normalizeShinyCounts({ wandering_shade: -1 }, { wandering_shade: 5 });
  assert.equal(neg.ok, false);
});

run('validateSync aceita shiny in-bounds e rejeita OOB', () => {
  const db = {
    souls: '100.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '100.00',
    run_souls: '100.00',
    prestige_count: 0,
    generators_state: { wandering_shade: 5 },
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
    last_sync_at: '2026-09-22T12:00:00.000Z',
  };

  const good = validateSync(db, {
    souls: '100.00',
    lifetimeSouls: '100.00',
    runSouls: '100.00',
    generators: { wandering_shade: 5 },
    shinyCounts: { wandering_shade: 2 },
    upgrades: [],
    lastSyncAt: db.last_sync_at,
  }, new Date('2026-09-22T12:00:05.000Z'));
  assert.equal(good.ok, true, good.detail || good.error);
  assert.equal(good.next.shinyCounts.wandering_shade, 2);
  assert.equal(good.state.shinyCounts.wandering_shade, 2);
  // SPS DTO recalculado com shiny
  const expected = calculateTotalSPS({
    generators: { wandering_shade: 5 },
    shinyCounts: { wandering_shade: 2 },
  });
  assert.equal(cmp(good.state.sps, expected), 0);

  const bad = validateSync(db, {
    souls: '100.00',
    lifetimeSouls: '100.00',
    runSouls: '100.00',
    generators: { wandering_shade: 5 },
    shinyCounts: { wandering_shade: 99 },
    upgrades: [],
    lastSyncAt: db.last_sync_at,
  }, new Date('2026-09-22T12:00:05.000Z'));
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 400);
  assert.equal(bad.detail, 'shiny_bounds');
});

run('applyPrestige (server) zera shinyCounts', () => {
  const db = {
    souls: '1000.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '1000000000.00',
    run_souls: '1000000000.00',
    prestige_count: 0,
    generators_state: { wandering_shade: 5 },
    shiny_counts: { wandering_shade: 3 },
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
    last_sync_at: '2026-09-22T12:00:00.000Z',
  };
  const result = applyPrestige(db, new Date('2026-09-22T12:00:00.000Z'));
  assert.equal(result.ok, true);
  assert.deepEqual(result.next.shinyCounts, {});
  assert.deepEqual(buildStateDto(result.next).shinyCounts, {});
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

run('G4.3: canonicalToRowPatch inclui shiny_counts', () => {
  const patch = canonicalToRowPatch({
    souls: '10',
    obols: '0',
    mnemosyne: '0',
    lifetimeSouls: '10',
    runSouls: '10',
    prestigeCount: 0,
    generators: { wandering_shade: 5 },
    shinyCounts: { wandering_shade: 2 },
    upgrades: [],
    talents: [],
    eduLogsSeen: [],
    milestones: {},
  }, '2026-09-22T12:00:00.000Z');
  assert.deepEqual(patch.shiny_counts, { wandering_shade: 2 });
  assert.equal(patch.generators_state.wandering_shade, 5);
});

run('G4.3: rowToCanonical lê shiny_counts (migration tolerante)', () => {
  const withCol = rowToCanonical({
    souls: '10.00',
    generators_state: { wandering_shade: 4 },
    shiny_counts: { wandering_shade: 1 },
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
  });
  assert.equal(withCol.shinyCounts.wandering_shade, 1);

  const legacy = rowToCanonical({
    souls: '10.00',
    generators_state: { wandering_shade: 4 },
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
  });
  assert.deepEqual(legacy.shinyCounts, {});
});

run('G4.3: validateSync → patch.shiny_counts round-trip', () => {
  const db = {
    souls: '100.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '100.00',
    run_souls: '100.00',
    prestige_count: 0,
    generators_state: { wandering_shade: 3 },
    shiny_counts: {},
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
    last_sync_at: '2026-09-22T12:00:00.000Z',
  };
  const result = validateSync(db, {
    souls: '100.00',
    lifetimeSouls: '100.00',
    runSouls: '100.00',
    generators: { wandering_shade: 3 },
    shinyCounts: { wandering_shade: 1 },
    upgrades: [],
    lastSyncAt: db.last_sync_at,
  }, new Date('2026-09-22T12:00:05.000Z'));
  assert.equal(result.ok, true, result.detail || result.error);
  assert.equal(result.patch.shiny_counts.wandering_shade, 1);
  const fromPatch = rowToCanonical({
    ...db,
    ...result.patch,
    generators_state: result.patch.generators_state,
    shiny_counts: result.patch.shiny_counts,
  });
  assert.equal(fromPatch.shinyCounts.wandering_shade, 1);
});

if (failed) {
  console.error(`\n${failed} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`\nAll ${passed} checks passed.`);
