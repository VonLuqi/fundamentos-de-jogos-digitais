/**
 * Smoke — Rio do Lethe (árvore + ascensionOpen).
 * Uso: node tests/despertar-lethe-river-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TALENTS,
  TALENT_BRANCHES,
  meetsTalentRequirement,
  LEGACY_TALENT_COSTS,
  talentNodePosition,
} from '../js/hades-despertar/config/talents.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import { migrateTalentSave, talentEffects } from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';

const RING_GAP = 88;
const ROOT_R = 56;
const NODE_R = 26;
const MIN_NODE_DIST = 2 * NODE_R + 4;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

run('catálogo Heavenly: 129 nós, ramos CC, anéis', () => {
  assert.equal(TALENTS.length, 129, `count ${TALENTS.length}`);
  const branchKeys = Object.keys(TALENT_BRANCHES);
  assert.ok(branchKeys.length >= 8, 'TALENT_BRANCHES');
  let maxRing = 0;
  const ids = new Set();
  for (const t of TALENTS) {
    assert.ok(!ids.has(t.id), `id único ${t.id}`);
    ids.add(t.id);
    assert.ok(typeof t.ring === 'number');
    assert.ok(typeof t.angle === 'number');
    assert.ok(t.icon);
    assert.ok(t.blurb && t.blurb.length > 8);
    assert.ok(t.effects && typeof t.effects === 'object');
    assert.match(String(t.cost), /^\d+$/, `custo ${t.id}`);
    maxRing = Math.max(maxRing, t.ring);
    for (const req of t.requires?.talentIds || []) {
      assert.ok(ids.has(req) || TALENTS.some((x) => x.id === req), `prereq ${req} de ${t.id}`);
    }
  }
  assert.ok(maxRing >= 6, `maxRing ${maxRing}`);
  const roots = TALENTS.filter((t) => !(t.requires?.talentIds?.length));
  assert.equal(roots.length, 1);
  assert.equal(roots[0].id, 'legado');

  // Grafo acíclico + curva de custo não-decrescente ao longo de cada aresta pai→filho
  const byId = Object.fromEntries(TALENTS.map((t) => [t.id, t]));
  for (const t of TALENTS) {
    for (const pid of t.requires?.talentIds || []) {
      const parent = byId[pid];
      assert.ok(parent, `pai ${pid}`);
      assert.ok(cmp(t.cost, parent.cost) >= 0, `custo ${t.id}(${t.cost}) >= ${pid}(${parent.cost})`);
      assert.ok(t.ring >= parent.ring, `anel ${t.id} >= ${pid}`);
    }
  }
  // DFS ciclo
  const state = Object.create(null);
  function visit(id, stack) {
    if (state[id] === 1) throw new Error(`ciclo em ${[...stack, id].join('→')}`);
    if (state[id] === 2) return;
    state[id] = 1;
    for (const pid of byId[id]?.requires?.talentIds || []) visit(pid, [...stack, id]);
    state[id] = 2;
  }
  for (const t of TALENTS) visit(t.id, []);

  // Sink longo: soma dos custos ≫ 1e9 após escala por anel
  let costSum = 0n;
  for (const t of TALENTS) costSum += BigInt(String(t.cost).split('.')[0] || '0');
  assert.ok(costSum > 1_000_000_000n, `soma custos ${costSum} ≫ 1e9`);

  // Anéis altos bem mais caros que raízes
  const ring0 = TALENTS.filter((t) => t.ring === 0);
  const ringHigh = TALENTS.filter((t) => t.ring >= 10);
  const maxR0 = ring0.reduce((m, t) => (cmp(t.cost, m) > 0 ? t.cost : m), '0');
  const minHigh = ringHigh.reduce((m, t) => (cmp(t.cost, m) < 0 ? t.cost : m), ringHigh[0]?.cost || '0');
  assert.ok(ringHigh.length > 0 && cmp(minHigh, maxR0) > 0, 'anel alto > raiz');

  assert.equal(meetsTalentRequirement(
    TALENTS.find((t) => t.id === 'luvas_de_halo'),
    { talents: [] },
  ), false);
  assert.equal(meetsTalentRequirement(
    TALENTS.find((t) => t.id === 'luvas_de_halo'),
    { talents: ['kit_inicial'] },
  ), true);
});

run('mid-run: buyTalent bloqueado sem ascensionOpen', () => {
  const state = new GameState({ mnemosyne: '50', ascensionOpen: false });
  assert.equal(state.buyTalent('portoes_gemeos').ok, false);
  assert.equal(state.talents.length, 0);
});

run('pós-prestige: ascensionOpen + compra + prereq + Continuar', () => {
  const state = new GameState({
    runSouls: '16000000000',
    lifetimeSouls: '16000000000',
    generators: { wandering_shade: 2 },
    mnemosyne: '50',
  });
  assert.equal(state.applyPrestige().ok, true);
  assert.equal(state.ascensionOpen, true);
  assert.equal(cmp(state.mnemosyne, '0') > 0, true);

  assert.equal(state.buyTalent('luvas_de_halo').ok, false, 'prereq bloqueia');
  state.talents = [...state.talents, 'legado'];
  assert.equal(state.buyTalent('portoes_gemeos').ok, true);
  state.talents = [...state.talents, 'kit_inicial'];
  state.mnemosyne = '100000';
  assert.equal(state.buyTalent('luvas_de_halo').ok, true);

  state.closeAscension();
  assert.equal(state.ascensionOpen, false);
  assert.equal(state.buyTalent('portoes_gemeos').ok, false);
  assert.ok(state.talents.includes('kit_inicial') || state.talents.includes('legado'));
});

run('migração legado: map + refund', () => {
  const migrated = migrateTalentSave(['memoria_das_sombras', 'talento_fantasma_xyz'], '0');
  assert.deepEqual(migrated.talents, ['kit_inicial']);
  assert.equal(cmp(migrated.mnemosyne, '0'), 0);

  const refunded = migrateTalentSave(['rebanho_despertado'], '5');
  assert.equal(cmp(refunded.mnemosyne, '10'), 0);
  assert.deepEqual(refunded.talents, []);
});

run('gates de sistema preservados nos effects', () => {
  const fx = talentEffects([
    'ovo_primordial',
    'rodizio_das_estacoes',
    'cozimento_de_acucar',
    'frenesi_de_acucar',
    'permanent_slot_v',
  ]);
  assert.equal(fx.dragonUnlock, true);
  assert.equal(fx.seasonSwitcherUnlock, true);
  assert.equal(fx.nectarReserveBonus, true);
  assert.equal(fx.nectarFrenzyUnlock, true);
  assert.equal(fx.permanentSlot, 5);
});

run('arte + HTML do rio presentes', () => {
  const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
  assert.ok(html.includes('despertar-lethe-river'));
  assert.ok(html.includes('data-river-continue'));
  assert.ok(html.includes('lethe-memory-river'), 'Memória do Rio embute árvore fechada');
  assert.ok(html.includes('lethe-river--memory'));
  const sample = path.join(root, 'assets/despertar/sprites/talents/legado.webp');
  assert.ok(fs.existsSync(sample), 'ícone webp amostra');
  const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
  assert.ok(css.includes('lethe-river'));
  assert.ok(css.includes('lethe-river--memory'));
  const riverSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/LetheRiverTree.js'), 'utf8');
  assert.ok(riverSrc.includes('readonly'), 'árvore aceita modo readonly');
  assert.ok(riverSrc.includes('sealingIds'), 'selo por id (não bloqueia a árvore inteira)');
  assert.ok(riverSrc.includes('setMotionPaused'), 'pausa rAF da Memória');
  const uiSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
  assert.ok(uiSrc.includes('_memoryRiver'), 'UIRenderer monta árvore da memória');
  const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
  assert.ok(indexSrc.includes('sealTalentOptimistic'), 'compra otimista no boot');
  assert.ok(indexSrc.includes('onBuyTalent: sealTalentOptimistic'), 'Rio e UI usam selo otimista');
  const sealStart = indexSrc.indexOf('async function sealTalentOptimistic');
  const sealEnd = indexSrc.indexOf('const riverUi = bindLetheRiverTree');
  assert.ok(sealStart >= 0 && sealEnd > sealStart, 'bloco sealTalentOptimistic localizado');
  const sealBody = indexSrc.slice(sealStart, sealEnd);
  assert.ok(sealBody.includes('buyTalent(id)'), 'selo local primeiro');
  assert.ok(sealBody.includes('talentBuy(id)'), 'persiste via talentBuy');
  assert.ok(sealBody.includes('await api.flush()'), 'flush grava pais antes/retry');
  assert.ok(sealBody.includes('softFail') || sealBody.includes('Mantém selo local'), 'não rollback soft');
  assert.ok(/talento desconhecido|unknown talent/.test(sealBody), 'rollback só desconhecido');
  const php = fs.readFileSync(path.join(root, 'backend/src/Services/Despertar/DespertarService.php'), 'utf8');
  assert.ok(php.includes('talentUnion') || php.includes('$talentUnion'), 'sync une talents');
  assert.ok(php.includes('$clientSpend') || php.includes('$newSpend'), 'conservação Catábase newSpend');
  const apiSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/services/ApiService.js'), 'utf8');
  assert.ok(apiSrc.includes('_enqueueMutation'), 'ApiService serializa flush/talentBuy');
  assert.ok(
    /async talentBuy[\s\S]*?mode:\s*'reconcile'/.test(apiSrc),
    'talentBuy aplica reconcile',
  );
  assert.ok(
    /flush:reject[\s\S]*?mode:\s*'reconcile'/.test(apiSrc)
      || /ok: false,\s*\n\s*epochAtSend[\s\S]*?mode:\s*'reconcile'/.test(apiSrc)
      || /mode: 'reconcile',\s*\n\s*ok: false/.test(apiSrc),
    'flush reject usa reconcile',
  );
});

run('compra local imediata: buyTalent aplica sem esperar API', () => {
  const state = new GameState({
    mnemosyne: '20',
    ascensionOpen: true,
    talents: [],
  });
  const before = state.mnemosyne;
  state.talents = ['legado'];
  const res = state.buyTalent('portoes_gemeos');
  assert.equal(res.ok, true);
  assert.ok(state.talents.includes('portoes_gemeos'));
  assert.equal(cmp(state.mnemosyne, before) < 0, true, 'essência gasta na hora');
});

run('reconcile atrasado NÃO apaga talento só-local', () => {
  const state = new GameState({
    mnemosyne: '10',
    ascensionOpen: true,
    talents: [],
  });
  state.talents = ['legado'];
  assert.equal(state.buyTalent('portoes_gemeos').ok, true);
  const mneAfterBuy = state.mnemosyne;
  // Server ainda sem o selo, com mais essência — típico sync atrasado.
  state.applyAuthoritativeState(
    {
      souls: state.souls,
      mnemosyne: '50',
      talents: [],
      generators: {},
      upgrades: [],
    },
    { mode: 'reconcile' },
  );
  assert.ok(
    state.talents.includes('portoes_gemeos'),
    'união preserva selo otimista',
  );
  assert.equal(
    cmp(state.mnemosyne, mneAfterBuy),
    0,
    'essência local preservada quando há talento só-local',
  );
});

run('reconcile com mesmos talentos usa min(mnemosyne)', () => {
  const state = new GameState({
    mnemosyne: '8',
    ascensionOpen: true,
    talents: ['portoes_gemeos'],
  });
  state.applyAuthoritativeState(
    {
      souls: '0',
      mnemosyne: '3',
      talents: ['portoes_gemeos'],
      generators: {},
      upgrades: [],
    },
    { mode: 'reconcile' },
  );
  assert.deepEqual(state.talents, ['portoes_gemeos']);
  assert.equal(cmp(state.mnemosyne, '3'), 0);
});

run('layout: ROOT_R + RING_GAP=88 → zero overlap de nós', () => {
  const pos = TALENTS.map((t) => ({
    id: t.id,
    ...talentNodePosition(t, { cx: 0, cy: 0, ringGap: RING_GAP, rootR: ROOT_R }),
  }));
  const roots = pos.filter((_, i) => TALENTS[i].ring === 0);
  assert.equal(roots.length, 1, '1 raiz Heavenly');
  for (const p of roots) {
    assert.ok(Math.abs(p.r - ROOT_R) < 0.01, `raiz ${p.id} em r=${ROOT_R}, got ${p.r}`);
  }
  const overlaps = [];
  for (let i = 0; i < pos.length; i += 1) {
    for (let j = i + 1; j < pos.length; j += 1) {
      const d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
      if (d < MIN_NODE_DIST) {
        overlaps.push(`${pos[i].id}/${pos[j].id}=${d.toFixed(1)}`);
      }
    }
  }
  assert.equal(overlaps.length, 0, `overlaps: ${overlaps.slice(0, 8).join('; ')}`);
});

run('UI: clique único + href/xlink + RING_GAP=88', () => {
  const riverSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/LetheRiverTree.js'), 'utf8');
  assert.ok(/const RING_GAP = 88/.test(riverSrc), 'RING_GAP=88');
  assert.ok(/const ROOT_R = 56/.test(riverSrc), 'ROOT_R=56');
  assert.ok(riverSrc.includes("setAttributeNS('http://www.w3.org/1999/xlink', 'href'"), 'xlink:href');
  assert.ok(riverSrc.includes("addEventListener('pointerup'"), 'selo no pointerup');
  assert.ok(riverSrc.includes('Clique para selar'), 'hint de clique único');
  assert.ok(!/Duplo clique para selar/.test(riverSrc), 'sem hint de duplo clique');
});

run('server: talentBuy abre Catábase se fechada', () => {
  const php = fs.readFileSync(path.join(root, 'backend/src/Services/Despertar/DespertarService.php'), 'utf8');
  const start = php.indexOf('public static function applyTalentBuy');
  const end = php.indexOf('public static function applyCloseAscension');
  assert.ok(start >= 0 && end > start, 'applyTalentBuy localizado');
  const body = php.slice(start, end);
  assert.ok(body.includes("milestones['ascensionOpen'] = true"), 'abre Catábase no buy');
  assert.ok(!/O Rio do Lethe só aceita selos durante a Catábase/.test(body), 'sem 400 de Catábase fechada');
});

run('arte: motivos por efeito (sem letra-placeholder)', () => {
  const artSrc = fs.readFileSync(path.join(root, 'scripts/gen-talent-river-art.mjs'), 'utf8');
  assert.ok(artSrc.includes('effectMotif'), 'motivos por efeito');
  assert.ok(artSrc.includes('scytheMotif') || artSrc.includes('soulsMotif'), 'motivos temáticos');
  const sampleSvg = fs.readFileSync(
    path.join(root, 'assets/despertar/sprites/talents/legado.svg'),
    'utf8',
  );
  assert.ok(sampleSvg.includes('ellipse') || sampleSvg.includes('path'), 'motivo geométrico');
  assert.ok(sampleSvg.includes('ellipse') || sampleSvg.includes('path'), 'motivo geométrico');
  let webpCount = 0;
  const dir = path.join(root, 'assets/despertar/sprites/talents');
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith('.webp')) webpCount += 1;
  }
  assert.ok(webpCount >= TALENTS.length, `webp ${webpCount} >= ${TALENTS.length}`);
  const mark = path.join(dir, 'portoes_gemeos.webp');
  assert.ok(fs.existsSync(mark), 'ícone portoes_gemeos.webp');
});

run('selo otimista: sem rollback por Essência/prereq; reject não replace', () => {
  const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
  const sealStart = indexSrc.indexOf('async function sealTalentOptimistic');
  const sealEnd = indexSrc.indexOf('const riverUi = bindLetheRiverTree');
  const sealBody = indexSrc.slice(sealStart, sealEnd);
  assert.ok(sealBody.includes('rollbackUnknown'), 'só rollback desconhecido');
  assert.ok(!/rollback\(msg\)/.test(sealBody), 'sem rollback genérico');
  assert.ok(/faltam vertentes/i.test(sealBody) && sealBody.includes('await api.flush()'), 'prereq → flush+retry');
  assert.ok(sealBody.includes('softFail'), 'softFail mantém selo');
  const apiSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/services/ApiService.js'), 'utf8');
  assert.ok(!/mode: 'replace',\s*\n\s*ok: false/.test(apiSrc), 'reject não usa replace');
  // Recusa que persiste depois do flush+retry = selo fantasma: desfaz em vez de manter.
  assert.ok(sealBody.includes('definitiveRefusal') && /definitiveRefusal\)\s*\{\s*\n\s*rollbackUnknown/.test(sealBody), 'recusa definitiva desfaz o selo');
  // Selos em sequência batem no limite (429): espera o Retry-After em vez de largar o pai só local.
  assert.ok(/status !== 429/.test(sealBody) && sealBody.includes('retryAfterSec'), '429 no selo espera e tenta de novo');
  // Pai ainda a caminho do servidor não faz o filho ser desfeito.
  assert.ok(/payload\?\.state/.test(sealBody) && /!serverTalents\.includes\(p\)/.test(sealBody), 'só desfaz se o servidor já tem os pais');
  // Uma requisição por selo: nada de flush antes do talentBuy.
  const persistBody = sealBody.slice(sealBody.indexOf('const persist = async'));
  assert.ok(persistBody.indexOf('buyWithBackoff()') < persistBody.indexOf('await api.flush()'), 'flush só no retry');
});

run('Ritual recusado pelo servidor não vira Lethe só local', () => {
  const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
  const start = indexSrc.indexOf('const letheUi = bindLetheModal');
  const body = indexSrc.slice(start, indexSrc.indexOf('onAfterPrestige', start));
  const catchBody = body.slice(body.lastIndexOf('} catch (error) {'));
  // O sync não entrega Óbolos/Essência: Ritual local zerava a corrida sem recompensa no save.
  assert.ok(!catchBody.includes('applyPrestige'), 'erro do servidor não aplica Ritual local');
  assert.ok(!catchBody.includes('openAscensionLocal'), 'erro do servidor não abre o Rio');
  assert.ok(/return false;/.test(catchBody), 'Ritual fica pendente');
});

console.log(`\ndespertar-lethe-river-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
