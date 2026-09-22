/**
 * Hard-gate do Selo do Mensageiro (Task 3).
 * Aluno sem email_verified_at não muta o Domínio; admin isento.
 */

export const MESSENGER_SEAL_REQUIRED = 'messenger_seal_required';
export const MESSENGER_SEAL_MESSAGE =
  'Sem selo de mensageiro — vincule e confirme um e-mail no Painel do Herói.';

/**
 * @param {{ role?: string, email_verified_at?: string|null, emailVerifiedAt?: string|null }|null} user
 */
export function needsMessengerSeal(user) {
  if (!user || user.role === 'admin') return false;
  const verified = user.email_verified_at ?? user.emailVerifiedAt ?? null;
  return !verified;
}

/**
 * @returns {boolean} true se a resposta já foi enviada (bloqueou)
 */
export function rejectUnlessMessengerSeal(user, res) {
  if (!needsMessengerSeal(user)) return false;
  res.status(403).json({
    ok: false,
    error: MESSENGER_SEAL_REQUIRED,
    message: MESSENGER_SEAL_MESSAGE,
  });
  return true;
}
