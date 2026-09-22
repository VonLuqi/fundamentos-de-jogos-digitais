/**
 * Placar do Domínio — ranking puro (Task 20 + Fase B / B5).
 * Métricas públicas: XP, #conquistas, juizoBest. Sem almas/SPS/óbolos.
 * Path quente: RPC `leaderboard_page` (ORDER BY + LIMIT no SQL).
 */

import { metricsBumpDb } from './request-metrics.js';

export const LEADERBOARD_TOP = 50;
export const LEADERBOARD_SCOPES = Object.freeze(['turma', 'global']);
export const LEADERBOARD_SORTS = Object.freeze(['xp', 'achievements', 'juizoBest']);
export const LEADERBOARD_PAGE_RPC = 'leaderboard_page';

export function normalizeLeaderboardScope(raw) {
  const value = String(raw || '').trim().toLowerCase();
  return LEADERBOARD_SCOPES.includes(value) ? value : 'turma';
}

export function normalizeLeaderboardSort(raw) {
  const value = String(raw || '').trim();
  if (value === 'achievements' || value === 'juizoBest' || value === 'xp') return value;
  return 'xp';
}

export function normalizeLeaderboardLimit(raw, fallback = LEADERBOARD_TOP) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(200, n);
}

export function achievementCount(conquistas) {
  if (!Array.isArray(conquistas)) return 0;
  return conquistas.length;
}

/**
 * @param {object} user row users
 * @param {number} [juizoBest]
 */
export function toLeaderboardEntry(user, juizoBest = 0) {
  const best = Number.parseInt(juizoBest, 10);
  return {
    userId: Number(user.id),
    username: String(user.username || ''),
    fullName: String(user.full_name || user.fullName || ''),
    turma: user.turma ? String(user.turma) : null,
    xp: Math.max(0, Number(user.xp) || 0),
    achievements: achievementCount(user.conquistas),
    juizoBest: Number.isFinite(best) && best >= 0 ? best : 0,
  };
}

function metricValue(entry, sort) {
  if (sort === 'achievements') return entry.achievements;
  if (sort === 'juizoBest') return entry.juizoBest;
  return entry.xp;
}

/**
 * Ordenação estável: métrica DESC, username ASC, userId ASC.
 * @returns {Array<object & { rank: number }>}
 */
export function rankLeaderboardEntries(entries, sort = 'xp') {
  const key = normalizeLeaderboardSort(sort);
  const sorted = [...(entries || [])].sort((a, b) => {
    const diff = metricValue(b, key) - metricValue(a, key);
    if (diff !== 0) return diff;
    const nameCmp = String(a.username || '').localeCompare(String(b.username || ''), 'pt-BR', {
      sensitivity: 'base',
    });
    if (nameCmp !== 0) return nameCmp;
    return (Number(a.userId) || 0) - (Number(b.userId) || 0);
  });
  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

/**
 * Top N + self (com rank) mesmo fora do top.
 */
export function buildLeaderboardPayload(ranked, viewerUserId, topN = LEADERBOARD_TOP) {
  const limit = Math.max(1, Number(topN) || LEADERBOARD_TOP);
  const entries = (ranked || []).slice(0, limit).map(publicLeaderboardRow);
  const viewerId = Number(viewerUserId);
  const selfRanked = (ranked || []).find((row) => Number(row.userId) === viewerId) || null;
  return {
    entries,
    self: selfRanked ? publicLeaderboardRow(selfRanked) : null,
    total: (ranked || []).length,
  };
}

/** DTO público — keep userId for isSelf highlight. */
export function publicLeaderboardRow(row) {
  return {
    rank: row.rank,
    userId: row.userId,
    username: row.username,
    fullName: row.fullName,
    turma: row.turma,
    xp: row.xp,
    achievements: row.achievements,
    juizoBest: row.juizoBest,
  };
}

/**
 * Normaliza linha vindas da RPC (camelCase já no SQL).
 * @param {object|null|undefined} row
 */
export function normalizeRpcLeaderboardRow(row) {
  if (!row || typeof row !== 'object') return null;
  const rank = Number.parseInt(row.rank, 10);
  const userId = Number(row.userId ?? row.user_id);
  if (!Number.isFinite(userId)) return null;
  return publicLeaderboardRow({
    rank: Number.isFinite(rank) && rank > 0 ? rank : 0,
    userId,
    username: String(row.username || ''),
    fullName: String(row.fullName ?? row.full_name ?? ''),
    turma: row.turma != null ? String(row.turma) : null,
    xp: Math.max(0, Number(row.xp) || 0),
    achievements: Math.max(0, Number(row.achievements) || 0),
    juizoBest: Math.max(0, Number(row.juizoBest ?? row.juizo_best) || 0),
  });
}

/**
 * @param {unknown} error
 */
export function isLeaderboardRpcMissing(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === 'PGRST202'
    || code === '42883'
    || /leaderboard_page/i.test(message)
    || (/Could not find the function/i.test(message) && /leaderboard/i.test(message));
}

/**
 * Path B5: 1 RTT via RPC (sort/limit no SQL).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ scope: string, turma?: string|null, sort: string, limit?: number, viewerUserId?: number }} opts
 * @returns {Promise<{ ok: true, entries: object[], self: object|null, total: number } | { ok: false, error: object }>}
 */
export async function fetchLeaderboardPageRpc(supabase, opts = {}) {
  const scope = normalizeLeaderboardScope(opts.scope);
  const sort = normalizeLeaderboardSort(opts.sort);
  const limit = normalizeLeaderboardLimit(opts.limit, LEADERBOARD_TOP);
  const viewerId = Number(opts.viewerUserId);
  const turma = scope === 'turma'
    ? (opts.turma != null ? String(opts.turma).trim() : null)
    : null;

  const { data, error } = await supabase.rpc(LEADERBOARD_PAGE_RPC, {
    p_scope: scope,
    p_turma: turma,
    p_sort: sort,
    p_limit: limit,
    p_viewer_id: Number.isFinite(viewerId) && viewerId > 0 ? viewerId : null,
  });
  metricsBumpDb(1);

  if (error) return { ok: false, error };

  const payload = typeof data === 'string'
    ? (() => { try { return JSON.parse(data); } catch { return null; } })()
    : data;

  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: { message: 'RPC leaderboard_page retornou payload inválido.' } };
  }

  const entries = Array.isArray(payload.entries)
    ? payload.entries.map(normalizeRpcLeaderboardRow).filter(Boolean)
    : [];
  const self = normalizeRpcLeaderboardRow(payload.self);

  return {
    ok: true,
    entries,
    self,
    total: Math.max(0, Number.parseInt(payload.total, 10) || entries.length),
  };
}

/**
 * Monta placar a partir de users + mapa juizoBest (path legado / testes).
 * @param {object[]} users
 * @param {Map<number, number>|Record<string, number>} juizoByUser
 * @param {{ sort?: string, viewerUserId?: number, topN?: number }} [options]
 */
export function assembleLeaderboard(users, juizoByUser, options = {}) {
  const juizoMap = juizoByUser instanceof Map
    ? juizoByUser
    : new Map(
      Object.entries(juizoByUser || {}).map(([id, value]) => [Number(id), Number(value) || 0]),
    );
  const entries = (users || []).map((user) => {
    const id = Number(user.id);
    return toLeaderboardEntry(user, juizoMap.get(id) ?? 0);
  });
  const ranked = rankLeaderboardEntries(entries, options.sort);
  return buildLeaderboardPayload(ranked, options.viewerUserId, options.topN);
}
