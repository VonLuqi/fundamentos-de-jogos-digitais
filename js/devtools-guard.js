/**
 * Vela atalhos de DevTools / ver código-fonte fora do ARG.
 * As salas /submundo precisam do inspecionar — Tártaro, Elísios, Estige.
 *
 * `devtools-guard.boot.js` (script clássico no <head>) fecha a janela entre
 * o parse do HTML e o carregamento dos módulos ES.
 *
 * Não redireciona se “parece” que o DevTools está aberto: outer−inner,
 * screen gap e Worker+debugger geram falso positivo em notebooks/mobile
 * e expulsam alunos sem painel aberto.
 */

'use strict';

const ARG_PATH = /(?:^|\/)(?:pages\/)?submundo(?:\/|$)/i;

export function isArgLocation(pathname = typeof window !== 'undefined' ? window.location?.pathname : '') {
  return ARG_PATH.test(String(pathname || ''));
}

export function isDevtoolsShortcut(event) {
  if (!event) return false;
  const key = String(event.key || '');
  const code = String(event.code || '');
  if (key === 'F12' || code === 'F12') return true;

  const ctrlOrMeta = Boolean(event.ctrlKey || event.metaKey);
  if (!ctrlOrMeta) return false;

  const letter = key.length === 1 ? key.toLowerCase() : '';
  const codeLetter = code.startsWith('Key') ? code.slice(3).toLowerCase() : '';

  // Ver código-fonte (Ctrl/Cmd+U).
  if (!event.shiftKey && !event.altKey && (letter === 'u' || codeLetter === 'u')) {
    return true;
  }

  const inspectLetter = letter === 'i' || letter === 'j' || letter === 'c' || letter === 'k'
    || codeLetter === 'i' || codeLetter === 'j' || codeLetter === 'c' || codeLetter === 'k';
  if (!inspectLetter) return false;

  if (event.shiftKey) return true;
  if (event.altKey) return true;
  return false;
}

function bindGuardListener() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (window.__fjdDevtoolsGuardBound) return true;

  const onKeydown = (event) => {
    if (isArgLocation()) return;
    if (!isDevtoolsShortcut(event)) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const onContextMenu = (event) => {
    if (isArgLocation()) return;
    event.preventDefault();
    event.stopPropagation();
  };

  window.addEventListener('keydown', onKeydown, true);
  document.addEventListener('keydown', onKeydown, true);
  window.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('contextmenu', onContextMenu, true);

  window.addEventListener('pageshow', () => {
    if (isArgLocation()) return;
    window.__fjdDevtoolsGuardInstalled = true;
  });

  window.__fjdDevtoolsGuardBound = true;
  return true;
}

export function installDevtoolsGuard() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (isArgLocation()) return false;

  window.__fjdDevtoolsGuardInstalled = true;
  bindGuardListener();
  return true;
}
