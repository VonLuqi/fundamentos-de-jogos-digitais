/**
 * Smoke Fase F5 — Néctar do Lethe (Sugar Lumps), Níveis de Gerador (+1% SPS/nível),
 * Néctar em Reserva (cap 100), Frenesi de Néctar (×3/1h), 4 Minigames Temáticos
 * (Panteão, Grimório, Jardim, Mercado), Anti-Clock-Skew no Sync PHP, Conquistas, Códice e Assets.
 *
 * Uso: node tests/despertar-f5-nectar-minigames-smoke.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GARDEN_SEEDS,
  GARDEN_SOILS,
  GRIMOIRE_SPELLS,
  MARKET_GOODS,
  NECTAR_CONFIG,
  NECTAR_VARIANTS,
  PANTHEON_SLOTS,
  PANTHEON_SPIRITS,
  gardenDimensionsForLevel,
} from '../js/hades-despertar/config/minigames.js';
import { EDU_LOG_BY_ID, EDU_LOG_IDS } from '../js/hades-despertar/config/edu-logs.js';
import { ACHIEVEMENTS, getAchievementById } from '../js/game-catalog.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import {
  calculateTotalSPS,
  clickPower,
  generatorLevelMult,
  nectarReserveMult,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  advanceNectarCycles,
  nextGeneratorLevelCost,
} from '../js/hades-despertar/core/NectarSystem.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${error.stack || error.message}`);
    failed += 1;
  }
}

// 1. Desbloqueio em 1e9 lifetimeSouls, ciclo 24h (20h maduro / 23h pronto / 24h auto-harvest), catch-up multi-dia e persistência pós-Lethe
run('1. Néctar do Lethe: unlock em 1e9 lifetimeSouls, ciclo 20h/23h/24h, catch-up multi-dia e persistência pós-Lethe', () => {
  const t0 = 1_700_000_000_000;
  const state = new GameState({ souls: '0', lifetimeSouls: '999999999' }, { initialNowMs: t0 });
  assert.equal(state.isNectarUnlocked(), false);

  // Atinge 1e9 almas -> desbloqueia e inicia ciclo em t0
  state.grantSouls('1');
  state.tick(1, { nowMs: t0 + 1000 });
  assert.equal(state.isNectarUnlocked(), true);
  assert.equal(state.nectarCycleStartedAt, t0 + 1000);
  assert.equal(state.nectarStatus(t0 + 1000).stage, 'budding');
  assert.equal(state.nectarStatus(t0 + 1000).canManualHarvest, false);

  // Em 20h (mature): 50% chance de colheita manual
  const t20h = t0 + 1000 + NECTAR_CONFIG.matureMs;
  assert.equal(state.nectarStatus(t20h).stage, 'mature');
  assert.equal(state.nectarStatus(t20h).canManualHarvest, true);
  // Falha manual (random >= 0.5) reinicia ciclo sem ganhar Néctar
  const botched = state.harvestNectar({ nowMs: t20h, random: () => 0.8 });
  assert.equal(botched.ok, true);
  assert.equal(botched.botched, true);
  assert.equal(botched.gained, 0);
  assert.equal(state.nectar, 0);
  assert.equal(state.nectarCycleStartedAt, t20h);

  // Em +23h (ripe): 100% de sucesso na colheita manual
  const tRipe = t20h + NECTAR_CONFIG.ripeMs;
  state.nectarCurrentVariant = 'nectar_normal';
  assert.equal(state.nectarStatus(tRipe).stage, 'ripe');
  const ripeHarvest = state.harvestNectar({ nowMs: tRipe, random: () => 0.99 });
  assert.equal(ripeHarvest.ok, true);
  assert.equal(ripeHarvest.botched, false);
  assert.equal(ripeHarvest.gained, 1);
  assert.equal(state.nectar, 1);
  assert.equal(state.totalNectarHarvested, 1);

  // Catch-up offline de 3 dias (72h = 3 ciclos completos de 24h)
  const adv3Days = advanceNectarCycles({
    unlocked: true,
    cycleStartedAt: tRipe,
    currentVariant: 'nectar_normal',
    nowMs: tRipe + 3 * NECTAR_CONFIG.autoHarvestMs + 3600_000,
    random: () => 0.1, // sorteia nectar_normal (+1 cada)
  });
  assert.equal(adv3Days.cyclesCompleted, 3);
  assert.equal(adv3Days.harvestedCount, 3);

  // Persistência pós-Lethe (Catábase): nectar, totalNectarHarvested e generatorLevels permanecem
  state.nectar = 5;
  state.totalNectarHarvested = 6;
  state.levelUpGenerator('charon_servants'); // gasta 1 -> nectar = 4, Lv.1
  assert.equal(state.generatorLevel('charon_servants'), 1);
  assert.equal(state.nectar, 4);

  state.grantSouls('5000000000'); // 5e9 para habilitar Lethe
  const prest = state.applyPrestige();
  assert.equal(prest.ok, true);
  assert.equal(state.nectar, 4, 'Néctar persiste após o Ritual do Lethe');
  assert.equal(state.totalNectarHarvested, 6, 'Total colhido persiste após o Lethe');
  assert.equal(state.generatorLevel('charon_servants'), 1, 'Nível do gerador persiste após o Lethe');
});

// 2. Custo aritmético de nível (1, 2, 3...), +1% SPS por nível, Néctar em Reserva (cap 100) e Frenesi de Néctar (×3/1h)
run('2. Níveis de Gerador (+1% SPS/nível), Néctar em Reserva (cap 100) e Frenesi de Néctar (×3 SPS / 1h)', () => {
  assert.equal(nextGeneratorLevelCost(0), 1);
  assert.equal(nextGeneratorLevelCost(1), 2);
  assert.equal(nextGeneratorLevelCost(9), 10);
  assert.equal(cmp(generatorLevelMult(0), '1'), 0);
  assert.equal(cmp(generatorLevelMult(1), '1.01'), 0);
  assert.equal(cmp(generatorLevelMult(10), '1.1'), 0);

  // Néctar em Reserva (Sugar Baking): +1% por Néctar até cap 100 (×2.0)
  assert.equal(cmp(nectarReserveMult(50, []), '1'), 0, 'Sem talento nectar_em_reserva = ×1');
  assert.equal(cmp(nectarReserveMult(50, ['nectar_em_reserva']), '1.5'), 0);
  assert.equal(cmp(nectarReserveMult(100, ['nectar_em_reserva']), '2'), 0);
  assert.equal(cmp(nectarReserveMult(250, ['nectar_em_reserva']), '2'), 0, 'Cap estrito em 100 Néctares');

  const state = new GameState({
    souls: '1000',
    nectar: 150,
    totalNectarHarvested: 150,
    generators: { charon_servants: 100 }, // Base SPS = 100 * 1 = 100
    talents: ['nectar_em_reserva'],
  }, { initialNowMs: 50_000 });

  // Com 150 Néctares (cap 100 -> ×2.0): SPS = 200
  assert.equal(cmp(state.sps(), '200'), 0);

  // Eleva charon_servants para Lv.1 (gasta 1 Néctar -> 149 Néctares, continua no cap 100)
  // Linha ganha ×1.01 -> 100 * 1.01 * 2 = 202
  const lv1 = state.levelUpGenerator('charon_servants');
  assert.equal(lv1.ok, true);
  assert.equal(lv1.cost, 1);
  assert.equal(lv1.level, 1);
  assert.equal(cmp(state.sps(), '202'), 0);

  // Ativa Frenesi de Néctar (×3 por 1h, 1× por corrida)
  const frenzy = state.activateNectarFrenzy({ nowMs: 50_000 });
  assert.equal(frenzy.ok, true);
  assert.equal(cmp(state.sps(), '606'), 0); // 202 * 3 = 606
  const frenzyDup = state.activateNectarFrenzy({ nowMs: 51_000 });
  assert.equal(frenzyDup.ok, false);
  assert.equal(frenzyDup.reason, 'already_used_this_run');
});

// 3. Os 4 Minigames desbloqueados no Nível 1 (Panteão, Grimório, Jardim e Mercado)
run('3. Desbloqueio no Nível 1 e mecânicas determinísticas dos 4 Minigames (Panteão, Grimório, Jardim, Mercado)', () => {
  const state = new GameState({
    souls: '1000000000',
    nectar: 30,
    totalNectarHarvested: 30,
    generators: {
      cerberian_hound: 50,
      obsidian_throne: 20,
      mnemosyne_temple: 10,
      styx_tower: 10,
    },
  }, { initialNowMs: 100_000 });

  // Antes do Lv.1 todos os 4 minigames estão bloqueados
  assert.deepEqual(state.unlockedMinigames(), {
    pantheon: false,
    grimoire: false,
    garden: false,
    market: false,
  });
  assert.equal(state.assignPantheonSlot('diamond', 'spirit_nyx').ok, false);
  assert.equal(state.castSpell('conjurar_almas').ok, false);
  assert.equal(state.plantSeed(0, 'asfodelo_cinzento').ok, false);
  assert.equal(state.buyMarketStock('obolo_cobre', 1).ok, false);

  // 3.1 Panteão Ctoniano (mnemosyne_temple Lv.1)
  state.levelUpGenerator('mnemosyne_temple');
  assert.equal(state.unlockedMinigames().pantheon, true);
  const spsBeforePantheon = state.sps();
  const slotRes = state.assignPantheonSlot('diamond', 'spirit_nyx', { nowMs: 100_000 });
  assert.equal(slotRes.ok, true);
  assert.equal(state.minigames.pantheon.swaps, 2);
  // Nyx no Diamante: +15% SPS (×1.15) e -10% clique (×0.90)
  assert.ok(cmp(state.sps(), spsBeforePantheon) > 0, 'Nyx em Diamante aumenta o SPS');

  // 3.2 Grimório de Hécate (styx_tower Lv.1)
  state.levelUpGenerator('styx_tower');
  assert.equal(state.unlockedMinigames().grimoire, true);
  assert.ok(state.minigames.grimoire.maxMana >= 15);
  // Conjurar Almas com sucesso (forceBackfire: false)
  const soulsBeforeSpell = state.souls;
  const spellOk = state.castSpell('conjurar_almas', { forceBackfire: false });
  assert.equal(spellOk.ok, true);
  assert.equal(spellOk.backfired, false);
  assert.ok(cmp(state.souls, soulsBeforeSpell) > 0, 'Conjurar Almas credita almas');
  // Recarrega Éter via tick e testa Mão do Destino em Backfire (invoca Eco Colérico)
  state.tick(3600);
  const handBackfire = state.castSpell('mao_do_destino', { forceBackfire: true });
  assert.equal(handBackfire.ok, true);
  assert.equal(handBackfire.backfired, true);
  assert.equal(state.shimmer?.variant, 'wrath');

  // 3.3 Jardim de Perséfone (cerberian_hound Lv.1 -> grelha 2x2 = 4 plots)
  state.levelUpGenerator('cerberian_hound');
  assert.equal(state.unlockedMinigames().garden, true);
  assert.deepEqual(gardenDimensionsForLevel(1), { rows: 2, cols: 2 });
  assert.deepEqual(gardenDimensionsForLevel(9), { rows: 6, cols: 6 });

  const soilRes = state.setGardenSoil('adubo_estigio'); // 50 hounds >= minHounds 50
  assert.equal(soilRes.ok, true);
  const plantRes = state.plantSeed(0, 'roma_de_persefone'); // matureTicks = 4
  assert.equal(plantRes.ok, true);
  const spsBeforeMature = state.sps();
  state.tickGarden(4); // atinge maturação
  assert.equal(state.minigames.garden.plots[0].mature, true);
  assert.ok(cmp(state.sps(), spsBeforeMature) > 0, 'Romã madura no Adubo Estígio eleva o SPS');
  const harvPlot = state.harvestPlot(0);
  assert.equal(harvPlot.ok, true);
  assert.equal(harvPlot.wasMature, true);
  assert.equal(state.minigames.garden.harvestedPlants, 1);

  // 3.4 Mercado de Caronte (obsidian_throne Lv.1)
  state.levelUpGenerator('obsidian_throne');
  assert.equal(state.unlockedMinigames().market, true);
  const buyStock = state.buyMarketStock('obolo_cobre', 5);
  assert.equal(buyStock.ok, true);
  assert.equal(state.minigames.market.goods.obolo_cobre.stock, 5);
  state.tickMarket({ random: () => 0.9 }); // flutua preço
  const sellStock = state.sellMarketStock('obolo_cobre', 5);
  assert.equal(sellStock.ok, true);
  assert.equal(state.minigames.market.goods.obolo_cobre.stock, 0);
});

// 4. Paridade Estrita JS ≡ PHP + Anti-Clock-Skew no Sync + Conquistas F5, Códice e Assets
run('4. Paridade JS ≡ PHP (Stack SPS/Click com Níveis + Néctar em Reserva + Panteão + Jardim) e Anti-Clock-Skew', () => {
  const nowMs = 1_700_000_000_000;
  const ctx = {
    generators: {
      wandering_shade: 50,
      charon_servants: 50,
      cerberian_hound: 50,
      obsidian_throne: 10,
      mnemosyne_temple: 10,
      styx_tower: 10,
    },
    upgrades: ['foice_afilada', 'umbras_despertas'],
    talents: ['nectar_em_reserva'],
    obols: '10',
    verdictPurchases: ['olho_do_tartarus'],
    shinyCounts: {},
    goldCounts: {},
    activeBuffs: {},
    nowMs,
    generatorLevels: {
      charon_servants: 5,
      cerberian_hound: 2,
      mnemosyne_temple: 1,
      styx_tower: 1,
      obsidian_throne: 10,
    },
    nectar: 80,
    minigames: {
      pantheon: {
        slots: { diamond: 'spirit_persephone', ruby: 'spirit_nyx', jade: null },
        swaps: 1,
      },
      garden: {
        soilId: 'adubo_estigio',
        plots: [
          { seedId: 'roma_de_persefone', ageTicks: 5, mature: true },
          { seedId: 'lirio_do_lethe', ageTicks: 4, mature: true },
        ],
      },
    },
  };

  const jsSps = calculateTotalSPS(ctx);
  const jsClick = clickPower({ ...ctx, sps: jsSps });

  const phpScript = `
    require 'backend/src/Core/Database.php';
    require 'backend/src/Core/GameCatalog.php';
    require 'backend/src/Services/Despertar/DespertarDecimal.php';
    require 'backend/src/Services/Despertar/DespertarCatalog.php';
    require 'backend/src/Services/Despertar/DespertarFormulas.php';
    require 'backend/src/Services/Despertar/DespertarService.php';

    use App\\Services\\Despertar\\DespertarCatalog;
    use App\\Services\\Despertar\\DespertarFormulas;
    use App\\Services\\Despertar\\DespertarService;

    $ctx = json_decode($argv[1], true);
    $nowMs = (int) $ctx['nowMs'];

    $sps = DespertarFormulas::calculateTotalSPS($ctx);
    $click = DespertarFormulas::clickPower(array_merge($ctx, ['sps' => $sps]));

    $dbRow = [
      'souls' => '5000000000.00',
      'obols' => '10.00',
      'mnemosyne' => '10.00',
      'lifetime_souls' => '5000000000.00',
      'run_souls' => '5000000000.00',
      'prestige_count' => 1,
      'generators_state' => $ctx['generators'],
      'upgrades_state' => $ctx['upgrades'],
      'talents_state' => $ctx['talents'],
      'verdict_purchases' => $ctx['verdictPurchases'],
      'edu_logs_seen' => [],
      'milestones' => [
        'f5Nectar' => [
          'nectar' => 2,
          'totalNectarHarvested' => 2,
          'nectarCycleStartedAt' => $nowMs - 3600000, // 1h atrás
          'generatorLevels' => [],
        ],
      ],
      'stats' => ['clicks' => 20, 'max_buy_biggest' => 10, 'juizo_tie_wins' => 0],
    ];

    // 1) Sync legítimo (2 dias depois do ciclo inicial)
    $dbRowLegit = $dbRow;
    $dbRowLegit['milestones']['f5Nectar']['nectarCycleStartedAt'] = $nowMs - (3 * 86400000);
    $syncOk = DespertarService::validateSync($dbRowLegit, [
      'souls' => '5000000000.00',
      'runSouls' => '5000000000.00',
      'lifetimeSouls' => '5000000000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'nectar' => 5,
      'totalNectarHarvested' => 5,
      'nectarCycleStartedAt' => $nowMs - 10000,
      'generatorLevels' => $ctx['generatorLevels'],
      'minigames' => $ctx['minigames'],
      'eduLogsSeen' => ['log_nectar_minigames'],
    ], $nowMs);

    // 2) Clock-skew: ciclo no futuro
    $syncFuture = DespertarService::validateSync($dbRow, [
      'souls' => '5000000000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'nectar' => 2,
      'totalNectarHarvested' => 2,
      'nectarCycleStartedAt' => $nowMs + 86400000,
    ], $nowMs);

    // 3) Clock-skew: declarou +50 Néctares colhidos em apenas 1h de tempo real no servidor
    $syncInfiniteNectar = DespertarService::validateSync($dbRow, [
      'souls' => '5000000000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'nectar' => 52,
      'totalNectarHarvested' => 52,
      'nectarCycleStartedAt' => $nowMs,
    ], $nowMs);

    $earnedAch = DespertarFormulas::evaluateDespertarAchievementIds($syncOk['next'], [], true);

    echo json_encode([
      'sps' => $sps,
      'click' => $click,
      'syncOk' => $syncOk['ok'],
      'syncLogs' => $syncOk['next']['eduLogsSeen'] ?? [],
      'syncFutureOk' => $syncFuture['ok'],
      'syncFutureErr' => $syncFuture['error'] ?? '',
      'syncInfiniteOk' => $syncInfiniteNectar['ok'],
      'syncInfiniteErr' => $syncInfiniteNectar['error'] ?? '',
      'earnedAch' => $earnedAch,
    ]);
  `;

  const outRaw = execFileSync('php', ['-r', phpScript, JSON.stringify(ctx)], {
    cwd: root,
    encoding: 'utf8',
  });
  const phpOut = JSON.parse(outRaw);

  assert.equal(cmp(phpOut.sps, jsSps), 0, `SPS PHP (${phpOut.sps}) ≠ JS (${jsSps})`);
  assert.equal(cmp(phpOut.click, jsClick), 0, `Click PHP (${phpOut.click}) ≠ JS (${jsClick})`);
  assert.equal(phpOut.syncOk, true);
  assert.ok(phpOut.syncLogs.includes('log_nectar_minigames'));

  // Rejeições de anti-clock-skew
  assert.equal(phpOut.syncFutureOk, false);
  assert.match(phpOut.syncFutureErr, /clock-skew/i);
  assert.equal(phpOut.syncInfiniteOk, false);
  assert.match(phpOut.syncInfiniteErr, /clock-skew/i);

  // Conquistas F5
  const expectedF5Achievements = [
    'despertar_nectar_primeiro',
    'despertar_nivel_1',
    'despertar_nivel_10',
    'despertar_minigame_panteao',
    'despertar_minigame_grimorio',
    'despertar_minigame_jardim',
    'despertar_minigame_mercado',
  ];
  for (const achId of expectedF5Achievements) {
    assert.ok(phpOut.earnedAch.includes(achId), `PHP deve conceder ${achId}`);
    const entry = getAchievementById(achId) || ACHIEVEMENTS.find((a) => a.id === achId);
    assert.ok(entry, `${achId} deve existir em game-catalog.json`);
  }

  // Assets e Códice
  assert.ok(EDU_LOG_BY_ID.log_nectar_minigames);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/sprites/manifest.json'), 'utf8'),
  );
  assert.equal(Object.keys(manifest.minigames || {}).length, 21, '21 ícones F5 no manifest.json');
  for (const v of NECTAR_VARIANTS) {
    assert.ok(manifest.minigames[v.spriteId], `manifest minigames inclui ${v.spriteId}`);
  }
  const artReqs = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'),
  );
  assert.ok(artReqs.requests.some((r) => r.id === 'art_f5_minigames' && r.listId === 'F5-MG'));
});

console.log(`\ndespertar-f5-nectar-minigames-smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
