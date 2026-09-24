/**
 * Sandbox / debug do Despertar (só Mestre).
 * Reset a zero, concessões de recursos e sandbox Lethe.
 */

import { add, money } from '../../js/hades-despertar/core/decimal.js';
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

/**
 * Expande notação científica simples (`1e12`, `1.5e3`) para decimal string.
 * @param {string} raw
 * @returns {string|null}
 */
export function expandDebugSci(raw) {
  const s = String(raw || '').trim().replace(/_/g, '');
  const m = s.match(/^(-?)(\d+)(?:\.(\d+))?e\+?(\d+)$/i);
  if (!m) return null;
  const sign = m[1];
  const intPart = m[2];
  const fracPart = m[3] || '';
  const exp = Number.parseInt(m[4], 10);
  if (!Number.isFinite(exp) || exp < 0 || exp > 38) return null;
  const digits = `${intPart}${fracPart}`;
  const shift = exp - fracPart.length;
  if (shift >= 0) return `${sign}${digits}${'0'.repeat(shift)}`;
  const cut = digits.length + shift;
  if (cut <= 0) return `${sign}0.${'0'.repeat(-cut)}${digits}`;
  return `${sign}${digits.slice(0, cut)}.${digits.slice(cut)}`;
}

/**
 * Valor absoluto de dinheiro (≥ 0). Aceita decimal ou `1e12`.
 * @param {unknown} raw
 * @returns {string|null} money() ou null se inválido
 */
export function parseAbsoluteMoney(raw) {
  if (raw == null || raw === '') return null;
  let s = String(raw).trim().replace(/_/g, '');
  const sci = expandDebugSci(s);
  if (sci != null) s = sci;
  try {
    const value = money(s);
    if (value.startsWith('-')) return money('0');
    return value;
  } catch {
    return null;
  }
}

function pickSetField(set, snake, camel) {
  if (Object.prototype.hasOwnProperty.call(set, snake)) return set[snake];
  if (camel && Object.prototype.hasOwnProperty.call(set, camel)) return set[camel];
  return undefined;
}

function hasSetField(set, snake, camel) {
  return Object.prototype.hasOwnProperty.call(set, snake)
    || (camel != null && Object.prototype.hasOwnProperty.call(set, camel));
}

/**
 * Patch absoluto (DEBUG_SET_PATCH) — substitui campos, não soma.
 * Não toca generators_state / upgrades / etc.
 *
 * @param {object} _row row atual (reservado; set é absoluto)
 * @param {object} setInput { souls?, run_souls?, lifetime_souls?, obols?, mnemosyne?, verdicts? }
 * @returns {{ ok: true, patch: object, label: string } | { ok: false, error: string }}
 */
export function buildDebugSetPatch(_row, setInput) {
  if (!setInput || typeof setInput !== 'object' || Array.isArray(setInput)) {
    return { ok: false, error: 'Patch absoluto ausente.' };
  }

  const patch = {};
  const parts = [];

  if (hasSetField(setInput, 'souls')) {
    const v = parseAbsoluteMoney(pickSetField(setInput, 'souls'));
    if (v == null) return { ok: false, error: 'Valor de almas inválido.' };
    patch.souls = v;
    parts.push(`almas=${v}`);
    // UX: definir almas também ancora run/lifetime se o Mestre não passou esses campos.
    if (!hasSetField(setInput, 'run_souls', 'runSouls')) {
      patch.run_souls = v;
    }
    if (!hasSetField(setInput, 'lifetime_souls', 'lifetimeSouls')) {
      patch.lifetime_souls = v;
    }
  }

  if (hasSetField(setInput, 'run_souls', 'runSouls')) {
    const v = parseAbsoluteMoney(pickSetField(setInput, 'run_souls', 'runSouls'));
    if (v == null) return { ok: false, error: 'Valor de run_souls inválido.' };
    patch.run_souls = v;
    parts.push(`run=${v}`);
  }

  if (hasSetField(setInput, 'lifetime_souls', 'lifetimeSouls')) {
    const v = parseAbsoluteMoney(pickSetField(setInput, 'lifetime_souls', 'lifetimeSouls'));
    if (v == null) return { ok: false, error: 'Valor de lifetime_souls inválido.' };
    patch.lifetime_souls = v;
    parts.push(`lifetime=${v}`);
  }

  if (hasSetField(setInput, 'obols')) {
    const v = parseAbsoluteMoney(pickSetField(setInput, 'obols'));
    if (v == null) return { ok: false, error: 'Valor de óbolos inválido.' };
    patch.obols = v;
    parts.push(`óbolos=${v}`);
  }

  if (hasSetField(setInput, 'mnemosyne')) {
    const v = parseAbsoluteMoney(pickSetField(setInput, 'mnemosyne'));
    if (v == null) return { ok: false, error: 'Valor de essência inválido.' };
    patch.mnemosyne = v;
    parts.push(`essência=${v}`);
  }

  if (hasSetField(setInput, 'verdicts')) {
    const n = Number.parseInt(pickSetField(setInput, 'verdicts'), 10);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: 'Valor de vereditos inválido.' };
    }
    patch.verdicts = Math.floor(n);
    parts.push(`vereditos=${patch.verdicts}`);
  }

  if (!Object.keys(patch).length) {
    return { ok: false, error: 'Nenhum campo para definir.' };
  }

  return {
    ok: true,
    patch,
    label: `Definido: ${parts.join(', ')}`,
  };
}