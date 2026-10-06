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
  mnemosyneFromObolsGain,
  pickEcoDoStyxUpgrade,
  pickEcoDoStyxUpgrades,
  prestigeBonus,
  prestigePreview,
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

staticAssert(TALENTS.length === 18, '18 talentos após sinks caros');
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
staticAssert(formulasSrc.includes('pickEcoDoStyxUpgrades'), 'pickEcoDoStyxUpgrades export');
staticAssert(formulasSrc.includes('STARTING_SOULS_MARGIN'), 'margen starting');
staticAssert(formulasSrc.includes('OFFLINE_EXTRA_HOURS_SILENCIO'), 'silêncio offline');
staticAssert(formulasSrc.includes('richAmort'), 'olho_da_curva flag');
staticAssert(formulasSrc.includes('mnemosyne_tripla'), 'mnemosyne_tripla no talentEffects');
staticAssert(formulasSrc.includes('calice_da_memoria'), 'cálice no yield');
staticAssert(stateSrc.includes('pickEcoDoStyxUpgrades'), 'cliente aplica eco N');
staticAssert(validateSrc.includes('pickEcoDoStyxUpgrades'), 'server aplica eco N');
staticAssert(uiSrc.includes('olho_da_curva'), 'blurb UI');
staticAssert(uiSrc.includes('richAmort'), 'UI usa richAmort');
staticAssert(uiSrc.includes('forja_despertada'), 'blurb forja');
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
  eqMoney(both.startingSouls, '30000');
  const only = talentEffects(['margem_generosa']);
  eqMoney(only.startingSouls, '25000');
});

run('rebanho max-rule com segundo_folego → 25 (não 30)', () => {
  const both = talentEffects(['segundo_folego', 'rebanho_despertado']);
  assert.equal(both.startingGenerators.wandering_shade, 25);
  const only = talentEffects(['rebanho_despertado']);
  assert.equal(only.startingGenerators.wandering_shade, 25);
  const folego = talentEffects(['segundo_folego']);
  assert.equal(folego.startingGenerators.wandering_shade, 5);
});

run('pacto_do_silencio +6 h (com e sem noite)', () => {
  assert.equal(talentEffects([]).offlineHours, 8);
  assert.equal(talentEffects(['pacto_do_silencio']).offlineHours, 14);
  assert.equal(talentEffects(['noite_prolongada']).offlineHours, 12);
  assert.equal(talentEffects(['noite_prolongada', 'pacto_do_silencio']).offlineHours, 18);
  const eco = economyEffects(['pacto_do_silencio'], ['memoria_classind']);
  assert.equal(eco.offlineHours, 14.5);
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
    souls: '4000000000',
    runSouls: '4000000000',
    talents: ['eco_do_styx', 'margem_generosa'],
  });
  const ritual = state.applyPrestige();
  assert.equal(ritual.ok, true);
  assert.equal(ritual.ecoStyxId, 'foice_afilada');
  assert.deepEqual(state.upgrades, ['foice_afilada']);
  eqMoney(state.souls, '25000');
});

run('server applyPrestige aplica eco_do_styx', () => {
  const db = {
    souls: '4000000000.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '4000000000.00',
    run_souls: '4000000000.00',
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
  assert.equal(result.next.generators.wandering_shade, 25);
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

run('offline teto com pacto (14 h)', () => {
  const result = calculateOfflineProgress({
    elapsedSeconds: 15 * 3600,
    sps: '1',
    talents: ['pacto_do_silencio'],
  });
  assert.equal(result.effectiveSeconds, 14 * 3600);
});

run('sinks caros: matilha + forja + tripla + cálice + eco ressonante', () => {
  const ids = [
    'matilha_cerberiana',
    'eco_ressonante',
    'calice_da_memoria',
    'mnemosyne_tripla',
    'forja_despertada',
  ];
  for (const id of ids) {
    assert.equal(isKnownTalentId(id), true, id);
  }
  const effects = talentEffects(ids);
  assert.equal(effects.startingGenerators.cerberian_hound, 3);
  assert.equal(effects.startingGenerators.phlegethon_forge, 1);
  assert.equal(effects.softPrestigeStyxCount, 2);
  assert.equal(effects.mnemosyneGainBoost, true);
  // 1 × 2.0 (só tripla) = 2
  eqMoney(effects.mnemosyneMult, '2');
  // Com os três mults: 1.25 × 1.50 × 2 = 3.75
  const stacked = talentEffects(['juramento_eterno', 'mnemosyne_profunda', 'mnemosyne_tripla']);
  eqMoney(stacked.mnemosyneMult, '3.75');
  eqMoney(prestigeBonus('1', ['mnemosyne_tripla']), '1.10');

  assert.equal(mnemosyneFromObolsGain('10'), '5');
  assert.equal(mnemosyneFromObolsGain('10', ['calice_da_memoria']), '7');
  assert.deepEqual(prestigePreview('16000000000', 0, ['calice_da_memoria']), {
    obolsGain: '2',
    mnemosyneGain: '1', // floor(1 * 1.5) = 1
    unlocked: true,
  });
  // 4 óbolos → 2 essência base → 3 com cálice
  assert.equal(mnemosyneFromObolsGain('4', ['calice_da_memoria']), '3');

  const ecos = pickEcoDoStyxUpgrades(2, { souls: '0', generators: {}, upgrades: [] });
  assert.equal(ecos.length, 2);
  assert.equal(ecos[0], 'foice_afilada');
  assert.notEqual(ecos[1], ecos[0]);

  const state = new GameState({
    souls: '16000000000',
    runSouls: '16000000000',
    talents: ['eco_ressonante', 'matilha_cerberiana', 'forja_despertada', 'calice_da_memoria'],
  });
  const ritual = state.applyPrestige();
  assert.equal(ritual.ok, true);
  assert.equal(ritual.ecoStyxIds.length, 2);
  assert.equal(state.upgrades.length, 2);
  assert.equal(state.quantities().cerberian_hound, 3);
  assert.equal(state.quantities().phlegethon_forge, 1);
  // 2 óbolos → 1 essência ×1.5 = 1
  eqMoney(state.mnemosyne, '1');
});

run('server talentBuy aceita sinks caros', () => {
  const db = {
    souls: '0.00',
    obols: '0.00',
    mnemosyne: '40.00',
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
  const buy = applyTalentBuy(db, 'mnemosyne_tripla', new Date('2026-09-22T12:01:00.000Z'));
  assert.equal(buy.ok, true);
  assert.ok(buy.next.talents.includes('mnemosyne_tripla'));
  eqMoney(buy.next.mnemosyne, '32');
});

console.log(`\ndespertar-talents-f1-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
