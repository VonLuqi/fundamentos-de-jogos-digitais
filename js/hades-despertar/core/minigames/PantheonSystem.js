/**
 * PantheonSystem (Fase F5 — Panteão Ctoniano, desbloqueado com `mnemosyne_temple` Lv.1).
 * 3 slots de pedras (Diamante Estígio, Rubi de Flegêton, Jade de Érebo) + cargas de troca (swaps).
 */

import {
  PANTHEON_SLOTS,
  PANTHEON_SPIRIT_BY_ID,
} from '../../config/minigames.js';
import { mul } from '../decimal.js';

export const PANTHEON_MAX_SWAPS = 3;
export const PANTHEON_SWAP_REGEN_MS = 3600 * 1000; // 1h por swap

export function defaultPantheonState() {
  return {
    slots: {
      diamond: null,
      ruby: null,
      jade: null,
    },
    swaps: PANTHEON_MAX_SWAPS,
    lastSwapAt: null,
  };
}

export function normalizePantheonState(raw = {}, nowMs = null) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const rawSlots = src.slots && typeof src.slots === 'object' ? src.slots : {};
  const slots = { diamond: null, ruby: null, jade: null };
  const used = new Set();

  for (const slotDef of PANTHEON_SLOTS) {
    const sid = rawSlots[slotDef.id] ? String(rawSlots[slotDef.id]) : null;
    if (sid && PANTHEON_SPIRIT_BY_ID[sid] && !used.has(sid)) {
      slots[slotDef.id] = sid;
      used.add(sid);
    }
  }

  let swaps = Number.isFinite(Number(src.swaps))
    ? Math.max(0, Math.min(PANTHEON_MAX_SWAPS, Math.floor(Number(src.swaps))))
    : PANTHEON_MAX_SWAPS;
  let lastSwapAt = Number.isFinite(Number(src.lastSwapAt)) && Number(src.lastSwapAt) > 0
    ? Math.floor(Number(src.lastSwapAt))
    : null;

  if (nowMs != null && Number.isFinite(Number(nowMs)) && lastSwapAt != null && swaps < PANTHEON_MAX_SWAPS) {
    const elapsed = Math.max(0, Math.floor(Number(nowMs)) - lastSwapAt);
    const regened = Math.floor(elapsed / PANTHEON_SWAP_REGEN_MS);
    if (regened > 0) {
      swaps = Math.min(PANTHEON_MAX_SWAPS, swaps + regened);
      lastSwapAt = swaps >= PANTHEON_MAX_SWAPS
        ? null
        : lastSwapAt + regened * PANTHEON_SWAP_REGEN_MS;
    }
  }

  return { slots, swaps, lastSwapAt };
}

/**
 * Aloca ou remove um espírito de um slot do Panteão Ctoniano.
 * Alocar um espírito consome 1 carga de troca (`swaps`); desequipar (`spiritId = null`) é gratuito.
 */
export function assignPantheonSpirit(pantheonState, {
  slotId,
  spiritId = null,
  nowMs = Date.now(),
  unlocked = true,
} = {}) {
  if (!unlocked) return { ok: false, reason: 'locked', state: pantheonState };
  const validSlot = PANTHEON_SLOTS.find((s) => s.id === slotId);
  if (!validSlot) return { ok: false, reason: 'invalid_slot', state: pantheonState };

  const current = normalizePantheonState(pantheonState, nowMs);
  const nextSlots = { ...current.slots };

  if (spiritId === null || spiritId === '') {
    nextSlots[slotId] = null;
    return {
      ok: true,
      state: { ...current, slots: nextSlots },
    };
  }

  const spirit = PANTHEON_SPIRIT_BY_ID[String(spiritId)];
  if (!spirit) return { ok: false, reason: 'unknown_spirit', state: current };
  if (nextSlots[slotId] === spirit.id) {
    return { ok: true, state: current };
  }
  if (current.swaps <= 0) {
    return { ok: false, reason: 'no_swaps', state: current };
  }

  // Se o espírito já estava em outro slot, remove de lá
  for (const key of Object.keys(nextSlots)) {
    if (nextSlots[key] === spirit.id) {
      nextSlots[key] = null;
    }
  }
  nextSlots[slotId] = spirit.id;

  const now = Math.floor(Number(nowMs) || Date.now());
  return {
    ok: true,
    state: {
      slots: nextSlots,
      swaps: Math.max(0, current.swaps - 1),
      lastSwapAt: now,
    },
  };
}

/**
 * Calcula os multiplicadores ativos do Panteão Ctoniano (`spsMult`, `clickMult`, `shimmerLuckMult`).
 */
export function pantheonModifiers(pantheonState, { unlocked = true } = {}) {
  if (!unlocked || !pantheonState || typeof pantheonState !== 'object') {
    return { spsMult: '1', clickMult: '1', shimmerLuckMult: 1 };
  }
  const slots = pantheonState.slots || {};
  let spsMult = '1';
  let clickMult = '1';
  let shimmerLuckMult = 1;
  const seen = new Set();

  for (const slotDef of PANTHEON_SLOTS) {
    const sid = slots[slotDef.id];
    if (!sid || seen.has(sid)) continue;
    const spirit = PANTHEON_SPIRIT_BY_ID[sid];
    if (!spirit) continue;
    seen.add(sid);
    const idx = slotDef.multIndex;
    const sMult = spirit.spsMultBySlot?.[idx] ?? '1';
    const cMult = spirit.clickMultBySlot?.[idx] ?? '1';
    const lMult = Number(spirit.shimmerLuckBySlot?.[idx] ?? 1) || 1;
    spsMult = mul(spsMult, sMult);
    clickMult = mul(clickMult, cMult);
    shimmerLuckMult *= lMult;
  }

  return { spsMult, clickMult, shimmerLuckMult };
}
