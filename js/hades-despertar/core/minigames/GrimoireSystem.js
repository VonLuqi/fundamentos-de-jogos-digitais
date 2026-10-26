/**
 * GrimoireSystem (Fase F5 — Grimório de Hécate, desbloqueado com `styx_tower` Lv.1).
 * Barra de Éter (Mana), regeneração passiva e feitiços com chance de Backfire (Falha Crítica).
 */

import { GRIMOIRE_SPELL_BY_ID } from '../../config/minigames.js';
import { cmp, money, mul } from '../decimal.js';

/**
 * Capacidade máxima de Éter (Mana) baseada na quantidade e nível de `styx_tower`.
 */
export function calculateMaxMana(towerQty = 0, towerLevel = 1) {
  const q = Math.max(0, Math.floor(Number(towerQty) || 0));
  const lv = Math.max(0, Math.floor(Number(towerLevel) || 0));
  if (lv <= 0) return 0;
  return Math.max(15, Math.round(15 + Math.pow(Math.max(1, q), 0.6) * 3 + lv * 5));
}

/**
 * Custo de Éter de um feitiço: `baseCost + floor(maxMana * maxManaFraction)`.
 */
export function calculateSpellCost(spellOrId, maxMana = 15) {
  const def = typeof spellOrId === 'string' ? GRIMOIRE_SPELL_BY_ID[spellOrId] : spellOrId;
  if (!def) return Infinity;
  const cap = Math.max(15, Math.floor(Number(maxMana) || 15));
  return Math.floor(Number(def.baseCost || 0) + cap * Number(def.maxManaFraction || 0));
}

export function defaultGrimoireState(towerQty = 1, towerLevel = 1) {
  const maxMana = calculateMaxMana(towerQty, towerLevel);
  return {
    mana: maxMana,
    maxMana,
    spellsCast: 0,
    spellsBackfired: 0,
  };
}

export function normalizeGrimoireState(raw = {}, { towerQty = 0, towerLevel = 0 } = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const maxMana = calculateMaxMana(towerQty, Math.max(1, towerLevel || 1));
  const mana = src.mana != null && Number.isFinite(Number(src.mana))
    ? Math.max(0, Math.min(maxMana, Number(src.mana)))
    : maxMana;
  return {
    mana: Number(mana.toFixed(2)),
    maxMana,
    spellsCast: Math.max(0, Math.floor(Number(src.spellsCast) || 0)),
    spellsBackfired: Math.max(0, Math.floor(Number(src.spellsBackfired) || 0)),
  };
}

/**
 * Regenera Éter passivamente ao longo de `dtSeconds`.
 */
export function tickGrimoireMana(grimoireState, dtSeconds, { towerQty = 0, towerLevel = 0 } = {}) {
  const lv = Math.max(0, Math.floor(Number(towerLevel) || 0));
  if (lv <= 0) return grimoireState;
  const current = normalizeGrimoireState(grimoireState, { towerQty, towerLevel: lv });
  const dt = Math.max(0, Number(dtSeconds) || 0);
  if (dt <= 0 || current.mana >= current.maxMana) return current;
  // Taxa de regeneração suave (~0.05 a 0.25 Éter/s dependendo do maxMana)
  const regenPerSec = Math.max(0.05, current.maxMana * 0.004);
  const nextMana = Math.min(current.maxMana, current.mana + regenPerSec * dt);
  return {
    ...current,
    mana: Number(nextMana.toFixed(2)),
  };
}

/**
 * Conjura um feitiço do Grimório de Hécate.
 * @param {object} grimoireState
 * @param {{
 *   spellId: string,
 *   unlocked?: boolean,
 *   towerQty?: number,
 *   towerLevel?: number,
 *   souls?: string,
 *   sps?: string,
 *   random?: () => number,
 *   forceBackfire?: boolean,
 * }} opts
 */
export function castGrimoireSpell(grimoireState, opts = {}) {
  const unlocked = opts.unlocked !== false && Number(opts.towerLevel || 0) >= 1;
  if (!unlocked) {
    return { ok: false, reason: 'locked', state: grimoireState };
  }
  const def = GRIMOIRE_SPELL_BY_ID[String(opts.spellId || '')];
  if (!def) {
    return { ok: false, reason: 'unknown_spell', state: grimoireState };
  }

  const current = normalizeGrimoireState(grimoireState, {
    towerQty: opts.towerQty,
    towerLevel: opts.towerLevel,
  });
  const cost = calculateSpellCost(def, current.maxMana);
  if (current.mana < cost) {
    return { ok: false, reason: 'insufficient_mana', cost, state: current };
  }

  const random = typeof opts.random === 'function' ? opts.random : Math.random;
  const backfired = typeof opts.forceBackfire === 'boolean'
    ? opts.forceBackfire
    : (Number(random()) || 0) < Number(def.backfireChance || 0.15);

  const nextState = {
    ...current,
    mana: Number(Math.max(0, current.mana - cost).toFixed(2)),
    spellsCast: current.spellsCast + 1,
    spellsBackfired: current.spellsBackfired + (backfired ? 1 : 0),
  };

  if (def.id === 'mao_do_destino') {
    return {
      ok: true,
      spellId: def.id,
      spellName: def.name,
      cost,
      backfired,
      spawnShimmerVariant: backfired ? 'wrath' : 'golden',
      spawnShimmerEffectId: backfired ? 'clot_acheron' : 'mare_acheron',
      soulsDelta: '0.00',
      state: nextState,
    };
  }

  if (def.id === 'conjurar_almas') {
    const souls = opts.souls || '0';
    const sps = opts.sps || '0';
    const walletCap = mul(souls, '0.15');
    if (backfired) {
      const lossSps = mul(sps, '300'); // 5 min SPS
      const loss = cmp(walletCap, lossSps) <= 0 ? walletCap : lossSps;
      return {
        ok: true,
        spellId: def.id,
        spellName: def.name,
        cost,
        backfired: true,
        spawnShimmerVariant: null,
        soulsDelta: `-${money(loss)}`,
        soulsLoss: money(loss),
        soulsGain: '0.00',
        state: nextState,
      };
    }
    const gainSps = mul(sps, '900'); // 15 min SPS
    const rawGain = cmp(walletCap, gainSps) <= 0 ? walletCap : gainSps;
    const gain = cmp(rawGain, '7') > 0 ? money(rawGain) : '7.00';
    return {
      ok: true,
      spellId: def.id,
      spellName: def.name,
      cost,
      backfired: false,
      spawnShimmerVariant: null,
      soulsDelta: gain,
      soulsGain: gain,
      soulsLoss: '0.00',
      state: nextState,
    };
  }

  return {
    ok: true,
    spellId: def.id,
    spellName: def.name,
    cost,
    backfired,
    state: nextState,
  };
}
