/**
 * Sandbox / debug do Despertar (só Mestre).
 * Reset a zero, concessões de recursos e sandbox Lethe.
 */

import { add } from '../../js/hades-despertar/core/decimal.js';
import { DESPERTAR_ACHIEVEMENT_IDS } from './despertar-achievements.js';

/** Estela vazia — recomeço limpo. */
export const DEBUG_ZERO_PATCH = Object.freeze({
  souls: '0.00',
  obols: '0.00',
  mnemosyne: '0.00',
  lifetime_souls: '0.00',
  run_souls: '0.00',
  prestige_count: 0,
  generators_state: Object.freeze({}),
  upgrades_state: Object.freeze([]),
  talents_state: Object.freeze([]),
  edu_logs_seen: Object.freeze([]),
  milestones: Object.freeze({}),
  verdicts: 0,
  juizo_best_streak: 0,
  juizo_current_streak: 0,
  juizo_milestones_claimed: Object.freeze([]),
  verdict_purchases: Object.freeze([]),
  juizo_run: null,
});

/** Patch SQL autoritativo para playtest (recursos sem rearmar todas as conquistas). */
export const DEBUG_SANDBOX_PATCH = Object.freeze({
  souls: '500000.00',
  obols: '25.00',
  mnemosyne: '100.00',
  lifetime_souls: '500000.00',
  run_souls: '1000000000.00',
  prestige_count: 0,
  generators_state: Object.freeze({}),
  upgrades_state: Object.freeze([]),
  talents_state: Object.freeze([]),
  edu_logs_seen: Object.freeze([]),
  milestones: Object.freeze({}),
  verdicts: 40,
  juizo_best_streak: 0,
  juizo_current_streak: 0,
  juizo_milestones_claimed: Object.freeze([]),
  verdict_purchases: Object.freeze([]),
  juizo_run: null,
});

/**
 * Presets de concessão (somam ao saldo atual).
 * `souls` também incrementa lifetime_souls e run_souls.
 */
export const DEBUG_GRANT_PRESETS = Object.freeze({
  souls_1k: Object.freeze({ label: '+1K almas', souls: '1000' }),
  souls_10k: Object.freeze({ label: '+10K almas', souls: '10000' }),
  souls_100k: Object.freeze({ label: '+100K almas', souls: '100000' }),
  souls_1m: Object.freeze({ label: '+1M almas', souls: '1000000' }),
  souls_1b: Object.freeze({ label: '+1B almas', souls: '1000000000' }),
  obols_1: Object.freeze({ label: '+1 óbolo', obols: '1' }),
  obols_10: Object.freeze({ label: '+10 óbolos', obols: '10' }),
  obols_25: Object.freeze({ label: '+25 óbolos', obols: '25' }),
  mnemosyne_1: Object.freeze({ label: '+1 essência', mnemosyne: '1' }),
  mnemosyne_10: Object.freeze({ label: '+10 essência', mnemosyne: '10' }),
  mnemosyne_50: Object.freeze({ label: '+50 essência', mnemosyne: '50' }),
  verdicts_1: Object.freeze({ label: '+1 veredito', verdicts: 1 }),
  verdicts_5: Object.freeze({ label: '+5 vereditos', verdicts: 5 }),
  verdicts_40: Object.freeze({ label: '+40 vereditos', verdicts: 40 }),
});

const DESPERTAR_ID_SET = new Set(DESPERTAR_ACHIEVEMENT_IDS);

/**
 * Remove conquistas do Despertar e devolve XP correspondente.
 * @param {{ xp?: number, conquistas?: string[] }} user
 * @param {(id: string) => number} getXp
 */
export function stripDespertarAchievements(user, getXp) {
  const existing = Array.isArray(user?.conquistas) ? user.conquistas.map(String) : [];
  const removed = [];
  const kept = [];
  for (const id of existing) {
    if (DESPERTAR_ID_SET.has(id)) removed.push(id);
    else kept.push(id);
  }
  const xpLoss = removed.reduce((sum, id) => sum + (Number(getXp?.(id)) || 0), 0);
  const nextXp = Math.max(0, (Number(user?.xp) || 0) - xpLoss);
  return {
    conquistas: kept,
    removed,
    xpLoss,
    xp: nextXp,
  };
}

/** Cópia mutável de um patch congelado (arrays/objetos). */
export function cloneDebugPatch(base) {
  return {
    ...base,
    generators_state: { ...(base.generators_state || {}) },
    upgrades_state: [...(base.upgrades_state || [])],
    talents_state: [...(base.talents_state || [])],
    edu_logs_seen: [...(base.edu_logs_seen || [])],
    milestones: { ...(base.milestones || {}) },
    juizo_milestones_claimed: [...(base.juizo_milestones_claimed || [])],
    verdict_purchases: [...(base.verdict_purchases || [])],
  };
}

function moneyField(row, key) {
  const raw = row?.[key];
  if (raw == null || raw === '') return '0';
  return String(raw);
}

/**
 * Soma um preset ao estado atual da Estela.
 * @returns {{ ok: true, patch: object, label: string } | { ok: false, error: string }}
 */
export function buildDebugGrantPatch(row, grantId) {
  const id = String(grantId || '').trim();
  const preset = DEBUG_GRANT_PRESETS[id];
  if (!preset) {
    return { ok: false, error: 'Concessão desconhecida.' };
  }

  const patch = {};
  if (preset.souls) {
    const gain = String(preset.souls);
    patch.souls = add(moneyField(row, 'souls'), gain);
    patch.lifetime_souls = add(moneyField(row, 'lifetime_souls'), gain);
    patch.run_souls = add(moneyField(row, 'run_souls'), gain);
  }
  if (preset.obols) {
    patch.obols = add(moneyField(row, 'obols'), String(preset.obols));
  }
  if (preset.mnemosyne) {
    patch.mnemosyne = add(moneyField(row, 'mnemosyne'), String(preset.mnemosyne));
  }
  if (preset.verdicts != null) {
    const current = Math.max(0, Number.parseInt(row?.verdicts, 10) || 0);
    patch.verdicts = current + Math.max(0, Number(preset.verdicts) || 0);
  }

  return { ok: true, patch, label: preset.label, grantId: id };
}
