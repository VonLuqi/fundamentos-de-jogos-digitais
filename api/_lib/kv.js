/**
 * Cliente Vercel KV (Upstash) — Fase A / Task A1.
 * Retorna null se env ausente ou se o pacote opcional não carregar.
 *
 * Env (qualquer um dos pares):
 *   KV_REST_API_URL + KV_REST_API_TOKEN
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   KV_URL / REDIS_URL (URI)
 *
 * @see docs/otimizacoes/01-tasks-fase-a-contencao.md
 */

const KEY_PREFIX = 'fjd:';

let cachedClient = undefined;
let cachedConfigured = undefined;

/**
 * @returns {boolean}
 */
export function isKvConfigured() {
  if (cachedConfigured !== undefined) return cachedConfigured;
  cachedConfigured = Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
    || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    || process.env.KV_URL
    || process.env.REDIS_URL,
  );
  return cachedConfigured;
}

/**
 * Prefixo de projeto para evitar colisão em KV compartilhado.
 * @param {string} parts
 * @returns {string}
 */
export function kvKey(...parts) {
  const rest = parts.map((p) => String(p ?? '').trim()).filter(Boolean).join(':');
  return rest ? `${KEY_PREFIX}${rest}` : KEY_PREFIX;
}

/**
 * @returns {Promise<import('@vercel/kv').KV | null>}
 */
export async function getKv() {
  if (!isKvConfigured()) {
    cachedClient = null;
    return null;
  }
  if (cachedClient !== undefined) return cachedClient;
  try {
    const mod = await import('@vercel/kv');
    cachedClient = mod.kv ?? null;
    return cachedClient;
  } catch (error) {
    console.warn('[kv] @vercel/kv indisponível:', error?.message || error);
    cachedClient = null;
    return null;
  }
}

/** Só para testes — limpa cache do client. */
export function __resetKvClientForTests() {
  cachedClient = undefined;
  cachedConfigured = undefined;
}

export { KEY_PREFIX };
