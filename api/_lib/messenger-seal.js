/**
 * Selo do Mensageiro — soft-nudge apenas (Task 2 / plano-email-opcional).
 * Hard-gate removido: aluno sem email_verified_at navega e muta o Domínio.
 * `needsMessengerSeal` ainda indica “falta confirmar selo” para banner/UI.
 */

export const MESSENGER_SEAL_REQUIRED = 'messenger_seal_required';
export const MESSENGER_SEAL_MESSAGE =
  'Sem selo de mensageiro — vincule e confirme um e-mail no Painel do Herói (opcional).';

/**
 * Soft-nudge: aluno sem e-mail confirmado. Admin isento.
 * @param {{ role?: string, email_verified_at?: string|null, emailVerifiedAt?: string|null }|null} user
 */
export function needsMessengerSeal(user) {
  if (!user || user.role === 'admin') return false;
  const verified = user.email_verified_at ?? user.emailVerifiedAt ?? null;
  return !verified;
}

/**
 * Hard-gate desligado (Task 2). Mantido como no-op para não quebrar imports.
 * @returns {boolean} always false — nunca bloqueia
 */
export function rejectUnlessMessengerSeal(_user, _res) {
  return false;
}
