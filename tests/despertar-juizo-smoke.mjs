/**
 * Smoke Task 18 / D3 / F3 — Juízo click-card + Empate; sucessor sempre desafiante.
 * (docs/plano-despertar-polish-foice-juizo-upgrades.md · gdd-juizo-v2.md).
 *
 * Uso: node tests/despertar-juizo-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  claimJuizoMilestones,
  isCorrectJuizoGuess,
  juizoAbandon,
  juizoDeltaLabel,
  juizoGuess,
  juizoStart,
  normalizeJuizoChoice,
} from '../api/_lib/despertar-juizo.js';
import { JUIZO_READY_POOL, isJuizoPoolReady } from '../js/hades-despertar/config/juizo-pool.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const html = read('pages/despertar.html');
const indexJs = read('js/hades-despertar/index.js');
const apiJs = read('js/api.js');
const despertarApi = read('api/despertar.js');
const juizoLib = read('api/_lib/despertar-juizo.js');
const pkg = read('package.json');

staticAssert(html.includes('id="despertar-juizo-modal"'), 'modal Juízo no HTML');
staticAssert(html.includes('data-juizo-choice="A"'), 'card campeão clicável (A)');
staticAssert(html.includes('data-juizo-choice="B"'), 'card desafiante clicável (B)');
staticAssert(html.includes('data-juizo-choice="tie"'), 'botão Empate');
staticAssert(!html.includes('data-juizo-choice="higher"'), 'sem botão Maior');
staticAssert(!html.includes('data-juizo-choice="lower"'), 'sem botão Menor');
staticAssert(html.includes('despertar-juizo-modal__vs'), 'VS no stage');
staticAssert(html.includes('data-juizo-rating="A"'), 'faixa campeão');
staticAssert(html.includes('data-juizo-rating="B"'), 'faixa desafiante');
staticAssert(html.includes('data-juizo-fail-card="A"'), 'fail card campeão');
staticAssert(html.includes('data-juizo-fail-card="B"'), 'fail card desafiante');
staticAssert(html.includes('data-juizo-confetti'), 'confetti juice');
staticAssert(fs.existsSync(path.join(root, 'js/hades-despertar/ui/JuizoModal.js')), 'JuizoModal.js');
staticAssert(indexJs.includes('JuizoModal'), 'index wire modal');
staticAssert(apiJs.includes('despertarJuizoStart'), 'cliente juizoStart');
staticAssert(apiJs.includes('despertarJuizoGuess'), 'cliente juizoGuess');
staticAssert(apiJs.includes('despertarJuizoAbandon'), 'cliente juizoAbandon');
staticAssert(despertarApi.includes("action === 'juizoStart'"), 'API juizoStart');
staticAssert(despertarApi.includes("action === 'juizoGuess'"), 'API juizoGuess');
staticAssert(despertarApi.includes('despertar_juizo') || despertarApi.includes('isJuizoGuessRateLimited'), 'rate limit Juízo');
staticAssert(despertarApi.includes('applyRetryAfterHeader'), '429 Juízo com Retry-After');
staticAssert(!despertarApi.includes('juizoGuessAttempts'), 'Map juizoGuessAttempts removido (A2)');
staticAssert(despertarApi.includes("action === 'juizoAbandon'"), 'API juizoAbandon');
staticAssert(juizoLib.includes('normalizeJuizoChoice'), 'normalizeJuizoChoice');
staticAssert(juizoLib.includes("higher: 'B'"), 'alias higher → B');
staticAssert(juizoLib.includes("lower: 'A'"), 'alias lower → A');
staticAssert(juizoLib.includes('run.challengerId'), 'sucessor sempre desafiante');
staticAssert(pkg.includes('despertar-juizo-smoke.mjs'), 'check inclui este smoke');
staticAssert(isJuizoPoolReady(), `pool ready ≥30 (tem ${JUIZO_READY_POOL.length})`);

const modalJs = read('js/hades-despertar/ui/JuizoModal.js');
staticAssert(modalJs.includes("this.#guess('A')"), 'modal envia A (card campeão)');
staticAssert(modalJs.includes("this.#guess('B')"), 'modal envia B (card desafiante)');
staticAssert(modalJs.includes("this.#guess('tie')"), 'modal envia tie');
staticAssert(!modalJs.includes("this.#guess('higher')"), 'modal sem higher');
staticAssert(!modalJs.includes("this.#guess('lower')"), 'modal sem lower');
staticAssert(!modalJs.includes('UI_TO_API_CHOICE'), 'sem map client-side (D3 no server)');

if (errors.length) {
  console.error('despertar-juizo-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

function makePool() {
  return [
    { id: 'g-a', title: 'A', rating: '12', blurb: '', cover: 'a.webp', descriptors: [] },
    { id: 'g-b', title: 'B', rating: '18', blurb: '', cover: 'b.webp', descriptors: [] },
    { id: 'g-c', title: 'C', rating: '12', blurb: '', cover: 'c.webp', descriptors: [] },
    { id: 'g-d', title: 'D', rating: '10', blurb: '', cover: 'd.webp', descriptors: [] },
    { id: 'g-e', title: 'E', rating: '16', blurb: '', cover: 'e.webp', descriptors: [] },
  ];
}

function blankState() {
  return {
    juizoCurrentStreak: 0,
    juizoBestStreak: 0,
    juizoMilestonesClaimed: [],
    verdicts: 0,
    juizoRun: null,
  };
}

let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

await run('aliases higher/lower/tie e legado A/B', () => {
  assert.equal(normalizeJuizoChoice('higher'), 'B');
  assert.equal(normalizeJuizoChoice('lower'), 'A');
  assert.equal(normalizeJuizoChoice('tie'), 'tie');
  assert.equal(normalizeJuizoChoice('A'), 'A');
  assert.equal(normalizeJuizoChoice('B'), 'B');
  assert.equal(normalizeJuizoChoice('nope'), null);
});

await run('empate correto só com faixas iguais', () => {
  assert.equal(isCorrectJuizoGuess('12', '12', 'tie'), true);
  assert.equal(isCorrectJuizoGuess('12', '18', 'tie'), false);
  assert.equal(isCorrectJuizoGuess('12', '18', 'B'), true);
  assert.equal(isCorrectJuizoGuess('12', '18', 'higher'), true);
  assert.equal(isCorrectJuizoGuess('12', '18', 'A'), false);
  assert.equal(isCorrectJuizoGuess('12', '18', 'lower'), false);
  assert.equal(isCorrectJuizoGuess('18', '12', 'lower'), true);
});

await run('acerto sobe streak; erro revela Δ e zera current', () => {
  const pool = makePool();
  let seq = 0;
  const rng = () => {
    const values = [0.01, 0.2, 0.4, 0.6, 0.8];
    return values[seq++ % values.length];
  };
  const started = juizoStart(blankState(), pool, { rng });
  assert.equal(started.ok, true);
  assert.ok(started.pair?.cardA?.id);
  assert.ok(started.pair?.cardA?.rating, 'campeão traz faixa (Q20)');
  assert.equal('rating' in (started.pair.cardB || {}), false, 'desafiante sem rating');

  const runState = started.next;
  const { ratingA, ratingB } = runState.juizoRun;
  const wrong = ratingA === ratingB
    ? 'higher'
    : (isCorrectJuizoGuess(ratingA, ratingB, 'higher') ? 'lower' : 'higher');
  const fail = juizoGuess(runState, wrong, pool, { rng });
  assert.equal(fail.ok, true);
  assert.equal(fail.ended, true);
  assert.equal(fail.ratingA, ratingA);
  assert.equal(fail.ratingB, ratingB);
  assert.equal(fail.deltaLabel, juizoDeltaLabel(ratingA, ratingB));
  assert.equal(fail.next.juizoCurrentStreak, 0);
  assert.equal(fail.next.juizoRun, null);
});

await run('acerto promove sempre o desafiante (F3 / Q19)', () => {
  const pool = makePool();

  const high = blankState();
  high.juizoRun = {
    championId: 'g-a',
    challengerId: 'g-b',
    ratingA: '12',
    ratingB: '18',
    recentIds: [],
  };
  const hitB = juizoGuess(high, 'B', pool, { rng: () => 0.9 });
  assert.equal(hitB.ok, true);
  assert.equal(hitB.ended, false);
  assert.equal(hitB.next.juizoRun.championId, 'g-b');
  assert.equal(hitB.next.juizoCurrentStreak, 1);
  assert.equal(hitB.ratingA, '12');
  assert.equal(hitB.ratingB, '18');
  assert.ok(hitB.pair?.cardA?.rating);
  assert.equal('rating' in (hitB.pair.cardB || {}), false);

  const low = blankState();
  low.juizoRun = {
    championId: 'g-b',
    challengerId: 'g-a',
    ratingA: '18',
    ratingB: '12',
    recentIds: [],
  };
  const hitA = juizoGuess(low, 'A', pool, { rng: () => 0.9 });
  assert.equal(hitA.ok, true);
  assert.equal(hitA.ended, false);
  assert.equal(hitA.next.juizoRun.championId, 'g-a', 'mesmo no Menor legado, desafiante assume');
  assert.equal(hitA.ratingA, '18');
  assert.equal(hitA.ratingB, '12');
});

await run('streak + milestone paga 1×', () => {
  const claimedOnce = claimJuizoMilestones(0, 10, []);
  assert.ok(claimedOnce.newly.includes('s5'));
  assert.ok(claimedOnce.newly.includes('s10'));
  assert.equal(claimedOnce.verdictGain, 1 + 2);

  const again = claimJuizoMilestones(0, 10, claimedOnce.claimed);
  assert.deepEqual(again.newly, []);
  assert.equal(again.verdictGain, 0);

  const afterDeath = claimJuizoMilestones(10, 10, claimedOnce.claimed);
  assert.deepEqual(afterDeath.newly, []);
});

await run('abandon zera current e não vaza ratings', () => {
  const pool = makePool();
  const started = juizoStart(blankState(), pool, { rng: () => 0.1 });
  started.next.juizoCurrentStreak = 4;
  const abandoned = juizoAbandon(started.next);
  assert.equal(abandoned.ok, true);
  assert.equal(abandoned.abandoned, true);
  assert.equal(abandoned.next.juizoCurrentStreak, 0);
  assert.equal(abandoned.next.juizoRun, null);
  assert.equal('ratingA' in abandoned, false);
  assert.equal('ratingB' in abandoned, false);
});

await run('acerto em empate também promove desafiante', () => {
  const pool = makePool();
  const state = blankState();
  state.juizoRun = {
    championId: 'g-a',
    challengerId: 'g-c',
    ratingA: '12',
    ratingB: '12',
    recentIds: [],
  };
  const result = juizoGuess(state, 'tie', pool, { rng: () => 0.9 });
  assert.equal(result.ok, true);
  assert.equal(result.ended, false);
  assert.equal(result.next.juizoRun.championId, 'g-c');
  assert.equal(result.next.juizoCurrentStreak, 1);
  assert.equal(result.ratingA, '12');
  assert.equal(result.ratingB, '12');
  assert.ok(result.pair?.cardA?.rating, 'próximo campeão traz faixa');
  assert.equal('rating' in (result.pair.cardB || {}), false);
});

console.log(`\ndespertar-juizo-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
