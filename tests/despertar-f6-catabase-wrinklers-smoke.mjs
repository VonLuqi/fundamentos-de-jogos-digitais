/**
 * Smoke Fase F6 — Catábase das Avós (Grandmapocalypse: Arquivo Estígio, Estágios 0..3,
 * Trégua / Elder Pledge, Aliança Eterna / Elder Covenant ×0.95) + Sanguessugas do Acheron
 * (Wrinklers: −5% SPS aparente por unidade, digestão coletiva paralela, pop ×1.1 / ×1.155 / ×3.3 Shiny)
 * + Integração com Ecos Coléricos (Wrath Shimmers da F2) + Anti-Cheat no Sync PHP.
 *
 * Uso: node tests/despertar-f6-catabase-wrinklers-smoke.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CATABASE_SPRITE_ITEMS,
  CATABASE_STAGES,
  CATABASE_UPGRADE_IDS,
  calculatePledgeCost,
  wrathProbabilityForStage,
} from '../js/hades-despertar/config/catabase.js';
import { EDU_LOG_BY_ID } from '../js/hades-despertar/config/edu-logs.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import {
  calculateEffectiveSPS,
  calculateRawSPS,
  talentEffects,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { describeCatabaseSummary } from '../js/hades-despertar/ui/UIRenderer.js';
import { LeechRingView } from '../js/hades-despertar/ui/world/LeechRingView.js';
import { maxLeechCapacity } from '../js/hades-despertar/core/CatabaseSystem.js';

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

// 1. Cadeia do Arquivo Estígio (≥7 Servos), progressão de Estágios 0 → 1 → 2 → 3, Trégua (Pledge) e Aliança (Covenant ×0.95)
run('1. Centro de Pesquisa Estígio (≥7 Servos), Estágios 0→1→2→3, Juramento de Trégua (8^n) e Aliança Eterna (×0.95)', () => {
  const t0 = 1_700_000_000_000;
  const state = new GameState({
    souls: '1000000000000000',
    generators: { charon_servants: 6, wandering_shade: 20 },
  }, { initialNowMs: t0 });

  assert.equal(state.catabaseStage(), 0);
  assert.equal(state.buyUpgrade('concilio_das_moiras').ok, false, 'Exige >= 7 Servos de Caronte');

  // Compra o 7º Servo -> desbloqueia Concílio das Moiras
  state.buyGenerator('charon_servants', '1');
  assert.equal(state.quantities().charon_servants, 7);
  assert.equal(state.buyUpgrade('concilio_das_moiras').ok, true);

  // Soro Estígio ainda aguarda o timer de pesquisa
  assert.equal(state.buyUpgrade('soro_estigio').ok, false, 'Bloqueado antes de concluir a pesquisa');
  state.advanceCatabaseResearch(1800);
  assert.equal(state.buyUpgrade('soro_estigio').ok, true);
  assert.equal(state.catabaseStage(), 0);

  // Avança e compra Despertar Ctoniano -> Estágio 1 (catabaseActive = true)
  state.advanceCatabaseResearch(1800);
  assert.equal(state.buyUpgrade('despertar_ctoniano').ok, true);
  assert.equal(state.catabaseStage(), 1);
  assert.equal(state.catabaseActive, true);

  // Avança e compra Sinapse Espectral e Comunhão Abissal -> Estágio 2
  state.advanceCatabaseResearch(1800);
  assert.equal(state.buyUpgrade('sinapse_espectral').ok, true);
  state.advanceCatabaseResearch(1800);
  assert.equal(state.buyUpgrade('comunhao_abissal').ok, true);
  assert.equal(state.catabaseStage(), 2);

  // Avança e compra Pacto Primordial -> Estágio 3 (e bônus Elder Pact +0.05 por não-Servo)
  state.advanceCatabaseResearch(1800);
  const spsBeforeElderPact = state.rawSps();
  assert.equal(state.buyUpgrade('pacto_primordial').ok, true);
  assert.equal(state.catabaseStage(), 3);
  assert.ok(cmp(state.rawSps(), spsBeforeElderPact) > 0, 'Pacto Primordial eleva o SPS de Servos');

  // Spawna 2 Sanguessugas e testa Juramento de Trégua (Elder Pledge: 8^(n+2); 1ª=64)
  state.spawnLeech({ shiny: false });
  state.spawnLeech({ shiny: false });
  assert.equal(state.leeches().length, 2);
  assert.equal(calculatePledgeCost(0), '64');
  assert.equal(calculatePledgeCost(1), '512');
  assert.equal(calculatePledgeCost(2), '4096');

  const pledgeRes = state.activateElderPledge({ nowMs: t0 + 5000 });
  assert.equal(pledgeRes.ok, true);
  assert.equal(pledgeRes.poppedCount, 2, 'Trégua estoura todas as Sanguessugas imediatamente');
  assert.equal(state.leeches().length, 0);
  assert.equal(state.catabaseStage(), 0, 'Estágio efetivo cai para 0 durante a Trégua');
  assert.equal(state.catabaseActive, false);

  // Aliança Eterna (Elder Covenant): −5% SPS global (×0.95) e revogação
  const rawBeforeCov = state.rawSps();
  const covOn = state.setElderCovenant(true);
  assert.equal(covOn.ok, true);
  assert.equal(state.isElderCovenantActive(), true);
  assert.equal(state.catabaseStage(), 0);
  assert.ok(cmp(state.rawSps(), rawBeforeCov) < 0, 'Aliança Eterna aplica −5% SPS global (×0.95)');

  const covOff = state.setElderCovenant(false);
  assert.equal(covOff.ok, true);
  assert.equal(state.isElderCovenantActive(), false);
  assert.equal(state.catabaseStage(), 3, 'Revogar Aliança restaura o Estágio 3');
  assert.equal(cmp(state.rawSps(), rawBeforeCov), 0);
});

// 2. Matemática de Dreno (−5%/Sanguessuga), Digestão Paralela Coletiva e Estouro (×1.1, ×1.155 Vísceras Sacras, ×3.3 Shiny)
run('2. Sanguessugas do Acheron: dreno −5%/unidade, digestão paralela coletiva (paradoxo ×6.0) e pop ×1.1 / ×1.155 / ×3.3', () => {
  const state = new GameState({
    souls: '0',
    generators: { charon_servants: 100 }, // 100 SPS base
    catabase: { stage: 1 },
  }, { initialNowMs: 100_000, random: () => 0.99 }); // random alto evita spawn aleatório extra no tick

  assert.equal(cmp(state.rawSps(), '100'), 0);
  assert.equal(cmp(state.effectiveSps(), '100'), 0);

  // Spawna 10 Sanguessugas normais (cap base = 10)
  for (let i = 0; i < 10; i += 1) {
    assert.equal(state.spawnLeech({ shiny: false }).ok, true);
  }
  assert.equal(state.spawnLeech({ shiny: false }).ok, false, 'Bloqueia 11ª Sanguessuga sem Ninho do Acheron');

  // Com 10 Sanguessugas: dreno = 50% -> effectiveSPS = 50, mas CADA Sanguessuga digere 50 SPS por segundo!
  assert.equal(cmp(state.rawSps(), '100'), 0);
  assert.equal(cmp(state.effectiveSps(), '50'), 0);

  // Simula 10 segundos (1000 almas brutas):
  // Carteira ganha 10s * 50 = 500 almas.
  // Cada uma das 10 Sanguessugas digere 10s * 50 = 500 almas!
  state.tick(10);
  assert.equal(cmp(state.souls, '500'), 0, 'Carteira recebeu 50% do SPS bruto (500 almas)');
  for (const leech of state.leeches()) {
    assert.equal(cmp(leech.digested, '500'), 0, 'Cada Sanguessuga digeriu 500 almas em paralelo');
  }

  // Estoura 1 Sanguessuga normal (3 cliques canônicos): devolve 500 * 1.1 = 550 almas
  assert.equal(state.popLeech(0).popped, false, '1º clique não estoura');
  assert.equal(state.popLeech(0).popped, false, '2º clique não estoura');
  const pop1 = state.popLeech(0);
  assert.equal(pop1.ok, true);
  assert.equal(pop1.popped, true);
  assert.equal(cmp(pop1.payout, '550'), 0, 'Pop normal devolve ×1.1 (550 almas)');
  assert.equal(state.leechesPopped, 1);

  // Estoura as 9 restantes: 9 * 550 = 4950 almas -> Total carteira = 500 + 550 + 4950 = 6000 (exatamente ×6.0 sobre os 1000 brutos!)
  const popRest = state.popAllLeeches();
  assert.equal(cmp(popRest.totalPayout, '4950'), 0);
  assert.equal(cmp(state.souls, '6000'), 0, 'Paradoxo dos Wrinklers: 1000 brutos viraram 6000 almas (×6.0)');

  // Ninho = +2 (cap 12); Ninho + Elder Spice = 14. Vísceras ×1.155; Shiny = ×3 sobre o payout.
  state.upgrades = [...state.upgrades, 'ninho_do_acheron', 'visceras_sacras'];
  assert.equal(state.maxLeeches(), 12, 'Só Ninho do Acheron → cap 12');
  state.talents = [...state.talents, 'elder_spice'];
  assert.equal(state.maxLeeches(), 14, 'Ninho + Elder Spice → cap 14');

  state.spawnLeech({ shiny: false, slot: 0 });
  state.spawnLeech({ shiny: true, slot: 1 });
  // 2 Sanguessugas = 10% dreno (10 SPS/s em cada). Em 100s -> cada uma digere 1000 almas.
  state.tick(100);
  const popSacra = state.popLeech(0, { clicksRequired: 1 });
  assert.equal(cmp(popSacra.payout, '1155'), 0, 'Com Vísceras Sacras devolve ×1.155 (1155 almas)');
  const popShiny = state.popLeech(1, { clicksRequired: 1 });
  assert.equal(cmp(popShiny.payout, '3465'), 0, 'Shiny = Vísceras ×3 → ×3.465 (3465 almas)');
  assert.equal(state.shinyLeechesPopped, 1);
});

// 3. Integração real com F2 (ShimmerSystem): probabilidades de Eco Colérico (33%, 66%, 100%) e rolls clot_acheron / elder_frenzy_acheron
run('3. Integração com F2 (ShimmerSystem): probabilidades Wrath por estágio (33%/66%/100%) e rolls Coléricos', () => {
  assert.equal(wrathProbabilityForStage(0), 0);
  assert.ok(Math.abs(wrathProbabilityForStage(1) - 1 / 3) < 1e-6);
  assert.ok(Math.abs(wrathProbabilityForStage(2) - 2 / 3) < 1e-6);
  assert.equal(wrathProbabilityForStage(3), 1);

  const state = new GameState({
    souls: '1000000',
    generators: { charon_servants: 50 },
    catabase: { stage: 3 },
  }, { initialNowMs: 200_000 });

  // No Estágio 3 (100% Wrath), spawnShimmer sem variante forçada gera Eco Colérico (`wrath`)
  const sp1 = state.spawnShimmer({ force: true, random: () => 0.1 });
  assert.equal(sp1.ok, true);
  assert.equal(sp1.shimmer.variant, 'wrath');
  assert.ok(
    sp1.shimmer.kind === 'clot_acheron' || sp1.shimmer.kind === 'elder_frenzy_acheron',
    `Efeito sorteado deve ser Wrath (${sp1.shimmer.kind})`,
  );

  // Clica no Eco Colérico e verifica ativação do buff (Coágulo ×0.5 ou Fúria Anciã ×666)
  const clickRes = state.clickShimmer({ nowMs: 201_000 });
  assert.equal(clickRes.ok, true);
  assert.equal(clickRes.variant, 'wrath');
  assert.equal(state.wrathClicked, 1);
});

// 4. Paridade Estrita JS ≡ PHP + Anti-Cheat no Sync PHP (cap >14 Sanguessugas e digestão impossível)
run('4. Paridade JS ≡ PHP (rawSPS, effectiveSPS, Elder Pact, Covenant) e Anti-Cheat no Sync PHP', () => {
  const nowMs = 1_700_000_000_000;
  const ctx = {
    generators: {
      wandering_shade: 40,
      charon_servants: 50,
      cerberian_hound: 30,
      obsidian_throne: 10,
    },
    upgrades: [
      'concilio_das_moiras',
      'soro_estigio',
      'despertar_ctoniano',
      'sinapse_espectral',
      'comunhao_abissal',
      'pacto_primordial',
      'ninho_do_acheron',
      'visceras_sacras',
    ],
    talents: ['juramento_eterno'],
    obols: '10',
    verdictPurchases: ['olho_do_tartarus'],
    shinyCounts: {},
    goldCounts: {},
    activeBuffs: {
      elder_frenzy_acheron: {
        id: 'elder_frenzy_acheron',
        mult: '666',
        startedAt: nowMs - 1000,
        expiresAt: nowMs + 4000,
      },
    },
    nowMs,
    catabase: {
      stage: 3,
      covenantActive: false,
      leeches: [
        { id: 'l0', slot: 0, shiny: false, digested: '1000', spawnedAt: nowMs - 60_000 },
        { id: 'l1', slot: 1, shiny: true, digested: '1000', spawnedAt: nowMs - 60_000 },
        { id: 'l2', slot: 2, shiny: false, digested: '1000', spawnedAt: nowMs - 60_000 },
        { id: 'l3', slot: 3, shiny: false, digested: '1000', spawnedAt: nowMs - 60_000 },
      ],
      leechesPopped: 55,
      shinyLeechesPopped: 1,
      pledgesCount: 1,
    },
  };

  const jsRawSps = calculateRawSPS(ctx);
  const jsEffSps = calculateEffectiveSPS(ctx);
  const jsRawCov = calculateRawSPS({ ...ctx, covenantActive: true });

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
    $effSps = DespertarFormulas::calculateEffectiveSPS($ctx);
    $rawCov = DespertarFormulas::calculateRawSPS(array_merge($ctx, ['covenantActive' => true]));
    $payoutNormalSacra = DespertarFormulas::calculateLeechPayout('1000', false, $ctx['upgrades']);
    $payoutShiny = DespertarFormulas::calculateLeechPayout('1000', true, $ctx['upgrades']);

    $dbRow = [
      'souls' => '500000000000000.00',
      'obols' => '10.00',
      'mnemosyne' => '10.00',
      'lifetime_souls' => '500000000000000.00',
      'run_souls' => '500000000000000.00',
      'prestige_count' => 2,
      'generators_state' => $ctx['generators'],
      'upgrades_state' => $ctx['upgrades'],
      'talents_state' => $ctx['talents'],
      'verdict_purchases' => $ctx['verdictPurchases'],
      'edu_logs_seen' => [],
      'milestones' => [],
      'stats' => ['clicks' => 100, 'max_buy_biggest' => 10, 'juizo_tie_wins' => 0],
    ];

    // 1) Sync legítimo com Estágio 3, buff Wrath elder_frenzy_acheron e 4 Sanguessugas
    $syncLegit = DespertarService::validateSync($dbRow, [
      'souls' => '500000000000000.00',
      'runSouls' => '500000000000000.00',
      'lifetimeSouls' => '500000000000000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'activeBuffs' => $ctx['activeBuffs'],
      'catabase' => $ctx['catabase'],
      'eduLogsSeen' => ['log_catabase_wrinklers'],
    ], $nowMs);

    // 2) Anti-cheat: enviar 15 Sanguessugas (acima do teto absoluto de 14)
    $tooManyLeeches = array_fill(0, 15, ['slot' => 0, 'digested' => '10', 'spawnedAt' => $nowMs - 5000]);
    $syncTooMany = DespertarService::validateSync($dbRow, [
      'souls' => '500000000000000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'catabase' => ['stage' => 3, 'leeches' => $tooManyLeeches],
    ], $nowMs);

    // 3) Anti-cheat: Sanguessuga nascida há 2 segundos declarando 1e35 almas digeridas
    $syncImpossibleDigested = DespertarService::validateSync($dbRow, [
      'souls' => '500000000000000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'catabase' => [
        'stage' => 3,
        'leeches' => [
          ['slot' => 0, 'digested' => '100000000000000000000000000000000000', 'spawnedAt' => $nowMs - 2000],
        ],
      ],
    ], $nowMs);

    $earnedAch = DespertarFormulas::evaluateDespertarAchievementIds($syncLegit['next'], [], true);

    echo json_encode([
      'rawSps' => $rawSps,
      'effSps' => $effSps,
      'rawCov' => $rawCov,
      'payoutNormalSacra' => $payoutNormalSacra,
      'payoutShiny' => $payoutShiny,
      'syncLegitOk' => $syncLegit['ok'],
      'syncLegitLogs' => $syncLegit['next']['eduLogsSeen'] ?? [],
      'syncTooManyOk' => $syncTooMany['ok'],
      'syncTooManyErr' => $syncTooMany['error'] ?? '',
      'syncImpossibleOk' => $syncImpossibleDigested['ok'],
      'syncImpossibleErr' => $syncImpossibleDigested['error'] ?? '',
      'earnedAch' => $earnedAch,
    ]);
  `;

  const outRaw = execFileSync('php', ['-r', phpScript, JSON.stringify(ctx)], {
    cwd: root,
    encoding: 'utf8',
  });
  const phpOut = JSON.parse(outRaw);

  assert.equal(cmp(phpOut.rawSps, jsRawSps), 0, `rawSPS PHP (${phpOut.rawSps}) ≠ JS (${jsRawSps})`);
  assert.equal(cmp(phpOut.effSps, jsEffSps), 0, `effectiveSPS PHP (${phpOut.effSps}) ≠ JS (${jsEffSps})`);
  assert.equal(cmp(phpOut.rawCov, jsRawCov), 0, `rawSPS Covenant PHP (${phpOut.rawCov}) ≠ JS (${jsRawCov})`);
  assert.equal(cmp(phpOut.payoutNormalSacra, '1155'), 0);
  assert.equal(cmp(phpOut.payoutShiny, '3465'), 0, 'Shiny + Vísceras = 1.155×3');

  assert.equal(phpOut.syncLegitOk, true);
  assert.ok(phpOut.syncLegitLogs.includes('log_catabase_wrinklers'));

  // Rejeições anti-cheat
  assert.equal(phpOut.syncTooManyOk, false);
  assert.match(phpOut.syncTooManyErr, /excede a capacidade/i);
  assert.equal(phpOut.syncImpossibleOk, false);
  assert.match(phpOut.syncImpossibleErr, /excede o limite matemático/i);

  // Conquistas F6
  for (const achId of [
    'despertar_catabase_avos_1',
    'despertar_catabase_avos_2',
    'despertar_catabase_avos_3',
    'despertar_sanguessuga_1',
    'despertar_sanguessuga_50',
    'despertar_sanguessuga_shiny',
    'despertar_tregua_estigia',
  ]) {
    assert.ok(phpOut.earnedAch.includes(achId), `PHP deve conceder ${achId}`);
  }
});

// 5. UI do Anel de Sanguessugas (A11y + reduced-motion), Estela Auditável, Códice e Assets Gemini
run('5. LeechRingView (A11y + reduced-motion), Estela Auditável, Códice e Assets Gemini', () => {
  const state = new GameState({
    souls: '1000000',
    generators: { charon_servants: 100 },
    upgrades: ['concilio_das_moiras', 'pacto_primordial'],
    catabase: {
      stage: 3,
      leeches: [
        { id: 'l0', slot: 0, shiny: false, digested: '500', spawnedAt: 1000 },
        { id: 'l1', slot: 1, shiny: true, digested: '1000', spawnedAt: 1000 },
      ],
    },
  });

  const summary = describeCatabaseSummary(state);
  assert.equal(summary.leechesCount, 2);
  assert.equal(summary.drainPercent, 10);
  assert.match(summary.spsLine, /2 Sanguessugas: −10%/);
  assert.match(summary.digestedLine, /1\.5K almas retidas/);

  // Testa LeechRingView em modo reduced-motion
  const fakeDoc = {
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        className: '',
        hidden: false,
        dataset: {},
        children: [],
        offsetWidth: 1,
        textContent: '',
        removed: false,
        style: { props: {}, animation: '', setProperty(k, v) { this.props[k] = v; } },
        classList: {
          _s: new Set(),
          toggle(c, on) { if (on) this._s.add(c); else this._s.delete(c); },
          contains(c) { return this._s.has(c); },
        },
        setAttribute(k, v) { this[k] = v; },
        addEventListener() {},
        remove() { this.removed = true; },
        append(...nodes) { this.children.push(...nodes); },
        prepend(...nodes) { this.children.unshift(...nodes); },
        replaceChildren(...nodes) { this.children = [...nodes]; },
      };
    },
  };
  const stageHost = fakeDoc.createElement('div');
  const view = new LeechRingView({ document: fakeDoc }).mount({ stageHost });
  view.sync(state, { reducedMotion: true, fancy: false });

  const backdropEl = stageHost.children[0];
  const ringEl = stageHost.children[1];
  assert.equal(backdropEl.className.includes('catabase-stage-bg'), true);
  assert.equal(backdropEl.hidden, false, 'Fundo de estágio visível no Estágio 3');
  assert.equal(ringEl.hidden, false);
  assert.equal(ringEl.classList.contains('is-static'), true, 'Congela animação com reducedMotion');
  assert.equal(ringEl.children[0].hidden, false);
  assert.equal(ringEl.children[1].hidden, false);
  assert.equal(ringEl.children[1].classList.contains('is-shiny'), true);
  assert.equal(ringEl.children[1].dataset.spriteId, 'sanguessuga_shiny');
  assert.equal(ringEl.children[2].hidden, true);

  // Float de estouro: precisa sair da tela (releasePooledNode com doc).
  const particleLayer = fakeDoc.createElement('div');
  particleLayer.appendChild = (n) => { particleLayer.children.push(n); };
  const floatView = new LeechRingView({ document: fakeDoc }).mount({
    stageHost: fakeDoc.createElement('div'),
    particleLayer,
  });
  const floatTimers = [];
  const prevSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => { floatTimers.push(fn); return 0; };
  try {
    const floatNode = floatView.spawnPopFeedback(
      { ok: true, popped: true, payout: '1000', leech: { shiny: false } },
      { reducedMotion: false, particles: true },
    );
    assert.ok(floatNode, 'spawnPopFeedback cria nó');
    assert.match(String(floatNode.className), /despertar-float/);
    assert.match(String(floatNode.textContent), /Sanguessuga estourada/);
    assert.equal(particleLayer.children.includes(floatNode), true);
    assert.equal(floatTimers.length >= 1, true, 'fallback de release agendado');
    floatTimers[0]();
    assert.equal(floatNode.removed, true, 'release remove o float (não gruda na tela)');
  } finally {
    globalThis.setTimeout = prevSetTimeout;
  }

  // Códice e Assets
  assert.ok(EDU_LOG_BY_ID.log_catabase_wrinklers);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/sprites/manifest.json'), 'utf8'),
  );
  for (const upId of CATABASE_UPGRADE_IDS) {
    assert.ok(manifest.upgrades[upId], `manifest.upgrades inclui ${upId}`);
  }
  assert.equal(Object.keys(manifest.catabase || {}).length, 7, '7 sprites F6 em manifest.catabase');

  const artReqs = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'),
  );
  assert.ok(artReqs.requests.some((r) => r.id === 'art_f6_catabase_wrinklers' && r.listId === 'F6-CW'));
});

// 6. Talentos celestiais F6: Unholy Bait ×5 spawn, Elder Spice +2, Persistent Memory 180s, Sacrilegious ×1.05, Eye
run('6. Talentos celestiais: spawn×5, cap+2, pesquisa 180s, payout×1.05, Eye digests', () => {
  const fx = talentEffects([
    'unholy_bait',
    'elder_spice',
    'sacrilegious_corruption',
    'persistent_memory',
    'eye_of_the_wrinkler',
  ]);
  assert.equal(String(fx.leechSpawnMult), '5');
  assert.equal(Number(fx.leechCapBonus), 2);
  assert.equal(String(fx.leechPayoutMult), '1.05');
  assert.equal(Number(fx.researchDurationMult), 0.1);
  assert.equal(fx.leechDigestVisible, true);

  assert.equal(maxLeechCapacity([], { leechCapBonus: 2 }), 12, 'Elder Spice sozinho → cap 12');
  assert.equal(maxLeechCapacity(['ninho_do_acheron'], { leechCapBonus: 2 }), 14);

  const state = new GameState({
    souls: '0',
    generators: { charon_servants: 10 },
    talents: ['elder_spice'],
    catabase: { stage: 1 },
  }, { initialNowMs: 50_000, random: () => 0.99 });
  assert.equal(state.maxLeeches(), 12, 'Elder Spice sozinho → cap 12');

  const withNinho = new GameState({
    souls: '0',
    upgrades: ['ninho_do_acheron'],
    talents: ['elder_spice'],
    catabase: { stage: 1 },
  }, { initialNowMs: 50_000 });
  assert.equal(withNinho.maxLeeches(), 14);

  const researchState = new GameState({
    souls: '1000000000000000',
    generators: { charon_servants: 7 },
    talents: ['persistent_memory'],
  }, { initialNowMs: 1_700_000_000_000 });
  assert.equal(researchState.buyUpgrade('concilio_das_moiras').ok, true);
  assert.ok(
    researchState.catabase.researchRemainingSec <= 180 + 1,
    `Pesquisa com Persistent Memory ≤180s (got ${researchState.catabase.researchRemainingSec})`,
  );

  const payState = new GameState({
    souls: '0',
    talents: ['sacrilegious_corruption'],
    catabase: {
      stage: 1,
      leeches: [{ id: 'l0', slot: 0, shiny: false, digested: '1000', spawnedAt: 1 }],
    },
  }, { initialNowMs: 60_000 });
  const pop = payState.popLeech(0, { clicksRequired: 1 });
  assert.equal(cmp(pop.payout, '1155'), 0, 'Sacrilegious Corruption sozinho → ×1.155');

  assert.equal(payState.leechDigestVisible(), false);
  payState.talents = [...payState.talents, 'eye_of_the_wrinkler'];
  assert.equal(payState.leechDigestVisible(), true);

  // Spawn ×5: com Unholy Bait a prob por segundo no estágio 1 sobe 5×
  let spawned = 0;
  const spawnState = new GameState({
    souls: '0',
    generators: { charon_servants: 100 },
    talents: ['unholy_bait'],
    catabase: { stage: 3 },
  }, { initialNowMs: 70_000, random: () => 0 }); // random 0 sempre spawna se prob > 0
  for (let i = 0; i < 5; i += 1) {
    const before = spawnState.leeches().length;
    spawnState.tick(1);
    if (spawnState.leeches().length > before) spawned += 1;
  }
  assert.ok(spawned >= 1, 'Unholy Bait permite spawn rápido sob random=0');
});

console.log(`\ndespertar-f6-catabase-wrinklers-smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
