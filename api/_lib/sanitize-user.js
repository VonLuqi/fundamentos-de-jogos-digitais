/**
 * DTO de usuário para respostas autenticadas (auth / session-bootstrap).
 * Remove hash/senha e expõe `achievements` a partir de `conquistas`.
 *
 * Nota: `progress.js` tem variante que expande conquistas para admin —
 * bootstrap segue o contrato de auth (lista real do banco).
 */

/**
 * @param {object|null|undefined} u
 * @returns {object|null}
 */
export function sanitizeUser(u) {
  if (!u) return null;
  const { password_hash, password, conquistas, ...safe } = u;
  const displayName = safe.full_name ?? safe.name ?? safe.username;
  return {
    ...safe,
    name: displayName,
    fullName: safe.full_name ?? safe.name ?? safe.username,
    username: safe.username ?? displayName,
    email: safe.email ?? null,
    emailVerifiedAt: safe.email_verified_at ?? null,
    achievements: Array.isArray(conquistas) ? conquistas : [],
  };
}
