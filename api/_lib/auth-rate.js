/**
 * Auth rate events — login / registro / recuperação sem teto (turma em aula).
 * Mantém hashes e mensagem 429 por compatibilidade; isAuthActionRateLimited nunca limita.
 */

import crypto from 'node:crypto';

export const AUTH_RATE_TABLE = 'auth_rate_events';
export const AUTH_RATE_LIMIT_MESSAGE =
  'Muitas tentativas. O Submundo pede paciência — tente novamente em breve.';

/** Todas as ações de auth sem teto (max Infinity). */
export const AUTH_RATE_LIMITS = Object.freeze({
  login_ip: { action: 'login', windowMs: 15 * 60 * 1000, max: Infinity, by: 'ip' },
  login_user: { action: 'login', windowMs: 15 * 60 * 1000, max: Infinity, by: 'username' },
  register_ip: { action: 'register', windowMs: 60 * 60 * 1000, max: Infinity, by: 'ip' },
  legacy_bind_ip: { action: 'legacy_bind', windowMs: 15 * 60 * 1000, max: Infinity, by: 'ip' },
  legacy_bind_user: { action: 'legacy_bind', windowMs: 15 * 60 * 1000, max: Infinity, by: 'username' },
  soul_recovery_issue_user: {
    action: 'soul_recovery_issue',
    windowMs: 60 * 60 * 1000,
    max: Infinity,
    by: 'username',
  },
  soul_recovery_consume_ip: {
    action: 'soul_recovery_consume',
    windowMs: 15 * 60 * 1000,
    max: Infinity,
    by: 'ip',
  },
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

/**
 * @returns {{ limited: boolean, missingTable?: boolean }}
 */
export async function isAuthActionRateLimited(_supabase, _opts) {
  return { limited: false };
}

/**
 * No-op: sem limite, não grava eventos.
 */
export async function recordAuthRateEvent(_supabase, _opts) {
  // intentionally empty
}
