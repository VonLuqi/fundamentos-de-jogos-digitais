/**
 * Conquistas e Códice do Despertar (Task 12).
 * Regras puras — sem I/O. O grant grava em users via api/despertar.js.
 */

import { LETHE_PREVIEW_RUN_SOULS, STYX_UNLOCK_SOULS } from '../../js/hades-despertar/config/constants.js';
import { EDU_LOG_IDS } from '../../js/hades-despertar/config/edu-logs.js';
import { GENERATORS } from '../../js/hades-despertar/config/generators.js';
import { VERDICT_SHOP_IDS } from '../../js/hades-despertar/config/verdict-shop.js';
import { cmp } from '../../js/hades-despertar/core/decimal.js';
import { calculateTotalSPS, canPrestige } from '../../js/hades-despertar/core/formulas.js';

/** Segundos de ausência creditável para `milestones.offline` / paciencia (D2). */
export const DESPERTAR_PACIENCIA_OFFLINE_SECONDS = 3600;

export const DESPERTAR_PUBLIC_IDS = Object.freeze([
  'despertar_primeira_alma',
  'despertar_primeira_sombra',
  'despertar_automacao',
  'despertar_forja',
  'despertar_trono',
  'despertar_catabase',
  'despertar_mnemosyne',
  'despertar_soberania',
  'despertar_juizo_5',
  'despertar_juizo_25',
  'despertar_veredito',
  // Fase D / D2 — P0 novas (11 públicas)
  'despertar_cem_almas',
  'despertar_mil_almas',
  'despertar_milhao',
  'despertar_styx_primeiro',
  'despertar_styx_cinco',
  'despertar_shiny',
  'despertar_gold',
  'despertar_catabase_3',
  'despertar_juizo_1',
  'despertar_juizo_10',
  'despertar_bancada_cheia',
]);

export const DESPERTAR_HIDDEN_IDS = Object.freeze([
  'despertar_arquiteto_do_loop',
  'despertar_paciencia',
]);

export const DESPERTAR_ACHIEVEMENT_IDS = Object.freeze([
  ...DESPERTAR_PUBLIC_IDS,
  ...DESPERTAR_HIDDEN_IDS,
]);

/**
 * Ladder Álbum ↔ `juizoBestStreak` (Fase D / D3).
 * Independente dos Vereditos (`JUIZO_STREAK_MILESTONES` s5/s10/… na Bancada).
 * Grant no sync e early em `juizoGuess` via `planDespertarAwards`.
 */
export const DESPERTAR_JUIZO_STREAK_THRESHOLDS = Object.freeze({
  despertar_juizo_1: 1,
  despertar_juizo_5: 5,
  despertar_juizo_10: 10,
  despertar_juizo_25: 25,
});

/**
 * Logs cujo gatilho o estado autoritativo *poderia* ter disparado.
 * Não confia em eduLogsSeen do cliente além desta interseção.
 */
export function computeEligibleEduLogs(state = {}, { syncOk = false } = {}) {
  const generators = state.generators && typeof state.generators === 'object'
    ? state.generators
    : {};
  const upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
  const milestones = state.milestones && typeof state.milestones === 'object'
    ? state.milestones
    : {};
  const qtyValues = Object.values(generators).map((n) => Number(n) || 0);
  const ownedAny = qtyValues.some((n) => n >= 1);
  const ownedFive = qtyValues.some((n) => n >= 5);
  const lifetime = state.lifetimeSouls ?? '0';
  const souls = state.souls ?? '0';
  const runSouls = state.runSouls ?? '0';
  const prestigeCount = Number(state.prestigeCount) || 0;

  const eligible = [];
  if (cmp(lifetime, '1') >= 0) eligible.push('log_input');
  if (cmp(lifetime, '10') >= 0 || cmp(souls, '10') >= 0) eligible.push('log_state');
  // Loop vivo: produção passiva ou qualquer alma ceifada/colhida.
  if (ownedAny || cmp(lifetime, '1') >= 0) eligible.push('log_loop');
  // Delta/ausência: exige catábase ou marco explícito (não basta lifetime=1).
  if (prestigeCount >= 1 || milestones.delta) eligible.push('log_delta');
  if (ownedAny) eligible.push('log_generator');
  if (ownedFive) eligible.push('log_curve');
  if ((Number(generators.cerberian_hound) || 0) >= 1 || milestones.amort) {
    eligible.push('log_amort');
  }
  if (upgrades.length >= 1) eligible.push('log_upgrade');
  if (cmp(runSouls, LETHE_PREVIEW_RUN_SOULS) >= 0 || prestigeCount >= 1) {
    eligible.push('log_wall');
  }
  const obols = state.obols ?? '0';
  const mnemosyne = state.mnemosyne ?? '0';
  const ritualReady = canPrestige(runSouls);
  const letheOpen =
    prestigeCount >= 1
    || cmp(obols, '0') > 0
    || cmp(mnemosyne, '0') > 0
    || ritualReady
    || cmp(runSouls, LETHE_PREVIEW_RUN_SOULS) >= 0;
  if (letheOpen) eligible.push('log_lethe_unlock');
  // Ritual: pronto agora, ou já prestigiou (já passou pelo CTA).
  if (ritualReady || prestigeCount >= 1) eligible.push('log_lethe_ritual');
  if (ownedAny || cmp(souls, STYX_UNLOCK_SOULS) >= 0) eligible.push('log_styx_open');
  if (prestigeCount >= 1) eligible.push('log_prestige');
  if (syncOk) eligible.push('log_authority');
  // Offline longo: marco ou progresso substancial (não DevTools com 1 clique).
  if (milestones.offline || cmp(lifetime, '1000') >= 0) eligible.push('log_offline');
  const verdictPurchases = Array.isArray(state.verdictPurchases) ? state.verdictPurchases : [];
  if (verdictPurchases.length >= 1) eligible.push('log_juizo');

  // B3 — mecânica (Foice, Mercado, Juramentos, Vereditos, Óbolos)
  const clickCount = Number(state.clickCount) || 0;
  if (clickCount >= 25 || milestones.reap) eligible.push('log_reap_power');
  if (ownedAny || milestones.buyModes) eligible.push('log_buy_modes');
  if (
    upgrades.length >= 1
    || ownedAny
    || cmp(souls, STYX_UNLOCK_SOULS) >= 0
  ) {
    eligible.push('log_sealed_juramentos');
  }
  const verdicts = Number(state.verdicts) || 0;
  if (verdicts >= 1 || verdictPurchases.length >= 1) {
    eligible.push('log_verdicts_milestone');
  }
  if (prestigeCount >= 1 || cmp(obols, '0') > 0) {
    eligible.push('log_obols_bonus');
  }

  return EDU_LOG_IDS.filter((id) => eligible.includes(id));
}

/** Intersecta claims do cliente com elegibilidade do servidor. */
export function sanitizeEduLogsSeen(claimed = [], state = {}, context = {}) {
  const eligible = new Set(computeEligibleEduLogs(state, context));
  const claimedSet = new Set(
    (Array.isArray(claimed) ? claimed : []).map((id) => String(id)),
  );
  return EDU_LOG_IDS.filter((id) => claimedSet.has(id) && eligible.has(id));
}

function hasAllGenerators(generators = {}) {
  return GENERATORS.every((def) => (Number(generators[def.id]) || 0) >= 1);
}

function sumRarityCounts(counts = {}) {
  if (!counts || typeof counts !== 'object') return 0;
  return Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

function hasFullVerdictShop(purchases = []) {
  const owned = new Set((Array.isArray(purchases) ? purchases : []).map((id) => String(id)));
  return VERDICT_SHOP_IDS.every((id) => owned.has(id));
}

/**
 * @param {object} state canônico (souls, generators, …)
 * @param {{ unlocked?: string[], syncOk?: boolean }} [options]
 */
export function evaluateDespertarAchievementIds(state = {}, options = {}) {
  const unlocked = new Set(
    (Array.isArray(options.unlocked) ? options.unlocked : []).map((id) => String(id)),
  );
  const generators = state.generators && typeof state.generators === 'object'
    ? state.generators
    : {};
  const upgrades = Array.isArray(state.upgrades) ? state.upgrades : [];
  const talents = Array.isArray(state.talents) ? state.talents : [];
  const milestones = state.milestones && typeof state.milestones === 'object'
    ? state.milestones
    : {};
  const prestigeCount = Number(state.prestigeCount) || 0;
  const shinyCounts = state.shinyCounts || {};
  const goldCounts = state.goldCounts || {};
  const sps = calculateTotalSPS({
    generators,
    upgrades,
    talents,
    obols: state.obols || '0',
    verdictPurchases: state.verdictPurchases || [],
    shinyCounts,
    goldCounts,
  });

  const earned = [];
  const take = (id, cond) => {
    if (!unlocked.has(id) && cond) earned.push(id);
  };

  take('despertar_primeira_alma', cmp(state.lifetimeSouls || '0', '1') >= 0);
  take(
    'despertar_primeira_sombra',
    (Number(generators.wandering_shade) || 0) >= 1 || Boolean(milestones.shade),
  );
  take('despertar_automacao', cmp(sps, '1') >= 0);
  take(
    'despertar_forja',
    (Number(generators.phlegethon_forge) || 0) >= 1 || Boolean(milestones.forge),
  );
  take(
    'despertar_trono',
    (Number(generators.obsidian_throne) || 0) >= 1 || Boolean(milestones.throne),
  );
  take('despertar_catabase', prestigeCount >= 1);
  take('despertar_mnemosyne', talents.length >= 1);
  take('despertar_soberania', hasAllGenerators(generators));

  const juizoBest = Number(state.juizoBestStreak) || 0;
  const verdictPurchases = Array.isArray(state.verdictPurchases) ? state.verdictPurchases : [];
  for (const [id, threshold] of Object.entries(DESPERTAR_JUIZO_STREAK_THRESHOLDS)) {
    take(id, juizoBest >= threshold);
  }
  take('despertar_veredito', verdictPurchases.length >= 1);

  // Fase D / D2 — P0 novas (campos já autoritativos)
  const lifetime = state.lifetimeSouls || '0';
  take('despertar_cem_almas', cmp(lifetime, '100') >= 0);
  take('despertar_mil_almas', cmp(lifetime, '1000') >= 0);
  take('despertar_milhao', cmp(lifetime, '1000000') >= 0);
  take('despertar_styx_primeiro', upgrades.length >= 1);
  take('despertar_styx_cinco', upgrades.length >= 5);
  take('despertar_shiny', sumRarityCounts(shinyCounts) >= 1);
  take('despertar_gold', sumRarityCounts(goldCounts) >= 1);
  take('despertar_catabase_3', prestigeCount >= 3);
  take('despertar_bancada_cheia', hasFullVerdictShop(verdictPurchases));
  take('despertar_paciencia', Boolean(milestones.offline));

  const syncOk = options.syncOk !== false;
  const eligible = computeEligibleEduLogs(state, { syncOk });
  const seen = sanitizeEduLogsSeen(state.eduLogsSeen || [], state, { syncOk });
  take(
    'despertar_arquiteto_do_loop',
    eligible.length === EDU_LOG_IDS.length && seen.length === EDU_LOG_IDS.length,
  );

  return earned;
}
