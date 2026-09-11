/**
 * Vela atalhos de DevTools / ver código-fonte fora do ARG.
 * As salas /submundo precisam do inspecionar — Tártaro, Elísios, Estige.
 *
 * Se DevTools já estiver aberto, redireciona para a página inicial.
 * Detecção: tamanho + Worker/debugger (sem travar a aba principal).
 *
 * `devtools-guard.boot.js` (script clássico no <head>) fecha a janela entre
 * o parse do HTML e o carregamento dos módulos ES.
 */

'use strict';

const ARG_PATH = /(?:^|\/)(?:pages\/)?submundo(?:\/|$)/i;
const SIZE_THRESHOLD_PX = 160;
const WORKER_TIMEOUT_MS = 320;

export function isArgLocation(pathname = typeof window !== 'undefined' ? window.location?.pathname : '') {
  return ARG_PATH.test(String(pathname || ''));
}

export function isHomeLocation(pathname = typeof window !== 'undefined' ? window.location?.pathname : '') {
  const path = String(pathname || '');
  if (!path || path === '/') return true;
  if (path.includes('/pages/')) return false;
  return /(?:^|\/)index\.html$/i.test(path);
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

/** Heurística: DevTools dockado (Chrome moderno às vezes anula outer−inner). */
export function isDevtoolsDockedBySize(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return false;
  const ww = win.innerWidth || 0;
  const wh = win.innerHeight || 0;
  const ow = win.outerWidth || 0;
  const oh = win.outerHeight || 0;
  if (Math.abs(ow - ww) > SIZE_THRESHOLD_PX || Math.abs(oh - wh) > SIZE_THRESHOLD_PX) {
    return true;
  }
  const sw = win.screen?.availWidth || win.screen?.width || 0;
  const sh = win.screen?.availHeight || win.screen?.height || 0;
  const nearMaxW = sw > 0 && ow >= sw - 48;
  const nearMaxH = sh > 0 && oh >= sh - 48;
  if (nearMaxW && sw - ww > SIZE_THRESHOLD_PX) return true;
  if (nearMaxH && sh - wh > SIZE_THRESHOLD_PX + 40) return true;
  return false;
}

function homeHref() {
  const path = String(window.location?.pathname || '');
  if (path.includes('/pages/')) return '../index.html';
  return './index.html';
}

function goHome() {
  if (isArgLocation() || isHomeLocation()) return false;
  if (window.__fjdDevtoolsRedirecting) return false;
  window.__fjdDevtoolsRedirecting = true;
  window.location.replace(homeHref());
  return true;
}

function probeWorker(done) {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined') {
    done(isDevtoolsDockedBySize());
    return;
  }

  let settled = false;
  let worker;
  let url;
  const finish = (open) => {
    if (settled) return;
    settled = true;
    try { worker?.terminate(); } catch { /* ignore */ }
    try { if (url) URL.revokeObjectURL(url); } catch { /* ignore */ }
    done(Boolean(open));
  };

  try {
    url = URL.createObjectURL(new Blob(
      ['onmessage=function(){var t=Date.now();debugger;postMessage(Date.now()-t);};'],
      { type: 'application/javascript' },
    ));
    worker = new Worker(url);
    worker.onmessage = (event) => finish((event.data || 0) > 100);
    worker.onerror = () => finish(isDevtoolsDockedBySize());
    worker.postMessage(0);
    window.setTimeout(() => finish(true), WORKER_TIMEOUT_MS);
  } catch {
    finish(isDevtoolsDockedBySize());
  }
}

function redirectHomeIfDevtoolsOpen() {
  if (isArgLocation() || isHomeLocation()) return false;
  if (window.__fjdDevtoolsRedirecting) return false;

  if (isDevtoolsDockedBySize()) {
    return goHome();
  }

  if (window.__fjdDevtoolsProbing) return false;
  window.__fjdDevtoolsProbing = true;
  probeWorker((open) => {
    window.__fjdDevtoolsProbing = false;
    if (open) goHome();
  });
  return false;
}

function bindOpenWatch() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (window.__fjdDevtoolsOpenWatch) return true;
  window.__fjdDevtoolsOpenWatch = true;

  const check = () => redirectHomeIfDevtoolsOpen();

  window.addEventListener('resize', check);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  window.addEventListener('pageshow', check);
  window.setInterval(check, 1600);
  check();

  return true;
}

function bindGuardListener() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (window.__fjdDevtoolsGuardBound) {
    bindOpenWatch();
    return true;
  }

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
  bindOpenWatch();
  return true;
}

export function installDevtoolsGuard() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (isArgLocation()) return false;

  window.__fjdDevtoolsGuardInstalled = true;
  bindGuardListener();
  return true;
}
