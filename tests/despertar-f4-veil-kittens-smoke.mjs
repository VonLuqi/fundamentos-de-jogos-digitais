/**
 * Smoke Fase F4 — Véu do Acheron (Milk +4%/conquista normal, Shadow +0%),
 * Linhagem Filhotes do Cérbero (Kitten Upgrades ∏(1 + veil × factor)),
 * Invalidação de cache de SPS, Anti-Cheat no Sync PHP, UI do Véu, Estela, Códice e Assets.
 *
 * Uso: node tests/despertar-f4-veil-kittens-smoke.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ALL_NORMAL_ACHIEVEMENT_IDS,
  CERBERUS_PUP_UPGRADE_IDS,
  DESPERTAR_ACHIEVEMENT_IDS,
  DESPERTAR_NORMAL_ACHIEVEMENT_IDS,
  DESPERTAR_SHADOW_ACHIEVEMENT_IDS,
  VEIL_TIERS,
  isNormalAchievementId,
  isShadowAchievementId,
  veilTierForPercent,
} from '../js/hades-despertar/config/achievements.js';
import { EDU_LOG_BY_ID } from '../js/hades-despertar/config/edu-logs.js';
import { getUpgrade, UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import {
  calculateTotalSPS,
  cerberusPupMult,
  countNormalAchievements,
  generatorUpgradeMult,
  meetsUpgradeRequirement,
  servantTalentMult,
  upgradeEffectiveCost,
  veilFraction,
  veilPercent,
} from '../js/hades-despertar/core/formulas.js';
import { mul } from '../js/hades-despertar/core/decimal.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  describeUpgradeCard,
  describeVeilSummary,
  upgradeBlurb,
  upgradeRequirementText,
} from '../js/hades-despertar/ui/UIRenderer.js';
import { applyVeilElementStyle } from '../js/hades-despertar/ui/world/AltarOrbit.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;

const PUP_LADDER_MIN_VEIL = Object.freeze([
  52, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400,
]);

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

run('0. Catálogo F4/Kittens: 15 Filhotes, ≥350 normais, ≥11 sabores de Véu', () => {
  assert.equal(CERBERUS_PUP_UPGRADE_IDS.length, 15);
  assert.ok(VEIL_TIERS.length >= 11, `VEIL_TIERS=${VEIL_TIERS.length}`);
  assert.ok(ALL_NORMAL_ACHIEVEMENT_IDS.length >= 350, `normais=${ALL_NORMAL_ACHIEVEMENT_IDS.length}`);
  assert.equal(CERBERUS_PUP_UPGRADE_IDS.length, PUP_LADDER_MIN_VEIL.length);
  for (let i = 0; i < CERBERUS_PUP_UPGRADE_IDS.length; i += 1) {
    const up = getUpgrade(CERBERUS_PUP_UPGRADE_IDS[i]);
    assert.equal(up?.kind, 'veilMult', CERBERUS_PUP_UPGRADE_IDS[i]);
    assert.equal(up?.requires?.minVeilPercent, PUP_LADDER_MIN_VEIL[i]);
  }
  const fortune103 = getUpgrade('fortune_103');
  assert.equal(fortune103?.kind, 'veilMult');
  assert.equal(fortune103?.factor, '0.05');
});

// 1. Cálculo exato de veilFraction (+4% por conquista normal; exclusão de Shadow e desconhecidas; inclusão de plataforma)
run('1. Matemática do Véu: +4% (0.04) por conquista normal, exclusão de Shadow (+0%) e suporte a conquistas de plataforma', () => {
  assert.ok(DESPERTAR_ACHIEVEMENT_IDS.length >= 300, 'Catálogo expandido de conquistas despertar_*');
  assert.ok(DESPERTAR_SHADOW_ACHIEVEMENT_IDS.length >= 2, 'Ao menos 2 conquistas Shadow registradas');

  for (const shId of DESPERTAR_SHADOW_ACHIEVEMENT_IDS) {
    assert.equal(isShadowAchievementId(shId), true, `${shId} deve ser Shadow`);
    assert.equal(isNormalAchievementId(shId), false, `${shId} não deve contar como normal`);
  }

  // Conquista de plataforma + conquistas do Despertar contam +4% cada; Shadow e inválidas somam 0%
  const sampleIds = [
    'aula1_concluida',
    'despertar_primeira_alma',
    'despertar_primeira_sombra',
    'despertar_sombra_sorte_pura', // Shadow -> ignorada
    'despertar_sombra_vigilia_eterna', // Shadow -> ignorada
    'id_falso_inexistente', // Inválida -> ignorada
    'aula1_concluida', // Duplicada -> contada 1x
  ];
  assert.equal(countNormalAchievements(sampleIds), 3);
  assert.equal(cmp(veilFraction(sampleIds), '0.12'), 0);
  assert.equal(veilPercent(sampleIds), 12);

  // 25 conquistas normais = 100% Véu (1.0); 50 conquistas normais = 200% Véu (2.0)
  const fiftyNormals = ALL_NORMAL_ACHIEVEMENT_IDS.slice(0, 50);
  assert.equal(fiftyNormals.length, 50);
  assert.equal(veilPercent(fiftyNormals), 200);
  assert.equal(cmp(veilFraction(fiftyNormals), '2'), 0);
});

// 2. Produtório Composto ∏(1 + veilFraction × factor_i) em JS e PHP (200% Véu + 0.1 + 0.15 = ×1.56)
run('2. Produtório Composto Filhotes do Cérbero: 200% Véu + fatores 0.1 e 0.15 = ×1.56 (JS ≡ PHP)', () => {
  const fiftyNormals = ALL_NORMAL_ACHIEVEMENT_IDS.slice(0, 50);
  const withShadows = [...fiftyNormals, ...DESPERTAR_SHADOW_ACHIEVEMENT_IDS];

  // (1 + 2.0 * 0.1) * (1 + 2.0 * 0.15) = 1.2 * 1.3 = 1.56
  const twoPups = ['filhote_vigia_estige', 'filhote_forjador_phlegethon'];
  const jsMult = cerberusPupMult(twoPups, withShadows);
  assert.equal(cmp(jsMult, '1.56'), 0, `Esperado 1.56, obtido ${jsMult}`);

  // Kitten angels — fator heavenly extra (0.1 × Véu) no produtório
  const withKittenAngels = cerberusPupMult(twoPups, withShadows, null, null, ['kitten_angels']);
  assert.equal(cmp(withKittenAngels, mul(jsMult, '1.2')), 0, 'kitten_angels ×(1 + 0.1×Véu)');

  // kitten_wages — desconto 10% só em veilMult
  const pupDef = getUpgrade('filhote_vigia_estige');
  const genDef = getUpgrade('umbras_despertas');
  assert.ok(pupDef && genDef);
  const basePupCost = upgradeEffectiveCost(pupDef, { talents: ['kitten_wages'] });
  const baseGenCost = upgradeEffectiveCost(genDef, { talents: ['kitten_wages'] });
  assert.equal(cmp(basePupCost, mul(pupDef.cost, '0.9')), 0, 'kitten_wages em Filhote');
  assert.equal(cmp(baseGenCost, genDef.cost), 0, 'kitten_wages não afeta generatorMult');

  // Cat Ladies / Milkhelp → Servos de Caronte via generatorUpgradeMult
  const fiftyAch = fiftyNormals;
  const catServ = servantTalentMult(twoPups, ['cat_ladies', 'kitten_angels'], fiftyAch);
  assert.equal(cmp(catServ, mul(mul('1.29', '1.29'), '1.29')), 0, 'Cat Ladies: 3×1.29 (2 pups + kitten angels)');
  const milkServ = servantTalentMult(twoPups, ['comprimidos_milkhelp'], fiftyAch);
  assert.equal(cmp(milkServ, '1.1'), 0, 'Milkhelp +2 ranks Véu @200%');
  const charonMult = generatorUpgradeMult(
    'charon_servants',
    twoPups,
    { charon_servants: 10 },
    ['cat_ladies', 'kitten_angels'],
    fiftyAch,
  );
  assert.equal(cmp(charonMult, catServ), 0, 'generatorUpgradeMult charon ≡ servantTalentMult');

  // Verifica no stack de calculateTotalSPS (100 Servos = 100 SPS base × 1.56 = 156 SPS)
  const spsWithTwoPups = calculateTotalSPS({
    generators: { charon_servants: 100 },
    upgrades: twoPups,
    achievements: withShadows,
  });
  assert.equal(cmp(spsWithTwoPups, '156'), 0);
});

// 3. Desbloqueio por minVeilPercent e Invalidação Imediata do Cache de SPS (Fase Perf)
run('3. Requisitos de Véu nos Filhotes do Cérbero e invalidação imediata do cache de SPS ao ganhar conquista', () => {
  for (let i = 0; i < CERBERUS_PUP_UPGRADE_IDS.length; i += 1) {
    const id = CERBERUS_PUP_UPGRADE_IDS[i];
    const minVeil = PUP_LADDER_MIN_VEIL[i];
    const up = getUpgrade(id);
    assert.ok(up, `${id} existe no catálogo`);
    assert.equal(up.kind, 'veilMult');
    assert.equal(up.requires?.minVeilPercent, minVeil);
    assert.equal(
      meetsUpgradeRequirement(up, { veilPercent: minVeil - 4 }),
      false,
      `${id} bloqueado abaixo de ${minVeil}%`,
    );
    assert.equal(
      meetsUpgradeRequirement(up, { veilPercent: minVeil }),
      true,
      `${id} liberado em ${minVeil}%`,
    );
  }

  // Testa GameState: compra bloqueada com 12 conquistas (48% < 52%), liberada ao desbloquear a 13ª (52%)
  const state = new GameState({
    souls: '100000000',
    lifetimeSouls: '100000000',
    generators: { charon_servants: 10 },
  });
  const baseEarned = [...state.achievements]; // conquistas naturais deste estado inicial
  const neededFor12 = ALL_NORMAL_ACHIEVEMENT_IDS
    .filter((id) => !baseEarned.includes(id))
    .slice(0, Math.max(0, 12 - baseEarned.length));
  const initial12 = [...baseEarned, ...neededFor12].slice(0, 12);
  state.setAchievements(initial12);
  assert.equal(state.veilPercent(), 48);
  assert.equal(state.buyUpgrade('filhote_vigia_estige').ok, false, 'Não pode comprar com 48% de Véu');

  // Desbloqueia a 13ª conquista -> Véu vai a 52% e compra é liberada
  const ach13 = ALL_NORMAL_ACHIEVEMENT_IDS.find((id) => !state.achievements.includes(id));
  const unlock13 = state.unlockAchievement(ach13);
  assert.equal(unlock13.ok, true);
  assert.equal(unlock13.added, true);
  assert.equal(state.veilPercent(), 52);

  const buyPup = state.buyUpgrade('filhote_vigia_estige');
  assert.equal(buyPup.ok, true, 'Compra Filhote Vigia com 52% de Véu');

  // Cache de SPS após compra do Filhote
  const spsBeforeNextAch = state.sps();
  const structVerBefore = state.structureVersion;

  // Ticks sem nova conquista NÃO invalidam o cache de SPS
  state.tick(1);
  assert.equal(state.structureVersion, structVerBefore, 'Tick sem nova conquista preserva structureVersion');

  // Desbloquear uma nova conquista normal invalida o cache IMEDIATAMENTE e aumenta o SPS
  const ach14 = ALL_NORMAL_ACHIEVEMENT_IDS.find((id) => !state.achievements.includes(id));
  state.unlockAchievement(ach14);
  assert.ok(state.structureVersion > structVerBefore, 'Nova conquista invalida cache imediatamente');
  assert.ok(cmp(state.sps(), spsBeforeNextAch) > 0, 'SPS sobe imediatamente com o novo Véu');

  // Desbloquear conquista Shadow NÃO altera o multiplicador de Véu
  const spsBeforeShadow = state.sps();
  state.unlockAchievement('despertar_sombra_sorte_pura');
  assert.equal(cmp(state.sps(), spsBeforeShadow), 0, 'Conquista Shadow não altera SPS');
});

// 4. Paridade Estrita JS ≡ PHP + Anti-Cheat no Sync PHP
run('4. Paridade JS ≡ PHP (veilFraction, cerberusPupMult, SPS) e Anti-Cheat no Sync PHP', () => {
  const fiftyNormals = ALL_NORMAL_ACHIEVEMENT_IDS.slice(0, 50);
  const withShadows = [...fiftyNormals, ...DESPERTAR_SHADOW_ACHIEVEMENT_IDS];
  const twoPups = ['filhote_vigia_estige', 'filhote_forjador_phlegethon'];

  const ctx = {
    generators: {
      wandering_shade: 50,
      charon_servants: 50,
      cerberian_hound: 20,
      obsidian_throne: 5,
    },
    upgrades: ['foice_afilada', 'umbras_despertas', ...twoPups],
    talents: ['juramento_eterno', 'kitten_angels'],
    obols: '10',
    verdictPurchases: ['olho_do_tartarus'],
    shinyCounts: {},
    goldCounts: {},
    activeBuffs: {},
    achievements: withShadows,
  };

  const jsVeilFrac = veilFraction(withShadows);
  const jsVeilPct = veilPercent(withShadows);
  const jsPupMult = cerberusPupMult(twoPups, withShadows, null, null, ctx.talents);
  const jsSps = calculateTotalSPS(ctx);

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
    $achs = $ctx['achievements'];
    $twoPups = ['filhote_vigia_estige', 'filhote_forjador_phlegethon'];

    $veilFrac = DespertarFormulas::veilFraction($achs);
    $veilPct = DespertarFormulas::veilPercent($achs);
    $pupMult = DespertarFormulas::cerberusPupMult($twoPups, $achs, null, [], $ctx['talents']);
    $sps = DespertarFormulas::calculateTotalSPS($ctx);

    $nowMs = 1700000000000;
    $dbRow = [
      'souls' => '500000000000000.00',
      'obols' => '10.00',
      'mnemosyne' => '10.00',
      'lifetime_souls' => '500000000000000.00',
      'run_souls' => '500000000000000.00',
      'prestige_count' => 5,
      'generators_state' => $ctx['generators'],
      'upgrades_state' => ['foice_afilada', 'umbras_despertas'],
      'talents_state' => $ctx['talents'],
      'verdict_purchases' => $ctx['verdictPurchases'],
      'edu_logs_seen' => [],
      'milestones' => [],
      'stats' => ['clicks' => 1200, 'max_buy_biggest' => 50, 'juizo_tie_wins' => 0, 'shimmers_clicked' => 30, 'wrath_clicked' => 1],
    ];

    // 1) Sync legítimo com 50 conquistas normais autorizadas e compra de filhote_vigia_estige + filhote_forjador_phlegethon (200% Véu)
    $syncLegit = DespertarService::validateSync($dbRow, [
      'souls' => '400000000000000.00',
      'runSouls' => '500000000000000.00',
      'lifetimeSouls' => '500000000000000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'eduLogsSeen' => ['log_veil_kittens'],
    ], $nowMs, $achs);

    // 2) Anti-cheat: tentar comprar cerbero_conselheiro_tartaro (exige 600% Véu) tendo apenas 200% Véu
    $syncLowVeil = DespertarService::validateSync($dbRow, [
      'souls' => '400000000000000.00',
      'generators' => $ctx['generators'],
      'upgrades' => ['foice_afilada', 'umbras_despertas', 'cerbero_conselheiro_tartaro'],
    ], $nowMs, $achs);

    // 3) Anti-cheat: enviar conquista falsa inexistente no payload
    $syncFakeAch = DespertarService::validateSync($dbRow, [
      'souls' => '400000000000000.00',
      'generators' => $ctx['generators'],
      'upgrades' => ['foice_afilada', 'umbras_despertas'],
      'achievements' => ['conquista_hacker_999'],
    ], $nowMs, []);

    // 4) Anti-cheat: conquista de volume impossível neste save (15 Filhotes sem compras)
    $syncUnearnedAch = DespertarService::validateSync($dbRow, [
      'souls' => '400000000000000.00',
      'generators' => $ctx['generators'],
      'upgrades' => ['foice_afilada', 'umbras_despertas'],
      'achievements' => ['despertar_filhotes_15'],
    ], $nowMs, []);

    $earnedAch = DespertarFormulas::evaluateDespertarAchievementIds($syncLegit['next'], [], true);

    echo json_encode([
      'veilFrac' => $veilFrac,
      'veilPct' => $veilPct,
      'pupMult' => $pupMult,
      'sps' => $sps,
      'syncLegitOk' => $syncLegit['ok'],
      'syncLegitVeilPct' => $syncLegit['state']['veilPercent'] ?? null,
      'syncLegitLogs' => $syncLegit['next']['eduLogsSeen'] ?? [],
      'syncLowVeilOk' => $syncLowVeil['ok'],
      'syncLowVeilUpgrades' => $syncLowVeil['next']['upgrades'] ?? [],
      'syncLowVeilCorr' => array_column($syncLowVeil['corrections'] ?? [], 'system'),
      'syncFakeAchOk' => $syncFakeAch['ok'],
      'syncFakeAchList' => $syncFakeAch['next']['achievements'] ?? [],
      'syncUnearnedAchOk' => $syncUnearnedAch['ok'],
      'syncUnearnedAchErr' => $syncUnearnedAch['error'] ?? '',
      'syncUnearnedAchList' => $syncUnearnedAch['next']['achievements'] ?? [],
      'earnedAch' => $earnedAch,
      'upCount' => count(DespertarCatalog::UPGRADES),
      'achCount' => count(DespertarCatalog::DESPERTAR_ACHIEVEMENT_IDS),
    ]);
  `;

  const outRaw = execFileSync('php', ['-r', phpScript, JSON.stringify(ctx)], {
    cwd: root,
    encoding: 'utf8',
  });
  const phpOut = JSON.parse(outRaw);

  assert.equal(phpOut.upCount, UPGRADES.length, 'Paridade de contagem de upgrades JS ≡ PHP');
  assert.equal(phpOut.achCount, DESPERTAR_ACHIEVEMENT_IDS.length, 'Paridade de contagem de conquistas JS ≡ PHP');
  assert.equal(cmp(phpOut.veilFrac, jsVeilFrac), 0, 'veilFraction JS ≡ PHP');
  assert.equal(phpOut.veilPct, jsVeilPct, 'veilPercent JS ≡ PHP');
  assert.equal(cmp(phpOut.pupMult, jsPupMult), 0, 'cerberusPupMult com kitten_angels JS ≡ PHP');
  assert.equal(cmp(phpOut.sps, jsSps), 0, `SPS JS (${jsSps}) ≡ PHP (${phpOut.sps})`);

  assert.equal(phpOut.syncLegitOk, true);
  assert.ok(phpOut.syncLegitVeilPct >= 200);
  assert.ok(phpOut.syncLegitLogs.includes('log_veil_kittens'));

  // Anti-cheat sem recusa: o sync segue e só o item ilegítimo fica de fora.
  assert.equal(phpOut.syncLowVeilOk, true);
  assert.ok(!phpOut.syncLowVeilUpgrades.includes('cerbero_conselheiro_tartaro'), 'filhote sem Véu retirado');
  assert.ok(phpOut.syncLowVeilUpgrades.includes('umbras_despertas'), 'resto das compras mantido');
  // Custa 9e25: o teto desfaz a compra (almas) antes do Véu; qualquer um dos dois serve.
  assert.ok(phpOut.syncLowVeilCorr.includes('veu') || phpOut.syncLowVeilCorr.includes('almas'), `correção registrada (${phpOut.syncLowVeilCorr})`);
  assert.equal(phpOut.syncFakeAchOk, true);
  assert.ok(!phpOut.syncFakeAchList.includes('conquista_hacker_999'), 'conquista falsa ignorada');
  assert.equal(phpOut.syncUnearnedAchOk, true, 'Sync aceita mas strip despertar_* não elegível');
  assert.ok(
    !(phpOut.syncUnearnedAchList || []).includes('despertar_filhotes_15'),
    'despertar_filhotes_15 não persiste sem 15 Filhotes',
  );

  // Conquistas F4 avaliadas no servidor
  for (const id of [
    'despertar_bilhao',
    'despertar_trilhao',
    'despertar_cliques_100',
    'despertar_cliques_1000',
    'despertar_eco_1',
    'despertar_eco_7',
    'despertar_eco_27',
    'despertar_eco_colerico',
    'despertar_sombra_50',
    'despertar_servos_50',
    'despertar_catabase_5',
    'despertar_filhote_primeiro',
  ]) {
    assert.ok(phpOut.earnedAch.includes(id), `PHP deve conceder ${id}`);
  }
});

// 5. UI do Véu (Sabores/Tiers + congelamento reduced-motion/fancy), Estela Auditável, Códice e Assets
run('5. UI do Véu (Sabores Ctonianos + reduced-motion), Estela Auditável, Códice e Assets', () => {
  assert.ok(VEIL_TIERS.length >= 11);
  assert.equal(veilTierForPercent(0).id, 'nevoa_cinzenta');
  assert.equal(veilTierForPercent(52).color, '#00a896');
  assert.equal(veilTierForPercent(100).color, '#7209b7');
  assert.equal(veilTierForPercent(200).color, '#d90429');
  assert.equal(veilTierForPercent(300).color, '#cfa759');
  assert.equal(veilTierForPercent(1400).id, 'veu_absoluto');

  const fiftyNormals = ALL_NORMAL_ACHIEVEMENT_IDS.slice(0, 50);
  const state = new GameState({
    souls: '1000000000000000',
    upgrades: ['filhote_vigia_estige', 'filhote_forjador_phlegethon'],
    achievements: fiftyNormals,
  });
  state.setAchievements(fiftyNormals);

  const summary = describeVeilSummary(state);
  assert.equal(summary.veilPercent, 200);
  assert.equal(summary.tier.name, 'Chama de Flegêton');
  assert.equal(cmp(summary.pupMult, '1.56'), 0);
  assert.match(summary.label, /Véu: 200% \(Chama de Flegêton\) · Filhotes 2\/15 · Mult Cerberiano: ×1\.56/);

  // Upgrade blurb e requirement text
  const pupDef = getUpgrade('filhote_vigia_estige');
  assert.match(upgradeBlurb(pupDef), /1 \+ \(Véu × 0\.1\)/);
  assert.equal(upgradeRequirementText(pupDef), 'Exige Véu 52%');
  const card = describeUpgradeCard(state, 'filhote_supervisor_tartaro'); // exige 300%
  assert.equal(card.canBuy, false);

  // Elemento visual #despertar-veil: aplica cor do sabor e congela ondas em reducedMotion / fancy:false
  const fakeVeilEl = {
    hidden: true,
    dataset: {},
    style: {
      props: {},
      setProperty(k, v) { this.props[k] = v; },
    },
    classList: {
      _set: new Set(),
      toggle(c, on) {
        if (on) this._set.add(c);
        else this._set.delete(c);
      },
      contains(c) { return this._set.has(c); },
    },
  };
  applyVeilElementStyle(fakeVeilEl, state, { reducedMotion: false, fancy: true, particles: true });
  assert.equal(fakeVeilEl.dataset.veilTier, 'chama_phlegethon');
  assert.equal(fakeVeilEl.style.props['--despertar-veil-accent'], '#d90429');
  assert.equal(fakeVeilEl.style.props['--despertar-veil-pct'], '200%');
  assert.equal(fakeVeilEl.classList.contains('is-milk'), true);
  assert.equal(fakeVeilEl.classList.contains('is-wave-frozen'), false);

  applyVeilElementStyle(fakeVeilEl, state, { reducedMotion: true, fancy: true, particles: true });
  assert.equal(fakeVeilEl.classList.contains('is-wave-frozen'), true, 'Congela ondas com reducedMotion');

  applyVeilElementStyle(fakeVeilEl, state, { reducedMotion: false, fancy: false, particles: true });
  assert.equal(fakeVeilEl.classList.contains('is-wave-frozen'), true, 'Congela ondas com fancy: false');

  // Códice e Assets
  assert.ok(EDU_LOG_BY_ID.log_veil_kittens);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/sprites/manifest.json'), 'utf8'),
  );
  for (const pid of CERBERUS_PUP_UPGRADE_IDS) {
    assert.ok(manifest.upgrades[pid], `manifest.upgrades inclui ${pid}`);
  }
  assert.ok(Object.keys(manifest.veil || {}).length >= 5, 'manifest.veil inclui sabores de Véu');

  const artReqs = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'),
  );
  assert.ok(artReqs.requests.some((r) => r.id === 'art_f4_veil_kittens' && r.listId === 'F4-VK'));
});

console.log(`\ndespertar-f4-veil-kittens-smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
