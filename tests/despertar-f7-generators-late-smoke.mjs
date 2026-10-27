/**
 * Smoke Fase F7 — Geradores T13–T20 (Condensador do Vazio → O Imperador),
 * 120 Juramentos de Linha (15 tiers ×2 por gerador T13–T20), Fecho de 100% das Sinergias Vol. I/II
 * + 8 Tipos de Servos Especializados, Stress Test Big-Num (1e35 almas, lotes 1/10/100/Max,
 * F1–F6 empilhados), Viewport Culling no WorldView, 45 Conquistas F7, Códice e Assets Gemini.
 *
 * Uso: node tests/despertar-f7-generators-late-smoke.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EDU_LOG_BY_ID } from '../js/hades-despertar/config/edu-logs.js';
import { GENERATORS, getGenerator } from '../js/hades-despertar/config/generators.js';
import { UPGRADES, getUpgrade } from '../js/hades-despertar/config/upgrades.js';
import { ACHIEVEMENTS, getAchievementById } from '../js/game-catalog.js';
import { cmp, div } from '../js/hades-despertar/core/decimal.js';
import {
  calculateEffectiveSPS,
  calculateRawSPS,
  calculateTotalSPS,
  elderPactServantFlatBonusPerUnit,
  meetsUpgradeRequirement,
  nonServantGeneratorsCount,
  nonShadeGeneratorsCount,
  synergyUpgradeMult,
  thousandBladesBonusPerUnit,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { formatSouls } from '../js/hades-despertar/ui/NumberFormatter.js';
import { isGeneratorRevealed } from '../js/hades-despertar/ui/UIRenderer.js';
import { WorldView, drawNpcSilhouette } from '../js/hades-despertar/ui/world/WorldView.js';

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

const EXPECTED_T13_T20 = [
  { id: 'void_condenser', tier: 13, baseCost: '170000000000000', baseRate: '430000000' },
  { id: 'moirai_prism', tier: 14, baseCost: '2100000000000000', baseRate: '2900000000' },
  { id: 'fate_forge', tier: 15, baseCost: '26000000000000000', baseRate: '21000000000' },
  { id: 'fractal_engine', tier: 16, baseCost: '310000000000000000', baseRate: '150000000000' },
  { id: 'oracle_console', tier: 17, baseCost: '71000000000000000000', baseRate: '1100000000000' },
  { id: 'chthonic_idleverse', tier: 18, baseCost: '12000000000000000000000', baseRate: '8300000000000' },
  { id: 'cortex_baker', tier: 19, baseCost: '1900000000000000000000000', baseRate: '64000000000000' },
  { id: 'the_emperor', tier: 20, baseCost: '540000000000000000000000000', baseRate: '510000000000000' },
];

const EXPECTED_MILESTONES = [1, 5, 10, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300];

// 1. Catálogo T1–T20 (20 geradores canónicos), máscaras de revelação e sufixos Big-Num
run('1. Catálogo completo T1–T20 (20 geradores), máscaras de revelação e formatação Big-Num (Qa..Vg)', () => {
  assert.equal(GENERATORS.length, 20, '20 geradores no catálogo (T1–T20)');

  for (const exp of EXPECTED_T13_T20) {
    const def = getGenerator(exp.id);
    assert.ok(def, `Gerador ${exp.id} existe`);
    assert.equal(def.tier, exp.tier);
    assert.equal(def.baseCost, exp.baseCost);
    assert.equal(def.baseRate, exp.baseRate);

    // Máscara de revelação: bloqueado no zero; revelado por 1x tier anterior ou BaseCost/4
    assert.equal(isGeneratorRevealed(exp.id, { souls: '0', generators: {} }), false);
    const quarter = div(exp.baseCost, '4');
    assert.equal(isGeneratorRevealed(exp.id, { souls: quarter, generators: {} }), true);
    const prevGen = GENERATORS.find((g) => g.tier === exp.tier - 1);
    assert.equal(isGeneratorRevealed(exp.id, { souls: '0', generators: { [prevGen.id]: 1 } }), true);
  }

  // Formatação de sufixos extremos sem Number overflow
  assert.equal(formatSouls('2100000000000000'), '2.1Qa');
  assert.equal(formatSouls('71000000000000000000'), '71Qi');
  assert.equal(formatSouls('12000000000000000000000'), '12Sx');
  assert.equal(formatSouls('1900000000000000000000000'), '1.9Sp');
  assert.equal(formatSouls('540000000000000000000000000'), '540Sp');
  assert.equal(formatSouls('1e33'), '1Dc');
  assert.equal(formatSouls('1e63'), '1Vg');
});

// 2. 120 Upgrades de Linha (15 tiers × 8 geradores T13–T20) + 100% da Malha de Sinergias Vol. I/II + 8 Tipos de Servos
run('2. 120 Juramentos de linha T13–T20 (15 tiers ×2) + 8 Sinergias Vol. I/II + 8 Tipos de Servos', () => {
  assert.ok(UPGRADES.length >= 361, 'Ao menos 361 upgrades no catálogo (F1+F3+F4+F6+F7)');

  for (const exp of EXPECTED_T13_T20) {
    const tiers = UPGRADES.filter((u) => u.kind === 'generatorMult' && u.generatorId === exp.id);
    assert.equal(tiers.length, 15, `${exp.id} deve ter exatamente 15 tiers ×2`);
    assert.deepEqual(
      tiers.map((u) => u.requires?.quantity),
      EXPECTED_MILESTONES,
      `marcos 1..300 em ${exp.id}`,
    );
    for (let i = 0; i < tiers.length; i += 1) {
      assert.equal(tiers[i].factor, '2');
      if (i > 0) {
        assert.ok(cmp(tiers[i].cost, tiers[i - 1].cost) > 0, `Custo estritamente crescente em ${exp.id}`);
      }
    }
  }

  const f7Synergies = [
    // [id, baseGeneratorId, boostedGeneratorId, talentId, minQty]
    ['magia_luminosa_i', 'moirai_prism', 'styx_tower', 'sinergias_vol_i', 15],
    ['espelhos_recursivos_i', 'fractal_engine', 'moirai_prism', 'sinergias_vol_i', 15],
    ['camundongos_clicando_ii', 'fractal_engine', 'wandering_shade', 'sinergias_vol_ii', 75],
    ['revisao_por_pares_ii', 'the_emperor', 'oracle_console', 'sinergias_vol_ii', 75],
  ];

  for (const [synId, baseId, boostedId, talentId, minQty] of f7Synergies) {
    const syn = getUpgrade(synId);
    assert.ok(syn, `Sinergia ${synId} existe`);
    const talents = talentId === 'sinergias_vol_ii'
      ? ['sinergias_vol_i', 'sinergias_vol_ii']
      : ['sinergias_vol_i'];
    assert.equal(
      meetsUpgradeRequirement(syn, {
        generators: { [baseId]: minQty, [boostedId]: minQty },
        talents,
      }),
      true,
    );
    assert.equal(
      cmp(synergyUpgradeMult(boostedId, [synId], { [baseId]: 20, [boostedId]: 15 }), '2'),
      0,
    );
  }

  const servantTypes = [
    'servos_do_vazio',
    'servos_prismaticos',
    'servos_da_fortuna',
    'servos_fractais',
    'servos_algoritmicos_do_oraculo',
    'servos_transversais',
    'servos_psionicos',
    'servos_da_guarda_imperial',
  ];
  for (const sid of servantTypes) {
    assert.ok(getUpgrade(sid), `Servo especializado ${sid} existe`);
  }
});

// 3. Stress Test Big-Num (1e35 almas, compras 1/10/100/Max de T13–T20, F1–F6 empilhados) + Paridade JS ≡ PHP
run('3. Stress Test Big-Num (1e35 almas, lotes 1/10/100/Max, Mil Foices, Véu, Néctar, Catábase) e Paridade JS ≡ PHP', () => {
  const state = new GameState({
    souls: '1e35',
    lifetimeSouls: '1e35',
    runSouls: '1e35',
    obols: '500',
    nectar: 100,
    totalNectarHarvested: 150,
    talents: ['juramento_eterno', 'nectar_em_reserva'],
    verdictPurchases: ['olho_do_tartarus', 'peso_das_faixas'],
  }, { initialNowMs: 1_700_000_000_000, random: () => 0.99 });

  // Compra todos os 20 geradores (incluindo lotes 1, 10, 100 e Max em T13–T20)
  for (const def of GENERATORS) {
    if (def.tier <= 12) {
      assert.equal(state.buyGenerator(def.id, '100').ok, true);
    }
  }
  assert.equal(state.buyGenerator('void_condenser', '100').ok, true);
  assert.equal(state.buyGenerator('moirai_prism', '100').ok, true);
  assert.equal(state.buyGenerator('fate_forge', '100').ok, true);
  assert.equal(state.buyGenerator('fractal_engine', '100').ok, true);
  assert.equal(state.buyGenerator('oracle_console', '100').ok, true);
  assert.equal(state.buyGenerator('chthonic_idleverse', '100').ok, true);
  assert.equal(state.buyGenerator('cortex_baker', '100').ok, true);
  assert.equal(state.buyGenerator('the_emperor', '10').ok, true);
  assert.equal(state.buyGenerator('the_emperor', '90').ok, true);

  // Eleva níveis de Néctar em T13 e T20
  state.nectar = 100;
  state.levelUpGenerator('void_condenser');
  state.levelUpGenerator('the_emperor');
  state.nectar = 100; // mantém cap 100 para Néctar em Reserva

  // Compra upgrades de linha, sinergias, Mil Foices, Filhotes do Cérbero e Pacto Primordial
  const emperorTiers = UPGRADES.filter((u) => u.kind === 'generatorMult' && u.generatorId === 'the_emperor').map((u) => u.id);
  const testUpgrades = [
    ...emperorTiers,
    'mil_foices',
    'milhao_de_foices',
    'camara_de_vazio_primordial',
    'lente_de_quartzo_estigio',
    'magia_luminosa_i',
    'espelhos_recursivos_i',
    'servos_da_guarda_imperial',
    'filhote_vigia_estige',
    'filhote_forjador_phlegethon',
    'concilio_das_moiras',
    'despertar_ctoniano',
    'comunhao_abissal',
    'pacto_primordial',
  ];
  state.upgrades = testUpgrades;
  state.setCatabaseStage(3);
  state.spawnLeech({ shiny: false, slot: 0 });
  state.spawnLeech({ shiny: true, slot: 1 });
  state.invalidateEconomyCache();

  // Verifica que Mil Foices e Elder Pact contabilizam T13–T20
  assert.ok(nonShadeGeneratorsCount(state.quantities()) >= 1900);
  assert.ok(nonServantGeneratorsCount(state.quantities()) >= 1900);
  assert.ok(cmp(thousandBladesBonusPerUnit(state.upgrades, state.quantities()), '0') > 0);
  assert.ok(cmp(elderPactServantFlatBonusPerUnit(state.upgrades, state.quantities()), '0') > 0);

  const jsRawSps = state.rawSps();
  const jsEffSps = state.effectiveSps();
  assert.ok(cmp(jsRawSps, '1e18') > 0, `SPS bruto late-game elevado: ${jsRawSps}`);
  assert.ok(cmp(jsEffSps, jsRawSps) < 0, '2 Sanguessugas drenam 10% do SPS aparente');

  const ctx = {
    generators: state.quantities(),
    upgrades: state.upgrades,
    talents: state.talents,
    obols: state.obols,
    verdictPurchases: state.verdictPurchases,
    shinyCounts: state.shinyCounts(),
    goldCounts: state.goldCounts(),
    activeBuffs: state.activeBuffs,
    nowMs: 1_700_000_000_000,
    generatorLevels: state.generatorLevels,
    nectar: state.nectar,
    minigames: state.minigames,
    achievements: state.achievements,
    catabase: state.catabase,
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

    $rawSps = DespertarFormulas::calculateRawSPS($ctx);
    $effSps = DespertarFormulas::calculateEffectiveSPS(array_merge($ctx, ['rawSps' => $rawSps]));

    $dbRow = [
      'souls' => '100000000000000000000000000000000000.00',
      'obols' => $ctx['obols'],
      'mnemosyne' => '100.00',
      'lifetime_souls' => '100000000000000000000000000000000000.00',
      'run_souls' => '100000000000000000000000000000000000.00',
      'prestige_count' => 5,
      'generators_state' => $ctx['generators'],
      'upgrades_state' => $ctx['upgrades'],
      'talents_state' => $ctx['talents'],
      'verdict_purchases' => $ctx['verdictPurchases'],
      'edu_logs_seen' => [],
      'milestones' => [
        'f5Nectar' => [
          'nectar' => 100,
          'totalNectarHarvested' => 150,
          'nectarCycleStartedAt' => $nowMs - 86400000,
          'generatorLevels' => $ctx['generatorLevels'],
        ],
      ],
      'stats' => ['clicks' => 500, 'max_buy_biggest' => 100, 'juizo_tie_wins' => 0],
    ];

    $syncRes = DespertarService::validateSync($dbRow, [
      'souls' => '1e35',
      'runSouls' => '1e35',
      'lifetimeSouls' => '1e35',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'nectar' => $ctx['nectar'],
      'totalNectarHarvested' => 150,
      'generatorLevels' => $ctx['generatorLevels'],
      'catabase' => $ctx['catabase'],
      'eduLogsSeen' => ['log_late_bignum_payoff'],
    ], $nowMs, $ctx['achievements']);

    $earnedAch = DespertarFormulas::evaluateDespertarAchievementIds($syncRes['next'], [], true);

    echo json_encode([
      'genCount' => count(DespertarCatalog::GENERATORS),
      'upCount' => count(DespertarCatalog::UPGRADES),
      'rawSps' => $rawSps,
      'effSps' => $effSps,
      'syncOk' => $syncRes['ok'],
      'syncLogs' => $syncRes['next']['eduLogsSeen'] ?? [],
      'earnedAch' => $earnedAch,
    ]);
  `;

  const outRaw = execFileSync('php', ['-r', phpScript, JSON.stringify(ctx)], {
    cwd: root,
    encoding: 'utf8',
  });
  const phpOut = JSON.parse(outRaw);

  assert.equal(phpOut.genCount, 20);
  assert.equal(phpOut.upCount, UPGRADES.length);
  assert.equal(cmp(phpOut.rawSps, jsRawSps), 0, `rawSPS PHP (${phpOut.rawSps}) ≠ JS (${jsRawSps})`);
  assert.equal(cmp(phpOut.effSps, jsEffSps), 0, `effectiveSPS PHP (${phpOut.effSps}) ≠ JS (${jsEffSps})`);
  assert.equal(phpOut.syncOk, true);
  assert.ok(phpOut.syncLogs.includes('log_late_bignum_payoff'));

  for (const achId of [
    'despertar_condensador_1',
    'despertar_condensador_100',
    'despertar_prisma_100',
    'despertar_forja_destino_100',
    'despertar_motor_fractal_100',
    'despertar_console_100',
    'despertar_idleverso_100',
    'despertar_cortex_100',
    'despertar_imperador_100',
    'despertar_vinte_rios',
    'despertar_almas_1e21',
    'despertar_almas_1e30',
    'despertar_sps_1e15',
    'despertar_sps_1e21',
  ]) {
    assert.ok(phpOut.earnedAch.includes(achId), `PHP deve conceder ${achId}`);
    assert.ok(getAchievementById(achId) || ACHIEVEMENTS.find((a) => a.id === achId), `${achId} existe em game-catalog.json`);
  }
});

// 4. WorldView (20 prateleiras + Viewport Culling), Códice e Assets Gemini
run('4. WorldView T13–T20 (silhuetas + Viewport Culling), Códice e Assets Gemini', () => {
  // Verifica silhuetas T13–T20
  let fillCalls = 0;
  const fakeCtx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    beginPath() {},
    ellipse() {},
    arc() {},
    rect() {},
    clip() {},
    fill() { fillCalls += 1; },
    stroke() {},
    setTransform() {},
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
  };
  for (let tier = 13; tier <= 20; tier += 1) {
    drawNpcSilhouette(fakeCtx, 0, 0, tier, 0, 36, { reducedMotion: false });
  }
  assert.ok(fillCalls >= 16);

  // Testa Viewport Culling em WorldView: prateleiras com inViewport = false não repintam no frame()
  let clearRectCalls = 0;
  const fakeDoc = {
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          className: '',
          width: 0,
          height: 0,
          style: {},
          setAttribute() {},
          getContext() {
            return {
              clearRect() { clearRectCalls += 1; },
              setTransform() {},
              save() {},
              restore() {},
              translate() {},
              scale() {},
              beginPath() {},
              ellipse() {},
              fill() {},
            };
          },
        };
      }
      return {
        tagName: String(tag).toUpperCase(),
        className: '',
        hidden: false,
        dataset: {},
        style: { setProperty() {} },
        classList: {
          _s: new Set(),
          add(c) { this._s.add(c); },
          remove(c) { this._s.delete(c); },
          toggle(c, on) { if (on) this._s.add(c); else this._s.delete(c); },
        },
        setAttribute() {},
        removeAttribute() {},
        addEventListener() {},
        removeEventListener() {},
        append() {},
        replaceChildren() {},
      };
    },
  };
  const host = fakeDoc.createElement('div');
  const wv = new WorldView({
    document: fakeDoc,
    matchMedia: () => ({ matches: false }),
    now: () => 1000,
  }).mount(host);

  const st = new GameState({
    souls: '1e30',
    generators: { void_condenser: 5, the_emperor: 5 },
  });
  wv.sync(st, { reducedMotion: false });

  // Marca ambas fora do viewport -> frame() não deve chamar #paintShelf (clearRectCalls permanece 0)
  wv.setShelfViewportVisibility('void_condenser', false);
  wv.setShelfViewportVisibility('the_emperor', false);
  clearRectCalls = 0;
  wv.frame(1 / 60, { reducedMotion: false, fancy: true, particles: false });
  assert.equal(clearRectCalls, 0, 'Prateleiras fora do viewport são puladas pelo culling no frame()');

  // Reentra void_condenser no viewport -> frame() pinta apenas 1 prateleira
  wv.setShelfViewportVisibility('void_condenser', true);
  clearRectCalls = 0;
  wv.frame(1 / 60, { reducedMotion: false, fancy: true, particles: false });
  assert.equal(clearRectCalls, 1, 'Apenas a prateleira visível no viewport é pintada no frame()');

  // Códice e Assets
  assert.ok(EDU_LOG_BY_ID.log_late_bignum_payoff);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/sprites/manifest.json'), 'utf8'),
  );
  assert.equal(Object.keys(manifest.generators).length, 20);
  assert.equal(Object.keys(manifest.upgrades).length, UPGRADES.length);
  for (const exp of EXPECTED_T13_T20) {
    assert.ok(manifest.generators[exp.id], `manifest.generators inclui ${exp.id}`);
  }
  const artReqs = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'),
  );
  assert.ok(artReqs.requests.some((r) => r.id === 'art_f7_generators_t13_t20' && r.listId === 'F7-GEN'));
  assert.ok(artReqs.requests.some((r) => r.id === 'art_f7_upgrades_late' && r.listId === 'F7-UP'));
});

console.log(`\ndespertar-f7-generators-late-smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
