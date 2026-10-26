/**
 * Fase F8 — FortuneSystem (Domínio puro das Fortunas de Hermes no News Ticker).
 * Regra canónica da Wiki (§ 11.1):
 * - Apenas no ciclo natural automático do ticker (`naturalCycle === true`), há 2% de chance
 *   (4% com a conquista `despertar_o_fortuna`) de surgir uma Fortuna de Hermes ainda não reivindicada.
 * - Avanços manuais do ticker (`naturalCycle === false`) NUNCA geram Fortuna.
 * - Clicar na Fortuna concede recompensa instantânea e desbloqueia permanentemente o juramento na loja Styx.
 */

import {
  FORTUNE_BY_ID,
  FORTUNE_CONFIG,
  FORTUNE_IDS,
  FORTUNES,
  O_FORTUNA_ACHIEVEMENT_ID,
  getFortune,
  isKnownFortuneId,
} from '../config/fortunes.js';
import { cmp, money, mul } from './decimal.js';

export function normalizeFortuneState(raw = {}, opts = {}) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const upgrades = Array.isArray(opts.upgrades) ? opts.upgrades : [];

  const claimedSet = new Set();
  for (const id of Array.isArray(src.claimedIds) ? src.claimedIds : []) {
    const key = String(id || '');
    if (isKnownFortuneId(key)) claimedSet.add(key);
  }
  for (const uid of upgrades) {
    const key = String(uid || '');
    if (isKnownFortuneId(key)) claimedSet.add(key);
  }

  const lifetimeSet = new Set(claimedSet);
  for (const id of Array.isArray(src.lifetimeClaimedIds) ? src.lifetimeClaimedIds : []) {
    const key = String(id || '');
    if (isKnownFortuneId(key)) lifetimeSet.add(key);
  }

  const activeFortuneId = src.activeFortuneId
    && isKnownFortuneId(src.activeFortuneId)
    && !claimedSet.has(String(src.activeFortuneId))
    ? String(src.activeFortuneId)
    : null;

  return {
    activeFortuneId,
    claimedIds: FORTUNE_IDS.filter((id) => claimedSet.has(id)),
    lifetimeClaimedIds: FORTUNE_IDS.filter((id) => lifetimeSet.has(id)),
  };
}

/**
 * Probabilidade de spawnar uma Fortuna no ciclo natural do ticker:
 * 2% base, ou 4% quando `despertar_o_fortuna` está desbloqueada.
 */
export function fortuneSpawnChance(achievements = [], lifetimeClaimedIds = []) {
  const achSet = new Set((Array.isArray(achievements) ? achievements : []).map((a) => String(a)));
  const allClaimedOnce = Array.isArray(lifetimeClaimedIds)
    && lifetimeClaimedIds.length >= FORTUNES.length;
  if (achSet.has(O_FORTUNA_ACHIEVEMENT_ID) || allClaimedOnce) {
    return FORTUNE_CONFIG.oFortunaChance;
  }
  return FORTUNE_CONFIG.baseChance;
}

/**
 * Lista de Fortunas ainda não reivindicadas nesta corrida.
 */
export function unclaimedFortunes(fortuneState = {}) {
  const state = normalizeFortuneState(fortuneState);
  const claimed = new Set(state.claimedIds);
  return FORTUNES.filter((f) => !claimed.has(f.id));
}

/**
 * Sorteia (ou força) uma Fortuna durante um ciclo do News Ticker.
 * Se `naturalCycle === false` (clique manual para avançar notícia), NUNCA gera Fortuna.
 */
export function rollTickerFortune(fortuneState = {}, {
  naturalCycle = true,
  achievements = [],
  random = Math.random,
  forceFortuneId = null,
} = {}) {
  const state = normalizeFortuneState(fortuneState);
  if (!naturalCycle && !forceFortuneId) {
    return { spawned: false, fortune: null, state };
  }

  if (forceFortuneId && isKnownFortuneId(forceFortuneId)) {
    const forced = getFortune(forceFortuneId);
    const nextState = normalizeFortuneState({
      ...state,
      activeFortuneId: forced.id,
    });
    return { spawned: true, fortune: forced, state: nextState };
  }

  const pool = unclaimedFortunes(state);
  if (pool.length === 0) {
    return { spawned: false, fortune: null, state };
  }

  const chance = fortuneSpawnChance(achievements, state.lifetimeClaimedIds);
  const r = Number(random());
  if (!Number.isFinite(r) || r >= chance) {
    return { spawned: false, fortune: null, state };
  }

  const idx = Math.min(pool.length - 1, Math.max(0, Math.floor(Number(random()) * pool.length)));
  const chosen = pool[idx];
  const nextState = normalizeFortuneState({
    ...state,
    activeFortuneId: chosen.id,
  });

  return {
    spawned: true,
    fortune: chosen,
    state: nextState,
  };
}

/**
 * Reivindica a Fortuna ativa no ticker (ou uma Fortuna específica),
 * concedendo bônus instantâneo de almas e liberando o juramento no Styx.
 */
export function claimTickerFortune(fortuneState = {}, {
  fortuneId = null,
  sps = '0',
} = {}) {
  const state = normalizeFortuneState(fortuneState);
  const targetId = fortuneId ? String(fortuneId) : state.activeFortuneId;
  if (!targetId || !isKnownFortuneId(targetId)) {
    return { ok: false, reason: 'no_active_fortune', state };
  }

  const def = FORTUNE_BY_ID[targetId];
  const alreadyClaimed = state.claimedIds.includes(def.id);
  const fromSps = mul(sps || '0', '60');
  const soulsReward = money(cmp(fromSps, '77') > 0 ? fromSps : '77');

  const nextState = normalizeFortuneState({
    activeFortuneId: state.activeFortuneId === def.id ? null : state.activeFortuneId,
    claimedIds: [...state.claimedIds, def.id],
    lifetimeClaimedIds: [...state.lifetimeClaimedIds, def.id],
  });

  return {
    ok: true,
    fortuneId: def.id,
    upgradeId: def.upgradeId,
    name: def.name,
    alreadyClaimed,
    soulsReward,
    allFortunesClaimed: nextState.lifetimeClaimedIds.length >= FORTUNES.length,
    state: nextState,
  };
}

export { FORTUNES, FORTUNE_IDS, getFortune, isKnownFortuneId };
