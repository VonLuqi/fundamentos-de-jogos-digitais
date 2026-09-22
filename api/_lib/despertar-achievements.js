/**
 * Conquistas e Códice do Despertar (Task 12).
 * Regras puras — sem I/O. O grant grava em users via api/despertar.js.
 */

import { LETHE_PREVIEW_RUN_SOULS } from '../../js/hades-despertar/config/constants.js';
import { EDU_LOG_IDS } from '../../js/hades-despertar/config/edu-logs.js';
import { GENERATORS } from '../../js/hades-despertar/config/generators.js';
import { cmp } from '../../js/hades-despertar/core/decimal.js';
import { calculateTotalSPS } from '../../js/hades-despertar/core/formulas.js';

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
]);

export const DESPERTAR_HIDDEN_IDS = Object.freeze([
  'despertar_arquiteto_do_loop',
]);

export const DESPERTAR_ACHIEVEMENT_IDS = Object.freeze([
  ...DESPERTAR_PUBLIC_IDS,
  ...DESPERTAR_HIDDEN_IDS,
]);

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
  if (prestigeCount >= 1) eligible.push('log_prestige');
  if (syncOk) eligible.push('log_authority');
  // Offline longo: marco ou progresso substancial (não DevTools com 1 clique).
  if (milestones.offline || cmp(lifetime, '1000') >= 0) eligible.push('log_offline');
  const verdictPurchases = Array.isArray(state.verdictPurchases) ? state.verdictPurchases : [];
  if (verdictPurchases.length >= 1) eligible.push('log_juizo');

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
  const talents = Array.isArray(state.talents) ? state.talents : [];
  const milestones = state.milestones && typeof state.milestones === 'object'
    ? state.milestones
    : {};
  const prestigeCount = Number(state.prestigeCount) || 0;
  const sps = calculateTotalSPS({
    generators,
    upgrades: state.upgrades || [],
    talents,
    obols: state.obols || '0',
    verdictPurchases: state.verdictPurchases || [],
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
  take('despertar_juizo_5', juizoBest >= 5);
  take('despertar_juizo_25', juizoBest >= 25);
  take('despertar_veredito', verdictPurchases.length >= 1);

  const syncOk = options.syncOk !== false;
  const eligible = computeEligibleEduLogs(state, { syncOk });
  const seen = sanitizeEduLogsSeen(state.eduLogsSeen || [], state, { syncOk });
  take(
    'despertar_arquiteto_do_loop',
    eligible.length === EDU_LOG_IDS.length && seen.length === EDU_LOG_IDS.length,
  );

  return earned;
}
