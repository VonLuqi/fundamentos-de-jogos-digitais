/**
 * Smoke Task F1 — talentos P0 Mnemosyne + Eco do Styx.
 * Uso: node tests/despertar-talents-f1-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALENTS, TALENT_IDS, isKnownTalentId } from '../js/hades-despertar/config/talents.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import {
  calculateOfflineProgress,
  economyEffects,
  pickEcoDoStyxUpgrade,
  talentEffects,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { applyPrestige, applyTalentBuy } from '../api/_lib/despertar-validate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const F1_IDS = [
  'margem_generosa',
  'pacto_do_silencio',
  'olho_da_curva',
  'eco_do_styx',
  'rebanho_despertado',
];

staticAssert(TALENTS.length === 13, '13 talentos após F1');
for (const id of F1_IDS) {
  staticAssert(isKnownTalentId(id), `talento F1 conhecido: ${id}`);
  staticAssert(TALENT_IDS.includes(id), `TALENT_IDS inclui ${id}`);
}

const formulasSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/formulas.js'), 'utf8');
const stateSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8');
const validateSrc = fs.readFileSync(path.join(root, 'api/_lib/despertar-validate.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(formulasSrc.includes('pickEcoDoStyxUpgrade'), 'pickEcoDoStyxUpgrade export');
staticAssert(formulasSrc.includes('STARTING_SOULS_MARGIN'), 'margen starting');
staticAssert(formulasSrc.includes('OFFLINE_EXTRA_HOURS_SILENCIO'), 'silêncio offline');
staticAssert(formulasSrc.includes('richAmort'), 'olho_da_curva flag');
staticAssert(stateSrc.includes('pickEcoDoStyxUpgrade'), 'cliente aplica eco');
staticAssert(validateSrc.includes('pickEcoDoStyxUpgrade'), 'server aplica eco');
staticAssert(uiSrc.includes('olho_da_curva'), 'blurb UI');
staticAssert(uiSrc.includes('richAmort'), 'UI usa richAmort');
staticAssert(pkg.includes('despertar-talents-f1-smoke.mjs'), 'npm check inclui F1 smoke');

if (errors.length) {
  console.error('despertar-talents-f1-smoke (estático):');
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
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

function eqMoney(actual, expected, message) {
  assert.equal(cmp(actual, expected), 0, message || `${actual} ≠ ${expected}`);
}

run('margem + memória soma startingSouls', () => {
  const both = talentEffects(['memoria_das_sombras', 'margem_generosa']);
  eqMoney(both.startingSouls, '350');
  const only = talentEffects(['margem_generosa']);
  eqMoney(only.startingSouls, '250');
});

run('rebanho max-rule com segundo_folego → 3 (não 4)', () => {
  const both = talentEffects(['segundo_folego', 'rebanho_despertado']);
  assert.equal(both.startingGenerators.wandering_shade, 3);
  const only = talentEffects(['rebanho_despertado']);
  assert.equal(only.startingGenerators.wandering_shade, 3);
  const folego = talentEffects(['segundo_folego']);
  assert.equal(folego.startingGenerators.wandering_shade, 1);
});

run('pacto_do_silencio +2 h (com e sem noite)', () => {
  assert.equal(talentEffects([]).offlineHours, 8);
  assert.equal(talentEffects(['pacto_do_silencio']).offlineHours, 10);
  assert.equal(talentEffects(['noite_prolongada']).offlineHours, 12);
  assert.equal(talentEffects(['noite_prolongada', 'pacto_do_silencio']).offlineHours, 14);
  const eco = economyEffects(['pacto_do_silencio'], ['memoria_classind']);
  assert.equal(eco.offlineHours, 10.5);
});

run('olho_da_curva → richAmort', () => {
  assert.equal(talentEffects(['olho_da_curva']).richAmort, true);
  assert.equal(talentEffects([]).richAmort, false);
});

run('pickEcoDoStyxUpgrade: foice_afilada no estado fresco', () => {
  const id = pickEcoDoStyxUpgrade({ souls: '0', generators: {}, upgrades: [] });
  assert.equal(id, 'foice_afilada');
});

run('pickEcoDoStyxUpgrade: com 3 shades, ainda o mais barato', () => {
  const id = pickEcoDoStyxUpgrade({
    souls: '350',
    generators: { wandering_shade: 3 },
    upgrades: [],
  });
  // foice_afilada e umbras_despertas custam 100 — id lexicográfico ganha.
  assert.equal(id, 'foice_afilada');
});

run('GameState prestige aplica eco_do_styx', () => {
  const state = new GameState({
    souls: '1000000000',
    runSouls: '1000000000',
    talents: ['eco_do_styx', 'margem_generosa'],
  });
  const ritual = state.applyPrestige();
  assert.equal(ritual.ok, true);
  assert.equal(ritual.ecoStyxId, 'foice_afilada');
  assert.deepEqual(state.upgrades, ['foice_afilada']);
  eqMoney(state.souls, '250');
});

run('server applyPrestige aplica eco_do_styx', () => {
  const db = {
    souls: '1000000000.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '1000000000.00',
    run_souls: '1000000000.00',
    prestige_count: 0,
    generators_state: { wandering_shade: 5 },
    upgrades_state: ['foice_afilada'],
    talents_state: ['eco_do_styx', 'rebanho_despertado'],
    shiny_counts: {},
    gold_counts: {},
    edu_logs_seen: [],
    milestones: {},
    last_sync_at: '2026-09-22T12:00:00.000Z',
  };
  const result = applyPrestige(db, new Date('2026-09-22T12:01:00.000Z'));
  assert.equal(result.ok, true);
  assert.deepEqual(result.next.upgrades, ['foice_afilada']);
  assert.equal(result.next.generators.wandering_shade, 3);
});

run('server talentBuy aceita ids F1', () => {
  const db = {
    souls: '0.00',
    obols: '0.00',
    mnemosyne: '20.00',
    lifetime_souls: '0.00',
    run_souls: '0.00',
    prestige_count: 0,
    generators_state: {},
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
    last_sync_at: '2026-09-22T12:00:00.000Z',
  };
  const buy = applyTalentBuy(db, 'olho_da_curva', new Date('2026-09-22T12:01:00.000Z'));
  assert.equal(buy.ok, true);
  assert.ok(buy.next.talents.includes('olho_da_curva'));
});

run('offline teto com pacto (10 h)', () => {
  const result = calculateOfflineProgress({
    elapsedSeconds: 11 * 3600,
    sps: '1',
    talents: ['pacto_do_silencio'],
  });
  assert.equal(result.effectiveSeconds, 10 * 3600);
});

console.log(`\ndespertar-talents-f1-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
