/**
 * Rate limit por IP no Edge Middleware — Fase C / Task C1.
 *
 * Contrato:
 *   consumeEdgeIpRateLimit(group, ip) →
 *     { limited, remaining, retryAfterSec, backend: 'kv'|'memory', degraded }
 *
 * Política D3: se KV REST indisponível → fail-open com teto in-memory do isolate
 * + degraded=true (header/log edge_rate_degraded=1).
 *
 * Não substitui rate limit por userId (A2 / rate-limit-kv.js).
 *
 * @see docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 */

/** Mesmo prefixo de api/_lib/kv.js (A1). */
const KEY_PREFIX = 'fjd:';

/** Limites congelados (Task 0 D2) — janela 60 s por IP. */
export const EDGE_RATE_LIMITS = Object.freeze({
  auth: Object.freeze({
    limit: 30,
    windowMs: 60_000,
    match: /^\/api\/auth(\/|$)/,
  }),
  despertar: Object.freeze({
    limit: 60,
    windowMs: 60_000,
    match: /^\/api\/despertar(\/|$)/,
  }),
  progress: Object.freeze({
    limit: 90,
    windowMs: 60_000,
    match: /^\/api\/progress(\/|$)/,
  }),
  prova: Object.freeze({
    limit: 120,
    windowMs: 60_000,
    match: /^\/api\/prova(\/|$)/,
  }),
});

/** @type {Map<string, number[]>} */
const memoryWindows = new Map();

let degradedWarnedAt = 0;
const DEGRADED_LOG_COOLDOWN_MS = 30_000;

/**
 * @param {string} pathname
 * @returns {keyof typeof EDGE_RATE_LIMITS | null}
 */
export function matchEdgePathGroup(pathname) {
  const path = String(pathname || '');
  if (path.startsWith('/api/cron')) return null;
  for (const [group, spec] of Object.entries(EDGE_RATE_LIMITS)) {
    if (spec.match.test(path)) return /** @type {keyof typeof EDGE_RATE_LIMITS} */ (group);
  }
  return null;
}

/**
 * IP do cliente (primeiro hop de x-forwarded-for / x-real-ip / Vercel).
 * @param {Request|{ headers: Headers|Record<string,string>| { get?: Function } }} request
 * @returns {string}
 */
export function clientIpFromRequest(request) {
  const headers = request?.headers;
  const get = (name) => {
    if (!headers) return '';
    if (typeof headers.get === 'function') return String(headers.get(name) || '');
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (String(k).toLowerCase() === lower) return String(v || '');
    }
    return '';
  };

  const xff = get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return sanitizeIp(first);
  }
  const real = get('x-real-ip').trim();
  if (real) return sanitizeIp(real);
  const vercel = get('x-vercel-forwarded-for');
  if (vercel) {
    const first = vercel.split(',')[0].trim();
    if (first) return sanitizeIp(first);
  }
  return 'unknown';
}

/**
 * @param {keyof typeof EDGE_RATE_LIMITS} group
 * @param {string} ip
 */
export function edgeIpRateLimitKey(group, ip) {
  return `${KEY_PREFIX}rl:edge:${group}:${sanitizeIp(ip)}`;
}

/**
 * @param {keyof typeof EDGE_RATE_LIMITS} group
 * @param {string} ip
 * @param {{ now?: number, forceBackend?: 'kv'|'memory' }} [opts]
 */
export async function consumeEdgeIpRateLimit(group, ip, opts = {}) {
  const spec = EDGE_RATE_LIMITS[group];
  if (!spec) throw new Error(`EDGE_RATE_LIMITS desconhecido: ${group}`);

  const key = edgeIpRateLimitKey(group, ip);
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const force = opts.forceBackend;

  if (force === 'memory') {
    return consumeMemory(key, spec.limit, spec.windowMs, now, false);
  }

  if (force !== 'kv' && !isEdgeKvConfigured()) {
    return consumeMemory(key, spec.limit, spec.windowMs, now, true);
  }

  try {
    return await consumeKvFixedWindow(key, spec.limit, spec.windowMs, now);
  } catch (error) {
    logDegradedOnce(error?.message || 'kv_error');
    return consumeMemory(key, spec.limit, spec.windowMs, now, true);
  }
}

/**
 * Resposta 429 JSON + Retry-After (Edge / Web Response).
 * @param {{ retryAfterSec?: number, degraded?: boolean }} result
 * @returns {Response}
 */
export function buildEdge429Response(result) {
  const retryAfterSec = Math.max(1, Math.ceil(Number(result?.retryAfterSec) || 1));
  const body = JSON.stringify({
    ok: false,
    error: 'Muitas requisições deste endereço. Aguarde e tente de novo.',
    code: 'edge_rate_limited',
  });
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'Retry-After': String(retryAfterSec),
  };
  if (result?.degraded) {
    headers['x-edge-rate-degraded'] = '1';
  }
  return new Response(body, { status: 429, headers });
}

/** Testes — limpa janelas em memória. */
export function __resetEdgeMemoryRateLimitsForTests() {
  memoryWindows.clear();
  degradedWarnedAt = 0;
}

export { KEY_PREFIX as EDGE_KEY_PREFIX };

function sanitizeIp(ip) {
  const s = String(ip || 'unknown').trim().slice(0, 128);
  return s || 'unknown';
}

function isEdgeKvConfigured() {
  const env = typeof process !== 'undefined' ? process.env : {};
  return Boolean(
    (env.KV_REST_API_URL && env.KV_REST_API_TOKEN)
    || (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  );
}

function getEdgeKvRestCreds() {
  const env = typeof process !== 'undefined' ? process.env : {};
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || '';
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || '';
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

function logDegradedOnce(reason) {
  const now = Date.now();
  if (now - degradedWarnedAt < DEGRADED_LOG_COOLDOWN_MS) return;
  degradedWarnedAt = now;
  console.warn(`[edge-rate-limit] edge_rate_degraded=1 reason=${reason}`);
}

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
 * Fixed window via Upstash/Vercel KV REST (INCR + PEXPIRE) — Edge-safe (fetch).
 */
async function consumeKvFixedWindow(key, limit, windowMs, now) {
  const creds = getEdgeKvRestCreds();
  if (!creds) {
    throw new Error('kv_not_configured');
  }

  const bucket = Math.floor(now / windowMs);
  const bucketKey = `${key}:w${bucket}`;

  const count = Number(await redisCmd(creds, ['INCR', bucketKey]));
  if (!Number.isFinite(count)) {
    throw new Error('kv_incr_invalid');
  }
  if (count === 1) {
    await redisCmd(creds, ['PEXPIRE', bucketKey, windowMs]);
  }

  if (count > limit) {
    let ttlMs = windowMs;
    try {
      const pttl = Number(await redisCmd(creds, ['PTTL', bucketKey]));
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

/**
 * @param {{ url: string, token: string }} creds
 * @param {Array<string|number>} args
 */
async function redisCmd(creds, args) {
  const res = await fetch(`${creds.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([args]),
  });
  if (!res.ok) {
    throw new Error(`kv_http_${res.status}`);
  }
  const data = await res.json();
  const row = Array.isArray(data) ? data[0] : data;
  if (row && typeof row === 'object' && 'error' in row && row.error) {
    throw new Error(String(row.error));
  }
  return row?.result;
}
