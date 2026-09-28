/**
 * Gate do Acheron — O Despertar (lesson_gates lesson_id=despertar).
 * Shared entre /api/despertar e callers que só precisam ler o selo / pausa.
 *
 * Published: cache memo + KV (Fase A contencao).
 * Classroom pause: gate_key classroom_pause + meta jsonb (produção profunda A1).
 * @see docs/otimizacoes/01-tasks-fase-a-contencao.md
 * @see docs/plano-despertar-producao-profundo.md Task A1
 */

import { getKv, kvKey } from './kv.js';
import { metricsBumpDb } from './request-metrics.js';

const LESSON_GATES_TABLE = 'lesson_gates';
export const DESPERTAR_GATE_ID = 'despertar';
export const DESPERTAR_PUBLISHED_KEY = 'published';
export const DESPERTAR_PAUSE_KEY = 'classroom_pause';

export const DESPERTAR_SEALED_ERROR = 'despertar_sealed';
export const DESPERTAR_SEALED_MESSAGE = 'O Acheron ainda está selado.';
export const DESPERTAR_PAUSED_ERROR = 'despertar_paused';
export const DESPERTAR_PAUSED_MESSAGE = 'O Acheron guarda silêncio.';

/** Chave KV: fjd:gate:despertar:published → "0" | "1" */
export const DESPERTAR_PUBLISHED_CACHE_KEY = kvKey('gate', 'despertar', 'published');
/** Chave KV: fjd:gate:despertar:classroom_pause → JSON serializado */
export const DESPERTAR_PAUSE_CACHE_KEY = kvKey('gate', 'despertar', 'classroom_pause');

/** TTL do valor no KV (D4). */
export const DESPERTAR_GATE_KV_TTL_MS = 60_000;

/** Memo por isolate — burst curto entre syncs no mesmo warm instance. */
export const DESPERTAR_GATE_MEMO_TTL_MS = 5_000;

/** Pausa máxima a partir de now (A-D / A1). */
export const DESPERTAR_PAUSE_MAX_MS = 4 * 60 * 60 * 1000;

export const DESPERTAR_PAUSE_REASON_MAX = 120;

export const DESPERTAR_PAUSE_REASON_PRESETS = Object.freeze({
  aula: 'Aula em andamento',
  explicacao: 'O Mestre está explicando — o Acheron aguarda.',
  intervalo: 'Intervalo — o Submundo faz silêncio.',
});

/** @type {{ value: boolean | null, expiresAt: number }} */
let memo = { value: null, expiresAt: 0 };

/** @type {{ value: object | null, expiresAt: number }} */
let pauseMemo = { value: null, expiresAt: 0 };

/** Último resultado de cache published (prep A6): hit_memo | hit_kv | miss | n/a */
let lastCacheStatus = 'n/a';

/** Último cache status da pausa */
let lastPauseCacheStatus = 'n/a';

/**
 * @returns {'hit_memo'|'hit_kv'|'miss'|'n/a'}
 */
export function getLastDespertarGateCacheStatus() {
  return lastCacheStatus;
}

/**
 * @returns {'hit_memo'|'hit_kv'|'miss'|'n/a'}
 */
export function getLastDespertarPauseCacheStatus() {
  return lastPauseCacheStatus;
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
    console.warn('[despertar-gate] invalidate published:', error?.message || error);
  }
}

/**
 * Limpa memo + DEL no KV da pausa. Chamar após pauseSet / pauseClear.
 */
export async function invalidateDespertarPauseCache() {
  pauseMemo = { value: null, expiresAt: 0 };
  lastPauseCacheStatus = 'n/a';
  try {
    const kv = await getKv();
    if (kv) await kv.del(DESPERTAR_PAUSE_CACHE_KEY);
  } catch (error) {
    console.warn('[despertar-gate] invalidate pause:', error?.message || error);
  }
}

/** Só para testes. */
export function __resetDespertarGateCacheForTests() {
  memo = { value: null, expiresAt: 0 };
  lastCacheStatus = 'n/a';
  pauseMemo = { value: null, expiresAt: 0 };
  lastPauseCacheStatus = 'n/a';
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
    console.warn('[despertar-gate] kv get published:', error?.message || error);
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
 * Estado bruto da pausa (released pode estar true com until já expirado — lazy).
 * @typedef {{
 *   released: boolean,
 *   pauseUntil: string | null,
 *   reason: string | null,
 *   pauseStartedAt: string | null,
 * }} DespertarPauseState
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<DespertarPauseState>}
 */
export async function getDespertarPauseState(supabase) {
  const empty = emptyPauseState();
  if (!supabase) {
    lastPauseCacheStatus = 'n/a';
    return empty;
  }

  const now = Date.now();
  if (pauseMemo.value !== null && now < pauseMemo.expiresAt) {
    lastPauseCacheStatus = 'hit_memo';
    return pauseMemo.value;
  }

  try {
    const kv = await getKv();
    if (kv) {
      const raw = await kv.get(DESPERTAR_PAUSE_CACHE_KEY);
      const parsed = parsePauseCacheValue(raw);
      if (parsed) {
        setPauseMemo(parsed, now);
        lastPauseCacheStatus = 'hit_kv';
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[despertar-gate] kv get pause:', error?.message || error);
  }

  lastPauseCacheStatus = 'miss';
  const fromDb = await readPauseFromDb(supabase);
  setPauseMemo(fromDb, now);
  await writeKvPause(fromDb);
  return fromDb;
}

/**
 * Lazy: released + pause_until no futuro.
 * @param {DespertarPauseState | null | undefined} pause
 * @param {number} [now]
 */
export function isDespertarPauseActive(pause, now = Date.now()) {
  if (!pause?.released) return false;
  const until = Date.parse(String(pause.pauseUntil || ''));
  if (!Number.isFinite(until)) return false;
  return until > now;
}

/**
 * Admin nunca bloqueado. Aluno: !published OU pausa efetiva.
 * @param {{ role?: string } | null} user
 * @param {boolean} published
 * @param {DespertarPauseState | null | undefined} pause
 * @param {number} [now]
 */
export function isDespertarPlayBlocked(user, published, pause, now = Date.now()) {
  if (user?.role === 'admin') return false;
  if (!published) return true;
  return isDespertarPauseActive(pause, now);
}

/**
 * DTO público para o cliente (null se pausa inativa / expirada).
 * @param {DespertarPauseState | null | undefined} pause
 * @param {number} [now]
 */
export function pausePublicDto(pause, now = Date.now()) {
  if (!isDespertarPauseActive(pause, now)) return null;
  return {
    active: true,
    pauseUntil: pause.pauseUntil,
    reason: pause.reason || DESPERTAR_PAUSE_REASON_PRESETS.aula,
    pauseStartedAt: pause.pauseStartedAt || null,
  };
}

/**
 * Janela bruta para catch-up (A4) — mesmo após expirar, enquanto meta ainda tiver until.
 * @param {DespertarPauseState | null | undefined} pause
 * @param {number} [now]
 */
export function pauseWindowDto(pause, now = Date.now()) {
  if (!pause?.pauseUntil) return null;
  return {
    active: isDespertarPauseActive(pause, now),
    pauseUntil: pause.pauseUntil,
    pauseStartedAt: pause.pauseStartedAt || null,
  };
}

/**
 * @param {{ reasonPreset?: string, reason?: string }} input
 * @returns {{ ok: true, reason: string } | { ok: false, error: string }}
 */
export function resolvePauseReason(input = {}) {
  const preset = String(input.reasonPreset ?? 'aula').trim() || 'aula';
  if (preset !== 'custom' && Object.prototype.hasOwnProperty.call(DESPERTAR_PAUSE_REASON_PRESETS, preset)) {
    return { ok: true, reason: DESPERTAR_PAUSE_REASON_PRESETS[preset] };
  }
  const custom = String(input.reason ?? '').trim();
  if (custom.length < 1 || custom.length > DESPERTAR_PAUSE_REASON_MAX) {
    return { ok: false, error: `Motivo inválido (1–${DESPERTAR_PAUSE_REASON_MAX} caracteres).` };
  }
  return { ok: true, reason: custom };
}

/**
 * @param {{ minutes?: unknown, pauseUntil?: unknown }} input
 * @param {number} [now]
 * @returns {{ ok: true, pauseUntil: string } | { ok: false, error: string }}
 */
export function resolvePauseUntil(input = {}, now = Date.now()) {
  let untilMs;
  if (input.pauseUntil != null && String(input.pauseUntil).trim()) {
    untilMs = Date.parse(String(input.pauseUntil));
    if (!Number.isFinite(untilMs)) {
      return { ok: false, error: 'Horário de reabertura inválido.' };
    }
  } else {
    const mins = Number(input.minutes);
    if (!Number.isFinite(mins) || mins <= 0) {
      return { ok: false, error: 'Duração inválida.' };
    }
    untilMs = now + Math.round(mins * 60_000);
  }
  if (untilMs <= now) {
    return { ok: false, error: 'A reabertura precisa ser no futuro.' };
  }
  if (untilMs > now + DESPERTAR_PAUSE_MAX_MS) {
    return { ok: false, error: 'Pausa máxima: 4 horas.' };
  }
  return { ok: true, pauseUntil: new Date(untilMs).toISOString() };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{
 *   userId: number,
 *   minutes?: unknown,
 *   pauseUntil?: unknown,
 *   reasonPreset?: string,
 *   reason?: string,
 * }} input
 */
export async function setDespertarClassroomPause(supabase, input) {
  const now = Date.now();
  const until = resolvePauseUntil(input, now);
  if (!until.ok) return until;
  const why = resolvePauseReason(input);
  if (!why.ok) return why;

  const meta = {
    pause_until: until.pauseUntil,
    reason: why.reason,
    pause_started_at: new Date(now).toISOString(),
  };
  const nowIso = new Date(now).toISOString();

  const { error } = await supabase.from(LESSON_GATES_TABLE).upsert(
    {
      lesson_id: DESPERTAR_GATE_ID,
      gate_key: DESPERTAR_PAUSE_KEY,
      released: true,
      released_by: input.userId,
      released_at: nowIso,
      updated_at: nowIso,
      meta,
    },
    { onConflict: 'lesson_id,gate_key' },
  );
  metricsBumpDb(1);

  if (error) {
    if (error.code === '42P01' || /lesson_gates/i.test(error.message || '')) {
      return { ok: false, error: 'Tabela lesson_gates ausente.' };
    }
    if (/meta/i.test(error.message || '') || error.code === '42703') {
      return {
        ok: false,
        error: 'Coluna meta ausente. Aplique db/migrate-2026-09-28-despertar-classroom-pause.sql.',
      };
    }
    console.error('[despertar-gate] pause set:', error);
    return { ok: false, error: 'Não foi possível pausar o Acheron.' };
  }

  const pause = {
    released: true,
    pauseUntil: meta.pause_until,
    reason: meta.reason,
    pauseStartedAt: meta.pause_started_at,
  };
  await invalidateDespertarPauseCache();
  setPauseMemo(pause, now);
  await writeKvPause(pause);
  return { ok: true, pause, serverNow: nowIso };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ userId: number }} input
 */
export async function clearDespertarClassroomPause(supabase, input) {
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from(LESSON_GATES_TABLE).upsert(
    {
      lesson_id: DESPERTAR_GATE_ID,
      gate_key: DESPERTAR_PAUSE_KEY,
      released: false,
      released_by: input.userId,
      released_at: null,
      updated_at: nowIso,
      meta: {},
    },
    { onConflict: 'lesson_id,gate_key' },
  );
  metricsBumpDb(1);

  if (error) {
    if (error.code === '42P01' || /lesson_gates/i.test(error.message || '')) {
      return { ok: false, error: 'Tabela lesson_gates ausente.' };
    }
    if (/meta/i.test(error.message || '') || error.code === '42703') {
      return {
        ok: false,
        error: 'Coluna meta ausente. Aplique db/migrate-2026-09-28-despertar-classroom-pause.sql.',
      };
    }
    console.error('[despertar-gate] pause clear:', error);
    return { ok: false, error: 'Não foi possível liberar a pausa.' };
  }

  const pause = emptyPauseState();
  await invalidateDespertarPauseCache();
  setPauseMemo(pause, Date.now());
  await writeKvPause(pause);
  return { ok: true, pause, serverNow: nowIso };
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
    console.warn('[despertar-gate] kv set published:', error?.message || error);
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
      console.error('[despertar-gate] read published:', error);
      return false;
    }

    const publishedRow = (rows || []).find(
      (row) => String(row.gate_key || '') === DESPERTAR_PUBLISHED_KEY,
    );
    return Boolean(publishedRow?.released);
  } catch (error) {
    console.error('[despertar-gate] published:', error);
    return false;
  }
}

function emptyPauseState() {
  return {
    released: false,
    pauseUntil: null,
    reason: null,
    pauseStartedAt: null,
  };
}

function normalizePauseRow(row) {
  if (!row) return emptyPauseState();
  const meta = row.meta && typeof row.meta === 'object' && !Array.isArray(row.meta)
    ? row.meta
    : {};
  return {
    released: Boolean(row.released),
    pauseUntil: meta.pause_until != null ? String(meta.pause_until) : null,
    reason: meta.reason != null ? String(meta.reason) : null,
    pauseStartedAt: meta.pause_started_at != null ? String(meta.pause_started_at) : null,
  };
}

/**
 * @param {unknown} raw
 * @returns {DespertarPauseState | null}
 */
function parsePauseCacheValue(raw) {
  if (raw == null || raw === '') return null;
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== 'object') return null;
    return {
      released: Boolean(obj.released),
      pauseUntil: obj.pauseUntil != null ? String(obj.pauseUntil) : null,
      reason: obj.reason != null ? String(obj.reason) : null,
      pauseStartedAt: obj.pauseStartedAt != null ? String(obj.pauseStartedAt) : null,
    };
  } catch {
    return null;
  }
}

function setPauseMemo(pause, now = Date.now()) {
  pauseMemo = {
    value: pause,
    expiresAt: now + DESPERTAR_GATE_MEMO_TTL_MS,
  };
}

async function writeKvPause(pause) {
  try {
    const kv = await getKv();
    if (!kv) return;
    await kv.set(
      DESPERTAR_PAUSE_CACHE_KEY,
      JSON.stringify(pause),
      { px: DESPERTAR_GATE_KV_TTL_MS },
    );
  } catch (error) {
    console.warn('[despertar-gate] kv set pause:', error?.message || error);
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<DespertarPauseState>}
 */
async function readPauseFromDb(supabase) {
  try {
    const { data: row, error } = await supabase
      .from(LESSON_GATES_TABLE)
      .select('gate_key, released, meta')
      .eq('lesson_id', DESPERTAR_GATE_ID)
      .eq('gate_key', DESPERTAR_PAUSE_KEY)
      .maybeSingle();
    metricsBumpDb(1);

    if (error) {
      if (error.code === '42P01' || /lesson_gates/i.test(error.message || '')) {
        return emptyPauseState();
      }
      // Coluna meta ainda não migrada — pausa inativa.
      if (error.code === '42703' || /meta/i.test(error.message || '')) {
        console.warn('[despertar-gate] meta ausente — pause off até migration');
        return emptyPauseState();
      }
      console.error('[despertar-gate] read pause:', error);
      return emptyPauseState();
    }

    return normalizePauseRow(row);
  } catch (error) {
    console.error('[despertar-gate] pause:', error);
    return emptyPauseState();
  }
}
