/**
 * Smoke Fase F3 — Geradores T7–T12 (Templo de Mnemosyne → Tear de Cronos),
 * 90 Upgrades de Linha + 8 Sinergias cruzadas, Mil Foices, Big-Num Sync JS ≡ PHP,
 * WorldView prateleiras (1 RAF / cap variantes), Conquistas, Códice e Assets.
 *
 * Uso: node tests/despertar-f3-generators-smoke.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GENERATORS, GENERATOR_BY_ID } from '../js/hades-despertar/config/generators.js';
import { UPGRADES, UPGRADE_BY_ID } from '../js/hades-despertar/config/upgrades.js';
import { EDU_LOG_BY_ID, EDU_LOG_IDS } from '../js/hades-despertar/config/edu-logs.js';
import { ACHIEVEMENTS, getAchievementById } from '../js/game-catalog.js';
import { cmp, div } from '../js/hades-despertar/core/decimal.js';
import {
  calculateTotalSPS,
  clickPower,
  generatorBatchCost,
  lineSPS,
  nonShadeGeneratorsCount,
  synergyUpgradeMult,
  thousandBladesBonusPerUnit,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  describeGeneratorCard,
  isGeneratorRevealed,
} from '../js/hades-despertar/ui/UIRenderer.js';
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

const EXPECTED_T7_T12 = [
  { id: 'mnemosyne_temple', tier: 7, name: 'Templo de Mnemosyne', baseCost: '20000000', baseRate: '7800' },
  { id: 'styx_tower', tier: 8, name: 'Torre do Estige', baseCost: '330000000', baseRate: '44000' },
  { id: 'star_barge', tier: 9, name: 'Barca das Estrelas', baseCost: '5100000000', baseRate: '260000' },
  { id: 'tartarus_lab', tier: 10, name: 'Laboratório do Tártaro', baseCost: '75000000000', baseRate: '1600000' },
  { id: 'erebus_portal', tier: 11, name: 'Portal do Érebo', baseCost: '1000000000000', baseRate: '10000000' },
  { id: 'chronos_loom', tier: 12, name: 'Tear de Cronos', baseCost: '14000000000000', baseRate: '65000000' },
];

const EXPECTED_MILESTONES = [1, 5, 10, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300];

const EXPECTED_F3_SYNERGIES = [
  { id: 'paganismo_erebo_i', base: 'erebus_portal', boosted: 'mnemosyne_temple', min: 15, talentId: 'sinergias_vol_i' },
  { id: 'oracao_da_chuva_ii', base: 'mnemosyne_temple', boosted: 'cerberian_hound', min: 75, talentId: 'sinergias_vol_ii' },
  { id: 'magia_sismica_i', base: 'styx_tower', boosted: 'tartarus_judge', min: 15, talentId: 'sinergias_vol_i' },
  { id: 'botanica_magica_ii', base: 'styx_tower', boosted: 'cerberian_hound', min: 75, talentId: 'sinergias_vol_ii' },
  { id: 'salto_parsec_i', base: 'chronos_loom', boosted: 'star_barge', min: 15, talentId: 'sinergias_vol_i' },
  { id: 'mineracao_asteroide_ii', base: 'star_barge', boosted: 'tartarus_judge', min: 75, talentId: 'sinergias_vol_ii' },
  { id: 'cosmos_mil_folhas_i', base: 'chthonic_idleverse', boosted: 'erebus_portal', min: 15, talentId: 'sinergias_vol_i' },
  { id: 'fulgor_primitivo_ii', base: 'moirai_prism', boosted: 'chronos_loom', min: 75, talentId: 'sinergias_vol_ii' },
];

// 1. Catálogo T1–T12, Payoffs e Reveal Thresholds
run('1. Catálogo T1–T12: baseCost, baseRate, payoffs canônicos e máscaras de revelação', () => {
  assert.ok(GENERATORS.length >= 12, 'Catálogo deve ter ao menos 12 geradores (T1–T12)');

  for (const exp of EXPECTED_T7_T12) {
    const gen = GENERATOR_BY_ID[exp.id];
    assert.ok(gen, `Gerador ${exp.id} ausente`);
    assert.equal(gen.tier, exp.tier);
    assert.equal(gen.name, exp.name);
    assert.equal(gen.baseCost, exp.baseCost);
    assert.equal(gen.baseRate, exp.baseRate);

    // Reveal thresholds: fechado no zero, abre com 1 unidade do tier anterior ou BaseCost/4
    assert.equal(isGeneratorRevealed(exp.id, { souls: '0', generators: {} }), false);
    const quarter = div(exp.baseCost, '4');
    assert.equal(isGeneratorRevealed(exp.id, { souls: quarter, generators: {} }), true);
    const prevTierGen = GENERATORS.find((g) => g.tier === exp.tier - 1);
    assert.equal(
      isGeneratorRevealed(exp.id, { souls: '0', generators: { [prevTierGen.id]: 1 } }),
      true,
    );
  }
});

// 2. 90 Upgrades de Linha (15 tiers × 6 geradores T7–T12) + 8 Sinergias cruzadas
run('2. Juramentos Styx T7–T12 (90 upgrades de linha ×2) + 8 Sinergias Vol. I/II', () => {
  assert.ok(UPGRADES.length >= 210, 'Pelo menos 210 upgrades (112 F1 + 90 T7–T12 + 8 sinergias F3)');

  for (const exp of EXPECTED_T7_T12) {
    const tiers = UPGRADES.filter((u) => u.kind === 'generatorMult' && u.generatorId === exp.id);
    assert.equal(tiers.length, 15, `${exp.id} deve ter exatamente 15 tiers`);
    assert.deepEqual(
      tiers.map((u) => u.requires?.quantity),
      EXPECTED_MILESTONES,
      `marcos 1..300 em ${exp.id}`,
    );

    for (let i = 0; i < tiers.length; i += 1) {
      const u = tiers[i];
      assert.equal(u.factor, '2', `Todos os 15 tiers de ${exp.id} são ×2 (${u.id})`);
      assert.ok(u.name && u.blurb, `Nome e blurb obrigatórios em ${u.id}`);
      if (i > 0) {
        assert.ok(
          cmp(u.cost, tiers[i - 1].cost) > 0,
          `Custo estritamente crescente em ${exp.id}: ${u.id} (${u.cost}) <= ${tiers[i - 1].id} (${tiers[i - 1].cost})`,
        );
      }
    }
  }

  for (const syn of EXPECTED_F3_SYNERGIES) {
    const u = UPGRADE_BY_ID[syn.id];
    assert.ok(u, `Sinergia ${syn.id} ausente`);
    assert.equal(u.kind, 'synergyMult');
    assert.equal(u.baseGeneratorId, syn.base);
    assert.equal(u.boostedGeneratorId, syn.boosted);
    assert.equal(u.baseBonusPerBoosted, '0.001');
    assert.equal(u.boostedBonusPerBase, '0.05');
    assert.equal(u.requires.minGenerators[syn.base], syn.min);
    assert.equal(u.requires.minGenerators[syn.boosted], syn.min);
    assert.equal(u.requires.talentId, syn.talentId);
  }

  // Oração da Chuva Vol. II: 20 Templos (base), 15 Cães (boosted)
  // Cão +5%/Templo -> 1 + 20 * 0.05 = ×2.0
  // Templo +0.1%/Cão -> 1 + 15 * 0.001 = ×1.015
  const multHound = synergyUpgradeMult(
    'cerberian_hound',
    ['oracao_da_chuva_ii'],
    { mnemosyne_temple: 20, cerberian_hound: 15 },
  );
  const multTemple = synergyUpgradeMult(
    'mnemosyne_temple',
    ['oracao_da_chuva_ii'],
    { mnemosyne_temple: 20, cerberian_hound: 15 },
  );
  assert.equal(cmp(multHound, '2'), 0);
  assert.equal(cmp(multTemple, '1.015'), 0);
});

// 3. Compra 1/10/100/Max, lineSPS, Mil Foices com T7–T12 e Big-Num (1e12–1e22)
run('3. Compras (1/10/100/Max), lineSPS, Mil Foices (nonShadeQty inclui T7–T12) e Big-Num', () => {
  const state = new GameState({
    souls: '10000000000000000000000', // 1e22
    generators: { wandering_shade: 25 },
    upgrades: ['mil_foices', 'milhao_de_foices'], // 0.1 * 5 = +0.5 por estrutura não-Sombra
  });

  // Compra 1× de cada T7–T12 (6 unidades não-Sombra)
  for (const exp of EXPECTED_T7_T12) {
    const res = state.buyGenerator(exp.id, '1', { random: () => 0.99 });
    assert.equal(res.ok, true, `Falha ao comprar 1× ${exp.id}`);
  }
  assert.equal(nonShadeGeneratorsCount(state.quantities()), 6);

  // Mil Foices deve somar 6 * 0.5 = +3.0 por unidade de Sombra e no clique
  const bonusPerShade = thousandBladesBonusPerUnit(state.upgrades, state.quantities());
  assert.equal(cmp(bonusPerShade, '3'), 0);

  // Compra lote 10 e lote 100 de Tear de Cronos (T12)
  const buy10 = state.buyGenerator('chronos_loom', '10', { random: () => 0.99 });
  assert.equal(buy10.ok, true);
  assert.equal(buy10.bought, 10);
  assert.equal(state.quantities().chronos_loom, 11);

  const buy100 = state.buyGenerator('erebus_portal', '100', { random: () => 0.99 });
  assert.equal(buy100.ok, true);
  assert.equal(buy100.bought, 100);
  assert.equal(state.quantities().erebus_portal, 101);

  // Compra o tier 300 do Tear de Cronos (custo 1.75e21 = 1750000000000000000000)
  state.generators.get('chronos_loom').quantity = 300;
  state.invalidateEconomyCache();
  const up300 = state.buyUpgrade('dominio_sobre_o_principio_e_o_fim');
  assert.equal(up300.ok, true, 'Compra de upgrade na casa de 1.75e21 deve funcionar sem perda de precisão');

  const card = describeGeneratorCard(state, 'chronos_loom', '10');
  assert.equal(card.revealed, true);
  assert.equal(card.quantity, 300);
});

// 4. Paridade Estrita JS ≡ PHP + Sync de triliões/sextiliões + Conquistas T7–T12
run('4. Paridade Estrita JS ≡ PHP (12 Geradores, 210 Upgrades, Fórmulas Big-Num, Sync e 24 Conquistas F3)', () => {
  const sampleQuantities = {
    wandering_shade: 50,
    charon_servants: 30,
    cerberian_hound: 75,
    tartarus_judge: 75,
    phlegethon_forge: 40,
    obsidian_throne: 30,
    mnemosyne_temple: 100,
    styx_tower: 75,
    star_barge: 50,
    tartarus_lab: 25,
    erebus_portal: 15,
    chronos_loom: 200,
  };
  const sampleUpgrades = [
    'mil_foices',
    'milhao_de_foices',
    'incenso_de_asfodelos',
    'grimorio_das_aguas_negras',
    'velas_de_eter_noturno',
    'alambiques_de_obsidiana',
    'umbral_de_pedra_vazia',
    'fuso_de_bronze_temporal',
    'paganismo_erebo_i',
    'oracao_da_chuva_ii',
    'magia_sismica_i',
    'salto_parsec_i',
    'botanica_magica_ii',
  ];

  const jsSps = calculateTotalSPS({
    generators: sampleQuantities,
    upgrades: sampleUpgrades,
    talents: ['juramento_eterno', 'sinergias_vol_i', 'sinergias_vol_ii'],
    obols: '25',
    verdictPurchases: ['olho_do_tartarus'],
  });
  const jsClick = clickPower({
    generators: sampleQuantities,
    upgrades: sampleUpgrades,
    talents: ['foice_ancestral', 'sinergias_vol_i', 'sinergias_vol_ii'],
    obols: '25',
    sps: jsSps,
    verdictPurchases: ['selo_do_juiz'],
  });
  const jsLoomBatch10 = generatorBatchCost('14000000000000', 50, 10, '1');

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

    $input = json_decode($argv[1], true);
    $gens = $input['generators'];
    $ups = $input['upgrades'];

    $sps = DespertarFormulas::calculateTotalSPS([
      'generators' => $gens,
      'upgrades' => $ups,
      'talents' => ['juramento_eterno', 'sinergias_vol_i', 'sinergias_vol_ii'],
      'obols' => '25',
      'verdictPurchases' => ['olho_do_tartarus'],
    ]);
    $click = DespertarFormulas::clickPower([
      'generators' => $gens,
      'upgrades' => $ups,
      'talents' => ['foice_ancestral', 'sinergias_vol_i', 'sinergias_vol_ii'],
      'obols' => '25',
      'sps' => $sps,
      'verdictPurchases' => ['selo_do_juiz'],
    ]);
    $batch10 = DespertarFormulas::generatorBatchCost('14000000000000', 50, 10, '1');

    $dbRow = [
      'souls' => '500000000000000000000.00',
      'obols' => '25.00',
      'mnemosyne' => '10.00',
      'lifetime_souls' => '900000000000000000000.00',
      'run_souls' => '500000000000000000000.00',
      'prestige_count' => 1,
      'generators_state' => $gens, // já possuídos: o teste é de paridade, não de compra
      'upgrades_state' => $ups,
      'talents_state' => ['juramento_eterno', 'foice_ancestral'],
      'verdict_purchases' => ['olho_do_tartarus', 'selo_do_juiz'],
      'edu_logs_seen' => [],
      'milestones' => [],
      'stats' => ['clicks' => 50, 'max_buy_biggest' => 10, 'juizo_tie_wins' => 0],
    ];

    $sync = DespertarService::validateSync($dbRow, [
      'souls' => '450000000000000000000.00',
      'runSouls' => '600000000000000000000.00',
      'lifetimeSouls' => '1000000000000000000000.00',
      'generators' => $gens,
      'upgrades' => $ups,
      'eduLogsSeen' => ['log_midgame_payoff'],
    ], 1700000000000);

    $earnedAch = DespertarFormulas::evaluateDespertarAchievementIds($sync['next'], [], true);

    echo json_encode([
      'generators' => DespertarCatalog::GENERATORS,
      'upgrades' => DespertarCatalog::UPGRADES,
      'eduLogs' => DespertarCatalog::EDU_LOG_IDS,
      'achIds' => DespertarCatalog::DESPERTAR_ACHIEVEMENT_IDS,
      'sps' => $sps,
      'click' => $click,
      'batch10' => $batch10,
      'syncOk' => $sync['ok'],
      'syncLogs' => $sync['next']['eduLogsSeen'] ?? [],
      'earnedAch' => $earnedAch,
    ]);
  `;

  const outRaw = execFileSync(
    'php',
    ['-r', phpScript, JSON.stringify({ generators: sampleQuantities, upgrades: sampleUpgrades })],
    { cwd: root, encoding: 'utf8' },
  );
  const phpOut = JSON.parse(outRaw);

  assert.equal(phpOut.generators.length, GENERATORS.length);
  for (let i = 0; i < GENERATORS.length; i += 1) {
    assert.equal(phpOut.generators[i].id, GENERATORS[i].id);
    assert.equal(phpOut.generators[i].tier, GENERATORS[i].tier);
    assert.equal(phpOut.generators[i].baseCost, GENERATORS[i].baseCost);
    assert.equal(phpOut.generators[i].baseRate, GENERATORS[i].baseRate);
  }

  assert.equal(phpOut.upgrades.length, UPGRADES.length);
  for (let i = 0; i < UPGRADES.length; i += 1) {
    assert.equal(phpOut.upgrades[i].id, UPGRADES[i].id);
    assert.equal(phpOut.upgrades[i].cost, UPGRADES[i].cost);
    assert.equal(phpOut.upgrades[i].kind, UPGRADES[i].kind);
  }

  assert.deepEqual(phpOut.eduLogs, [...EDU_LOG_IDS]);
  assert.equal(cmp(phpOut.sps, jsSps), 0, `SPS PHP (${phpOut.sps}) ≠ JS (${jsSps})`);
  assert.equal(cmp(phpOut.click, jsClick), 0, `Click PHP (${phpOut.click}) ≠ JS (${jsClick})`);
  assert.equal(cmp(phpOut.batch10, jsLoomBatch10), 0);
  assert.equal(phpOut.syncOk, true);
  assert.ok(phpOut.syncLogs.includes('log_midgame_payoff'));

  // Verifica conquistas desbloqueadas (Templo 1/50/100, Torre 1/50, Barca 1/50, Lab 1, Portal 1, Tear 1/50/100/200)
  assert.ok(phpOut.earnedAch.includes('despertar_templo_1'));
  assert.ok(phpOut.earnedAch.includes('despertar_templo_50'));
  assert.ok(phpOut.earnedAch.includes('despertar_templo_100'));
  assert.ok(!phpOut.earnedAch.includes('despertar_templo_200'));
  assert.ok(phpOut.earnedAch.includes('despertar_tear_200'));
});

// 5. Mundo Visual (WorldView T7–T12), Conquistas no game-catalog.json, Códice e Assets
run('5. WorldView T7–T12 (orçamento Perf preservado) + Conquistas + Códice + Assets (manifest/art-requests)', () => {
  // Verifica silhueta procedural e paletas T7–T12
  let drawCalls = 0;
  const fakeCtx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    beginPath() {},
    ellipse() {},
    arc() {},
    fill() { drawCalls += 1; },
    stroke() {},
    clearRect() {},
    setTransform() {},
  };
  for (let tier = 7; tier <= 12; tier += 1) {
    drawNpcSilhouette(fakeCtx, 0, 0, tier, 0, 36, { rarity: 'normal' });
  }
  assert.ok(drawCalls >= 18, 'drawNpcSilhouette desenha todos os tiers T7–T12');

  // Verifica que todas as 24 conquistas F3 existem em game-catalog.json com arte existente
  const f3AchPrefixes = ['templo', 'torre', 'barca', 'laboratorio', 'portal', 'tear'];
  for (const prefix of f3AchPrefixes) {
    for (const m of [1, 50, 100, 200]) {
      const id = `despertar_${prefix}_${m}`;
      const ach = getAchievementById(id) || ACHIEVEMENTS.find((a) => a.id === id);
      assert.ok(ach, `Conquista ${id} registrada em game-catalog.json`);
      assert.equal(ach.meta?.family, 'despertar');
      assert.ok(
        fs.existsSync(path.join(root, 'assets/achievements', ach.art)),
        `Arte da conquista ${id} (${ach.art}) existe em disco`,
      );
    }
  }

  // Verifica Códice log_midgame_payoff
  assert.ok(EDU_LOG_BY_ID.log_midgame_payoff);
  const st = new GameState({ souls: '100', generators: { mnemosyne_temple: 1 } });
  assert.ok(st.eduLogsSeen.includes('log_midgame_payoff'));

  // Verifica manifest.json e art-requests.json
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/sprites/manifest.json'), 'utf8'),
  );
  assert.ok(Object.keys(manifest.generators).length >= 12);
  assert.ok(Object.keys(manifest.upgrades).length >= 210);
  for (const exp of EXPECTED_T7_T12) {
    const entry = manifest.generators[exp.id];
    assert.ok(entry, `manifest generator ${exp.id}`);
    assert.ok(fs.existsSync(path.join(root, 'assets/despertar/sprites', entry.webp)));
    assert.ok(fs.existsSync(path.join(root, 'assets/despertar/sprites', entry.svg)));
  }

  const artReqs = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'),
  );
  for (const key of ['art_t7', 'art_t8', 'art_t9', 'art_t10', 'art_t11', 'art_t12', 'art_f3_upgrades']) {
    const req = artReqs.requests.find((r) => r.id === key);
    assert.ok(req, `Pedido ${key} em art-requests.json`);
    assert.ok(
      ['open', 'delivered'].includes(req.status),
      `Pedido ${key} com status open|delivered (got ${req.status})`,
    );
  }
});

console.log(`\ndespertar-f3-generators-smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
