/**
 * Smoke Fase F2 — Eco do Acheron (Shimmers Golden / Wrath, Buffs Ativos, Sync JS ≡ PHP, UI/A11y, Assets & Códice).
 * Uso: node tests/despertar-f2-shimmers-smoke.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SHIMMER_BY_ID,
  SHIMMER_CONFIG,
  SHIMMER_EFFECTS,
  SHIMMER_PRESETS,
} from '../js/hades-despertar/config/shimmers.js';
import { EDU_LOG_BY_ID, EDU_LOG_IDS } from '../js/hades-despertar/config/edu-logs.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import {
  activeClickBuffMult,
  activeSpsBuffMult,
  buildingSpecialMultFromQty,
  calculateLuckyReward,
  calculateTotalSPS,
  clickPower,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  activateOrRenewBuff,
  eligibleShimmerEffects,
  normalizeActiveBuffs,
} from '../js/hades-despertar/core/ShimmerSystem.js';
import { ShimmerView, formatShimmerFeedback } from '../js/hades-despertar/ui/ShimmerView.js';
import { getDomPoolSize } from '../js/hades-despertar/ui/particles.js';
import { shimmerSprite } from '../js/hades-despertar/ui/world/SpriteAtlas.js';

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

function makeFakeDoc() {
  const makeNode = (tag) => {
    const classes = new Set();
    const attrs = new Map();
    const listeners = new Map();
    const styleProps = new Map();
    const node = {
      tagName: String(tag).toUpperCase(),
      className: '',
      id: '',
      hidden: false,
      disabled: false,
      textContent: '',
      dataset: {},
      children: [],
      parentNode: null,
      ownerDocument: null,
      style: {
        setProperty(k, v) { styleProps.set(k, String(v)); },
        getPropertyValue(k) { return styleProps.get(k) || ''; },
        removeProperty(k) { styleProps.delete(k); },
      },
      classList: {
        add(...names) { names.forEach((n) => classes.add(n)); },
        remove(...names) { names.forEach((n) => classes.delete(n)); },
        toggle(n, force) {
          const on = force === undefined ? !classes.has(n) : Boolean(force);
          if (on) classes.add(n);
          else classes.delete(n);
          return on;
        },
        contains(n) { return classes.has(n) || String(node.className).split(/\s+/).includes(n); },
      },
      setAttribute(k, v) { attrs.set(k, String(v)); },
      getAttribute(k) { return attrs.get(k) ?? null; },
      removeAttribute(k) { attrs.delete(k); },
      addEventListener(type, cb) { listeners.set(type, cb); },
      dispatchEvent(type, ev = {}) { listeners.get(type)?.(ev); },
      append(...kids) {
        for (const k of kids) {
          if (k && typeof k === 'object') {
            k.parentNode = node;
            node.children.push(k);
          }
        }
      },
      appendChild(k) {
        if (k && typeof k === 'object') {
          k.parentNode = node;
          node.children.push(k);
        }
        return k;
      },
      replaceChildren(...kids) {
        node.children = [];
        node.append(...kids);
      },
      contains(target) {
        return node.children.includes(target);
      },
      remove() {
        if (node.parentNode?.children) {
          const idx = node.parentNode.children.indexOf(node);
          if (idx >= 0) node.parentNode.children.splice(idx, 1);
        }
        node.parentNode = null;
      },
    };
    return node;
  };
  const doc = {
    createElement(tag) {
      const el = makeNode(tag);
      el.ownerDocument = doc;
      return el;
    },
  };
  return doc;
}

// 1. Ciclo completo: spawn -> clique -> ativação de buff -> expiração e invalidação de cache SPS
run('1. Ciclo completo: spawn → clique → buff ativo → expiração e invalidação do cache de SPS', () => {
  assert.equal(SHIMMER_CONFIG.spawnMinSec, 420);
  assert.equal(SHIMMER_CONFIG.spawnMaxSec, 720);
  assert.equal(SHIMMER_CONFIG.lifetimeSec, 13);
  assert.equal(SHIMMER_CONFIG.maxActiveShimmers, 7, 'vários Ecos na tela (natural + extras)');
  assert.ok(SHIMMER_PRESETS.canonical);
  assert.ok(SHIMMER_PRESETS.classroom);

  const state = new GameState(
    {
      souls: '1000',
      generators: { wandering_shade: 10, charon_servants: 10 },
    },
    { initialNowMs: 10_000 },
  );

  // Base SPS: 10 * 0.1 + 10 * 1 = 11.0
  assert.equal(cmp(state.sps(), '11'), 0);
  const v0 = state.structureVersion;

  // Spawn Maré do Acheron (×7 por 77s)
  const sp1 = state.spawnShimmer({ effectId: 'mare_acheron', nowMs: 10_000 });
  assert.equal(sp1.ok, true);
  assert.equal(state.shimmer?.kind, 'mare_acheron');
  assert.equal(state.shimmer?.expiresAt, 23_000);

  // Um segundo Eco convive com o primeiro (como no Cookie Clicker); o resto do ciclo usa só a Maré.
  const spDup = state.spawnShimmer({ effectId: 'furia_foice', nowMs: 11_000 });
  assert.equal(spDup.ok, true);
  assert.equal(state.shimmers.length, 2);
  state.shimmers = state.shimmers.slice(0, 1);

  // Clique no shimmer ativa buff e invalida cache de SPS
  const vBeforeClick = state.structureVersion;
  const clicked = state.clickShimmer({ nowMs: 12_000 });
  assert.equal(clicked.ok, true);
  assert.equal(clicked.effectId, 'mare_acheron');
  assert.equal(state.shimmer, null);
  assert.equal(state.shimmersClicked, 1);
  assert.ok(state.structureVersion > vBeforeClick, 'structureVersion deve subir ao ativar buff');
  assert.ok(state.activeBuffs.mare_acheron, 'mare_acheron deve estar em activeBuffs');
  assert.equal(state.activeBuffs.mare_acheron.expiresAt, 12_000 + 77_000);

  // SPS cacheado agora reflete ×7 (11 * 7 = 77)
  assert.equal(cmp(state.sps(), '77'), 0);
  assert.ok(state.structureVersion > v0);

  // Tick durante o buff (10s depois -> t=22_000): ganha 77 * 10 = 770 almas
  state.tick(10);
  assert.equal(cmp(state.sps(), '77'), 0);
  assert.equal(cmp(state.souls, '1770'), 0);

  // Avança 70s (t=92_000 > 89_000): buff expira, invalida cache de SPS e volta a 11
  const vBeforeExpire = state.structureVersion;
  const tickRes = state.tick(70);
  assert.ok(tickRes.expiredBuffs.includes('mare_acheron'));
  assert.equal(state.activeBuffs.mare_acheron, undefined);
  assert.ok(state.structureVersion > vBeforeExpire, 'expiração do buff deve invalidar cache de SPS');
  assert.equal(cmp(state.sps(), '11'), 0);

  // Fúria da Foice (×777 no clique por 13s)
  const baseClick = state.clickPower();
  assert.equal(cmp(baseClick, '1'), 0);
  state.spawnShimmer({ effectId: 'furia_foice', nowMs: 100_000 });
  state.clickShimmer({ nowMs: 101_000 });
  assert.equal(cmp(state.clickPower(), '777'), 0);
  state.tick(14);
  assert.equal(cmp(state.clickPower(), '1'), 0);

  // Selo do Juízo (+1 Veredito e (N/10 + 1)× SPS por 30s quando há gerador >= 10)
  const verdictsBefore = state.verdicts;
  state.spawnShimmer({ effectId: 'selo_juizo', nowMs: 200_000 });
  const seloRes = state.clickShimmer({ nowMs: 201_000 });
  assert.equal(seloRes.ok, true);
  assert.equal(state.verdicts, verdictsBefore + 1);
  assert.ok(state.activeBuffs.selo_juizo, 'selo_juizo ativa buff de linha (10/10 + 1 = ×2)');
  assert.equal(cmp(state.sps(), '22'), 0);
  state.tick(31);
  assert.equal(cmp(state.sps(), '11'), 0);

  // Shimmer não clicado expira após 13s e incrementa shimmersMissed
  state.spawnShimmer({ effectId: 'mare_acheron', nowMs: 300_000 });
  state.tick(14);
  assert.equal(state.shimmer, null);
  assert.equal(state.shimmersMissed, 1);
});

// 2. Matemática exata da Colheita (Lucky) nos dois limites
run('2. Matemática exata da Colheita (Lucky): limitado por 15% da carteira vs 15 min de SPS', () => {
  // Caso A: limitado por 15% da carteira (15% de 200 = 30 < 900 * 10 = 9000) -> 30 + 13 = 43.00
  const rewardWalletLimited = calculateLuckyReward({ souls: '200', sps: '10' });
  assert.equal(rewardWalletLimited, '43.00');

  // Caso B: limitado por 15 min de SPS (15% de 1_000_000 = 150_000 > 900 * 10 = 9000) -> 9000 + 13 = 9013.00
  const rewardSpsLimited = calculateLuckyReward({ souls: '1000000', sps: '10' });
  assert.equal(rewardSpsLimited, '9013.00');

  // Integração via GameState.clickShimmer()
  const state = new GameState({
    souls: '1000000',
    generators: { charon_servants: 10 }, // SPS = 10
  });
  state.spawnShimmer({ effectId: 'colheita_acheron', nowMs: 5_000 });
  const res = state.clickShimmer({ nowMs: 6_000 });
  assert.equal(res.ok, true);
  assert.equal(res.gained, '9013.00');
  assert.equal(cmp(state.souls, '1009013'), 0);
});

// 3. Bloqueio de rolls Wrath quando Catábase está inativa e cap de overlap
run('3. Bloqueio de rolls Wrath sem Catábase + Cap de overlap de buffs', () => {
  const poolNoCatabase = eligibleShimmerEffects({ catabaseActive: false });
  assert.equal(
    poolNoCatabase.some((e) => e.requiresCatabase || e.variant === 'wrath'),
    false,
    'Nenhum efeito Wrath pode entrar na pool quando catabaseActive=false',
  );

  const poolWithCatabase = eligibleShimmerEffects({ catabaseActive: true });
  assert.equal(
    poolWithCatabase.some((e) => e.id === 'clot_acheron')
      && poolWithCatabase.some((e) => e.id === 'elder_frenzy_acheron'),
    true,
    'Com catabaseActive=true, clot_acheron e elder_frenzy_acheron entram na pool',
  );

  const state = new GameState({ souls: '1000', generators: { charon_servants: 10 } });
  const blocked = state.spawnShimmer({ effectId: 'elder_frenzy_acheron', nowMs: 1_000 });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'requires_catabase');

  // Ativando Catábase libera o spawn de Wrath
  state.setCatabaseActive(true);
  const allowed = state.spawnShimmer({ effectId: 'elder_frenzy_acheron', nowMs: 2_000 });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.shimmer?.variant, 'wrath');
  const wrathClick = state.clickShimmer({ nowMs: 2_500 });
  assert.equal(wrathClick.ok, true);
  assert.equal(state.wrathClicked, 1);
  assert.equal(cmp(state.sps(), '6660'), 0); // 10 * 666

  // Cap de overlap (máx 3 buffs simultâneos; mesmo id renova sem duplicar)
  let buffs = {};
  buffs = activateOrRenewBuff(buffs, { id: 'mare_acheron' }, 10_000).nextBuffs;
  buffs = activateOrRenewBuff(buffs, { id: 'mare_acheron' }, 15_000).nextBuffs;
  assert.equal(Object.keys(buffs).length, 1);
  assert.equal(buffs.mare_acheron.expiresAt, 15_000 + 77_000);

  buffs = activateOrRenewBuff(buffs, { id: 'furia_foice' }, 16_000).nextBuffs;
  buffs = activateOrRenewBuff(buffs, { id: 'selo_juizo', mult: '3' }, 17_000).nextBuffs;
  buffs = activateOrRenewBuff(buffs, { id: 'clot_acheron' }, 18_000).nextBuffs;
  assert.equal(
    Object.keys(buffs).length <= SHIMMER_CONFIG.maxActiveBuffs,
    true,
    `activeBuffs respeita cap de overlap (${SHIMMER_CONFIG.maxActiveBuffs})`,
  );
});

// 4. Paridade estrita JS ≡ PHP e Validação Autoritativa no Backend
run('4. Paridade JS ≡ PHP (Catálogo, SPS/Click/Lucky e Rejeição de buffs inválidos/expirados/Wrath no PHP)', () => {
  const nowMs = 1_700_000_000_000;
  const activeBuffsSample = {
    mare_acheron: {
      id: 'mare_acheron',
      mult: '7',
      startedAt: nowMs - 5_000,
      expiresAt: nowMs + 60_000,
    },
    furia_foice: {
      id: 'furia_foice',
      mult: '777',
      startedAt: nowMs - 2_000,
      expiresAt: nowMs + 10_000,
    },
    selo_juizo: {
      id: 'selo_juizo',
      mult: buildingSpecialMultFromQty(20), // (20/10 + 1) = 3
      startedAt: nowMs - 1_000,
      expiresAt: nowMs + 25_000,
    },
  };

  const ctx = {
    generators: { wandering_shade: 20, charon_servants: 20 },
    upgrades: ['foice_afilada', 'umbras_despertas'],
    talents: [],
    obols: '0',
    verdictPurchases: [],
    shinyCounts: {},
    goldCounts: {},
    activeBuffs: activeBuffsSample,
    nowMs,
  };

  const jsSpsMult = activeSpsBuffMult(activeBuffsSample, nowMs);
  const jsClickMult = activeClickBuffMult(activeBuffsSample, nowMs);
  const jsTotalSps = calculateTotalSPS(ctx);
  const jsClickPower = clickPower({ ...ctx, sps: jsTotalSps });
  const jsLuckyWallet = calculateLuckyReward({ souls: '200', sps: '10' });
  const jsLuckySps = calculateLuckyReward({ souls: '1000000', sps: '10' });

  const phpScript = `
    require 'backend/src/Core/Database.php';
    require 'backend/src/Services/Despertar/DespertarDecimal.php';
    require 'backend/src/Services/Despertar/DespertarCatalog.php';
    require 'backend/src/Services/Despertar/DespertarFormulas.php';
    require 'backend/src/Services/Despertar/DespertarService.php';

    use App\\Services\\Despertar\\DespertarCatalog;
    use App\\Services\\Despertar\\DespertarFormulas;
    use App\\Services\\Despertar\\DespertarService;

    $ctx = json_decode($argv[1], true);
    $nowMs = (int) $ctx['nowMs'];

    $dbRow = [
      'souls' => '1000.00',
      'obols' => '0.00',
      'mnemosyne' => '0.00',
      'lifetime_souls' => '1000.00',
      'run_souls' => '1000.00',
      'prestige_count' => 0,
      'generators_state' => $ctx['generators'],
      'upgrades_state' => $ctx['upgrades'],
      'talents_state' => [],
      'edu_logs_seen' => [],
      'milestones' => [],
      'stats' => ['clicks' => 10, 'max_buy_biggest' => 1, 'juizo_tie_wins' => 0],
    ];

    $syncValid = DespertarService::validateSync($dbRow, [
      'souls' => '1000.00',
      'runSouls' => '1000.00',
      'lifetimeSouls' => '1000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'activeBuffs' => $ctx['activeBuffs'],
      'shimmersClicked' => 3,
      'eduLogsSeen' => ['log_shimmer_echo'],
    ], $nowMs);

    $syncExpired = DespertarService::validateSync($dbRow, [
      'souls' => '1000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'activeBuffs' => [
        'mare_acheron' => ['id' => 'mare_acheron', 'expiresAt' => $nowMs - 1000],
      ],
    ], $nowMs);

    $syncUnknown = DespertarService::validateSync($dbRow, [
      'souls' => '1000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'activeBuffs' => [
        'buff_hacker_999' => ['id' => 'buff_hacker_999', 'expiresAt' => $nowMs + 50000],
      ],
    ], $nowMs);

    $syncWrathBlocked = DespertarService::validateSync($dbRow, [
      'souls' => '1000.00',
      'generators' => $ctx['generators'],
      'upgrades' => $ctx['upgrades'],
      'catabaseActive' => false,
      'activeBuffs' => [
        'elder_frenzy_acheron' => ['id' => 'elder_frenzy_acheron', 'expiresAt' => $nowMs + 5000],
      ],
    ], $nowMs);

    $sps = DespertarFormulas::calculateTotalSPS($ctx);
    $click = DespertarFormulas::clickPower(array_merge($ctx, ['sps' => $sps]));

    echo json_encode([
      'shimmers' => DespertarCatalog::SHIMMER_EFFECTS,
      'eduLogs' => DespertarCatalog::EDU_LOG_IDS,
      'spsMult' => DespertarFormulas::activeSpsBuffMult($ctx['activeBuffs'], $nowMs),
      'clickMult' => DespertarFormulas::activeClickBuffMult($ctx['activeBuffs'], $nowMs),
      'sps' => $sps,
      'click' => $click,
      'luckyWallet' => DespertarFormulas::calculateLuckyReward('200', '10'),
      'luckySps' => DespertarFormulas::calculateLuckyReward('1000000', '10'),
      'syncValidOk' => $syncValid['ok'],
      'syncValidLogs' => $syncValid['next']['eduLogsSeen'] ?? [],
      'syncValidShimmersClicked' => $syncValid['state']['shimmersClicked'] ?? 0,
      'syncExpiredOk' => $syncExpired['ok'],
      'syncExpiredBuffs' => array_keys($syncExpired['next']['activeBuffs'] ?? []),
      'syncExpiredCorr' => array_column($syncExpired['corrections'] ?? [], 'system'),
      'syncUnknownOk' => $syncUnknown['ok'],
      'syncUnknownBuffs' => array_keys($syncUnknown['next']['activeBuffs'] ?? []),
      'syncUnknownCorr' => array_column($syncUnknown['corrections'] ?? [], 'system'),
      'syncWrathBlockedOk' => $syncWrathBlocked['ok'],
      'syncWrathBlockedBuffs' => array_keys($syncWrathBlocked['next']['activeBuffs'] ?? []),
      'syncWrathBlockedCorr' => array_column($syncWrathBlocked['corrections'] ?? [], 'system'),
    ]);
  `;

  const outRaw = execFileSync('php', ['-r', phpScript, JSON.stringify(ctx)], {
    cwd: root,
    encoding: 'utf8',
  });
  const phpOut = JSON.parse(outRaw);

  assert.equal(phpOut.shimmers.length, SHIMMER_EFFECTS.length);
  for (let i = 0; i < SHIMMER_EFFECTS.length; i += 1) {
    const j = SHIMMER_EFFECTS[i];
    const p = phpOut.shimmers[i];
    assert.equal(p.id, j.id);
    assert.equal(p.kind, j.kind);
    assert.equal(p.variant, j.variant);
    assert.equal(Boolean(p.requiresCatabase), Boolean(j.requiresCatabase));
    assert.equal(Number(p.durationSec), Number(j.durationSec));
  }

  assert.deepEqual(phpOut.eduLogs, [...EDU_LOG_IDS]);
  assert.equal(cmp(phpOut.spsMult, jsSpsMult), 0);
  assert.equal(cmp(phpOut.clickMult, jsClickMult), 0);
  assert.equal(cmp(phpOut.sps, jsTotalSps), 0);
  assert.equal(cmp(phpOut.click, jsClickPower), 0);
  assert.equal(phpOut.luckyWallet, jsLuckyWallet);
  assert.equal(phpOut.luckySps, jsLuckySps);

  // Sync válido aceita buffs ativos e preserva log_shimmer_echo + shimmersClicked
  assert.equal(phpOut.syncValidOk, true);
  assert.ok(phpOut.syncValidLogs.includes('log_shimmer_echo'));
  assert.equal(phpOut.syncValidShimmersClicked, 3);

  // Buff vencido, ID inválido e Wrath sem Catábase: o sync segue, o buff é descartado.
  for (const k of ['Expired', 'Unknown', 'WrathBlocked']) {
    assert.equal(phpOut[`sync${k}Ok`], true, `${k}: sync não recusa`);
    assert.deepEqual(phpOut[`sync${k}Buffs`], [], `${k}: buff não entra no estado`);
    assert.ok(phpOut[`sync${k}Corr`].includes('buffs'), `${k}: correção registrada`);
  }
});

// 5. UI no Santuário, A11y (prefers-reduced-motion / fancy), Object Pool, Assets e Códice
run('5. ShimmerView A11y + Object Pool + Assets (manifest/art-requests) + Códice (log_shimmer_echo)', () => {
  const doc = makeFakeDoc();
  const shimmerHost = doc.createElement('div');
  const buffsHost = doc.createElement('div');
  const particleLayer = doc.createElement('div');

  let clickedCount = 0;
  const view = new ShimmerView({
    document: doc,
    onClickShimmer: () => { clickedCount += 1; },
  }).mount({ shimmerHost, buffsHost, particleLayer });

  const state = new GameState({ souls: '500', generators: { charon_servants: 5 } }, { initialNowMs: 1_000 });
  state.spawnShimmer({ effectId: 'mare_acheron', nowMs: 1_000 });

  // Render com reducedMotion: true -> botão visível e com classe .is-static
  view.sync(state, { reducedMotion: true, fancy: true, nowMs: 1_000 });
  const btn = shimmerHost.children[0];
  assert.ok(btn, 'botão do Eco montado');
  assert.equal(btn.hidden, false);
  assert.equal(btn.classList.contains('is-static'), true, 'reducedMotion ativa modo estático');
  assert.equal(btn.classList.contains('is-golden'), true);

  // Clique via evento dispara callback e feedback usa Object Pool
  btn.dispatchEvent('click', { stopPropagation() {} });
  assert.equal(clickedCount, 1);

  const clickRes = state.clickShimmer({ nowMs: 1_500 });
  assert.ok(formatShimmerFeedback(clickRes).includes('Maré do Acheron'));
  const floatNode = view.spawnClickFeedback(clickRes, { reducedMotion: false, particles: true });
  assert.ok(floatNode, 'feedback flutuante criado');
  floatNode.dispatchEvent('animationend');
  assert.ok(getDomPoolSize(doc, 'shimmer-float') >= 1, 'nó devolvido ao Object Pool');

  // Pílulas de buffs ativos reutilizam o mesmo nó DOM entre syncs
  view.sync(state, { reducedMotion: false, fancy: true, nowMs: 2_000 });
  assert.equal(buffsHost.hidden, false);
  assert.equal(buffsHost.children.length, 1);
  const firstPillNode = buffsHost.children[0];
  view.sync(state, { reducedMotion: false, fancy: true, nowMs: 5_000 });
  assert.equal(buffsHost.children[0], firstPillNode, 'pílula de buff reutilizada sem recriar DOM');

  // Assets e Códice
  const sGold = shimmerSprite('eco_dourado');
  const sWrath = shimmerSprite('eco_colerico');
  assert.ok(sGold.webp.includes('shimmers/eco_dourado.webp'));
  assert.ok(sWrath.webp.includes('shimmers/eco_colerico.webp'));

  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/sprites/manifest.json'), 'utf8'),
  );
  assert.ok(manifest.shimmers?.eco_dourado, 'manifest contém eco_dourado');
  assert.ok(manifest.shimmers?.eco_colerico, 'manifest contém eco_colerico');
  assert.ok(
    fs.existsSync(path.join(root, 'assets/despertar/sprites', manifest.shimmers.eco_dourado.webp)),
    'eco_dourado.webp existe em disco',
  );
  assert.ok(
    fs.existsSync(path.join(root, 'assets/despertar/sprites', manifest.shimmers.eco_colerico.webp)),
    'eco_colerico.webp existe em disco',
  );

  const artReqs = JSON.parse(
    fs.readFileSync(path.join(root, 'assets/despertar/art-requests.json'), 'utf8'),
  );
  const shimmerReq = artReqs.requests.find((r) => r.id === 'art_shimmers' || r.listId === 'B12');
  assert.ok(shimmerReq, 'art-requests.json inclui pedido B12 (art_shimmers)');

  assert.ok(EDU_LOG_BY_ID.log_shimmer_echo, 'log_shimmer_echo registrado em edu-logs.js');
  assert.ok(state.eduLogsSeen.includes('log_shimmer_echo'), 'clicar no Eco desbloqueia log_shimmer_echo');
});

// 6. Vários Ecos ao mesmo tempo (Cookie Clicker): 1 natural do timer + extras
run('6. Vários Ecos na tela: natural do timer + extras; timer pausa com natural; clique pelo id', () => {
  const state = new GameState({ souls: '500', generators: { charon_servants: 5 } }, {
    initialNowMs: 0,
    shimmerSpawnRange: { minSec: 10, maxSec: 10 },
    random: () => 0.5,
  });
  state.tick(11); // timer de 10 s → nasce o natural
  assert.equal(state.shimmers.length, 1);
  assert.equal(state.hasLeadShimmer(), true);

  // Extras (debug / Mão do Destino) somam na tela
  assert.equal(state.spawnShimmer({ effectId: 'mare_acheron' }).ok, true);
  assert.equal(state.spawnShimmer({ effectId: 'colheita_acheron' }).ok, true);
  assert.equal(state.shimmers.length, 3, 'três Ecos ao mesmo tempo');
  assert.equal(new Set(state.shimmers.map((s) => s.id)).size, 3, 'ids únicos');

  // Enquanto o natural está na tela, o timer não corre (não nasce outro natural)
  const timerBefore = state._nextShimmerInSec;
  state.tick(1);
  assert.equal(state._nextShimmerInSec, timerBefore, 'timer pausado com natural na tela');

  // Clicar num extra não reinicia o timer nem tira o natural
  const extra = state.shimmers.find((s) => !s.lead);
  assert.equal(state.clickShimmer({ shimmerId: extra.id }).ok, true);
  assert.equal(state.shimmers.length, 2);
  assert.equal(state.hasLeadShimmer(), true);

  // Clicar no natural libera o timer
  const lead = state.shimmers.find((s) => s.lead);
  assert.equal(state.clickShimmer({ shimmerId: lead.id }).ok, true);
  assert.equal(state.hasLeadShimmer(), false);
  assert.ok(state._nextShimmerInSec > 0);

  // Teto de SHIMMER_MAX_ACTIVE
  while (state.shimmers.length < SHIMMER_CONFIG.maxActiveShimmers) state.spawnShimmer({ effectId: 'mare_acheron' });
  assert.equal(state.spawnShimmer({ effectId: 'mare_acheron' }).reason, 'max_active');

  // Save/load preserva todos (e qual é o natural)
  const restored = new GameState(state.toSnapshot(), { initialNowMs: state._clockMs });
  assert.equal(restored.shimmers.length, state.shimmers.length);
  assert.equal(restored.shimmers.filter((s) => s.lead).length, state.shimmers.filter((s) => s.lead).length);

  // UI: um botão por Eco; clique informa qual
  const doc = makeFakeDoc();
  const shimmerHost = doc.createElement('div');
  const clickedIds = [];
  const view = new ShimmerView({ document: doc, onClickShimmer: (id) => clickedIds.push(id) })
    .mount({ shimmerHost, buffsHost: doc.createElement('div') });
  view.sync(state, { reducedMotion: false, fancy: true });
  const visible = shimmerHost.children.filter((b) => !b.hidden);
  assert.equal(visible.length, state.shimmers.length, 'um botão visível por Eco');
  visible[1].dispatchEvent('click', { stopPropagation() {} });
  assert.deepEqual(clickedIds, [state.shimmers[1].id]);

  // Menos Ecos → botões sobrando ficam ocultos (reaproveitados, sem recriar DOM)
  const keep = state.shimmers[0];
  state.shimmers = [keep];
  view.sync(state, { reducedMotion: false, fancy: true });
  assert.equal(shimmerHost.children.filter((b) => !b.hidden).length, 1);
});

console.log(`\ndespertar-f2-shimmers-smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
