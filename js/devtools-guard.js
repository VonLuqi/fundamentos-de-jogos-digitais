/**
 * Vela o atalho de DevTools (F12 e equivalentes) fora do ARG.
 * As salas /submundo precisam do inspecionar — Tártaro, Elísios, Estige.
 */

'use strict';

const ARG_PATH = /(?:^|\/)(?:pages\/)?submundo(?:\/|$)/i;

export function isArgLocation(pathname = typeof window !== 'undefined' ? window.location?.pathname : '') {
  return ARG_PATH.test(String(pathname || ''));
}

export function isDevtoolsShortcut(event) {
  if (!event) return false;
  const key = String(event.key || '');
  if (key === 'F12') return true;

  const letter = key.length === 1 ? key.toLowerCase() : '';
  const inspectLetter = letter === 'i' || letter === 'j' || letter === 'c' || letter === 'k';
  if (!inspectLetter) return false;

  const ctrlOrMeta = Boolean(event.ctrlKey || event.metaKey);
  if (ctrlOrMeta && event.shiftKey) return true;
  if (ctrlOrMeta && event.altKey) return true;
  return false;
}

export function installDevtoolsGuard() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (window.__fjdDevtoolsGuardInstalled) return true;
  if (isArgLocation()) return false;

  window.__fjdDevtoolsGuardInstalled = true;

  window.addEventListener('keydown', (event) => {
    if (isArgLocation()) return;
    if (!isDevtoolsShortcut(event)) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  return true;
}
