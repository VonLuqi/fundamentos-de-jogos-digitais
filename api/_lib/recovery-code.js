/**
 * Senha do Caronte — código rotativo do Mestre para recuperação legada (Task 4).
 * Só o hash fica no banco; o plaintext aparece uma vez na rotação.
 */

import crypto from 'node:crypto';

export const RECOVERY_SETTING_KEY = 'caronte_recovery_code';
export const RECOVERY_CODE_LENGTH = 10;
/** Charset sem 0/O/1/I/L — evita ambiguidade na sala. */
export const RECOVERY_CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const SETTINGS_TABLE = 'site_settings';

export function hashRecoveryCode(plain) {
  return crypto
    .createHash('sha256')
    .update(`caronte:${String(plain || '').trim().toUpperCase()}`, 'utf8')
    .digest('hex');
}

export function generateRecoveryCodePlain() {
  const bytes = crypto.randomBytes(RECOVERY_CODE_LENGTH);
  let out = '';
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i += 1) {
    out += RECOVERY_CODE_CHARSET[bytes[i] % RECOVERY_CODE_CHARSET.length];
  }
  return out;
}

export function normalizeRecoveryCodeInput(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isMissingSettingsTable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '42P01'
    || code === 'PGRST205'
    || /site_settings/i.test(message);
}

/**
 * Compara plaintext ao hash atual. Sem linha / tabela ausente → false.
 */
export async function verifyRecoveryCode(supabase, plain) {
  const normalized = normalizeRecoveryCodeInput(plain);
  if (normalized.length < 8) return { ok: false, reason: 'short' };

  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select('value_hash')
    .eq('key', RECOVERY_SETTING_KEY)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingSettingsTable(error)) {
      console.warn('[recovery-code] site_settings ausente — aplique migrate-2026-09-22-caronte-recovery.sql');
      return { ok: false, reason: 'missing_table' };
    }
    console.error('[recovery-code] falha ao ler hash', error.message);
    return { ok: false, reason: 'error' };
  }

  const stored = String(data?.value_hash || '');
  if (!stored) return { ok: false, reason: 'unset' };

  const candidate = hashRecoveryCode(normalized);
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(stored, 'utf8');
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok: match, reason: match ? 'match' : 'mismatch' };
}

/**
 * Gera novo código, grava só o hash, devolve plaintext uma vez.
 */
export async function rotateRecoveryCodeRow(supabase, adminUserId) {
  const plain = generateRecoveryCodePlain();
  const value_hash = hashRecoveryCode(plain);
  const rotated_at = new Date().toISOString();

  const { error } = await supabase.from(SETTINGS_TABLE).upsert({
    key: RECOVERY_SETTING_KEY,
    value_hash,
    rotated_at,
    rotated_by: adminUserId || null,
  }, { onConflict: 'key' });

  if (error) {
    if (isMissingSettingsTable(error)) {
      return {
        ok: false,
        error: 'Tabela site_settings ausente. Aplique db/migrate-2026-09-22-caronte-recovery.sql.',
      };
    }
    console.error('[recovery-code] falha ao rotacionar', error.message);
    return { ok: false, error: 'Não foi possível rotacionar a Senha do Caronte agora.' };
  }

  return { ok: true, code: plain, rotatedAt: rotated_at };
}
