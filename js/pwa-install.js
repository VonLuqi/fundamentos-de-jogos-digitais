/**
 * Convite para instalar o app (PWA) após o login.
 * Chromium: beforeinstallprompt → diálogo nativo.
 * iOS/Safari: instruções Compartilhar → Adicionar à Tela de Início.
 */
'use strict';

import { rootPath } from './api.js';

export const PWA_DISMISS_KEY = 'hades-pwa-install-dismissed';
export const PWA_INSTALLED_KEY = 'hades-pwa-install-done';
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 1800;

let deferredPrompt = null;
let bannerEl = null;
let started = false;

function siteRootUrl() {
  try {
    return new URL(`${rootPath()}/`, window.location.href);
  } catch {
    return new URL('./', window.location.href);
  }
}

function isStandalone() {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia?.('(display-mode: standalone)')?.matches) return true;
  if (window.navigator?.standalone === true) return true;
  return false;
}

function isIosSafari() {
  const ua = String(window.navigator?.userAgent || '');
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/i.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/i.test(ua);
  return iOS && webkit && notChrome;
}

function readDismissedUntil() {
  try {
    const raw = localStorage.getItem(PWA_DISMISS_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function wasInstalled() {
  try {
    return localStorage.getItem(PWA_INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(PWA_DISMISS_KEY, String(Date.now() + DISMISS_MS));
  } catch {
    /* ignore */
  }
}

function markInstalled() {
  try {
    localStorage.setItem(PWA_INSTALLED_KEY, '1');
    localStorage.removeItem(PWA_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

function ensureManifestLink() {
  if (typeof document === 'undefined' || !document.head) return;
  if (document.querySelector('link[rel="manifest"]')) return;
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = new URL('manifest.webmanifest', siteRootUrl()).href;
  document.head.appendChild(link);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  const swUrl = new URL('sw.js', siteRootUrl()).href;
  try {
    return await navigator.serviceWorker.register(swUrl, { scope: siteRootUrl().pathname });
  } catch (err) {
    console.warn('[pwa] SW register failed', err);
    return null;
  }
}

function hideBanner() {
  if (!bannerEl) return;
  bannerEl.classList.remove('is-visible');
  const node = bannerEl;
  bannerEl = null;
  window.setTimeout(() => node.remove(), 280);
}

function renderBanner({ mode }) {
  if (bannerEl || typeof document === 'undefined') return;

  const card = document.createElement('aside');
  card.className = 'pwa-install';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-labelledby', 'pwa-install-title');
  card.setAttribute('aria-describedby', 'pwa-install-body');

  const bodyText =
    mode === 'ios'
      ? 'No Safari: toque em Compartilhar e depois em Adicionar à Tela de Início.'
      : 'Acesso rápido na área de trabalho — abre como app, sem barra do navegador.';

  card.innerHTML = `
    <div class="pwa-install__panel">
      <div class="pwa-install__copy">
        <p class="pwa-install__title" id="pwa-install-title">Instalar o app</p>
        <p class="pwa-install__body" id="pwa-install-body">${bodyText}</p>
      </div>
      <div class="pwa-install__actions">
        ${
          mode === 'ios'
            ? '<button type="button" class="btn-gold" data-pwa-action="ok">Entendi</button>'
            : '<button type="button" class="btn-gold" data-pwa-action="install">Instalar</button>'
        }
        <button type="button" class="btn-gold btn-gold--ghost" data-pwa-action="dismiss">Agora não</button>
      </div>
    </div>
  `;

  card.querySelector('[data-pwa-action="dismiss"]')?.addEventListener('click', () => {
    markDismissed();
    hideBanner();
  });

  card.querySelector('[data-pwa-action="ok"]')?.addEventListener('click', () => {
    markDismissed();
    hideBanner();
  });

  card.querySelector('[data-pwa-action="install"]')?.addEventListener('click', async () => {
    const promptEvent = deferredPrompt;
    if (!promptEvent) {
      hideBanner();
      return;
    }
    deferredPrompt = null;
    try {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === 'accepted') markInstalled();
      else markDismissed();
    } catch {
      markDismissed();
    }
    hideBanner();
  });

  document.body.appendChild(card);
  bannerEl = card;
  requestAnimationFrame(() => card.classList.add('is-visible'));
}

function shouldOffer() {
  if (isStandalone() || wasInstalled()) return false;
  if (Date.now() < readDismissedUntil()) return false;
  return true;
}

function bindBeforeInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (!shouldOffer() || bannerEl) return;
    renderBanner({ mode: 'chromium' });
  });

  window.addEventListener('appinstalled', () => {
    markInstalled();
    deferredPrompt = null;
    hideBanner();
  });
}

/**
 * Inicia registro PWA e, se couber, mostra o convite de instalação.
 * Seguro chamar várias vezes (idempotente).
 */
export function maybeOfferInstall() {
  if (typeof window === 'undefined' || started) return;
  started = true;

  ensureManifestLink();
  bindBeforeInstallPrompt();

  void registerServiceWorker();

  if (!shouldOffer()) return;

  window.setTimeout(() => {
    if (!shouldOffer() || bannerEl) return;
    if (deferredPrompt) {
      renderBanner({ mode: 'chromium' });
      return;
    }
    if (isIosSafari()) {
      renderBanner({ mode: 'ios' });
    }
  }, SHOW_DELAY_MS);
}
