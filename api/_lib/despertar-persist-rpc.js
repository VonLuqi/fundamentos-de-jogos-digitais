/**
 * Persistência híbrida Despertar (Fase B / B3 + Fase C / C5).
 * Flag DESPERTAR_SYNC_RPC=1 → supabase.rpc('despertar_persist_and_award').
 * Flag DESPERTAR_PG_POOL=1 → tenta pg Transaction pooler primeiro; fallback PostgREST + log pg_pool_fallback=1.
 * Fallback final: persistPatch + grantDespertarAchievements (path legado em despertar.js).
 *
 * @see docs/otimizacoes/contratos-fase-b.md §2
 * @see docs/otimizacoes/03-tasks-fase-c-escala-obs.md (C5)
 */

import { evaluateDespertarAchievementIds } from './despertar-achievements.js';
import { metricsBumpDb } from './request-metrics.js';
import {
  callDespertarPersistAndAwardViaPg,
  isDespertarPgPoolEnabled,
} from './pg-pool.js';
import {
  getAchievementXp,
  levelForXp,
  mapAchievementDetails,
} from '../../js/game-catalog.js';

export const DESPERTAR_PERSIST_RPC = 'despertar_persist_and_award';

/**
 * @returns {boolean}
 */
export function isDespertarSyncRpcEnabled() {
  return String(process.env.DESPERTAR_SYNC_RPC || '').trim() === '1';
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isDespertarPersistRpcMissing(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === 'PGRST202'
    || code === '42883'
    || /despertar_persist_and_award/i.test(message)
    || (/Could not find the function/i.test(message) && /despertar/i.test(message));
}

/**
 * Planeja conquistas novas a partir do snapshot de user já carregado (0 RTT).
 * @param {{ xp?: number, conquistas?: string[] } | null | undefined} user
 * @param {object} canonicalState
 */
export function planDespertarAwards(user, canonicalState) {
  const existing = Array.isArray(user?.conquistas) ? [...user.conquistas] : [];
  const ids = evaluateDespertarAchievementIds(canonicalState, {
    unlocked: existing,
    syncOk: true,
  });
  if (!ids.length) {
    return { fresh: [], xpGain: 0, nextXp: Number(user?.xp || 0), prevXp: Number(user?.xp || 0) };
  }

  const fresh = ids.filter((id) => !existing.includes(id));
  if (!fresh.length) {
    return { fresh: [], xpGain: 0, nextXp: Number(user?.xp || 0), prevXp: Number(user?.xp || 0) };
  }

  const xpGain = fresh.reduce((sum, id) => sum + (getAchievementXp(id) || 0), 0);
  const prevXp = Number(user?.xp || 0);
  return {
    fresh,
    xpGain,
    nextXp: prevXp + xpGain,
    prevXp,
  };
}

/**
 * @param {{ fresh: string[], xpGain: number, nextXp: number, prevXp: number }} plan
 */
export function awardedFromPlan(plan) {
  if (!plan?.fresh?.length) {
    return { xp: 0, achievements: [], achievementDetails: [] };
  }
  return {
    xp: plan.xpGain,
    achievements: plan.fresh,
    achievementDetails: mapAchievementDetails(plan.fresh),
    leveledUp: levelForXp(plan.nextXp) > levelForXp(plan.prevXp),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number} userId
 * @param {object} patch
 * @param {string[]} achievementIds
 * @param {number} xpDelta
 * @returns {Promise<{ ok: true, state: object, user: object|null, via?: string } | { ok: false, error: object, via?: string }>}
 */
export async function callDespertarPersistAndAward(
  supabase,
  userId,
  patch,
  achievementIds = [],
  xpDelta = 0,
) {
  // C5: path pg (Transaction pooler) — só com DESPERTAR_PG_POOL=1 + DATABASE_URL_RUNTIME.
  if (isDespertarPgPoolEnabled()) {
    try {
      const viaPg = await callDespertarPersistAndAwardViaPg(
        userId,
        patch,
        achievementIds,
        xpDelta,
      );
      metricsBumpDb(1);
      if (viaPg.ok) {
        return { ...viaPg, via: 'pg' };
      }
      console.warn(
        '[despertar] pg_pool_fallback=1',
        viaPg.error?.message || viaPg.error?.code || viaPg.error,
      );
    } catch (error) {
      metricsBumpDb(1);
      console.warn('[despertar] pg_pool_fallback=1', error?.message || error?.code || error);
    }
  }

  const { data, error } = await supabase.rpc(DESPERTAR_PERSIST_RPC, {
    p_user_id: userId,
    p_patch: patch || {},
    p_achievement_ids: Array.isArray(achievementIds) ? achievementIds : [],
    p_xp_delta: Math.max(0, Number(xpDelta) || 0),
  });
  metricsBumpDb(1);

  if (error) return { ok: false, error, via: 'rpc' };

  const payload = typeof data === 'string'
    ? (() => { try { return JSON.parse(data); } catch { return null; } })()
    : data;

  if (!payload?.state) {
    return {
      ok: false,
      error: { message: 'RPC despertar_persist_and_award retornou payload inválido.' },
      via: 'rpc',
    };
  }

  return {
    ok: true,
    state: payload.state,
    user: payload.user || null,
    via: 'rpc',
  };
}
