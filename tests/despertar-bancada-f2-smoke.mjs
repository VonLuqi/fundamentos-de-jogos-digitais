/**
 * Smoke Task F2 — Bancada +4 · mercy Juízo · eco do veredito.
 * Uso: node tests/despertar-bancada-f2-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VERDICT_SHOP,
  VERDICT_SHOP_IDS,
  VERDICT_SHOP_TOTAL_COST,
  isKnownVerdictPurchase,
} from '../js/hades-despertar/config/verdict-shop.js';
import { clickPower, calculateTotalSPS, economyEffects } from '../js/hades-despertar/core/formulas.js';
import { cmp, mul } from '../js/hades-despertar/core/decimal.js';
import {
  applyEcoVereditoBonus,
  claimJuizoMilestones,
  isVerdictBonusPending,
  juizoGuess,
  juizoStart,
} from '../api/_lib/despertar-juizo.js';
import { applyVerdictBuy } from '../api/_lib/despertar-validate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const F2_IDS = [
  'sentenca_afiada',
  'eco_do_veredito',
  'catalogo_vivo',
  'peso_das_faixas',
];

staticAssert(VERDICT_SHOP.length === 8, '8 itens na Bancada após F2');
staticAssert(VERDICT_SHOP_TOTAL_COST === 64, 'Bancada total 64 V');
for (const id of F2_IDS) {
  staticAssert(isKnownVerdictPurchase(id), `item F2: ${id}`);
  staticAssert(VERDICT_SHOP_IDS.includes(id), `IDS inclui ${id}`);
}

const shop = Object.fromEntries(VERDICT_SHOP.map((i) => [i.id, i]));
staticAssert(shop.sentenca_afiada?.cost === 6, 'sentença custa 6');
staticAssert(shop.eco_do_veredito?.cost === 8, 'eco custa 8');
staticAssert(shop.catalogo_vivo?.cost === 10, 'catálogo custa 10');
staticAssert(shop.peso_das_faixas?.cost === 14, 'peso custa 14');

const juizoSrc = fs.readFileSync(path.join(root, 'api/_lib/despertar-juizo.js'), 'utf8');
const modalSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/JuizoModal.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(juizoSrc.includes('mercyUsed'), 'mercyUsed no run');
staticAssert(juizoSrc.includes('catalogo_vivo'), 'mercy catalogo_vivo');
staticAssert(juizoSrc.includes('applyEcoVereditoBonus'), 'eco helper');
staticAssert(juizoSrc.includes('ecoVereditoConsumed'), 'consumo sticky');
staticAssert(juizoSrc.includes('patch.milestones'), 'juizo patch grava milestones');
staticAssert(modalSrc.includes('result.mercy'), 'modal trata mercy');
staticAssert(pkg.includes('despertar-bancada-f2-smoke.mjs'), 'check inclui F2 smoke');

if (errors.length) {
  console.error('despertar-bancada-f2-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

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

function makePool() {
  return [
    { id: 'g-a', title: 'A', rating: '12', blurb: '', cover: 'a.webp', descriptors: [] },
    { id: 'g-b', title: 'B', rating: '18', blurb: '', cover: 'b.webp', descriptors: [] },
    { id: 'g-c', title: 'C', rating: '12', blurb: '', cover: 'c.webp', descriptors: [] },
    { id: 'g-d', title: 'D', rating: '10', blurb: '', cover: 'd.webp', descriptors: [] },
    { id: 'g-e', title: 'E', rating: '16', blurb: '', cover: 'e.webp', descriptors: [] },
  ];
}

run('sentenca_afiada ×1.08 click (stack com selo)', () => {
  const base = clickPower({});
  const one = clickPower({ verdictPurchases: ['sentenca_afiada'] });
  assert.equal(cmp(one, mul(base, '1.08')), 0);
  const both = clickPower({ verdictPurchases: ['selo_do_juiz', 'sentenca_afiada'] });
  assert.equal(cmp(both, mul(mul(base, '1.05'), '1.08')), 0);
});

run('peso_das_faixas ×1.03 SPS (stack com olho)', () => {
  const args = { generators: { wandering_shade: 10 } };
  const base = calculateTotalSPS(args);
  const one = calculateTotalSPS({ ...args, verdictPurchases: ['peso_das_faixas'] });
  assert.equal(cmp(one, mul(base, '1.03')), 0);
  const both = calculateTotalSPS({
    ...args,
    verdictPurchases: ['olho_do_tartarus', 'peso_das_faixas'],
  });
  assert.equal(cmp(both, mul(mul(base, '1.02'), '1.03')), 0);
  const eco = economyEffects([], ['peso_das_faixas']);
  assert.equal(cmp(eco.spsVerdictMult, '1.03'), 0);
});

run('eco pending derivado + consome 1× no claim', () => {
  const state = {
    verdictPurchases: ['eco_do_veredito'],
    milestones: {},
    verdicts: 0,
  };
  assert.equal(isVerdictBonusPending(state), true);
  const claimed = claimJuizoMilestones(0, 5, []);
  assert.deepEqual(claimed.newly, ['s5']);
  const eco = applyEcoVereditoBonus(state, claimed);
  assert.equal(eco.ecoBonus, 1);
  assert.equal(eco.verdictGain, 1 + 1);
  assert.equal(eco.milestones.ecoVereditoConsumed, true);
  assert.equal(eco.verdictBonusPending, false);

  const again = applyEcoVereditoBonus(
    { ...state, milestones: eco.milestones },
    claimJuizoMilestones(5, 10, claimed.claimed),
  );
  assert.equal(again.ecoBonus, 0);
  assert.equal(again.verdictGain, 2);
});

run('eco sem newly não consome', () => {
  const state = { verdictPurchases: ['eco_do_veredito'], milestones: {} };
  const eco = applyEcoVereditoBonus(state, { newly: [], verdictGain: 0 });
  assert.equal(eco.ecoBonus, 0);
  assert.equal(isVerdictBonusPending({ ...state, milestones: eco.milestones }), true);
});

run('mercy: 1º erro continua; 2º encerra', () => {
  const pool = makePool();
  const base = {
    juizoCurrentStreak: 3,
    juizoBestStreak: 3,
    juizoMilestonesClaimed: [],
    verdicts: 0,
    verdictPurchases: ['catalogo_vivo'],
    milestones: {},
    juizoRun: {
      championId: 'g-a',
      challengerId: 'g-b',
      ratingA: '12',
      ratingB: '18',
      recentIds: [],
      mercyUsed: false,
    },
  };
  // wrong: A when B is higher
  const mercy = juizoGuess(base, 'A', pool, { rng: () => 0.9 });
  assert.equal(mercy.ok, true);
  assert.equal(mercy.ended, false);
  assert.equal(mercy.mercy, true);
  assert.equal(mercy.next.juizoCurrentStreak, 3, 'streak preservada');
  assert.equal(mercy.next.juizoRun.mercyUsed, true);
  assert.ok(mercy.next.juizoRun.challengerId);

  const fatal = juizoGuess(mercy.next, 'A', pool, { rng: () => 0.9 });
  // may be correct or wrong depending on new pair — force wrong via known ratings
  const forced = {
    ...mercy.next,
    juizoRun: {
      ...mercy.next.juizoRun,
      ratingA: '12',
      ratingB: '18',
      championId: 'g-a',
      challengerId: 'g-b',
      mercyUsed: true,
    },
  };
  const end = juizoGuess(forced, 'A', pool, { rng: () => 0.9 });
  assert.equal(end.ok, true);
  assert.equal(end.ended, true);
  assert.equal(end.next.juizoCurrentStreak, 0);
  assert.equal(end.next.juizoRun, null);
  void fatal;
});

run('sem catalogo_vivo, erro encerra na hora', () => {
  const pool = makePool();
  const state = {
    juizoCurrentStreak: 2,
    juizoBestStreak: 2,
    juizoMilestonesClaimed: [],
    verdicts: 0,
    verdictPurchases: [],
    juizoRun: {
      championId: 'g-a',
      challengerId: 'g-b',
      ratingA: '12',
      ratingB: '18',
      recentIds: [],
      mercyUsed: false,
    },
  };
  const fail = juizoGuess(state, 'A', pool, { rng: () => 0.9 });
  assert.equal(fail.ended, true);
  assert.equal(fail.mercy, undefined);
});

run('juizoGuess paga eco no milestone s5', () => {
  const pool = makePool();
  const state = {
    juizoCurrentStreak: 4,
    juizoBestStreak: 4,
    juizoMilestonesClaimed: [],
    verdicts: 0,
    verdictPurchases: ['eco_do_veredito'],
    milestones: {},
    juizoRun: {
      championId: 'g-a',
      challengerId: 'g-b',
      ratingA: '12',
      ratingB: '18',
      recentIds: [],
      mercyUsed: false,
    },
  };
  const hit = juizoGuess(state, 'B', pool, { rng: () => 0.9 });
  assert.equal(hit.ok, true);
  assert.equal(hit.next.juizoCurrentStreak, 5);
  assert.ok(hit.milestones.newly.includes('s5'));
  assert.equal(hit.milestones.ecoBonus, 1);
  assert.equal(hit.milestones.verdictGain, 2); // 1 + eco
  assert.equal(hit.next.verdicts, 2);
  assert.equal(hit.next.milestones.ecoVereditoConsumed, true);
});

run('server verdictBuy aceita ids F2', () => {
  const db = {
    souls: '0.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '0.00',
    run_souls: '0.00',
    prestige_count: 0,
    generators_state: {},
    upgrades_state: [],
    talents_state: [],
    verdicts: 20,
    verdict_purchases: [],
    edu_logs_seen: [],
    milestones: {},
    last_sync_at: '2026-09-22T12:00:00.000Z',
  };
  const buy = applyVerdictBuy(db, 'catalogo_vivo', new Date('2026-09-22T12:01:00.000Z'));
  assert.equal(buy.ok, true);
  assert.ok(buy.next.verdictPurchases.includes('catalogo_vivo'));
  assert.equal(buy.next.verdicts, 10);
});

run('juizoStart zera mercyUsed', () => {
  const pool = makePool();
  const started = juizoStart({
    juizoCurrentStreak: 9,
    juizoBestStreak: 9,
    verdictPurchases: ['catalogo_vivo'],
    juizoRun: null,
  }, pool, { rng: () => 0 });
  assert.equal(started.ok, true);
  assert.equal(started.next.juizoRun.mercyUsed, false);
  assert.equal(started.next.juizoCurrentStreak, 0);
});

console.log(`\ndespertar-bancada-f2-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
