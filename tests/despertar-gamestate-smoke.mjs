/**
 * Smoke Task 3 — GameState reativo de O Despertar
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-gamestate-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmp, money, mul, add, sub } from '../js/hades-despertar/core/decimal.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  calculateTotalSPS,
  clickPower,
  generatorPriceAt,
} from '../js/hades-despertar/core/formulas.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFiles = [
  'js/hades-despertar/core/GameState.js',
  'js/hades-despertar/config/edu-logs.js',
];

requiredFiles.forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-gamestate-smoke.mjs'), 'npm run check inclui este smoke');
staticAssert(pkg.includes('js/hades-despertar/core/GameState.js'), 'npm run check cobre GameState.js');

if (errors.length) {
  console.error('despertar-gamestate-smoke (estático):');
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

await run('10 cliques batem clickPower de formulas.js', () => {
  const state = new GameState();
  const power = clickPower({});
  for (let i = 0; i < 10; i += 1) state.click();
  eqMoney(state.souls, mul(power, '10'));
  eqMoney(state.runSouls, mul(power, '10'));
  assert.ok(state.eduLogsSeen.includes('log_input'));
  assert.ok(state.eduLogsSeen.includes('log_state'));
});

await run('10 cliques + 1 sombra + 2 s de tick batem formulas.js', () => {
  const state = new GameState();
  const power = clickPower({});
  for (let i = 0; i < 10; i += 1) state.click();

  const poor = state.buyGenerator('wandering_shade', '1');
  assert.equal(poor.ok, false, '10 almas não pagam a primeira sombra');
  eqMoney(state.souls, mul(power, '10'));

  for (let i = 0; i < 5; i += 1) state.click();
  const bought = state.buyGenerator('wandering_shade', '1');
  assert.equal(bought.ok, true);
  assert.equal(state.quantities().wandering_shade, 1);

  const price = generatorPriceAt('15', 0);
  const afterBuy = sub(mul(power, '15'), price);
  eqMoney(state.souls, afterBuy);

  const sps = calculateTotalSPS({ generators: { wandering_shade: 1 } });
  eqMoney(state.sps(), sps);

  state.tick(2);
  const expectedSouls = add(afterBuy, mul(sps, '2'));
  const expectedRun = add(mul(power, '15'), mul(sps, '2'));
  eqMoney(state.souls, expectedSouls);
  eqMoney(state.runSouls, expectedRun);
  eqMoney(state.lifetimeSouls, expectedRun);
  assert.ok(state.eduLogsSeen.includes('log_generator'));
});

await run('compra falha é no-op e carteira não fica negativa', () => {
  const state = new GameState();
  state.click();
  const before = state.souls;
  const fail = state.buyGenerator('obsidian_throne', '1');
  assert.equal(fail.ok, false);
  eqMoney(state.souls, before);
  assert.equal(state.quantities().obsidian_throne, undefined);
  assert.equal(cmp(state.souls, '0') >= 0, true);
});

await run('snapshot DTO + prestígio local', () => {
  const state = new GameState({
    souls: '0',
    runSouls: '1000000000',
    lifetimeSouls: '1000000000',
    generators: { wandering_shade: 3 },
    upgrades: ['foice_afilada'],
  });
  assert.equal(state.canPrestige(), true);
  const snap = state.toSnapshot();
  assert.equal(typeof snap.souls, 'string');
  assert.equal(snap.prestigePreview.unlocked, true);
  assert.equal(snap.prestigePreview.obolsGain, '1');
  assert.ok(Array.isArray(snap.upgrades));
  assert.equal(typeof snap.generators, 'object');

  const ritual = state.applyPrestige();
  assert.equal(ritual.ok, true);
  eqMoney(state.souls, '0');
  eqMoney(state.runSouls, '0');
  eqMoney(state.obols, '1');
  eqMoney(state.mnemosyne, '1');
  assert.equal(state.prestigeCount, 1);
  assert.equal(state.upgrades.length, 0);
  assert.equal(Object.keys(state.quantities()).length, 0);
  eqMoney(state.lifetimeSouls, '1000000000');
  assert.ok(state.eduLogsSeen.includes('log_prestige'));
});

console.log(`\ndespertar-gamestate-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
