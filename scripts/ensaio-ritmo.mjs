#!/usr/bin/env node
/**
 * Ensaio de ritmo: um jogador simulado num save limpo, medido contra as metas de
 * docs/paridade-cookieclicker-despertar.md §8.4 ("Alvos de laboratório").
 *
 * Bot ativo-humano: N cliques/s, clica todo Eco, compra o juramento mais barato que puder,
 * e entre geradores escolhe o de melhor retorno (preço ÷ ganho de SPS, medido numa cópia).
 * Sem rede, sem offline, sem debug. Semente fixa → resultado reproduzível.
 *
 * Uso: node scripts/ensaio-ritmo.mjs [--cps 5] [--minutos 120] [--seed 7]
 */

import { GameState } from '../js/hades-despertar/core/GameState.js';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? Number(process.argv[i + 1]) : def;
};
const CPS = arg('cps', 5);
const MINUTES = arg('minutos', 120);
let seed = arg('seed', 7);
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

/** Metas §8.4 em segundos [mín, máx]. */
const TARGETS = {
  primeiraSombra: [0, 30],
  sps1: [60, 180],
  primeiroJuramento: [120, 300],
  primeiraForja: [900, 1500],
  primeiroTrono: [1500, 2400],
  previewLethe: [2100, 3000],
  primeiraCatabase: [2700, 4200],
};
const LABELS = {
  primeiraSombra: '1ª Sombra',
  sps1: 'SPS ≥ 1',
  primeiroJuramento: '1º Juramento Styx',
  primeiraForja: '1ª Forja',
  primeiroTrono: '1º Trono',
  previewLethe: 'Preview Lethe (1e8 na corrida)',
  primeiraCatabase: '1ª Catábase ≥ 1 óbolo',
};

const T0 = Date.UTC(2026, 9, 28, 12, 0, 0);
const state = new GameState({}, { random, initialNowMs: T0, now: () => T0 });
const UPGRADES_BY_COST = [...UPGRADES].sort((a, b) => cmp(a.cost, b.cost));
const marks = {};
const mark = (key, t) => { if (marks[key] == null) marks[key] = t; };

/** Ganho de SPS de comprar 1 unidade, medido numa cópia do estado. */
function spsGain(id) {
  const copy = GameState.fromSnapshot(state.toSnapshot());
  // A cópia não pode consumir Math.random: um shiny hipotético mudava a compra e o tempo da Catábase.
  copy._random = () => 0;
  copy.debugFlags.freeShopping = true;
  copy.buyGenerator(id, '1');
  return Number(copy.sps()) - Number(state.sps());
}

function bestGenerator() {
  const owned = state.quantities();
  let best = null;
  // Revelados = possuídos + o próximo da fila (como a loja mostra).
  const firstUnowned = GENERATORS.findIndex((g) => !(owned[g.id] > 0));
  const pool = GENERATORS.filter((g, i) => owned[g.id] > 0 || i === firstUnowned);
  for (const g of pool) {
    const price = Number(state.generators.get(g.id).nextPrice(state.costMult(g.id)));
    const gain = spsGain(g.id);
    if (!(gain > 0)) continue;
    const score = price / gain; // segundos de SPS para pagar a si mesmo
    if (!best || score < best.score) best = { id: g.id, price, score };
  }
  return best;
}

let target = null;
let lastEval = -999;
const samples = [];
for (let t = 1; t <= MINUTES * 60; t += 1) {
  for (let c = 0; c < CPS; c += 1) state.click();
  state.tick(1);
  if (state.shimmer) state.clickShimmer({ random });

  // Juramentos: o mais barato que der para pagar (jogador típico compra assim que aparece).
  for (const u of UPGRADES_BY_COST) {
    if (cmp(state.upgradeCost(u), state.souls) > 0) break;
    if (!state.upgrades.includes(u.id) && state.buyUpgrade(u.id).ok) mark('primeiroJuramento', t);
  }

  if (t - lastEval >= 5 || !target) {
    target = bestGenerator();
    lastEval = t;
  }
  if (target && cmp(String(target.price), state.souls) <= 0 && state.buyGenerator(target.id, '1').ok) {
    target = null;
  }

  const q = state.quantities();
  if (q.wandering_shade > 0) mark('primeiraSombra', t);
  if (Number(state.sps()) >= 1) mark('sps1', t);
  if (q.phlegethon_forge > 0) mark('primeiraForja', t);
  if (q.obsidian_throne > 0) mark('primeiroTrono', t);
  if (cmp(state.runSouls, '100000000') >= 0) mark('previewLethe', t);
  if (state.canPrestige()) mark('primeiraCatabase', t);
  if (t % 300 === 0) samples.push({ min: t / 60, sps: Number(state.sps()), souls: Number(state.runSouls) });
  if (marks.primeiraCatabase) break;
}

const fmt = (s) => (s == null ? '—' : `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, '0')}s`);
console.log(`Ensaio de ritmo — ${CPS} cliques/s, semente ${arg('seed', 7)}, até ${MINUTES} min\n`);
console.log('Marco                              Tempo        Meta              Resultado');
let out = 0;
for (const [key, [lo, hi]] of Object.entries(TARGETS)) {
  const v = marks[key];
  let verdict = 'ok';
  if (v == null) verdict = 'NÃO ATINGIU';
  else if (v < lo) verdict = 'rápido demais';
  else if (v > hi) verdict = 'lento demais';
  if (verdict !== 'ok') out += 1;
  console.log(`${LABELS[key].padEnd(34)} ${fmt(v).padEnd(12)} ${`${fmt(lo)}–${fmt(hi)}`.padEnd(17)} ${verdict}`);
}
console.log('\nCurva (a cada 5 min):');
for (const s of samples) console.log(`  ${String(s.min).padStart(3)} min  SPS ${s.sps.toExponential(2).padStart(9)}  corrida ${s.souls.toExponential(2)}`);
console.log(`\n${Object.keys(TARGETS).length - out}/${Object.keys(TARGETS).length} marcos dentro da meta`);
