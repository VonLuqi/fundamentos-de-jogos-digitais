/**
 * Smoke Task F1 — Heavenly 129 + slots permanentes + Eco Styx.
 * Uso: node tests/despertar-talents-f1-smoke.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALENTS, TALENT_IDS, isKnownTalentId } from '../js/hades-despertar/config/talents.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import {
  calculateOfflineProgress,
  economyEffects,
  migrateTalentSave,
  mnemosyneFromObolsGain,
  pickEcoDoStyxUpgrade,
  pickEcoDoStyxUpgrades,
  prestigeBonus,
  prestigePreview,
  talentEffects,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function phpService(action, payload) {
  const php = `
    require 'backend/src/Core/Database.php';
    require 'backend/src/Core/GameCatalog.php';
    require 'backend/src/Services/Despertar/DespertarDecimal.php';
    require 'backend/src/Services/Despertar/DespertarCatalog.php';
    require 'backend/src/Services/Despertar/DespertarFormulas.php';
    require 'backend/src/Services/Despertar/DespertarService.php';
    use App\\Services\\Despertar\\DespertarService;
    $in = json_decode($argv[1], true);
    $action = $in['action'];
    $db = $in['db'];
    $nowMs = isset($in['nowMs']) ? (int) $in['nowMs'] : null;
    if ($action === 'prestige') {
      echo json_encode(DespertarService::applyPrestige($db, $nowMs));
    } elseif ($action === 'talentBuy') {
      echo json_encode(DespertarService::applyTalentBuy($db, $in['talentId'], $nowMs));
    } else {
      echo json_encode(['ok' => false, 'error' => 'unknown action']);
    }
  `;
  const out = execFileSync('php', ['-r', php, JSON.stringify({ action, ...payload })], {
    cwd: root,
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const HEAVENLY_ANCHORS = [
  'legado',
  'portoes_gemeos',
  'permanent_slot_i',
  'sinergias_vol_i',
  'kit_inicial',
  'contabilidade_genial',
];

staticAssert(TALENTS.length === 129, `129 talentos Heavenly (got ${TALENTS.length})`);
for (const id of HEAVENLY_ANCHORS) {
  staticAssert(isKnownTalentId(id), `talento conhecido: ${id}`);
  staticAssert(TALENT_IDS.includes(id), `TALENT_IDS inclui ${id}`);
}

const formulasSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/formulas.js'), 'utf8');
const talentsSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/config/talents.js'), 'utf8');
const stateSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(root, 'backend/src/Services/Despertar/DespertarService.php'), 'utf8');
const uiSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(formulasSrc.includes('migrateTalentSave'), 'migrateTalentSave export');
staticAssert(formulasSrc.includes('LEGACY_TALENT_MAP'), 'legacy map import');
staticAssert(formulasSrc.includes('mnemosyneGainMult'), 'mnemosyneGainMult no talentEffects');
staticAssert(talentsSrc.includes('permanent_slot_i'), 'permanent_slot_i no catálogo');
staticAssert(talentsSrc.includes('portoes_gemeos'), 'portoes_gemeos no catálogo');
staticAssert(stateSrc.includes('setPermanentUpgradeSlot'), 'slots permanentes GameState');
staticAssert(stateSrc.includes('permanentUpgradeIds'), 'snapshot permanentUpgradeIds');
staticAssert(serviceSrc.includes('normalizePermanentUpgradeIds'), 'PHP permanent slots');
staticAssert(pkg.includes('despertar-heavenly-tree-smoke.mjs'), 'npm inclui heavenly smoke');

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

run('kit_inicial → 10 shades', () => {
  const fx = talentEffects(['kit_inicial']);
  assert.equal(fx.startingGenerators.wandering_shade, 10);
});

run('migrate margem_generosa → kit_inicial', () => {
  const m = migrateTalentSave(['margem_generosa'], '0');
  assert.deepEqual(m.talents, ['kit_inicial']);
});

run('portoes_gemeos offlineRate + progress', () => {
  assert.equal(talentEffects(['portoes_gemeos']).offlineRate, '0.05');
  const withGates = calculateOfflineProgress({
    elapsedSeconds: 3600,
    sps: '1',
    talents: ['portoes_gemeos'],
  });
  const plain = calculateOfflineProgress({ elapsedSeconds: 3600, sps: '1', talents: [] });
  assert.ok(cmp(withGates.offlineSouls, plain.offlineSouls) > 0);
});

run('abadao + extra horas offline (ex pacto)', () => {
  assert.equal(talentEffects(['abadao']).offlineHours, 8 + 16);
});

run('contabilidade_genial → richAmort', () => {
  assert.equal(talentEffects(['contabilidade_genial']).richAmort, true);
});

run('pickEcoDoStyxUpgrade: foice_afilada no estado fresco', () => {
  const id = pickEcoDoStyxUpgrade({ souls: '0', generators: {}, upgrades: [] });
  assert.equal(id, 'foice_afilada');
});

run('GameState prestige + slot permanente (eco legado migrado)', () => {
  const state = new GameState({
    souls: '4000000000',
    runSouls: '4000000000',
    talents: ['eco_do_styx'],
    upgrades: ['foice_afilada'],
    permanentUpgradeIds: ['foice_afilada', null, null, null, null],
  });
  assert.ok(state.talents.includes('permanent_slot_i'));
  const ritual = state.applyPrestige();
  assert.equal(ritual.ok, true);
  assert.deepEqual(state.upgrades, ['foice_afilada']);
});

run('server applyPrestige + permanent_upgrade_ids', () => {
  const db = {
    souls: '4000000000.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '4000000000.00',
    run_souls: '4000000000.00',
    prestige_count: 0,
    generators_state: { wandering_shade: 5 },
    upgrades_state: ['foice_afilada'],
    talents_state: ['permanent_slot_i', 'kit_inicial'],
    permanent_upgrade_ids: ['foice_afilada', null, null, null, null],
    shiny_counts: {},
    gold_counts: {},
    edu_logs_seen: [],
    milestones: {},
    last_sync_at: '2026-09-22T12:00:00.000Z',
  };
  const result = phpService('prestige', { db, nowMs: Date.parse('2026-09-22T12:01:00.000Z') });
  assert.equal(result.ok, true);
  assert.deepEqual(result.next.upgrades, ['foice_afilada']);
  assert.equal(result.next.generators.wandering_shade, 10);
});

run('server talentBuy portoes_gemeos', () => {
  const db = {
    souls: '0.00',
    obols: '0.00',
    mnemosyne: '5.00',
    lifetime_souls: '0.00',
    run_souls: '0.00',
    prestige_count: 1,
    generators_state: {},
    upgrades_state: [],
    talents_state: ['legado'],
    edu_logs_seen: [],
    milestones: { ascensionOpen: true },
    last_sync_at: '2026-09-22T12:01:00.000Z',
  };
  const buy = phpService('talentBuy', {
    db,
    talentId: 'portoes_gemeos',
    nowMs: Date.parse('2026-09-22T12:01:00.000Z'),
  });
  assert.equal(buy.ok, true);
  assert.ok(buy.next.talents.includes('portoes_gemeos'));
});

run('mnemosyneFromObolsGain data-driven (sem calice hardcode)', () => {
  assert.equal(mnemosyneFromObolsGain('10'), '5');
  assert.equal(mnemosyneFromObolsGain('10', ['legado']), '5');
  assert.equal(talentEffects(['pagamento_da_sorte']).prestigeEffectMult, '1.01');
});

run('sinergias_vol_i unlock + permanent slots stack', () => {
  assert.equal(talentEffects(['sinergias_vol_i']).synergyVolUnlock, 1);
  assert.equal(talentEffects(['permanent_slot_i', 'permanent_slot_ii']).permanentSlot, 2);
});

console.log(`\ndespertar-talents-f1-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
