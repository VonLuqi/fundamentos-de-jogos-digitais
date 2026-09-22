/**
 * Cache KV do Placar (Fase C / Task C4) — TTL ≤ 60 s por (scope, turma, sort, limit).
 *
 * Flag: LEADERBOARD_KV_CACHE=1 (default off até evidência k6 C4 / p95 > limiar).
 * TTL: LEADERBOARD_CACHE_TTL_SEC (partida 45; clamp 30–60).
 *
 * Política: cacheia só { entries, total } (compartilhado). `self` é montado a partir
 * do top-N; se o viewer estiver fora do top, faz miss → RPC (turma pequena ≈ todos no top).
 * Invalidação: bump de geração (`fjd:lb:gen`) best-effort após awards / XP / redeem.
 *
 * @see docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 */

import { getKv, isKvConfigured, kvKey } from './kv.js';
import {
  normalizeLeaderboardLimit,
  normalizeLeaderboardScope,
  normalizeLeaderboardSort,
  LEADERBOARD_TOP,
} from './leaderboard.js';

/** Partida D6 — máximo 60 s. */
export const LEADERBOARD_CACHE_TTL_SEC_DEFAULT = 45;
export const LEADERBOARD_CACHE_TTL_SEC_MIN = 30;
export const LEADERBOARD_CACHE_TTL_SEC_MAX = 60;

/** @type {Map<string, { expiresAt: number, payload: object }>} */
const memoryCache = new Map();
let memoryGen = 0;

/**
 * @returns {boolean}
 */
export function isLeaderboardKvCacheEnabled() {
  const raw = String(process.env.LEADERBOARD_KV_CACHE || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

/**
 * @returns {number} TTL em segundos (30–60)
 */
export function getLeaderboardCacheTtlSec() {
  const n = Number.parseInt(process.env.LEADERBOARD_CACHE_TTL_SEC || '', 10);
  if (!Number.isFinite(n)) return LEADERBOARD_CACHE_TTL_SEC_DEFAULT;
  return Math.min(
    LEADERBOARD_CACHE_TTL_SEC_MAX,
    Math.max(LEADERBOARD_CACHE_TTL_SEC_MIN, n),
  );
}

/**
 * @param {{ scope?: string, turma?: string|null, sort?: string, limit?: number, gen?: number }} opts
 */
export function leaderboardCacheKey(opts = {}) {
  const scope = normalizeLeaderboardScope(opts.scope);
  const sort = normalizeLeaderboardSort(opts.sort);
  const limit = normalizeLeaderboardLimit(opts.limit, LEADERBOARD_TOP);
  const turma = scope === 'turma'
    ? (opts.turma != null && String(opts.turma).trim() ? String(opts.turma).trim() : '_')
    : '_';
  const gen = Number.isFinite(opts.gen) ? opts.gen : 0;
  return kvKey('lb', `g${gen}`, scope, turma, sort, String(limit));
}

/**
 * Lê snapshot compartilhado { entries, total }.
 * @param {{ scope: string, turma?: string|null, sort: string, limit?: number, forceBackend?: 'kv'|'memory' }} opts
 * @returns {Promise<{ hit: boolean, entries?: object[], total?: number, backend: 'kv'|'memory'|'off', degraded?: boolean }>}
 */
export async function readLeaderboardCache(opts = {}) {
  if (!isLeaderboardKvCacheEnabled() && opts.forceBackend !== 'memory' && opts.forceBackend !== 'kv') {
    return { hit: false, backend: 'off' };
  }

  const gen = await readGeneration(opts.forceBackend);
  const key = leaderboardCacheKey({ ...opts, gen });
  const now = Date.now();

  if (opts.forceBackend === 'memory' || (!isKvConfigured() && opts.forceBackend !== 'kv')) {
    const row = memoryCache.get(key);
    if (!row || row.expiresAt <= now) {
      if (row) memoryCache.delete(key);
      return { hit: false, backend: 'memory', degraded: !isKvConfigured() && opts.forceBackend !== 'memory' };
    }
    return {
      hit: true,
      entries: row.payload.entries,
      total: row.payload.total,
      backend: 'memory',
      degraded: !isKvConfigured() && opts.forceBackend !== 'memory',
    };
  }

  try {
    const kv = await getKv();
    if (!kv) {
      return readLeaderboardCache({ ...opts, forceBackend: 'memory' });
    }
    const raw = await kv.get(key);
    if (!raw || typeof raw !== 'object') {
      return { hit: false, backend: 'kv' };
    }
    const entries = Array.isArray(raw.entries) ? raw.entries : null;
    const total = Number.parseInt(raw.total, 10);
    if (!entries || !Number.isFinite(total)) {
      return { hit: false, backend: 'kv' };
    }
    return { hit: true, entries, total, backend: 'kv' };
  } catch (error) {
    console.warn('[leaderboard-cache] read fail → memory', error?.message || error);
    return readLeaderboardCache({ ...opts, forceBackend: 'memory' });
  }
}

/**
 * Grava snapshot compartilhado.
 * @param {{ scope: string, turma?: string|null, sort: string, limit?: number, entries: object[], total: number, forceBackend?: 'kv'|'memory' }} opts
 */
export async function writeLeaderboardCache(opts = {}) {
  if (!isLeaderboardKvCacheEnabled() && opts.forceBackend !== 'memory' && opts.forceBackend !== 'kv') {
    return { ok: false, backend: 'off' };
  }

  const gen = await readGeneration(opts.forceBackend);
  const key = leaderboardCacheKey({ ...opts, gen });
  const ttlSec = getLeaderboardCacheTtlSec();
  const payload = {
    entries: Array.isArray(opts.entries) ? opts.entries : [],
    total: Math.max(0, Number(opts.total) || 0),
  };

  if (opts.forceBackend === 'memory' || (!isKvConfigured() && opts.forceBackend !== 'kv')) {
    memoryCache.set(key, {
      expiresAt: Date.now() + ttlSec * 1000,
      payload,
    });
    return { ok: true, backend: 'memory', key, ttlSec };
  }

  try {
    const kv = await getKv();
    if (!kv) {
      return writeLeaderboardCache({ ...opts, forceBackend: 'memory' });
    }
    await kv.set(key, payload, { ex: ttlSec });
    return { ok: true, backend: 'kv', key, ttlSec };
  } catch (error) {
    console.warn('[leaderboard-cache] write fail → memory', error?.message || error);
    return writeLeaderboardCache({ ...opts, forceBackend: 'memory' });
  }
}

/**
 * Invalida todos os snapshots (bump de geração). Best-effort; falha silenciosa.
 * @param {{ forceBackend?: 'kv'|'memory' }} [opts]
 */
export async function invalidateLeaderboardCache(opts = {}) {
  if (!isLeaderboardKvCacheEnabled() && opts.forceBackend !== 'memory' && opts.forceBackend !== 'kv') {
    return { ok: false, backend: 'off' };
  }

  if (opts.forceBackend === 'memory' || (!isKvConfigured() && opts.forceBackend !== 'kv')) {
    memoryGen += 1;
    memoryCache.clear();
    return { ok: true, backend: 'memory', gen: memoryGen };
  }

  try {
    const kv = await getKv();
    if (!kv) {
      return invalidateLeaderboardCache({ forceBackend: 'memory' });
    }
    const gen = await kv.incr(kvKey('lb', 'gen'));
    return { ok: true, backend: 'kv', gen: Number(gen) || 0 };
  } catch (error) {
    console.warn('[leaderboard-cache] invalidate fail → memory', error?.message || error);
    return invalidateLeaderboardCache({ forceBackend: 'memory' });
  }
}

/**
 * Resolve `self` a partir do top-N cacheado (ou null se fora do top → caller deve RPC).
 * @param {object[]} entries
 * @param {number} viewerUserId
 */
export function selfFromCachedEntries(entries, viewerUserId) {
  const viewerId = Number(viewerUserId);
  if (!Number.isFinite(viewerId) || viewerId <= 0) return null;
  return (entries || []).find((row) => Number(row.userId) === viewerId) || null;
}

/** Testes. */
export function __resetLeaderboardCacheForTests() {
  memoryCache.clear();
  memoryGen = 0;
}

async function readGeneration(forceBackend) {
  if (forceBackend === 'memory' || (!isKvConfigured() && forceBackend !== 'kv')) {
    return memoryGen;
  }
  try {
    const kv = await getKv();
    if (!kv) return memoryGen;
    const raw = await kv.get(kvKey('lb', 'gen'));
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return memoryGen;
  }
}
