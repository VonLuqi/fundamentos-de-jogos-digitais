/**
 * Rate limit de register / legado / soul recovery (Tasks 2 + 4 + 3).
 * Persistido em auth_rate_events — adequado a serverless.
 *
 * Login: sem limite de tentativas (turma em aula — sem bloqueio 429).
 */

import crypto from 'node:crypto';

export const AUTH_RATE_TABLE = 'auth_rate_events';
export const AUTH_RATE_LIMIT_MESSAGE =
  'Muitas tentativas. O Submundo pede paciência — tente novamente em breve.';

/** Limites (register / legado / soul recovery). Login sem teto (max Infinity). */
export const AUTH_RATE_LIMITS = Object.freeze({
  login_ip: { action: 'login', windowMs: 15 * 60 * 1000, max: Infinity, by: 'ip' },
  login_user: { action: 'login', windowMs: 15 * 60 * 1000, max: Infinity, by: 'username' },
  register_ip: { action: 'register', windowMs: 60 * 60 * 1000, max: 5, by: 'ip' },
  legacy_bind_ip: { action: 'legacy_bind', windowMs: 15 * 60 * 1000, max: 10, by: 'ip' },
  legacy_bind_user: { action: 'legacy_bind', windowMs: 15 * 60 * 1000, max: 5, by: 'username' },
  soul_recovery_issue_user: { action: 'soul_recovery_issue', windowMs: 60 * 60 * 1000, max: 10, by: 'username' },
  soul_recovery_consume_ip: { action: 'soul_recovery_consume', windowMs: 15 * 60 * 1000, max: 5, by: 'ip' },
});

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

export function hashIp(ip) {
  return sha256Hex(`ip:${ip || 'unknown'}`);
}

export function hashUsername(username) {
  return sha256Hex(`user:${String(username || '').trim().toLowerCase()}`);
}

function isMissingRateTable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '42P01'
    || code === 'PGRST205'
    || /auth_rate_events/i.test(message);
}

async function countEvents(supabase, { action, ipHash, usernameHash, sinceIso }) {
  let query = supabase
    .from(AUTH_RATE_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('action', action)
    .gte('created_at', sinceIso);

  if (ipHash) query = query.eq('ip_hash', ipHash);
  if (usernameHash) query = query.eq('username_hash', usernameHash);

  const { count, error } = await query;
  if (error) return { count: 0, error };
  return { count: count || 0, error: null };
}

/**
 * @returns {{ limited: boolean, missingTable?: boolean }}
 */
export async function isAuthActionRateLimited(supabase, { action, ip, username }) {
  if (!supabase) return { limited: false };
  // Login livre — sem teto por IP/usuário.
  if (action === 'login') return { limited: false };

  const ipHash = hashIp(ip);
  const usernameHash = username ? hashUsername(username) : null;
  const now = Date.now();

  const checks = [];
  if (action === 'register') {
    checks.push({
      ...AUTH_RATE_LIMITS.register_ip,
      ipHash,
      usernameHash: null,
    });
  } else if (action === 'legacy_bind') {
    checks.push({
      ...AUTH_RATE_LIMITS.legacy_bind_ip,
      ipHash,
      usernameHash: null,
    });
    if (usernameHash) {
      checks.push({
        ...AUTH_RATE_LIMITS.legacy_bind_user,
        ipHash: null,
        usernameHash,
      });
    }
  } else if (action === 'soul_recovery_issue') {
    if (usernameHash) {
      checks.push({
        ...AUTH_RATE_LIMITS.soul_recovery_issue_user,
        ipHash: null,
        usernameHash,
      });
    }
  } else if (action === 'soul_recovery_consume') {
    checks.push({
      ...AUTH_RATE_LIMITS.soul_recovery_consume_ip,
      ipHash,
      usernameHash: null,
    });
  }

  for (const check of checks) {
    if (!Number.isFinite(check.max)) continue;
    const sinceIso = new Date(now - check.windowMs).toISOString();
    const { count, error } = await countEvents(supabase, {
      action: check.action,
      ipHash: check.ipHash,
      usernameHash: check.usernameHash,
      sinceIso,
    });
    if (error) {
      if (isMissingRateTable(error)) {
        return { limited: false, missingTable: true };
      }
      console.warn('[auth-rate] count failed', error.message);
      continue;
    }
    if (count >= check.max) {
      return { limited: true };
    }
  }

  return { limited: false };
}

/**
 * Registra tentativa (sucesso ou falha). Melhor esforço.
 * Login não grava (sem limite).
 */
export async function recordAuthRateEvent(supabase, { action, ip, username }) {
  if (!supabase) return;
  if (action === 'login') return;
  try {
    const { error } = await supabase.from(AUTH_RATE_TABLE).insert({
      action,
      ip_hash: hashIp(ip),
      username_hash: username ? hashUsername(username) : null,
      created_at: new Date().toISOString(),
    });
    if (error && !isMissingRateTable(error)) {
      console.warn('[auth-rate] insert failed', error.message);
    }
  } catch (error) {
    console.warn('[auth-rate] insert threw', error?.message || error);
  }
}
