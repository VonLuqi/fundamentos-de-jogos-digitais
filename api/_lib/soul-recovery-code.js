/**
 * Código de Recuperação da Alma — por aluno, uso único, TTL 24h (Task 3).
 * Plaintext só na emissão; no banco fica o SHA-256.
 */

import crypto from 'node:crypto';
import {
  generateRecoveryCodePlain,
  normalizeRecoveryCodeInput,
} from './recovery-code.js';

export const SOUL_RECOVERY_TABLE = 'soul_recovery_codes';
export const SOUL_RECOVERY_TTL_MS = 24 * 60 * 60 * 1000;
export const SOUL_RECOVERY_GENERIC_ERROR =
  'Código inválido ou expirado. Peça um novo ao Mestre na sala.';

export function hashSoulRecoveryCode(plain) {
  return crypto
    .createHash('sha256')
    .update(`soul:${normalizeRecoveryCodeInput(plain)}`, 'utf8')
    .digest('hex');
}

function isMissingTable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '42P01'
    || code === 'PGRST205'
    || /soul_recovery_codes/i.test(message);
}

/**
 * Invalida códigos ativos do aluno e emite um novo.
 * @returns {{ ok: true, code: string, expiresAt: string, username: string } | { ok: false, error: string }}
 */
export async function issueSoulRecoveryCode(supabase, { userId, adminId, username }) {
  if (!supabase || !userId) {
    return { ok: false, error: 'Alvo inválido.' };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SOUL_RECOVERY_TTL_MS).toISOString();
  const plain = generateRecoveryCodePlain();
  const code_hash = hashSoulRecoveryCode(plain);

  const { error: invalidateError } = await supabase
    .from(SOUL_RECOVERY_TABLE)
    .update({ used_at: now.toISOString() })
    .eq('user_id', userId)
    .is('used_at', null);

  if (invalidateError) {
    if (isMissingTable(invalidateError)) {
      return {
        ok: false,
        error: 'Tabela soul_recovery_codes ausente. Aplique db/migrate-2026-09-22-soul-recovery-codes.sql.',
      };
    }
    console.error('[soul-recovery] falha ao invalidar anteriores', invalidateError.message);
    return { ok: false, error: 'Não foi possível emitir o código agora.' };
  }

  const { error: insertError } = await supabase.from(SOUL_RECOVERY_TABLE).insert({
    user_id: userId,
    code_hash,
    expires_at: expiresAt,
    created_by: adminId || null,
    created_at: now.toISOString(),
  });

  if (insertError) {
    if (isMissingTable(insertError)) {
      return {
        ok: false,
        error: 'Tabela soul_recovery_codes ausente. Aplique db/migrate-2026-09-22-soul-recovery-codes.sql.',
      };
    }
    console.error('[soul-recovery] falha ao gravar código', insertError.message);
    return { ok: false, error: 'Não foi possível emitir o código agora.' };
  }

  return {
    ok: true,
    code: plain,
    expiresAt,
    username: String(username || ''),
  };
}

/**
 * Localiza código ativo válido (não usado, não expirado) para o user_id.
 */
export async function findActiveSoulRecovery(supabase, { userId, code }) {
  const normalized = normalizeRecoveryCodeInput(code);
  if (normalized.length < 8) return { ok: false, reason: 'short' };

  const code_hash = hashSoulRecoveryCode(normalized);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from(SOUL_RECOVERY_TABLE)
    .select('id, user_id, expires_at, used_at')
    .eq('user_id', userId)
    .eq('code_hash', code_hash)
    .is('used_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) {
      console.warn('[soul-recovery] tabela ausente — aplique migrate-2026-09-22-soul-recovery-codes.sql');
      return { ok: false, reason: 'missing_table' };
    }
    console.error('[soul-recovery] falha ao buscar código', error.message);
    return { ok: false, reason: 'error' };
  }

  if (!data?.id) return { ok: false, reason: 'mismatch' };
  return { ok: true, row: data };
}

export async function markSoulRecoveryUsed(supabase, id) {
  if (!id) return false;
  const { error } = await supabase
    .from(SOUL_RECOVERY_TABLE)
    .update({ used_at: new Date().toISOString() })
    .eq('id', id)
    .is('used_at', null);
  if (error) {
    console.error('[soul-recovery] falha ao marcar usado', error.message);
    return false;
  }
  return true;
}

export { generateRecoveryCodePlain, normalizeRecoveryCodeInput };
