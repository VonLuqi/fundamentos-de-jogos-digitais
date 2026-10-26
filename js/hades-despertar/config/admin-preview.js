/**
 * Pré-visualização admin do Despertar sem abrir o Acheron para a turma.
 * sessionStorage + ?preview=1 (só honorado se role === admin).
 */

'use strict';

export const ADMIN_PREVIEW_STORAGE_KEY = 'despertar-admin-preview';

export function isAdminPreviewActive() {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(ADMIN_PREVIEW_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAdminPreviewActive(active) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (active) sessionStorage.setItem(ADMIN_PREVIEW_STORAGE_KEY, '1');
    else sessionStorage.removeItem(ADMIN_PREVIEW_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

/**
 * Se a URL tiver ?preview=1 e o user for admin, ativa o preview e limpa a query.
 * @param {{ isAdmin?: boolean, location?: Location, history?: History }} [opts]
 * @returns {boolean} true se o preview ficou ativo
 */
export function consumeAdminPreviewQuery(opts = {}) {
  if (!opts.isAdmin) return isAdminPreviewActive();
  const loc = opts.location || (typeof globalThis !== 'undefined' ? globalThis.location : null);
  if (!loc?.search) return isAdminPreviewActive();
  try {
    const params = new URLSearchParams(loc.search);
    if (params.get('preview') !== '1') return isAdminPreviewActive();
    setAdminPreviewActive(true);
    params.delete('preview');
    const next = `${loc.pathname}${params.toString() ? `?${params}` : ''}${loc.hash || ''}`;
    const hist = opts.history || (typeof globalThis !== 'undefined' ? globalThis.history : null);
    hist?.replaceState?.(hist.state, '', next);
  } catch {
    setAdminPreviewActive(true);
  }
  return true;
}
