/**
 * Lógica pura do Juízo do Tartarus (Task 18).
 * Pool e ratings ficam no server; cliente só vê cards públicos.
 *
 * Task F2: mercy (`catalogo_vivo`) · eco Veredito (`eco_do_veredito`).
 */

import {
  JUIZO_RATING_ORDER,
  JUIZO_READY_POOL,
  isJuizoPoolReady,
  toPublicJuizoCard,
} from '../../js/hades-despertar/config/juizo-pool.js';
import { asNonNegInt, asStringArray } from './despertar-validate.js';
import { bumpJuizoTieWins, statsToRowJson } from './despertar-stats.js';

export const JUIZO_CHOICES = Object.freeze(['A', 'B', 'tie']);

/** Aliases dle (Task D3) → choice canônico A/B/tie. */
export const JUIZO_CHOICE_ALIASES = Object.freeze({
  higher: 'B', // desafiante > campeão
  lower: 'A', // desafiante < campeão
  tie: 'tie',
  A: 'A',
  B: 'B',
});

/**
 * Normaliza choice UI/legado para A | B | tie.
 * @returns {'A'|'B'|'tie'|null}
 */
export function normalizeJuizoChoice(choice) {
  const raw = String(choice ?? '');
  if (Object.prototype.hasOwnProperty.call(JUIZO_CHOICE_ALIASES, raw)) {
    return JUIZO_CHOICE_ALIASES[raw];
  }
  const lower = raw.toLowerCase();
  if (lower === 'higher') return 'B';
  if (lower === 'lower') return 'A';
  if (lower === 'tie') return 'tie';
  return null;
}

/** Milestones de melhor streak → Vereditos (1×). J.2 / B1 Soft: +s20. */
export const JUIZO_STREAK_MILESTONES = Object.freeze([
  { id: 's5', streak: 5, verdicts: 1 },
  { id: 's10', streak: 10, verdicts: 2 },
  { id: 's15', streak: 15, verdicts: 3 },
  { id: 's20', streak: 20, verdicts: 4 },
  { id: 's25', streak: 25, verdicts: 5 },
  { id: 's40', streak: 40, verdicts: 8 },
  { id: 's60', streak: 60, verdicts: 12 },
  { id: 's100', streak: 100, verdicts: 20 },
]);

/** Teto teórico de Vereditos via milestones (soma dos payouts). */
export const JUIZO_MILESTONE_VERDICT_CAP = JUIZO_STREAK_MILESTONES.reduce(
  (sum, m) => sum + m.verdicts,
  0,
);

const RECENT_EXCLUDE = 8;

function asMilestonesObject(raw) {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : {};
}

function hasPurchase(state, id) {
  return asStringArray(state?.verdictPurchases).includes(id);
}

/**
 * F-D4 — `verdictBonusPending` derivado: owns eco && !ecoVereditoConsumed.
 * Consumo sticky (OR) anti re-arm via sync de milestones.
 */
export function isVerdictBonusPending(state) {
  if (!hasPurchase(state, 'eco_do_veredito')) return false;
  return !Boolean(asMilestonesObject(state.milestones).ecoVereditoConsumed);
}

/**
 * Aplica +1 Veredito se há claim novo e pending.
 * @returns {{ verdictGain: number, milestones: object, ecoBonus: number, verdictBonusPending: boolean }}
 */
export function applyEcoVereditoBonus(state, milestonesResult) {
  const marks = asMilestonesObject(state.milestones);
  const newly = Array.isArray(milestonesResult?.newly) ? milestonesResult.newly : [];
  const baseGain = Math.max(0, Number(milestonesResult?.verdictGain) || 0);
  const pending = isVerdictBonusPending(state);
  if (!pending || newly.length === 0) {
    return {
      verdictGain: baseGain,
      milestones: marks,
      ecoBonus: 0,
      verdictBonusPending: pending,
    };
  }
  return {
    verdictGain: baseGain + 1,
    milestones: { ...marks, ecoVereditoConsumed: true },
    ecoBonus: 1,
    verdictBonusPending: false,
  };
}

export function ratingRank(rating, order = JUIZO_RATING_ORDER) {
  const idx = order.indexOf(String(rating));
  return idx >= 0 ? idx : -1;
}

export function isCorrectJuizoGuess(ratingA, ratingB, choice, order = JUIZO_RATING_ORDER) {
  const a = ratingRank(ratingA, order);
  const b = ratingRank(ratingB, order);
  if (a < 0 || b < 0) return false;
  const pick = normalizeJuizoChoice(choice);
  if (!pick) return false;
  if (pick === 'tie') return a === b;
  if (pick === 'A') return a > b;
  if (pick === 'B') return b > a;
  return false;
}

export function juizoDeltaLabel(ratingA, ratingB) {
  return `${ratingA} → ${ratingB}`;
}

/**
 * Concede milestones ainda não claimados cujo limiar o melhor streak já alcançou.
 * Catch-up (J.2): marcos novos (ex. s20) pagam na próxima avaliação se best ≥ limiar.
 *
 * @param {number} bestBefore
 * @param {number} bestAfter
 * @param {string[]} [claimed]
 */
export function claimJuizoMilestones(bestBefore, bestAfter, claimed = []) {
  void bestBefore; // mantido na assinatura (call sites / histórico de cruzamento)
  const have = new Set(asStringArray(claimed));
  const newly = [];
  let verdictGain = 0;
  const after = Math.max(0, Number(bestAfter) || 0);
  for (const m of JUIZO_STREAK_MILESTONES) {
    if (have.has(m.id)) continue;
    if (after >= m.streak) {
      newly.push(m.id);
      verdictGain += m.verdicts;
      have.add(m.id);
    }
  }
  return {
    newly,
    verdictGain,
    claimed: JUIZO_STREAK_MILESTONES.map((m) => m.id).filter((id) => have.has(id)),
  };
}

function defaultRng() {
  return Math.random();
}

function pickDistinct(pool, count, exclude, rng) {
  const banned = new Set(exclude);
  const candidates = pool.filter((g) => !banned.has(g.id));
  if (candidates.length < count) return null;
  const picked = [];
  const bag = [...candidates];
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(rng() * bag.length);
    picked.push(bag.splice(idx, 1)[0]);
  }
  return picked;
}

export function buildJuizoRun(champion, challenger, recentIds = [], extras = {}) {
  return {
    championId: champion.id,
    challengerId: challenger.id,
    ratingA: String(champion.rating),
    ratingB: String(challenger.rating),
    recentIds: [...recentIds].slice(-RECENT_EXCLUDE),
    mercyUsed: Boolean(extras.mercyUsed),
  };
}

export function publicPairFromRun(run, poolById) {
  const a = poolById[run.championId];
  const b = poolById[run.challengerId];
  if (!a || !b) return null;
  // Q20: faixa do campeão visível; desafiante nunca leva rating no payload.
  return {
    cardA: { ...toPublicJuizoCard(a), rating: String(a.rating) },
    cardB: toPublicJuizoCard(b),
  };
}

export function juizoHud(state) {
  return {
    streak: asNonNegInt(state.juizoCurrentStreak),
    best: asNonNegInt(state.juizoBestStreak),
    verdicts: asNonNegInt(state.verdicts),
  };
}

function dealNextChallenger(pool, championId, recentIds, rng) {
  const recent = asStringArray(recentIds).filter(Boolean).slice(-RECENT_EXCLUDE);
  return pickDistinct(pool, 1, [championId, ...recent], rng)
    || pickDistinct(pool, 1, [championId], rng);
}

/**
 * @param {object} state canonical
 * @param {object[]} pool ready games
 * @param {{ rng?: () => number }} [opts]
 */
export function juizoStart(state, pool = JUIZO_READY_POOL, opts = {}) {
  const usingDefault = pool === JUIZO_READY_POOL;
  if (usingDefault && !isJuizoPoolReady()) {
    return { ok: false, status: 503, error: 'O Juízo ainda cataloga as almas.' };
  }
  if (!Array.isArray(pool) || pool.length < 2) {
    return { ok: false, status: 503, error: 'O Juízo ainda cataloga as almas.' };
  }

  const rng = typeof opts.rng === 'function' ? opts.rng : defaultRng;
  const pair = pickDistinct(pool, 2, [], rng);
  if (!pair) {
    return { ok: false, status: 503, error: 'O Juízo ainda cataloga as almas.' };
  }
  const [champion, challenger] = pair;
  const run = buildJuizoRun(champion, challenger, [], { mercyUsed: false });
  const next = {
    ...state,
    juizoCurrentStreak: 0,
    juizoRun: run,
  };
  const poolById = Object.fromEntries(pool.map((g) => [g.id, g]));
  const cards = publicPairFromRun(run, poolById);
  return {
    ok: true,
    next,
    pair: cards,
    hud: juizoHud(next),
    ended: false,
  };
}

/**
 * @param {object} state
 * @param {'A'|'B'|'tie'|'higher'|'lower'} choice
 * @param {object[]} pool
 * @param {{ rng?: () => number }} [opts]
 */
export function juizoGuess(state, choice, pool = JUIZO_READY_POOL, opts = {}) {
  const run = state.juizoRun;
  if (!run?.championId || !run?.challengerId) {
    return { ok: false, status: 400, error: 'Não há julgamento em curso.' };
  }
  const pick = normalizeJuizoChoice(choice);
  if (!pick || !JUIZO_CHOICES.includes(pick)) {
    return { ok: false, status: 400, error: 'Escolha inválida.' };
  }

  const correct = isCorrectJuizoGuess(run.ratingA, run.ratingB, pick);
  const brokenStreak = asNonNegInt(state.juizoCurrentStreak);
  const poolById = Object.fromEntries(pool.map((g) => [g.id, g]));
  const rng = typeof opts.rng === 'function' ? opts.rng : defaultRng;

  if (!correct) {
    // F-D5: Catálogo Vivo — 1 mercy / corrida (server-only).
    const canMercy = hasPurchase(state, 'catalogo_vivo') && !Boolean(run.mercyUsed);
    if (canMercy) {
      const champion = poolById[run.championId];
      if (!champion) {
        return { ok: false, status: 500, error: 'Campeão ausente do pool.' };
      }
      const recent = [...asStringArray(run.recentIds), run.challengerId]
        .filter(Boolean)
        .slice(-RECENT_EXCLUDE);
      const nextPick = dealNextChallenger(pool, run.championId, recent, rng);
      if (!nextPick) {
        return { ok: false, status: 503, error: 'O Juízo ainda cataloga as almas.' };
      }
      const nextRun = buildJuizoRun(champion, nextPick[0], recent, { mercyUsed: true });
      const next = {
        ...state,
        juizoRun: nextRun,
      };
      return {
        ok: true,
        next,
        ended: false,
        mercy: true,
        ratingA: run.ratingA,
        ratingB: run.ratingB,
        deltaLabel: juizoDeltaLabel(run.ratingA, run.ratingB),
        brokenStreak,
        pair: publicPairFromRun(nextRun, poolById),
        hud: juizoHud(next),
        milestones: { newly: [], verdictGain: 0, ecoBonus: 0 },
      };
    }

    const next = {
      ...state,
      juizoCurrentStreak: 0,
      juizoRun: null,
    };
    return {
      ok: true,
      next,
      ended: true,
      ratingA: run.ratingA,
      ratingB: run.ratingB,
      deltaLabel: juizoDeltaLabel(run.ratingA, run.ratingB),
      brokenStreak,
      hud: juizoHud(next),
      milestones: { newly: [], verdictGain: 0, ecoBonus: 0 },
    };
  }

  const current = brokenStreak + 1;
  const bestBefore = asNonNegInt(state.juizoBestStreak);
  const bestAfter = Math.max(bestBefore, current);
  const milestones = claimJuizoMilestones(
    bestBefore,
    bestAfter,
    state.juizoMilestonesClaimed,
  );
  const eco = applyEcoVereditoBonus(state, milestones);

  // F3 — sempre o desafiante vira o próximo campeão (slide clássico HL).
  const championId = run.challengerId;
  const champion = poolById[championId];
  if (!champion) {
    return { ok: false, status: 500, error: 'Campeão ausente do pool.' };
  }

  const recent = [...asStringArray(run.recentIds), run.championId, run.challengerId]
    .filter(Boolean)
    .slice(-RECENT_EXCLUDE);
  const nextPick = dealNextChallenger(pool, championId, recent, rng);
  if (!nextPick) {
    return { ok: false, status: 503, error: 'O Juízo ainda cataloga as almas.' };
  }
  const challenger = nextPick[0];
  const nextRun = buildJuizoRun(champion, challenger, recent, {
    mercyUsed: Boolean(run.mercyUsed),
  });
  const next = {
    ...state,
    juizoCurrentStreak: current,
    juizoBestStreak: bestAfter,
    juizoMilestonesClaimed: milestones.claimed,
    verdicts: asNonNegInt(state.verdicts) + eco.verdictGain,
    juizoRun: nextRun,
    milestones: eco.milestones,
    // D1: empate acertado — métrica autoritativa (P1 conquistas).
    ...(pick === 'tie' ? { stats: bumpJuizoTieWins(state.stats) } : {}),
  };

  return {
    ok: true,
    next,
    ended: false,
    // Reveal das faixas da rodada vencida (juice); próximo par sem rating do desafiante.
    ratingA: run.ratingA,
    ratingB: run.ratingB,
    pair: publicPairFromRun(nextRun, poolById),
    hud: juizoHud(next),
    milestones: {
      newly: milestones.newly,
      verdictGain: eco.verdictGain,
      ecoBonus: eco.ecoBonus,
    },
  };
}

export function juizoAbandon(state) {
  const next = {
    ...state,
    juizoCurrentStreak: 0,
    juizoRun: null,
  };
  return {
    ok: true,
    next,
    ended: true,
    abandoned: true,
    hud: juizoHud(next),
  };
}

/** Patch SQL só dos campos Juízo / Bancada (+ stats / milestones F2 se presente). */
export function juizoPatchFromState(state) {
  const patch = {
    verdicts: asNonNegInt(state.verdicts),
    juizo_best_streak: asNonNegInt(state.juizoBestStreak),
    juizo_current_streak: asNonNegInt(state.juizoCurrentStreak),
    juizo_milestones_claimed: asStringArray(state.juizoMilestonesClaimed),
    verdict_purchases: asStringArray(state.verdictPurchases),
    juizo_run: state.juizoRun ?? null,
  };
  if (state.stats != null) {
    patch.stats = statsToRowJson(state.stats);
  }
  if (state.milestones != null) {
    patch.milestones = asMilestonesObject(state.milestones);
  }
  return patch;
}
