/**
 * Rate limit compartilhado (KV) com fallback em memória — Fase A / Task A1.
 *
 * Contrato:
 *   consumeRateLimit({ key, limit, windowMs }) →
 *     { limited, remaining, retryAfterSec, backend: 'kv'|'memory', degraded }
 *
 * Política D3: se KV indisponível → fail-open com teto local + degraded=true.
 * Auth login permanece em auth_rate_events (DB) — não usar este módulo lá.
 *
 * @see docs/otimizacoes/01-tasks-fase-a-contencao.md
 */

import { getKv, isKvConfigured, kvKey } from './kv.js';

/** Limites congelados (Task 0 D2) — A2 liga Despertar/underworld nestes valores. */
export const GAME_RATE_LIMITS = Object.freeze({
  despertar_sync: Object.freeze({
    limit: 12,
    windowMs: 60_000,
    keyPart: 'rl:despertar:sync',
  }),
  despertar_juizo: Object.freeze({
    limit: 2,
    windowMs: 1_000,
    keyPart: 'rl:despertar:juizo',
  }),
  underworld_redeem: Object.freeze({
    limit: 12,
    windowMs: 60_000,
    keyPart: 'rl:underworld:redeem',
  }),
});

/** @type {Map<string, number[]>} */
const memoryWindows = new Map();

let degradedWarnedAt = 0;
const DEGRADED_LOG_COOLDOWN_MS = 30_000;

/**
 * @param {string} userId
 * @param {keyof typeof GAME_RATE_LIMITS} kind
 */
export function gameRateLimitKey(kind, userId) {
  const spec = GAME_RATE_LIMITS[kind];
  if (!spec) throw new Error(`GAME_RATE_LIMITS desconhecido: ${kind}`);
  return kvKey(spec.keyPart, userId);
}

/**
 * @param {{ key: string, limit: number, windowMs: number, now?: number, forceBackend?: 'kv'|'memory' }} opts
 * @returns {Promise<{
 *   limited: boolean,
 *   remaining: number,
 *   retryAfterSec: number,
 *   backend: 'kv'|'memory',
 *   degraded: boolean,
 * }>}
 */
export async function consumeRateLimit(opts) {
  const key = String(opts?.key || '').trim();
  const limit = Math.max(1, Number(opts?.limit) || 1);
  const windowMs = Math.max(1, Number(opts?.windowMs) || 1000);
  const now = Number.isFinite(opts?.now) ? Number(opts.now) : Date.now();
  const force = opts?.forceBackend;

  if (!key) {
    return {
      limited: false,
      remaining: limit,
      retryAfterSec: 0,
      backend: 'memory',
      degraded: false,
    };
  }

  if (force === 'memory') {
    return consumeMemory(key, limit, windowMs, now, false);
  }

  if (force === 'kv' || isKvConfigured()) {
    try {
      const kv = await getKv();
      if (kv) {
        return await consumeKvFixedWindow(kv, key, limit, windowMs, now);
      }
      logDegradedOnce('client_null');
      return consumeMemory(key, limit, windowMs, now, true);
    } catch (error) {
      logDegradedOnce(error?.message || 'kv_error');
      return consumeMemory(key, limit, windowMs, now, true);
    }
  }

  return consumeMemory(key, limit, windowMs, now, false);
}

/**
 * Atalho: consome limite de jogo (D2) por userId.
 * @param {keyof typeof GAME_RATE_LIMITS} kind
 * @param {string} userId
 * @param {{ now?: number, forceBackend?: 'kv'|'memory' }} [opts]
 */
export async function consumeGameRateLimit(kind, userId, opts = {}) {
  const spec = GAME_RATE_LIMITS[kind];
  if (!spec) throw new Error(`GAME_RATE_LIMITS desconhecido: ${kind}`);
  return consumeRateLimit({
    key: gameRateLimitKey(kind, userId),
    limit: spec.limit,
    windowMs: spec.windowMs,
    now: opts.now,
    forceBackend: opts.forceBackend,
  });
}

/**
 * Aplica header Retry-After em resposta 429.
 * @param {{ setHeader?: Function }} res
 * @param {{ retryAfterSec?: number }} result
 */
export function applyRetryAfterHeader(res, result) {
  const sec = Math.max(1, Math.ceil(Number(result?.retryAfterSec) || 1));
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('Retry-After', String(sec));
  }
  return sec;
}

/** Testes — limpa janelas em memória. */
export function __resetMemoryRateLimitsForTests() {
  memoryWindows.clear();
  degradedWarnedAt = 0;
}

function logDegradedOnce(reason) {
  const now = Date.now();
  if (now - degradedWarnedAt < DEGRADED_LOG_COOLDOWN_MS) return;
  degradedWarnedAt = now;
  console.warn(`[rate-limit-kv] rate_limit_degraded=1 reason=${reason}`);
}

/**
 * Sliding window em memória (paridade com Maps legados do Despertar).
 */
function consumeMemory(key, limit, windowMs, now, degraded) {
  const recent = (memoryWindows.get(key) || []).filter((ts) => now - ts < windowMs);
  if (recent.length >= limit) {
    memoryWindows.set(key, recent);
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return {
      limited: true,
      remaining: 0,
      retryAfterSec,
      backend: 'memory',
      degraded: Boolean(degraded),
    };
  }
  recent.push(now);
  memoryWindows.set(key, recent);
  return {
    limited: false,
    remaining: Math.max(0, limit - recent.length),
    retryAfterSec: 0,
    backend: 'memory',
    degraded: Boolean(degraded),
  };
}

/**
 * Fixed window atômica via INCR + PEXPIRE (bom para multi-isolate).
 * Chave efetiva inclui o bucket temporal para não reutilizar contadores.
 */
async function consumeKvFixedWindow(kv, key, limit, windowMs, now) {
  const bucket = Math.floor(now / windowMs);
  const bucketKey = `${key}:w${bucket}`;
  const count = await kv.incr(bucketKey);
  if (count === 1) {
    await kv.pexpire(bucketKey, windowMs);
  }

  if (count > limit) {
    let ttlMs = windowMs;
    try {
      const pttl = await kv.pttl(bucketKey);
      if (Number.isFinite(pttl) && pttl > 0) ttlMs = pttl;
    } catch {
      /* ignore */
    }
    return {
      limited: true,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000)),
      backend: 'kv',
      degraded: false,
    };
  }

  return {
    limited: false,
    remaining: Math.max(0, limit - count),
    retryAfterSec: 0,
    backend: 'kv',
    degraded: false,
  };
}
