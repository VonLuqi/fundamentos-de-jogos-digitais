/**
 * Sessões opacas com TTL (Task 2).
 * TTL 14 dias; renovação deslizante se restam &lt; 7 dias.
 */

import crypto from 'node:crypto';
import { metricsBumpDb } from './request-metrics.js';

export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const SESSION_RENEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSIONS_TABLE = 'sessions';

export function sessionExpiresAt(fromMs = Date.now()) {
  return new Date(fromMs + SESSION_TTL_MS).toISOString();
}

function isMissingExpiresColumn(error) {
  const message = String(error?.message || '');
  const code = String(error?.code || '');
  return code === '42703'
    || /expires_at/i.test(message)
    || /column .* does not exist/i.test(message);
}

/**
 * Apaga sessões vencidas. Melhor esforço — usado pelo cron (Fase A / A5), não pelo hot path de auth.
 * @returns {Promise<{ ok: boolean, deleted: number, error: string|null }>}
 */
export async function purgeExpiredSessions(supabase) {
  if (!supabase) return { ok: false, deleted: 0, error: 'no_supabase' };
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .delete()
      .lt('expires_at', nowIso)
      .select('token');

    if (error) {
      console.warn('[sessions] purgeExpiredSessions', error?.message || error);
      return { ok: false, deleted: 0, error: String(error.message || error) };
    }

    return {
      ok: true,
      deleted: Array.isArray(data) ? data.length : 0,
      error: null,
    };
  } catch (error) {
    console.warn('[sessions] purgeExpiredSessions', error?.message || error);
    return { ok: false, deleted: 0, error: String(error?.message || error) };
  }
}

/**
 * Cria sessão com expires_at. Se a coluna ainda não existe, cai no insert legado.
 * @returns {{ token: string|null, error: object|null }}
 */
export async function createSessionRow(supabase, userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const nowIso = new Date().toISOString();
  const withExpiry = {
    token,
    user_id: userId,
    created_at: nowIso,
    expires_at: sessionExpiresAt(),
  };

  let { error } = await supabase.from(SESSIONS_TABLE).insert(withExpiry);
  metricsBumpDb(1);
  if (error && isMissingExpiresColumn(error)) {
    ({ error } = await supabase.from(SESSIONS_TABLE).insert({
      token,
      user_id: userId,
      created_at: nowIso,
    }));
    metricsBumpDb(1);
  }

  if (error) return { token: null, error };
  return { token, error: null };
}

/**
 * Carrega sessão válida. Expira e apaga se passou do TTL; renova se na janela.
 * @returns {Promise<{ token: string, user_id: number, expires_at?: string }|null>}
 */
export async function loadValidSession(supabase, token) {
  if (!supabase || !token || typeof token !== 'string') return null;

  let { data: session, error } = await supabase
    .from(SESSIONS_TABLE)
    .select('token, user_id, expires_at, created_at')
    .eq('token', token)
    .limit(1)
    .maybeSingle();
  metricsBumpDb(1);

  if (error && isMissingExpiresColumn(error)) {
    ({ data: session, error } = await supabase
      .from(SESSIONS_TABLE)
      .select('token, user_id, created_at')
      .eq('token', token)
      .limit(1)
      .maybeSingle());
    metricsBumpDb(1);
  }

  if (error || !session?.user_id) return null;

  if (session.expires_at) {
    const expMs = Date.parse(session.expires_at);
    if (Number.isFinite(expMs) && expMs <= Date.now()) {
      await supabase.from(SESSIONS_TABLE).delete().eq('token', token);
      metricsBumpDb(1);
      return null;
    }

    if (Number.isFinite(expMs) && expMs - Date.now() < SESSION_RENEW_WINDOW_MS) {
      const { error: renewError } = await supabase
        .from(SESSIONS_TABLE)
        .update({ expires_at: sessionExpiresAt() })
        .eq('token', token);
      metricsBumpDb(1);
      if (renewError && !isMissingExpiresColumn(renewError)) {
        console.warn('[sessions] renew failed', renewError.message);
      }
    }
  }

  return session;
}
