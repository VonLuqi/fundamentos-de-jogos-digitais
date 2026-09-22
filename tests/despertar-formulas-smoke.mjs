/**
 * Smoke Task 2 — Núcleo matemático compartilhado de O Despertar
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-formulas-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { TALENTS } from '../js/hades-despertar/config/talents.js';
import { cmp, money, mul } from '../js/hades-despertar/core/decimal.js';
import { Entity } from '../js/hades-despertar/core/Entity.js';
import { EntitySet } from '../js/hades-despertar/core/EntitySet.js';
import {
  amortizationSeconds,
  calculateOfflineProgress,
  calculateTotalSPS,
  canPrestige,
  clickPower,
  generatorBatchCost,
  generatorPriceAt,
  lineSPS,
  maxAffordableCount,
  mnemosyneFromObolsGain,
  obolsFromRunSouls,
  prestigeBonus,
  prestigePreview,
} from '../js/hades-despertar/core/formulas.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFiles = [
  'js/hades-despertar/config/constants.js',
  'js/hades-despertar/config/generators.js',
  'js/hades-despertar/config/upgrades.js',
  'js/hades-despertar/config/talents.js',
  'js/hades-despertar/core/decimal.js',
  'js/hades-despertar/core/formulas.js',
  'js/hades-despertar/core/Entity.js',
  'js/hades-despertar/core/EntitySet.js',
];

requiredFiles.forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-formulas-smoke.mjs'), 'npm run check inclui este smoke');

staticAssert(GENERATORS.length === 6, '6 geradores no catálogo');
staticAssert(UPGRADES.length === 19, '19 juramentos no catálogo');
staticAssert(TALENTS.length === 8, '8 talentos no Panteão');

if (errors.length) {
  console.error('despertar-formulas-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

function eqMoney(actual, expected, message) {
  assert.equal(cmp(actual, expected), 0, message || `${actual} ≠ ${expected}`);
}

await run('Preço T1 n=0 → 15; n=1 → 15×1.15', () => {
  const shade = GENERATORS[0];
  assert.equal(shade.id, 'wandering_shade');
  eqMoney(generatorPriceAt(shade.baseCost, 0), '15');
  eqMoney(generatorPriceAt(shade.baseCost, 1), mul('15', '1.15'));
  const entity = new Entity({ ...shade, quantity: 0 });
  eqMoney(entity.priceAt(0), '15');
  eqMoney(entity.priceAt(1), '17.25');
});

await run('Lote 10 de T1 a n=0 é soma geométrica (não 10×15)', () => {
  const cost = generatorBatchCost('15', 0, 10);
  eqMoney(cost, '304.56');
  assert.notEqual(cmp(cost, '150'), 0, 'lote não pode ser 10 × preço linear');
  const entity = new Entity({ id: 'wandering_shade', quantity: 0 });
  eqMoney(entity.batchCost(10), cost);
});

await run('SPS: 10 sombras sem upgrade = 1.0', () => {
  const sps = calculateTotalSPS({ generators: { wandering_shade: 10 } });
  eqMoney(sps, '1');
  const set = EntitySet.fromCatalog({ wandering_shade: 10 });
  eqMoney(set.get('wandering_shade').rate(), '1');
});

await run('G4.1 lineSPS / shiny no total SPS', () => {
  eqMoney(lineSPS({ qty: 10, shiny: 2, baseRate: '0.1' }), '1.2');
  const sps = calculateTotalSPS({
    generators: { wandering_shade: 10 },
    shinyCounts: { wandering_shade: 2 },
  });
  eqMoney(sps, '1.2');
});

await run('Óbolos: runSouls 1e9 → 1; 9.99e8 → 0', () => {
  assert.equal(obolsFromRunSouls('1000000000'), '1');
  assert.equal(obolsFromRunSouls('999000000'), '0');
  assert.equal(canPrestige('999000000'), false);
  assert.equal(canPrestige('1000000000'), true);
  assert.deepEqual(prestigePreview('1000000000'), {
    obolsGain: '1',
    mnemosyneGain: '1',
    unlocked: true,
  });
  assert.equal(mnemosyneFromObolsGain('10'), '2');
  eqMoney(prestigeBonus('1'), '1.05');
});

await run('Offline 10 s a SPS 1, 80% → 8 almas', () => {
  const result = calculateOfflineProgress({ elapsedSeconds: 10, sps: '1' });
  eqMoney(result.offlineSouls, '8');
  assert.equal(result.effectiveSeconds, 10);
  assert.equal(result.ignored, false);
  const skipped = calculateOfflineProgress({ elapsedSeconds: 9, sps: '1' });
  assert.equal(skipped.ignored, true);
  eqMoney(skipped.offlineSouls, '0');
});

await run('Entity.buy e clique base / amortização T1', () => {
  const shade = new Entity({ id: 'wandering_shade', quantity: 0 });
  const poor = shade.buy(1, '14.99');
  assert.equal(poor.ok, false);
  assert.equal(shade.quantity, 0);
  const bought = shade.buy(1, '15');
  assert.equal(bought.ok, true);
  assert.equal(shade.quantity, 1);
  eqMoney(bought.wallet, '0');
  eqMoney(clickPower({}), '1');
  eqMoney(amortizationSeconds('15', '0.1'), '150');
  assert.equal(maxAffordableCount('15', 0, '32.25'), 2);
  assert.equal(maxAffordableCount('15', 0, '14.99'), 0);
});

console.log(`\ndespertar-formulas-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
