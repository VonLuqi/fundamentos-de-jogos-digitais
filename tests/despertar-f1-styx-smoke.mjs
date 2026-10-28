/**
 * Smoke Fase F1 — Styx: 15 tiers por gerador + Sinergias Vol. I/II + Mil Foices + Paridade JS ≡ PHP
 * (docs/plano-paridade-cookieclicker-producao.md · docs/paridade-cookieclicker-despertar.md).
 *
 * Uso: node tests/despertar-f1-styx-smoke.mjs
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { UPGRADES, UPGRADE_BY_ID } from '../js/hades-despertar/config/upgrades.js';
import { EDU_LOG_BY_ID, EDU_LOG_IDS, eduLogTip } from '../js/hades-despertar/config/edu-logs.js';
import { cmp, money } from '../js/hades-despertar/core/decimal.js';
import {
  calculateTotalSPS,
  clickPower,
  effectiveUnitSPS,
  generatorUpgradeMult,
  meetsUpgradeRequirement,
  nonShadeBonus,
  nonShadeGeneratorsCount,
  synergyUpgradeMult,
  thousandBladesBonusPerUnit,
  unknownCatalogIds,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  describeGeneratorCard,
  describeUpgradeCard,
  upgradeBlurb,
  upgradeRequirementText,
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
    console.error(error);
    failed += 1;
  }
}

function eqMoney(actual, expected, message) {
  assert.equal(cmp(actual, expected), 0, message || `${actual} ≠ ${expected}`);
}

const EXPECTED_MILESTONES = [1, 5, 10, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300];

run('1. Densificação Styx: 15 tiers por gerador (T1–T6) com custos crescentes e blurbs', () => {
  assert.ok(GENERATORS.length >= 6);
  assert.ok(UPGRADES.length >= 112, 'ao menos 112 juramentos no catálogo');

  for (const gen of GENERATORS.slice(0, 6)) {
    const tiers = UPGRADES.filter(
      (u) => u.kind === 'generatorMult' && u.generatorId === gen.id,
    );
    assert.equal(tiers.length, 15, `${gen.id} deve ter exatamente 15 tiers`);
    const quantities = tiers.map((u) => u.requires?.quantity);
    assert.deepEqual(quantities, EXPECTED_MILESTONES, `marcos de ${gen.id}`);

    for (let i = 0; i < tiers.length; i += 1) {
      const u = tiers[i];
      assert.ok(typeof u.name === 'string' && u.name.length > 2, `nome válido em ${u.id}`);
      assert.ok(typeof u.blurb === 'string' && u.blurb.length > 10, `blurb temático em ${u.id}`);
      if (i > 0) {
        assert.ok(
          cmp(u.cost, tiers[i - 1].cost) > 0,
          `custo crescente em ${gen.id}: ${u.id} (${u.cost}) > ${tiers[i - 1].id} (${tiers[i - 1].cost})`,
        );
      }
      // Novos marcos intermediários (5, 75, 125, 175, 225, 250, 275, 300) são ×2
      if ([5, 75, 125, 175, 225, 250, 275, 300].includes(u.requires.quantity)) {
        assert.equal(u.factor, '2', `${u.id} deve ter fator ×2`);
      }
    }
  }
});

run('2. Sinergias Vol. I e Vol. II: requisitos (15/75) e matemática +5% / +0.1%', () => {
  const sy1 = UPGRADE_BY_ID.almanaques_do_destino_i;
  const sy2 = UPGRADE_BY_ID.oracao_da_chuva_ii;
  const br1 = UPGRADE_BY_ID.eletronica_quantica_i;
  const br2 = UPGRADE_BY_ID.prensas_de_obolo_ii;

  assert.ok(sy1 && sy2 && br1 && br2, 'sinergias canónicas presentes');
  assert.equal(sy1.kind, 'synergyMult');
  assert.equal(sy2.kind, 'synergyMult');

  // Unlock Vol. I exige talento + >= 15 de ambos
  assert.equal(
    meetsUpgradeRequirement(sy1, {
      generators: { cerberian_hound: 15, chronos_loom: 14 },
      talents: ['sinergias_vol_i'],
    }),
    false,
  );
  assert.equal(
    meetsUpgradeRequirement(sy1, {
      generators: { cerberian_hound: 15, chronos_loom: 15 },
      talents: ['sinergias_vol_i'],
    }),
    true,
  );
  assert.equal(
    meetsUpgradeRequirement(sy1, {
      generators: { cerberian_hound: 15, chronos_loom: 15 },
      talents: [],
    }),
    false,
    'Vol. I exige talento sinergias_vol_i',
  );

  // Unlock Vol. II exige talento Vol. II + >= 75
  assert.equal(
    meetsUpgradeRequirement(sy2, {
      generators: { cerberian_hound: 75, mnemosyne_temple: 75 },
      talents: ['sinergias_vol_i'],
    }),
    false,
    'Vol. II exige sinergias_vol_ii',
  );
  assert.equal(
    meetsUpgradeRequirement(sy2, {
      generators: { cerberian_hound: 75, mnemosyne_temple: 75 },
      talents: ['sinergias_vol_i', 'sinergias_vol_ii'],
    }),
    true,
  );

  // Almanaques Vol. I: 20 Tears (base) e 10 Cães (boosted)
  // Boosted (Cão) +5%/Tear: 1 + 0.05 * 20 = 2.0
  // Base (Tear) +0.1%/Cão: 1 + 0.001 * 10 = 1.01
  const gens = { chronos_loom: 20, cerberian_hound: 10 };
  eqMoney(
    synergyUpgradeMult('cerberian_hound', ['almanaques_do_destino_i'], gens),
    '2',
  );
  assert.equal(
    synergyUpgradeMult('chronos_loom', ['almanaques_do_destino_i'], gens),
    '1.01',
  );

  // Duas sinergias que boostam o Cão empilhadas (100 Tears + 100 Templos):
  // Cão: (1 + 0.05*100) * (1 + 0.05*100) = 6 * 6 = 36
  const gens100 = { chronos_loom: 100, mnemosyne_temple: 100, cerberian_hound: 100 };
  const bothSynergies = ['almanaques_do_destino_i', 'oracao_da_chuva_ii'];
  eqMoney(synergyUpgradeMult('cerberian_hound', bothSynergies, gens100), '36');

  // Eletrônica Quântica Vol. I: 20 Condensadores (base) e 10 Forjas (boosted)
  const forgeVoid = { void_condenser: 20, phlegethon_forge: 10 };
  eqMoney(synergyUpgradeMult('phlegethon_forge', ['eletronica_quantica_i'], forgeVoid), '2');
  assert.equal(synergyUpgradeMult('void_condenser', ['eletronica_quantica_i'], forgeVoid), '1.01');
  assert.ok(br2 && br2.requires?.talentId === 'sinergias_vol_ii');
});

run('3. Mil Foices (Thousand Fingers): bônus linear não-Sombra em clique e Sombra Vagante', () => {
  const gens = {
    wandering_shade: 50,
    charon_servants: 10,
    cerberian_hound: 5,
    tartarus_judge: 5,
  };
  // Total não-Sombra = 10 + 5 + 5 = 20
  assert.equal(nonShadeGeneratorsCount(gens), 20);
  assert.equal(thousandBladesBonusPerUnit([], gens), '0');

  // mil_foices: +0.1 * 20 = +2 por unidade de Sombra e no clique
  assert.equal(thousandBladesBonusPerUnit(['mil_foices'], gens), '2');
  assert.equal(nonShadeBonus(['mil_foices'], gens), '2');

  // milhao_de_foices (×5): 2 * 5 = 10
  assert.equal(
    thousandBladesBonusPerUnit(['mil_foices', 'milhao_de_foices'], gens),
    '10',
  );

  // bilhao_de_foices (×10): 10 * 10 = 100
  assert.equal(
    thousandBladesBonusPerUnit(
      ['mil_foices', 'milhao_de_foices', 'bilhao_de_foices'],
      gens,
    ),
    '100',
  );

  // trilhao_de_foices (×20): 100 * 20 = 2000
  assert.equal(
    thousandBladesBonusPerUnit(
      ['mil_foices', 'milhao_de_foices', 'bilhao_de_foices', 'trilhao_de_foices'],
      gens,
    ),
    '2000',
  );

  // Escada completa wiki (8× ×20 após o trilhão): 2000 × 20^8 = 5.12e13
  const fullLadder = [
    'mil_foices',
    'milhao_de_foices',
    'bilhao_de_foices',
    'trilhao_de_foices',
    'quadrilhao_de_foices',
    'quintilhao_de_foices',
    'sextilhao_de_foices',
    'septilhao_de_foices',
    'octilhao_de_foices',
    'nonilhao_de_foices',
    'decilhao_de_foices',
    'undecilhao_de_foices',
  ];
  assert.equal(thousandBladesBonusPerUnit(fullLadder, gens), '51200000000000');

  // Gate trilhao: qty 150 (wiki), não 200
  assert.equal(UPGRADE_BY_ID.trilhao_de_foices.requires.quantity, 150);
  assert.equal(UPGRADE_BY_ID.undecilhao_de_foices.requires.quantity, 550);

  // Coexistência aditiva no clickPower com eco_da_foice (clickKSps = 0.01) e foice_afilada (×2):
  // flatPart = 1 * 2 = 2
  // bladesPart = 2 (mil_foices com 20 não-Sombras)
  // spsPart = 0.01 * 1000 = 10
  // total clickPower = 2 + 2 + 10 = 14
  const cp = clickPower({
    generators: gens,
    upgrades: ['foice_afilada', 'mil_foices', 'eco_da_foice'],
    sps: '1000',
  });
  eqMoney(cp, '14');

  // Impacto no SPS de wandering_shade:
  // 25 Sombras (0.1 base) + 10 Servos (1.0 base)
  // Sem mil_foices: 25 * 0.1 + 10 * 1.0 = 2.5 + 10 = 12.5
  // Com mil_foices (10 não-Sombras → +1.0 por Sombra):
  // Cada Sombra rende 0.1 + 1.0 = 1.1 → 25 * 1.1 + 10 * 1.0 = 27.5 + 10 = 37.5
  const gSimple = { wandering_shade: 25, charon_servants: 10 };
  eqMoney(calculateTotalSPS({ generators: gSimple, upgrades: [] }), '12.5');
  eqMoney(calculateTotalSPS({ generators: gSimple, upgrades: ['mil_foices'] }), '37.5');
  eqMoney(
    effectiveUnitSPS({
      generatorId: 'wandering_shade',
      generators: gSimple,
      upgrades: ['mil_foices'],
    }),
    '1.1',
  );
});

run('4. Rejeição de IDs desconhecidos e requisitos não atendidos + UI blurbs/requirements', () => {
  assert.deepEqual(
    unknownCatalogIds({
      generators: { wandering_shade: 1, fake_gen: 2 },
      upgrades: ['foice_afilada', 'fake_upgrade_xyz'],
      talents: ['legado', 'fake_talent_xyz'],
    }),
    ['fake_gen', 'fake_upgrade_xyz', 'fake_talent_xyz'],
  );

  const state = new GameState({
    souls: '1e20',
    generators: { cerberian_hound: 14, chronos_loom: 15 },
    talents: ['sinergias_vol_i'],
  });
  // Falta 1 Cão para Almanaques do Destino Vol. I
  assert.equal(state.buyUpgrade('almanaques_do_destino_i').ok, false);
  assert.equal(state.buyUpgrade('upgrade_inexistente_f1').ok, false);

  state.buyGenerator('cerberian_hound', '1');
  assert.equal(state.quantities().cerberian_hound, 15);
  const card = describeUpgradeCard(state, 'almanaques_do_destino_i');
  assert.equal(card.revealed, true);
  assert.equal(card.canBuy, true);
  assert.match(card.blurb, /\+5% SPS/);
  assert.match(card.blurb, /\+0\.1% SPS/);
  assert.match(card.requirement, /15×/);

  assert.equal(state.buyUpgrade('almanaques_do_destino_i').ok, true);
  assert.ok(state.eduLogsSeen.includes('log_synergy_blades'), 'compra de sinergia desbloqueia log_synergy_blades');

  const houndCard = describeGeneratorCard(state, 'cerberian_hound', '1');
  const loomCard = describeGeneratorCard(state, 'chronos_loom', '1');
  assert.ok(houndCard && loomCard);
  // 15 Tears -> Cães ganham +75% (unit * 1.75)
  assert.ok(cmp(houndCard.unitRate, '0') > 0);

  assert.match(upgradeBlurb(UPGRADE_BY_ID.mil_foices), /gerador não-Sombra/);
  assert.match(upgradeRequirementText(UPGRADE_BY_ID.milhao_de_foices), /Mil Foices/);
});

run('5. Assets (manifest.json + art-requests.json) e Códice (log_synergy_blades)', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/sprites/manifest.json'), 'utf8'),
  );
  const artReq = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'),
  );

  for (const u of UPGRADES) {
    assert.ok(manifest.upgrades?.[u.id], `manifest.json contém upgrade ${u.id}`);
  }
  const b8 = artReq.requests.find((r) => r.id === 'art_upgrades');
  assert.ok(b8, 'pedido art_upgrades presente');
  assert.ok(['open', 'delivered'].includes(b8.status), `art_upgrades status válido (got ${b8.status})`);
  assert.equal(
    Array.isArray(b8.f1UpgradeIds) && b8.f1UpgradeIds.length === 64,
    true,
    '64 IDs F1 (incl. escada Mil Foices 12 elos) em art-requests.json',
  );
  assert.ok(b8.f1UpgradeIds.includes('undecilhao_de_foices'));
  const tfArt = artReq.requests.find((r) => r.id === 'art_mil_foices_ladder');
  assert.ok(tfArt && tfArt.status === 'delivered' && tfArt.upgradeIds?.length === 12);

  assert.ok(EDU_LOG_IDS.includes('log_synergy_blades'));
  assert.ok(EDU_LOG_BY_ID.log_synergy_blades?.title.includes('Sinergias'));
  assert.ok(eduLogTip('log_synergy_blades').length > 0);
});

run('6. Paridade Estrita JS ≡ PHP (Catálogo, Sinergias, Mil Foices, Validação e Códice)', () => {
  const phpCheck = spawnSync('php', ['-v'], { encoding: 'utf8' });
  if (phpCheck.status !== 0) {
    console.log('[SKIP] PHP CLI indisponível neste ambiente.');
    return;
  }

  const jsCatalogPayload = UPGRADES.map((u) => ({
    id: u.id,
    cost: u.cost,
    kind: u.kind,
    factor: u.factor ?? null,
    generatorId: u.generatorId ?? null,
    baseGeneratorId: u.baseGeneratorId ?? null,
    boostedGeneratorId: u.boostedGeneratorId ?? null,
    baseBonusPerBoosted: u.baseBonusPerBoosted ?? null,
    boostedBonusPerBase: u.boostedBonusPerBase ?? null,
    requires: u.requires ?? {},
  }));

  const scenario = {
    generators: {
      wandering_shade: 100,
      charon_servants: 80,
      cerberian_hound: 100,
      chronos_loom: 100,
      mnemosyne_temple: 100,
      tartarus_judge: 20,
      phlegethon_forge: 75,
      void_condenser: 75,
      obsidian_throne: 75,
    },
    upgrades: [
      'foice_afilada',
      'eco_da_foice',
      'mil_foices',
      'milhao_de_foices',
      'bilhao_de_foices',
      'umbras_despertas',
      'sussurro_dos_juncos',
      'moeda_no_barquinho',
      'remos_de_cipreste',
      'almanaques_do_destino_i',
      'oracao_da_chuva_ii',
      'eletronica_quantica_i',
      'prensas_de_obolo_ii',
      'coroacao_imperador',
    ],
    talents: ['foice_ancestral', 'juramento_eterno', 'sinergias_vol_i', 'sinergias_vol_ii'],
    obols: '12',
    verdictPurchases: ['selo_do_juiz', 'olho_do_tartarus'],
    shinyCounts: { wandering_shade: 2, obsidian_throne: 1 },
    goldCounts: { charon_servants: 3 },
  };

  const jsTotalSps = money(calculateTotalSPS(scenario));
  const jsClickPower = money(clickPower(scenario));
  const jsBladesBonus = money(thousandBladesBonusPerUnit(scenario.upgrades, scenario.generators));
  const jsShadeMult = money(generatorUpgradeMult('wandering_shade', scenario.upgrades, scenario.generators));
  const jsServantMult = money(generatorUpgradeMult('charon_servants', scenario.upgrades, scenario.generators));
  const jsForgeMult = money(generatorUpgradeMult('phlegethon_forge', scenario.upgrades, scenario.generators));
  const jsThroneMult = money(generatorUpgradeMult('obsidian_throne', scenario.upgrades, scenario.generators));

  const phpScript = `
    if (!defined('STDERR')) { define('STDERR', fopen('php://stderr', 'w')); }
    require ${JSON.stringify(path.join(root, 'backend/bootstrap.php'))};
    use App\\Services\\Despertar\\DespertarCatalog;
    use App\\Services\\Despertar\\DespertarDecimal;
    use App\\Services\\Despertar\\DespertarFormulas;

    $jsUpgrades = json_decode(${JSON.stringify(JSON.stringify(jsCatalogPayload))}, true);
    $phpUpgrades = DespertarCatalog::UPGRADES;

    if (count($jsUpgrades) !== count($phpUpgrades)) {
      fwrite(STDERR, "Contagem de upgrades diverge: JS=" . count($jsUpgrades) . " PHP=" . count($phpUpgrades) . "\\n");
      exit(1);
    }

    foreach ($jsUpgrades as $idx => $ju) {
      $pu = $phpUpgrades[$idx];
      if ($ju['id'] !== $pu['id'] || $ju['cost'] !== $pu['cost'] || $ju['kind'] !== $pu['kind']) {
        fwrite(STDERR, "Divergencia no indice {$idx}: JS={$ju['id']} PHP={$pu['id']}\\n");
        exit(1);
      }
      if (($ju['factor'] ?? null) !== ($pu['factor'] ?? null)) {
        fwrite(STDERR, "Fator diverge em {$ju['id']}\\n");
        exit(1);
      }
      if (($ju['generatorId'] ?? null) !== ($pu['generatorId'] ?? null)) {
        fwrite(STDERR, "generatorId diverge em {$ju['id']}\\n");
        exit(1);
      }
      if (($ju['baseGeneratorId'] ?? null) !== ($pu['baseGeneratorId'] ?? null)
          || ($ju['boostedGeneratorId'] ?? null) !== ($pu['boostedGeneratorId'] ?? null)) {
        fwrite(STDERR, "Par de sinergia diverge em {$ju['id']}\\n");
        exit(1);
      }
      if (json_encode($ju['requires']) !== json_encode($pu['requires'])) {
        fwrite(STDERR, "requires diverge em {$ju['id']}: JS=" . json_encode($ju['requires']) . " PHP=" . json_encode($pu['requires']) . "\\n");
        exit(1);
      }
    }

    $sc = json_decode(${JSON.stringify(JSON.stringify(scenario))}, true);
    $out = [
      'totalSps' => DespertarDecimal::money(DespertarFormulas::calculateTotalSPS($sc)),
      'clickPower' => DespertarDecimal::money(DespertarFormulas::clickPower($sc)),
      'bladesBonus' => DespertarDecimal::money(DespertarFormulas::thousandBladesBonusPerUnit($sc['upgrades'], $sc['generators'])),
      'shadeMult' => DespertarDecimal::money(DespertarFormulas::generatorUpgradeMult('wandering_shade', $sc['upgrades'], $sc['generators'])),
      'servantMult' => DespertarDecimal::money(DespertarFormulas::generatorUpgradeMult('charon_servants', $sc['upgrades'], $sc['generators'])),
      'forgeMult' => DespertarDecimal::money(DespertarFormulas::generatorUpgradeMult('phlegethon_forge', $sc['upgrades'], $sc['generators'])),
      'throneMult' => DespertarDecimal::money(DespertarFormulas::generatorUpgradeMult('obsidian_throne', $sc['upgrades'], $sc['generators'])),
      'reqFail' => DespertarFormulas::meetsUpgradeRequirement('almanaques_do_destino_i', ['generators' => ['cerberian_hound' => 15, 'chronos_loom' => 14], 'talents' => ['sinergias_vol_i']]),
      'reqPass' => DespertarFormulas::meetsUpgradeRequirement('almanaques_do_destino_i', ['generators' => ['cerberian_hound' => 15, 'chronos_loom' => 15], 'talents' => ['sinergias_vol_i']]),
      'unknown' => DespertarFormulas::unknownCatalogIds(['bad_gen' => 1], ['bad_up'], ['bad_tal']),
      'eduLogs' => DespertarFormulas::computeEligibleEduLogs([
        'lifetimeSouls' => '1000',
        'souls' => '1000',
        'runSouls' => '1000',
        'generators' => ['cerberian_hound' => 15, 'chronos_loom' => 15],
        'upgrades' => ['almanaques_do_destino_i'],
        'talents' => ['sinergias_vol_i'],
      ], true),
    ];
    echo json_encode($out);
  `;

  const res = spawnSync('php', [], { input: `<?php\n${phpScript}`, encoding: 'utf8' });
  assert.equal(res.status, 0, `PHP falhou:\n${res.stdout}\n${res.stderr}\n${res.error || ''}`);
  const phpOut = JSON.parse(res.stdout);

  assert.equal(phpOut.totalSps, jsTotalSps, `SPS total JS (${jsTotalSps}) === PHP (${phpOut.totalSps})`);
  assert.equal(phpOut.clickPower, jsClickPower, `clickPower JS (${jsClickPower}) === PHP (${phpOut.clickPower})`);
  assert.equal(phpOut.bladesBonus, jsBladesBonus, `bladesBonus JS === PHP`);
  assert.equal(phpOut.shadeMult, jsShadeMult, `shadeMult JS === PHP`);
  assert.equal(phpOut.servantMult, jsServantMult, `servantMult JS === PHP`);
  assert.equal(phpOut.forgeMult, jsForgeMult, `forgeMult JS === PHP`);
  assert.equal(phpOut.throneMult, jsThroneMult, `throneMult JS === PHP`);
  assert.equal(phpOut.reqFail, false);
  assert.equal(phpOut.reqPass, true);
  assert.deepEqual(phpOut.unknown, ['bad_gen', 'bad_up', 'bad_tal']);
  assert.ok(phpOut.eduLogs.includes('log_synergy_blades'), 'PHP desbloqueia log_synergy_blades');
});

console.log(`\ndespertar-f1-styx-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
