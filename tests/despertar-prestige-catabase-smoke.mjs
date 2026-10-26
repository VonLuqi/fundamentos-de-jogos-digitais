/**
 * Smoke: Lethe PHP reseta Catábase/buffs/frenesi alinhado ao GameState.applyPrestige.
 * Uso: node tests/despertar-prestige-catabase-smoke.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GameState } from '../js/hades-despertar/core/GameState.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const state = new GameState({
  souls: '1e20',
  runSouls: '1e20',
  prestigeCount: 0,
  generators: { charon_servants: 50 },
  upgrades: ['despertar_ctoniano'],
  catabase: {
    stage: 2,
    covenantActive: true,
    pledgesCount: 3,
    leeches: [{ id: 'l0', slot: 0, shiny: false, digested: '100', spawnedAt: 1 }],
    leechesPopped: 7,
    shinyLeechesPopped: 2,
    unlockedResearchIds: ['concilio_das_moiras'],
  },
  activeBuffs: { some_buff: { expiresAt: Date.now() + 60_000 } },
  nectarFrenzyUsedThisRun: true,
}, { initialNowMs: 1_700_000_000_000 });

assert.equal(state.canPrestige(), true, 'deve poder beber do Lethe');
const clientPrestige = state.applyPrestige();
assert.equal(clientPrestige.ok, true);
assert.equal(state.catabaseStage(), 0, 'cliente zera estágio Catábase');
assert.equal(state.catabaseActive, false);
assert.deepEqual(state.catabase.leeches, []);
assert.equal(state.leechesPopped, 7, 'pops vitalícios permanecem');
assert.equal(state.nectarFrenzyUsedThisRun, false);
assert.deepEqual(state.activeBuffs, {});

const phpScript = `
  require '${root.replace(/\\/g, '/')}/backend/bootstrap.php';
  use App\\Services\\Despertar\\DespertarService;

  $ctx = json_decode($argv[1], true);
  $dbRow = [
    'souls' => $ctx['souls'],
    'obols' => '0',
    'mnemosyne' => '0',
    'lifetime_souls' => $ctx['runSouls'],
    'run_souls' => $ctx['runSouls'],
    'prestige_count' => 0,
    'generators_state' => $ctx['generators'],
    'upgrades_state' => $ctx['upgrades'],
    'talents_state' => [],
    'edu_logs_seen' => [],
    'milestones' => [
      'f6Catabase' => $ctx['catabase'],
      'catabaseActive' => true,
      'f5Nectar' => ['nectarFrenzyUsedThisRun' => true, 'nectar' => 3],
      'f8Dragon' => ['stage' => 2, 'auraSlot1' => 'x', 'auraSlot2' => null, 'scaleDropped' => true],
      'f8Seasons' => ['activeSeason' => 'saturnalia', 'deerCaught' => 4, 'unlockedDrops' => ['d1']],
      'f8Fortunes' => ['activeFortuneId' => 'f1', 'claimedIds' => ['f1'], 'lifetimeClaimedIds' => ['old']],
    ],
    'stats' => [
      'leechesPopped' => $ctx['leechesPopped'],
      'shinyLeechesPopped' => $ctx['shinyLeechesPopped'],
    ],
    'activeBuffs' => ['some_buff' => ['expiresAt' => 999]],
  ];

  $res = DespertarService::applyPrestige($dbRow, 1_700_000_000_000);
  $state = $res['state'] ?? [];
  $next = $res['next'] ?? [];
  $m = is_array($next['milestones'] ?? null) ? $next['milestones'] : [];
  $cat = is_array($m['f6Catabase'] ?? null) ? $m['f6Catabase'] : (array) ($state['catabase'] ?? []);

  echo json_encode([
    'ok' => !empty($res['ok']),
    'catStage' => (int) ($cat['stage'] ?? -1),
    'catActiveMilestone' => array_key_exists('catabaseActive', $m),
    'leeches' => $cat['leeches'] ?? null,
    'leechesPopped' => (int) ($cat['leechesPopped'] ?? -1),
    'shinyLeechesPopped' => (int) ($cat['shinyLeechesPopped'] ?? -1),
    'researchIds' => $cat['unlockedResearchIds'] ?? null,
    'activeBuffsEmpty' => empty($next['activeBuffs']),
    'frenzy' => !empty($next['nectarFrenzyUsedThisRun']),
    'f5Frenzy' => !empty($m['f5Nectar']['nectarFrenzyUsedThisRun'] ?? false),
    'dragonStage' => (int) (($m['f8Dragon']['stage'] ?? -1)),
    'deerCaught' => (int) (($m['f8Seasons']['deerCaught'] ?? -1)),
    'lifetimeFortunes' => $m['f8Fortunes']['lifetimeClaimedIds'] ?? null,
  ]);
`;

const phpOut = JSON.parse(execFileSync('php', ['-r', phpScript, JSON.stringify({
  souls: '1e20',
  runSouls: '1e20',
  generators: { charon_servants: 50 },
  upgrades: ['despertar_ctoniano'],
  catabase: {
    stage: 2,
    covenantActive: true,
    pledgesCount: 3,
    leeches: [{ id: 'l0', slot: 0, shiny: false, digested: '100', spawnedAt: 1 }],
    leechesPopped: 7,
    shinyLeechesPopped: 2,
    unlockedResearchIds: ['concilio_das_moiras'],
  },
  leechesPopped: 7,
  shinyLeechesPopped: 2,
})], { cwd: root, encoding: 'utf8' }));

assert.equal(phpOut.ok, true, 'PHP applyPrestige ok');
assert.equal(phpOut.catStage, 0, 'PHP zera stage Catábase');
assert.equal(phpOut.catActiveMilestone, false, 'PHP remove catabaseActive do milestones');
assert.deepEqual(phpOut.leeches, []);
assert.equal(phpOut.leechesPopped, 7);
assert.equal(phpOut.shinyLeechesPopped, 2);
assert.deepEqual(phpOut.researchIds, []);
assert.equal(phpOut.activeBuffsEmpty, true);
assert.equal(phpOut.frenzy, false);
assert.equal(phpOut.f5Frenzy, false);
assert.equal(phpOut.dragonStage, 0);
assert.equal(phpOut.deerCaught, 4, 'deerCaught vitalício permanece');
assert.deepEqual(phpOut.lifetimeFortunes, ['old']);

console.log('despertar-prestige-catabase-smoke: OK');
