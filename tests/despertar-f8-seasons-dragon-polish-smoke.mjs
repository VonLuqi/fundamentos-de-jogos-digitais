/**
 * Smoke Fase F8 — Venda de Geradores (25% / 50% com Abalo do Tártaro), Dragão Ctoniano Pitão/Ladão
 * (Estágios 0→4, 2 Slots de Aura, Apetite Radiante ×2, Sopro de Flegêton +5% nos Filhotes, Voo Dracónico ×1111,
 * Escama de Ladão +3%), 4 Estações do Submundo (Antestéria, Lemúria, Saturnália c/ Rei Saturno e Corças,
 * Feira de Hermes), 24 Fortunas de Hermes no News Ticker (2%/4% apenas no ciclo natural),
 * Auditoria Completa do Stack SPS (F0–F8 simultâneos JS ≡ PHP) e Save Heal de Prestígio.
 *
 * Uso: node tests/despertar-f8-seasons-dragon-polish-smoke.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DRAGON_AURAS, DRAGON_STAGES } from '../js/hades-despertar/config/dragon.js';
import { EDU_LOG_BY_ID } from '../js/hades-despertar/config/edu-logs.js';
import { FORTUNES } from '../js/hades-despertar/config/fortunes.js';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { ALL_SEASONAL_DROP_UPGRADE_IDS, SEASONS } from '../js/hades-despertar/config/seasons.js';
import { TALENTS } from '../js/hades-despertar/config/talents.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { ACHIEVEMENTS } from '../js/game-catalog.js';
import { cmp, money, mul } from '../js/hades-despertar/core/decimal.js';
import {
  calculateSpsBreakdown,
  cerberusPupMult,
  generatorBatchCost,
  generatorSellRefund,
  healLegacySave,
  obolsFromLifetimeCubic,
  obolsFromRunSouls,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  describeGeneratorCard,
  describeSpsBreakdownSummary,
} from '../js/hades-despertar/ui/UIRenderer.js';

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

// 1. Venda de Geradores (1, 10, 100, Max): 25% base e 50% com Abalo do Tártaro (Earth Shatterer)
run('1. Venda de Geradores (1, 10, 100, Max): reembolso 25% base e 50% com Abalo do Tártaro + UI sell', () => {
  // Referência: 100 unidades de Sombra Vagante (baseCost = 15)
  const batch10At90 = generatorBatchCost('15', 90, 10, '1');
  const refund25 = generatorSellRefund('15', 100, 10, '1', '0.25');
  const refund50 = generatorSellRefund('15', 100, 10, '1', '0.50');

  assert.equal(cmp(refund25, money(mul(batch10At90, '0.25'))), 0, 'Reembolso de 10 unidades = 25% das unidades 90..99');
  assert.equal(cmp(refund50, money(mul(batch10At90, '0.50'))), 0, 'Reembolso com Abalo do Tártaro = 50% (dobro do base)');

  const state = new GameState({
    souls: '0',
    generators: { wandering_shade: 115, charon_servants: 50 },
    talents: ['ovo_primordial'],
    dragon: { stage: 2, auraSlot1: null, auraSlot2: null, scaleDropped: true },
  });

  // Vende 1, 10 e 100 unidades com 25% base
  const sell1 = state.sellGenerator('wandering_shade', '1');
  assert.equal(sell1.ok, true);
  assert.equal(sell1.sold, 1);
  assert.equal(sell1.refundRate, '0.25');
  assert.equal(state.quantities().wandering_shade, 114);

  const sell10 = state.sellGenerator('wandering_shade', '10');
  assert.equal(sell10.ok, true);
  assert.equal(sell10.sold, 10);
  assert.equal(state.quantities().wandering_shade, 104);

  const sell100 = state.sellGenerator('wandering_shade', '100');
  assert.equal(sell100.ok, true);
  assert.equal(sell100.sold, 100);
  assert.equal(state.quantities().wandering_shade, 4);

  // Equipa a aura Abalo do Tártaro (sacrifica 1 charon_servants, que é o maior tier possuído)
  const eqRes = state.setDragonAura(1, 'abalo_do_tartaro');
  assert.equal(eqRes.ok, true);
  assert.equal(eqRes.sacrificedGeneratorId, 'charon_servants');
  assert.equal(state.quantities().charon_servants, 49);
  assert.equal(state.sellRefundRate(), '0.50');

  // Card do mercado no modo 'sell' e lote 'max'
  const sellCard = describeGeneratorCard(state, 'wandering_shade', 'max', 'sell');
  assert.equal(sellCard.tradeAction, 'sell');
  assert.equal(sellCard.lot, 4);
  assert.equal(sellCard.refundRate, '0.50');
  assert.equal(sellCard.canSell, true);

  const sellMax = state.sellGenerator('wandering_shade', 'max');
  assert.equal(sellMax.ok, true);
  assert.equal(sellMax.sold, 4);
  assert.equal(sellMax.refundRate, '0.50');
  assert.equal(state.quantities().wandering_shade || 0, 0);
  assert.ok(state.achievements.includes('despertar_mercador_acheron'));
});

// 2. Dragão Ctoniano: evolução 0→1→2→3→4, 2 Slots de Aura, Apetite Radiante ×2 e Sopro de Flegêton (+5% Filhotes)
run('2. Dragão Ctoniano Pitão/Ladão: evolução 0→4, 2 Slots de Aura, Apetite Radiante ×2 e Sopro de Flegêton', () => {
  assert.equal(DRAGON_STAGES.length, 5);
  assert.equal(DRAGON_AURAS.length, 5);

  const state = new GameState({
    souls: '1000000000000',
    generators: { wandering_shade: 400, charon_servants: 10 },
    talents: ['ovo_primordial'],
    achievements: Array.from({ length: 25 }, (_, i) => ACHIEVEMENTS[i].id), // 25 normais = 100% Véu (fração = 1)
    upgrades: ['filhote_vigia_estige'], // fator 0.10 -> sem aura = 1.10; com Sopro de Flegêton = 1 + 1 * 0.10 * 1.05 = 1.105
  });

  // Estágio 0 -> 1 (gasta 1M almas, libera 1º slot e Escama de Ladão)
  const ev1 = state.evolveDragon();
  assert.equal(ev1.ok, true);
  assert.equal(ev1.stage, 1);
  assert.equal(state.dragon.scaleDropped, true);
  assert.ok(state.achievements.includes('despertar_dragao_filhote'));

  // Estágio 1 -> 2 (sacrifica 50 wandering_shade)
  const ev2 = state.evolveDragon({ targetGeneratorId: 'wandering_shade' });
  assert.equal(ev2.ok, true);
  assert.equal(ev2.stage, 2);
  assert.equal(ev2.sacrificedQty, 50);
  assert.equal(state.quantities().wandering_shade, 350);

  // Estágio 2 -> 3 (sacrifica 100 wandering_shade)
  const ev3 = state.evolveDragon({ targetGeneratorId: 'wandering_shade' });
  assert.equal(ev3.ok, true);
  assert.equal(ev3.stage, 3);
  assert.equal(ev3.sacrificedQty, 100);
  assert.equal(state.quantities().wandering_shade, 250);

  // No estágio 3, o slot 2 ainda está bloqueado
  assert.equal(state.setDragonAura(2, 'sopro_de_flegeton').ok, false);

  // Estágio 3 -> 4 (sacrifica 200 wandering_shade, desbloqueia Ladão de Cem Cabeças e 2º Slot de Aura)
  const ev4 = state.evolveDragon({ targetGeneratorId: 'wandering_shade' });
  assert.equal(ev4.ok, true);
  assert.equal(ev4.stage, 4);
  assert.equal(ev4.sacrificedQty, 200);
  assert.equal(state.quantities().wandering_shade, 50);
  assert.ok(state.achievements.includes('despertar_dragao_ladao'));

  const spsBeforeAuras = state.rawSps();
  const pupBefore = cerberusPupMult(state.upgrades, state.achievements, 25, state.dragon);
  assert.equal(cmp(pupBefore, '1.1'), 0);

  // Equipa Sopro de Flegêton no slot 1 (+5% eficácia nos Filhotes: 1 + 1 * 0.1 * 1.05 = 1.105)
  assert.equal(state.setDragonAura(1, 'sopro_de_flegeton').ok, true);
  const pupWithBreath = cerberusPupMult(state.upgrades, state.achievements, 25, state.dragon);
  assert.equal(cmp(pupWithBreath, '1.105'), 0);

  // Equipa Apetite Radiante no slot 2 (×2.0 SPS global)
  const spsBeforeRadiant = state.rawSps();
  assert.equal(state.setDragonAura(2, 'apetite_radiante').ok, true);
  const spsAfterRadiant = state.rawSps();
  assert.ok(cmp(spsAfterRadiant, spsBeforeAuras) > 0);
  assert.equal(state.spsBreakdown().dragonAuraMult, '2');

  // Compra Escama de Ladão (+3% SPS global)
  assert.equal(state.buyUpgrade('escama_de_ladao').ok, true);
  assert.equal(state.spsBreakdown().dragonScaleMult, '1.03');

  // Testa Voo Dracónico (×1111 clique no Eco do Acheron)
  assert.equal(state.setDragonAura(1, 'voo_draconico').ok, true);
  const shRes = state.spawnShimmer({ effectId: 'voo_draconico_acheron', force: true });
  assert.equal(shRes.ok, true);
  const clickRes = state.clickShimmer();
  assert.equal(clickRes.ok, true);
  assert.equal(clickRes.buff.mult, '1111');
  assert.equal( clickRes.buff.durationSec, 10 );
});

// 3. 4 Estações do Submundo + 24 Fortunas de Hermes (regra de ciclo natural vs manual e descontos -1% / -7%)
run('3. 4 Estações (Antestéria, Lemúria, Saturnália, Feira de Hermes) e 24 Fortunas (ciclo natural vs manual)', () => {
  assert.equal(SEASONS.length, 4);
  assert.equal(ALL_SEASONAL_DROP_UPGRADE_IDS.length, 10);
  assert.equal(FORTUNES.length, 24);

  const state = new GameState({
    souls: '1e20',
    generators: { wandering_shade: 10, charon_servants: 10 },
    talents: ['rodizio_das_estacoes'],
  });

  // Alterna pelas 4 estações (custo 1B, 2B, 4B, 8B)
  assert.equal(state.seasonSwitchCost(), '1000000000.00');
  assert.equal(state.activateSeason('antesteria').ok, true);
  assert.equal(state.seasonSwitchCost(), '2000000000.00');
  assert.equal(state.activateSeason('lemuria').ok, true);
  assert.equal(state.activateSeason('feira_de_hermes').ok, true);
  assert.equal(state.activateSeason('saturnalia').ok, true);
  assert.ok(state.achievements.includes('despertar_estacoes_4'));

  // Evolui Rei Saturno até o nível 5 (+25% SPS e -5% custo) e captura Corça de Ártemis
  for (let lv = 1; lv <= 5; lv += 1) {
    const upSat = state.upgradeSaturnKing();
    assert.equal(upSat.ok, true);
    assert.equal(upSat.level, lv);
  }
  assert.ok(state.achievements.includes('despertar_rei_saturno_5'));
  const deerRes = state.catchArtemisDeer();
  assert.equal(deerRes.ok, true);
  assert.ok(state.seasons.unlockedDrops.includes('presente_de_saturnalia'));

  // Regra canónica do Ticker: clique manual (naturalCycle: false) NUNCA gera Fortuna, mesmo com random = 0
  const manualRoll = state.rollTickerFortune({ naturalCycle: false, random: () => 0 });
  assert.equal(manualRoll.spawned, false);

  // Ciclo natural (naturalCycle: true) com random < 0.02 gera Fortuna
  assert.equal(state.fortuneChance(), 0.02);
  const natRoll = state.rollTickerFortune({
    naturalCycle: true,
    forceFortuneId: 'fortune_100',
  });
  assert.equal(natRoll.spawned, true);
  assert.equal(state.fortunes.activeFortuneId, 'fortune_100');

  // Reivindica Fortune #100, #101, #102, #103 e a Fortune da Sombra Vagante
  assert.equal(state.claimTickerFortune('fortune_100').ok, true);
  assert.equal(state.claimTickerFortune('fortune_101').ok, true);
  assert.equal(state.claimTickerFortune('fortune_102').ok, true);
  assert.equal(state.claimTickerFortune('fortune_103').ok, true);
  assert.equal(state.claimTickerFortune('fortune_gen_wandering_shade').ok, true);
  assert.ok(state.achievements.includes('despertar_fortuna_1'));

  const baseShadeMult = state.costMult('wandering_shade');
  const baseUpgradeCost = state.upgradeCost('foice_afilada');

  assert.equal(state.buyUpgrade('fortune_100').ok, true);
  assert.equal(state.buyUpgrade('fortune_101').ok, true);
  assert.equal(state.buyUpgrade('fortune_102').ok, true);
  assert.equal(state.buyUpgrade('fortune_103').ok, true);
  assert.equal(state.buyUpgrade('fortune_gen_wandering_shade').ok, true);

  // Custo da Sombra Vagante reduziu por fortune_100 (×0.99) e fortune_gen_wandering_shade (×0.93)
  assert.equal(
    cmp(state.costMult('wandering_shade'), mul(mul(baseShadeMult, '0.99'), '0.93')),
    0,
  );
  // Custo de upgrades reduziu por fortune_101 (×0.93)
  assert.ok(cmp(state.upgradeCost('foice_afilada'), baseUpgradeCost) < 0);

  // Fortune #102 aumenta o ganho de Óbolos em +1%
  const obolsBase = obolsFromRunSouls('40000000000000', 0, []);
  const obolsWith102 = obolsFromRunSouls('40000000000000', 0, ['fortune_102']);
  assert.equal(obolsBase, '100');
  assert.equal(obolsWith102, '101');

  // Reivindicar todas as 24 Fortunas desbloqueia Moira Dourada (despertar_o_fortuna) e eleva a chance de 2% para 4%
  for (const f of FORTUNES) {
    state.claimTickerFortune(f.id);
  }
  assert.ok(state.achievements.includes('despertar_o_fortuna'));
  assert.equal(state.fortuneChance(), 0.04);
});

// 4. Auditoria Completa do Stack SPS (F0–F8 simultâneos), Paridade Estrita JS ≡ PHP e Save Heal
run('4. Auditoria Completa do Stack SPS (todas as camadas F0–F8 ativas), Paridade JS ≡ PHP e Save Heal', () => {
  const nowMs = 1_700_000_000_000;
  const allNormalAch = ACHIEVEMENTS.filter((a) => !a.shadow).slice(0, 50).map((a) => a.id); // 50 * 4% = 200% Véu

  const state = new GameState({
    souls: '1e30',
    lifetimeSouls: '1e30',
    runSouls: '1e30',
    obols: '200',
    mnemosyne: '50',
    prestigeCount: 3,
    nectar: 100,
    totalNectarHarvested: 120,
    generators: {
      wandering_shade: 100,
      charon_servants: 100,
      cerberian_hound: 50,
      tartarus_judge: 50,
      phlegethon_forge: 50,
      obsidian_throne: 50,
      mnemosyne_temple: 50,
      styx_tower: 50,
      the_emperor: 10,
    },
    shinyCounts: { wandering_shade: 2 },
    goldCounts: { wandering_shade: 5 },
    generatorLevels: {
      wandering_shade: 5,
      mnemosyne_temple: 2,
      cerberian_hound: 2,
      the_emperor: 3,
    },
    talents: [
      'juramento_eterno',
      'foice_ancestral',
      'favor_de_caronte',
      'nectar_em_reserva',
      'ovo_primordial',
      'rodizio_das_estacoes',
      'eco_ancestral_v',
    ],
    verdictPurchases: ['olho_do_tartarus', 'peso_das_faixas', 'selo_do_juiz'],
    upgrades: [
      'foice_afilada',
      'eco_da_foice',
      'mil_foices',
      'milhao_de_foices',
      'umbras_despertas',
      'moeda_no_barquinho',
      'almanaques_do_destino_i',
      'reflexo_na_agua_do_styx',
      'filhote_vigia_estige',
      'filhote_rastreador_asfodelos',
      'concilio_das_moiras',
      'soro_estigio',
      'despertar_ctoniano',
      'comunhao_abissal',
      'pacto_primordial',
      'escama_de_ladao',
      ...ALL_SEASONAL_DROP_UPGRADE_IDS,
      'fortune_100',
      'fortune_101',
      'fortune_102',
      'fortune_103',
      'fortune_gen_wandering_shade',
      'fortune_gen_the_emperor',
    ],
    minigames: {
      pantheon: { slots: { diamond: 'spirit_nyx', ruby: 'spirit_hypnos', jade: null }, swaps: 3 },
      garden: {
        soilId: 'adubo_estigio',
        plots: [
          { seedId: 'asfodelo_cinzento', ageTicks: 5, mature: true },
          { seedId: 'roma_de_persefone', ageTicks: 5, mature: true },
        ],
      },
    },
    catabase: {
      stage: 3,
      covenantActive: true,
      leeches: [],
      unlockedResearchIds: ['soro_estigio', 'despertar_ctoniano', 'comunhao_abissal', 'pacto_primordial'],
    },
    dragon: {
      stage: 4,
      auraSlot1: 'sopro_de_flegeton',
      auraSlot2: 'apetite_radiante',
      scaleDropped: true,
    },
    seasons: {
      activeSeason: 'saturnalia',
      expiresAt: nowMs + 86_400_000,
      switchesCount: 4,
      saturnKingLevel: 5,
      deerCaught: 3,
      unlockedDrops: [...ALL_SEASONAL_DROP_UPGRADE_IDS],
    },
    fortunes: {
      activeFortuneId: null,
      claimedIds: FORTUNES.map((f) => f.id),
      lifetimeClaimedIds: FORTUNES.map((f) => f.id),
    },
    activeBuffs: {
      mare_acheron: {
        id: 'mare_acheron',
        kind: 'spsBuff',
        variant: 'golden',
        mult: '7',
        startedAt: nowMs - 5000,
        expiresAt: nowMs + 60000,
        durationSec: 77,
      },
    },
    achievements: allNormalAch,
    generatorsSold: 5,
  }, { initialNowMs: nowMs });

  const jsBd = state.spsBreakdown();
  const jsClick = state.clickPower();
  const jsSummary = describeSpsBreakdownSummary(state);

  assert.ok(cmp(jsBd.rawMultiplier, '100') > 0, `Multiplicador Bruto elevado: ${jsBd.rawMultiplier}`);
  assert.ok(jsSummary.rawMultiplierLabel.startsWith('×'));
  assert.ok(jsSummary.stackBreakdownLabel.includes('Relíquias'));
  assert.ok(jsSummary.stackBreakdownLabel.includes('Saturnália'));
  assert.ok(jsSummary.stackBreakdownLabel.includes('Fortunas'));
  assert.ok(jsSummary.stackBreakdownLabel.includes('Escama'));
  assert.ok(jsSummary.stackBreakdownLabel.includes('Auras'));

  const ctx = {
    generators: state.quantities(),
    upgrades: state.upgrades,
    talents: state.talents,
    obols: state.obols,
    verdictPurchases: state.verdictPurchases,
    shinyCounts: state.shinyCounts(),
    goldCounts: state.goldCounts(),
    activeBuffs: state.activeBuffs,
    nowMs,
    generatorLevels: state.generatorLevels,
    nectar: state.nectar,
    minigames: state.minigames,
    achievements: state.achievements,
    catabase: state.catabase,
    dragon: state.dragon,
    seasons: state.seasons,
    fortunes: state.fortunes,
  };

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

    $bd = DespertarFormulas::calculateSpsBreakdown($ctx);
    $click = DespertarFormulas::clickPower($ctx);
    $refund25 = DespertarFormulas::generatorSellRefund('15', 100, 10, '1', '0.25');
    $refund50 = DespertarFormulas::generatorSellRefund('15', 100, 10, '1', '0.50');
    $cubicObols = DespertarFormulas::obolsFromLifetimeCubic('8000000000000');

    $dbRow = [
      'souls' => '1000000000000000000000000000000.00',
      'obols' => $ctx['obols'],
      'mnemosyne' => '50.00',
      'lifetime_souls' => '1000000000000000000000000000000.00',
      'run_souls' => '1000000000000000000000000000000.00',
      'prestige_count' => 3,
      'generators_state' => $ctx['generators'],
      'upgrades_state' => $ctx['upgrades'],
      'talents_state' => $ctx['talents'],
      'verdict_purchases' => $ctx['verdictPurchases'],
      'edu_logs_seen' => [],
      'milestones' => [
        'f5Nectar' => [
          'nectar' => 100,
          'totalNectarHarvested' => 120,
          'nectarCycleStartedAt' => $nowMs - 86400000,
          'generatorLevels' => $ctx['generatorLevels'],
        ],
      ],
      'stats' => ['clicks' => 500, 'max_buy_biggest' => 100, 'juizo_tie_wins' => 0],
    ];

    $syncRes = DespertarService::validateSync($dbRow, [
      'souls' => '1e30',
      'runSouls' => '1e30',
      'lifetimeSouls' => '1e30',
      'generators' => $ctx['generators'],
      'shinyCounts' => $ctx['shinyCounts'],
      'goldCounts' => $ctx['goldCounts'],
      'upgrades' => $ctx['upgrades'],
      'activeBuffs' => $ctx['activeBuffs'],
      'nectar' => $ctx['nectar'],
      'totalNectarHarvested' => 120,
      'generatorLevels' => $ctx['generatorLevels'],
      'minigames' => $ctx['minigames'],
      'catabase' => $ctx['catabase'],
      'dragon' => $ctx['dragon'],
      'seasons' => $ctx['seasons'],
      'fortunes' => $ctx['fortunes'],
      'generatorsSold' => 5,
      'eduLogsSeen' => ['log_incremental_architecture_f8'],
    ], $nowMs, $ctx['achievements']);

    // Testa rejeição de aura inválida no sync PHP
    $badAuraRes = DespertarService::validateSync($dbRow, [
      'souls' => '100',
      'dragon' => ['stage' => 1, 'auraSlot1' => 'apetite_radiante'], // exige estágio 3
    ], $nowMs, []);

    $earnedAch = DespertarFormulas::evaluateDespertarAchievementIds($syncRes['next'], [], true);

    echo json_encode([
      'upCount' => count(DespertarCatalog::UPGRADES),
      'talentCount' => count(DespertarCatalog::TALENTS),
      'bd' => $bd,
      'click' => $click,
      'refund25' => $refund25,
      'refund50' => $refund50,
      'cubicObols' => $cubicObols,
      'syncOk' => $syncRes['ok'],
      'badAuraOk' => $badAuraRes['ok'],
      'syncLogs' => $syncRes['next']['eduLogsSeen'] ?? [],
      'earnedAch' => $earnedAch,
    ]);
  `;

  const outRaw = execFileSync('php', ['-r', phpScript, JSON.stringify(ctx)], {
    cwd: root,
    encoding: 'utf8',
  });
  const phpOut = JSON.parse(outRaw);

  assert.equal(phpOut.upCount, UPGRADES.length);
  assert.equal(phpOut.talentCount, TALENTS.length);

  // Compara cada camada do Stack SPS entre JS e PHP
  for (const key of [
    'baseLinesSps',
    'prestigeMult',
    'verdictMult',
    'minigamesMult',
    'seasonalCompoundMult',
    'catabaseResearchMult',
    'saturnaliaMult',
    'fortuneGlobalMult',
    'dragonScaleMult',
    'cerberusPupMult',
    'nectarReserveMult',
    'dragonAuraMult',
    'elderCovenantMult',
    'activeBuffsMult',
    'rawMultiplier',
    'rawSps',
    'effectiveSps',
  ]) {
    assert.equal(
      cmp(phpOut.bd[key], jsBd[key]),
      0,
      `Camada ${key} diverge: PHP (${phpOut.bd[key]}) ≠ JS (${jsBd[key]})`,
    );
  }
  assert.equal(cmp(phpOut.click, jsClick), 0, `clickPower PHP (${phpOut.click}) ≠ JS (${jsClick})`);
  assert.equal(
    cmp(phpOut.refund25, generatorSellRefund('15', 100, 10, '1', '0.25')),
    0,
  );
  assert.equal(
    cmp(phpOut.refund50, generatorSellRefund('15', 100, 10, '1', '0.50')),
    0,
  );
  assert.equal(phpOut.cubicObols, obolsFromLifetimeCubic('8000000000000'));
  assert.equal(phpOut.cubicObols, '2'); // cbrt(8e12 / 1e12) = 2
  assert.equal(phpOut.syncOk, true);
  assert.equal(phpOut.badAuraOk, false, 'PHP deve rejeitar aura de estágio 3 quando Dragão está no estágio 1');
  assert.ok(phpOut.syncLogs.includes('log_incremental_architecture_f8'));

  for (const achId of [
    'despertar_dragao_filhote',
    'despertar_dragao_ladao',
    'despertar_estacoes_4',
    'despertar_reliquias_sazonais',
    'despertar_rei_saturno_5',
    'despertar_fortuna_1',
    'despertar_o_fortuna',
    'despertar_mercador_acheron',
  ]) {
    assert.ok(phpOut.earnedAch.includes(achId), `PHP deve conceder ${achId}`);
  }

  // Testa Save Heal (nunca perde Óbolos de saves antigos e garante piso cúbico pós-Catábase)
  const healedKeep = healLegacySave({
    obols: '50.00',
    mnemosyne: '20.00',
    prestigeCount: 2,
    lifetimeSouls: '8000000000000',
  });
  assert.equal(healedKeep.obols, '50.00', 'Save Heal preserva Óbolos maiores que o piso cúbico');
  assert.equal(healedKeep.milestones.f8SaveHealed, true);

  const healedBoost = healLegacySave({
    obols: '1.00',
    mnemosyne: '0.00',
    prestigeCount: 1,
    lifetimeSouls: '27000000000000', // cbrt(27e12 / 1e12) = 3
  });
  assert.equal(healedBoost.obols, '3.00', 'Save Heal eleva ao piso cúbico sem perder progresso');
});

// 5. Códice F8 e Assets Gemini (manifest.json + art-requests.json)
run('5. Códice (log_incremental_architecture_f8) e Assets Gemini (manifest.json + art-requests.json)', () => {
  assert.ok(EDU_LOG_BY_ID.log_incremental_architecture_f8);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/sprites/manifest.json'), 'utf8'),
  );
  assert.equal(Object.keys(manifest.generators).length, 20);
  assert.equal(Object.keys(manifest.upgrades).length, 396);
  assert.ok(manifest.seasons.dragon_stage_0);
  assert.ok(manifest.seasons.dragon_stage_4);
  assert.ok(manifest.seasons.aura_apetite_radiante);
  assert.ok(manifest.seasons.season_antesteria);
  assert.ok(manifest.seasons.season_lemuria);
  assert.ok(manifest.seasons.season_saturnalia);
  assert.ok(manifest.seasons.season_feira_de_hermes);
  assert.ok(manifest.seasons.corca_de_artemis);

  const artReqs = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'),
  );
  assert.ok(
    artReqs.requests.some((r) => r.id === 'art_f8_seasons_dragon_fortunes' && r.listId === 'F8-SD'),
  );
});

console.log(`\ndespertar-f8-seasons-dragon-polish-smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
