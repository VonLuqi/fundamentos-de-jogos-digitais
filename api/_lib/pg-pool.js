/**
 * Pool Postgres Transaction-mode (Fase C / Task C5) — último recurso.
 *
 * Flag: DESPERTAR_PG_POOL=1 (default off — só com evidência D5).
 * URI: DATABASE_URL_RUNTIME (Transaction / porta 6543). Nunca usar Session
 * mode (Direct 5432) em serverless. DATABASE_URL de migrate ≠ runtime.
 *
 * Limite: max 1–3 clients por isolate (partida 2). Sem connection-per-request.
 *
 * @see docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 */

import pg from 'pg';

const { Pool } = pg;

/** Partida — clamp 1–3. */
export const PG_POOL_MAX_DEFAULT = 2;
export const PG_POOL_MAX_MIN = 1;
export const PG_POOL_MAX_MAX = 3;

/** @type {import('pg').Pool | null | undefined} */
let cachedPool = undefined;
let sessionModeWarned = false;

/**
 * @returns {boolean}
 */
export function isDespertarPgPoolEnabled() {
  const raw = String(process.env.DESPERTAR_PG_POOL || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

/**
 * URI de runtime (Transaction pooler). Preferir DATABASE_URL_RUNTIME.
 * @returns {string}
 */
export function getRuntimeDatabaseUrl() {
  return String(
    process.env.DATABASE_URL_RUNTIME
    || process.env.POSTGRES_URL
    || '',
  ).trim();
}

/**
 * @returns {number} 1–3
 */
export function getPgPoolMax() {
  const n = Number.parseInt(process.env.PG_POOL_MAX || '', 10);
  if (!Number.isFinite(n)) return PG_POOL_MAX_DEFAULT;
  return Math.min(PG_POOL_MAX_MAX, Math.max(PG_POOL_MAX_MIN, n));
}

/**
 * Heurística: porta 6543 ≈ Transaction pooler Supabase; 5432 ≈ Direct/Session.
 * @param {string} url
 * @returns {'transaction'|'session'|'unknown'}
 */
export function inferPgPoolMode(url) {
  const s = String(url || '');
  if (/:6543(\/|$|\?)/.test(s) || /pooler\.supabase/i.test(s) && /transaction/i.test(s)) {
    return 'transaction';
  }
  if (/:5432(\/|$|\?)/.test(s) || /db\.[^/]+\.supabase\.co:5432/i.test(s)) {
    return 'session';
  }
  if (/pooler\.supabase/i.test(s)) return 'transaction';
  return 'unknown';
}

/**
 * Pool singleton do isolate (lazy). null se flag off ou URI ausente.
 * @returns {Promise<import('pg').Pool | null>}
 */
export async function getPgPool() {
  if (!isDespertarPgPoolEnabled()) {
    cachedPool = null;
    return null;
  }

  if (cachedPool !== undefined) return cachedPool;

  const connectionString = getRuntimeDatabaseUrl();
  if (!connectionString) {
    console.warn('[pg-pool] DESPERTAR_PG_POOL=1 sem DATABASE_URL_RUNTIME');
    cachedPool = null;
    return null;
  }

  const mode = inferPgPoolMode(connectionString);
  if (mode === 'session' && !sessionModeWarned) {
    sessionModeWarned = true;
    console.warn(
      '[pg-pool] DATABASE_URL_RUNTIME parece Session/Direct (5432). '
      + 'Use Transaction pooler (6543) em serverless — risco de too many connections.',
    );
  }

  try {
    cachedPool = new Pool({
      connectionString,
      max: getPgPoolMax(),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 3_000,
      allowExitOnIdle: true,
      // Supabase pooler often needs SSL
      ssl: /supabase\.(co|com)/i.test(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });
    cachedPool.on('error', (err) => {
      console.warn('[pg-pool] idle client error', err?.message || err);
    });
    return cachedPool;
  } catch (error) {
    console.warn('[pg-pool] init fail', error?.message || error);
    cachedPool = null;
    return null;
  }
}

/**
 * Executa query com client do pool (nunca abre conexão avulsa).
 * @param {string} text
 * @param {unknown[]} [params]
 * @returns {Promise<{ rows: object[], rowCount: number|null }>}
 */
export async function pgQuery(text, params = []) {
  const pool = await getPgPool();
  if (!pool) {
    const err = new Error('pg_pool_unavailable');
    err.code = 'PG_POOL_UNAVAILABLE';
    throw err;
  }
  return pool.query(text, params);
}

/**
 * Chama despertar_persist_and_award via pg (1 round-trip).
 * @returns {Promise<{ ok: true, state: object, user: object|null } | { ok: false, error: object }>}
 */
export async function callDespertarPersistAndAwardViaPg(
  userId,
  patch,
  achievementIds = [],
  xpDelta = 0,
) {
  const { rows } = await pgQuery(
    `SELECT public.despertar_persist_and_award($1::integer, $2::jsonb, $3::text[], $4::integer) AS payload`,
    [
      userId,
      JSON.stringify(patch || {}),
      Array.isArray(achievementIds) ? achievementIds : [],
      Math.max(0, Number(xpDelta) || 0),
    ],
  );

  const raw = rows?.[0]?.payload;
  const payload = typeof raw === 'string'
    ? (() => { try { return JSON.parse(raw); } catch { return null; } })()
    : raw;

  if (!payload?.state) {
    return {
      ok: false,
      error: { message: 'pg despertar_persist_and_award retornou payload inválido.' },
    };
  }

  return {
    ok: true,
    state: payload.state,
    user: payload.user || null,
  };
}

/** Testes — limpa singleton. */
export function __resetPgPoolForTests() {
  const prev = cachedPool;
  cachedPool = undefined;
  sessionModeWarned = false;
  if (prev && typeof prev.end === 'function') {
    prev.end().catch(() => {});
  }
}
