/**
 * Gate do Acheron — O Despertar (lesson_gates lesson_id=despertar).
 * Shared entre /api/despertar e callers que só precisam ler o selo.
 *
 * Fase A / A3: cache memo (isolate) + KV (cross-isolate), invalidate no setLessonGate.
 * @see docs/otimizacoes/01-tasks-fase-a-contencao.md
 */

import { getKv, kvKey } from './kv.js';
import { metricsBumpDb } from './request-metrics.js';

const LESSON_GATES_TABLE = 'lesson_gates';
export const DESPERTAR_GATE_ID = 'despertar';
export const DESPERTAR_PUBLISHED_KEY = 'published';
export const DESPERTAR_SEALED_ERROR = 'despertar_sealed';
export const DESPERTAR_SEALED_MESSAGE = 'O Acheron ainda está selado.';

/** Chave KV: fjd:gate:despertar:published → "0" | "1" */
export const DESPERTAR_PUBLISHED_CACHE_KEY = kvKey('gate', 'despertar', 'published');

/** TTL do valor no KV (D4). */
export const DESPERTAR_GATE_KV_TTL_MS = 60_000;

/** Memo por isolate — burst curto entre syncs no mesmo warm instance. */
export const DESPERTAR_GATE_MEMO_TTL_MS = 5_000;

/** @type {{ value: boolean | null, expiresAt: number }} */
let memo = { value: null, expiresAt: 0 };

/** Último resultado de cache (prep A6): hit_memo | hit_kv | miss | n/a */
let lastCacheStatus = 'n/a';

/**
 * @returns {'hit_memo'|'hit_kv'|'miss'|'n/a'}
 */
export function getLastDespertarGateCacheStatus() {
  return lastCacheStatus;
}

/**
 * Limpa memo + DEL no KV. Chamar após setLessonGate(despertar/published) bem-sucedido.
 */
export async function invalidateDespertarPublishedCache() {
  memo = { value: null, expiresAt: 0 };
  lastCacheStatus = 'n/a';
  try {
    const kv = await getKv();
    if (kv) await kv.del(DESPERTAR_PUBLISHED_CACHE_KEY);
  } catch (error) {
    console.warn('[despertar-gate] invalidate:', error?.message || error);
  }
}

/** Só para testes. */
export function __resetDespertarGateCacheForTests() {
  memo = { value: null, expiresAt: 0 };
  lastCacheStatus = 'n/a';
}

/**
 * Default: fechado. Ausência de linha em lesson_gates = selado.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<boolean>}
 */
export async function isDespertarPublished(supabase) {
  if (!supabase) {
    lastCacheStatus = 'n/a';
    return false;
  }

  const now = Date.now();
  if (memo.value !== null && now < memo.expiresAt) {
    lastCacheStatus = 'hit_memo';
    return memo.value;
  }

  try {
    const kv = await getKv();
    if (kv) {
      const raw = await kv.get(DESPERTAR_PUBLISHED_CACHE_KEY);
      const parsed = parseGateCacheValue(raw);
      if (parsed !== null) {
        setMemo(parsed, now);
        lastCacheStatus = 'hit_kv';
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[despertar-gate] kv get:', error?.message || error);
  }

  lastCacheStatus = 'miss';
  const published = await readPublishedFromDb(supabase);
  setMemo(published, now);
  await writeKvPublished(published);
  return published;
}

/**
 * @param {{ role?: string } | null} user
 * @param {boolean} published
 * @returns {boolean} true se deve bloquear
 */
export function isDespertarSealedForUser(user, published) {
  if (user?.role === 'admin') return false;
  return !published;
}

/**
 * @param {unknown} raw
 * @returns {boolean | null}
 */
function parseGateCacheValue(raw) {
  if (raw === '1' || raw === 1 || raw === true) return true;
  if (raw === '0' || raw === 0 || raw === false) return false;
  return null;
}

function setMemo(published, now = Date.now()) {
  memo = {
    value: Boolean(published),
    expiresAt: now + DESPERTAR_GATE_MEMO_TTL_MS,
  };
}

async function writeKvPublished(published) {
  try {
    const kv = await getKv();
    if (!kv) return;
    await kv.set(
      DESPERTAR_PUBLISHED_CACHE_KEY,
      published ? '1' : '0',
      { px: DESPERTAR_GATE_KV_TTL_MS },
    );
  } catch (error) {
    console.warn('[despertar-gate] kv set:', error?.message || error);
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<boolean>}
 */
async function readPublishedFromDb(supabase) {
  try {
    const { data: rows, error } = await supabase
      .from(LESSON_GATES_TABLE)
      .select('gate_key, released')
      .eq('lesson_id', DESPERTAR_GATE_ID);
    metricsBumpDb(1);

    if (error) {
      if (error.code === '42P01' || /lesson_gates/i.test(error.message || '')) {
        return false;
      }
      console.error('[despertar-gate] read:', error);
      return false;
    }

    const publishedRow = (rows || []).find(
      (row) => String(row.gate_key || '') === DESPERTAR_PUBLISHED_KEY,
    );
    return Boolean(publishedRow?.released);
  } catch (error) {
    console.error('[despertar-gate]', error);
    return false;
  }
}
