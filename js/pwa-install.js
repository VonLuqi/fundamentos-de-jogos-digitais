/**
 * Convite para instalar o app (PWA) após o login.
 * Chromium: beforeinstallprompt → diálogo nativo.
 * iOS/Safari: instruções Compartilhar → Adicionar à Tela de Início.
 * Instalação só com e-mail confirmado (Selo do Mensageiro); senão popup de vínculo.
 */
'use strict';

import {
  ApiError,
  bindEmail,
  fetchSessionBootstrap,
  getSession,
  needsMessengerSeal,
  requestEmailVerification,
  rootPath,
  validateSession,
} from './api.js';

export const PWA_DISMISS_KEY = 'hades-pwa-install-dismissed';
export const PWA_INSTALLED_KEY = 'hades-pwa-install-done';
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 1800;

let deferredPrompt = null;
let bannerEl = null;
let gateEl = null;
let started = false;
let installBtnWired = false;
/** @type {'chromium' | 'ios' | null} */
let pendingInstallMode = null;

function siteRootUrl() {
  try {
    return new URL(`${rootPath()}/`, window.location.href);
  } catch {
    return new URL('./', window.location.href);
  }
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)')?.matches) return true;
  if (window.matchMedia?.('(display-mode: fullscreen)')?.matches) return true;
  if (window.navigator?.standalone === true) return true;
  return false;
}

/** Detecta se o PWA já está instalado (standalone, flag local ou related apps). */
export async function isAppInstalled() {
  if (isStandalone() || wasInstalled()) return true;
  if (typeof navigator !== 'undefined' && typeof navigator.getInstalledRelatedApps === 'function') {
    try {
      const apps = await navigator.getInstalledRelatedApps();
      if (Array.isArray(apps) && apps.length > 0) {
        markInstalled();
        return true;
      }
    } catch {
      /* ignore */
    }
  }
  return false;
}

function installModeForDevice() {
  return isIosSafari() ? 'ios' : 'chromium';
}

function refreshInstallButtons() {
  void isAppInstalled().then((installed) => {
    document.querySelectorAll('[data-pwa-install-btn]').forEach((btn) => {
      applyInstallButtonState(btn, installed);
    });
  });
}

function applyInstallButtonState(btn, installed) {
  if (!btn) return;
  btn.classList.toggle('is-installed', installed);
  btn.classList.toggle('is-attention', !installed);
  if (installed) {
    btn.textContent = 'App instalado';
    btn.setAttribute('aria-label', 'O app já está instalado neste dispositivo');
    btn.title = 'Você já está usando o atalho do app (ou ele já foi instalado).';
    btn.setAttribute('aria-disabled', 'true');
  } else {
    btn.textContent = 'Instalar o app';
    btn.setAttribute('aria-label', 'Instalar o app na área de trabalho');
    btn.title = 'Instalar Fundamentos na área de trabalho / tela inicial';
    btn.removeAttribute('aria-disabled');
  }
}

/**
 * Botão permanente no rodapé do aside (injeta em todas as páginas com app-shell).
 */
export function mountInstallButton(shell = typeof document !== 'undefined' ? document.querySelector('[data-shell]') : null) {
  const footer = shell?.querySelector?.('.app-shell__footer');
  if (!footer) return null;

  let btn = footer.querySelector('[data-pwa-install-btn]');
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'app-shell__install is-attention';
    btn.setAttribute('data-pwa-install-btn', '1');
    // O "Encerrar sessão" pode estar dentro do menu do chip de perfil (não é filho direto do
    // rodapé): insere antes do item do rodapé que o contém — insertBefore com neto lança erro.
    let anchor = footer.querySelector('[data-shell-logout]');
    while (anchor && anchor.parentNode !== footer) anchor = anchor.parentNode;
    if (anchor) footer.insertBefore(btn, anchor);
    else footer.appendChild(btn);
  }

  if (!installBtnWired) {
    installBtnWired = true;
    document.addEventListener('click', (event) => {
      const target = event.target?.closest?.('[data-pwa-install-btn]');
      if (!target) return;
      event.preventDefault();
      void onInstallButtonClick(target);
    });
  }

  void isAppInstalled().then((installed) => applyInstallButtonState(btn, installed));
  return btn;
}

async function onInstallButtonClick(btn) {
  if (btn?.classList.contains('is-installed') || (await isAppInstalled())) {
    applyInstallButtonState(btn, true);
    return;
  }
  await handleInstallIntent(installModeForDevice());
  refreshInstallButtons();
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

function maskEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  const at = value.indexOf('@');
  if (at < 1) return value;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const keep = Math.min(2, local.length);
  return `${local.slice(0, keep)}***@${domain}`;
}

function sealKind(user) {
  const email = String(user?.email || '').trim();
  if (!email) return 'empty';
  if (user.emailVerifiedAt) return 'confirmed';
  return 'pending';
}

async function resolveCurrentUser() {
  const session = getSession();
  if (!session?.token) return null;
  try {
    const boot = await fetchSessionBootstrap(session.token);
    return boot?.user || null;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405 || err.status === 503)) {
      try {
        const { user } = await validateSession(session.token);
        return user || null;
      } catch {
        return null;
      }
    }
    throw err;
  }
}

function hideBanner() {
  if (!bannerEl) return;
  bannerEl.classList.remove('is-visible');
  const node = bannerEl;
  bannerEl = null;
  window.setTimeout(() => node.remove(), 280);
}

function hideGate() {
  if (!gateEl) return;
  gateEl.classList.remove('is-visible');
  const node = gateEl;
  gateEl = null;
  pendingInstallMode = null;
  window.setTimeout(() => node.remove(), 280);
}

async function runNativeInstall() {
  const promptEvent = deferredPrompt;
  if (!promptEvent) {
    if (await isAppInstalled()) {
      refreshInstallButtons();
      hideGate();
      hideBanner();
      return;
    }
    hideGate();
    hideBanner();
    renderBanner({ mode: 'manual-hint' });
    return;
  }
  deferredPrompt = null;
  try {
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome === 'accepted') {
      markInstalled();
      refreshInstallButtons();
    } else markDismissed();
  } catch {
    markDismissed();
  }
  hideGate();
  hideBanner();
}

function showIosInstructions() {
  hideGate();
  hideBanner();
  renderBanner({ mode: 'ios-instructions' });
}

/**
 * Após o selo estar ok: Chromium → prompt nativo; iOS → card de instruções.
 * @param {'chromium' | 'ios'} mode
 */
async function proceedInstall(mode) {
  if (mode === 'ios') {
    showIosInstructions();
    return;
  }
  await runNativeInstall();
}

function setGateStatus(message, isError = false) {
  const el = gateEl?.querySelector('[data-pwa-gate-status]');
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('is-error', Boolean(isError && message));
}

function renderGateForm(user) {
  const kind = sealKind(user);
  const form = gateEl?.querySelector('[data-pwa-gate-form]');
  const pending = gateEl?.querySelector('[data-pwa-gate-pending]');
  const emailEl = gateEl?.querySelector('[data-pwa-gate-email]');
  if (!form || !pending) return;

  if (kind === 'empty') {
    form.hidden = false;
    pending.hidden = true;
    if (emailEl) {
      emailEl.hidden = true;
      emailEl.textContent = '';
    }
  } else {
    form.hidden = true;
    pending.hidden = false;
    if (emailEl) {
      emailEl.hidden = false;
      emailEl.textContent = maskEmail(user.email);
    }
  }
}

function openEmailGate(user, mode) {
  if (typeof document === 'undefined') return;
  pendingInstallMode = mode;
  if (gateEl) {
    renderGateForm(user);
    setGateStatus('');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'pwa-install-gate';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'pwa-gate-title');
  overlay.innerHTML = `
    <div class="pwa-install-gate__backdrop" data-pwa-gate-dismiss></div>
    <div class="pwa-install-gate__panel">
      <p class="pwa-install-gate__title" id="pwa-gate-title">Selo do Mensageiro</p>
      <p class="pwa-install-gate__body">
        Para instalar o app, vincule e confirme um e-mail. Assim a conta não se perde se a Palavra cair no esquecimento.
      </p>
      <p class="pwa-install-gate__email" data-pwa-gate-email hidden></p>
      <p class="pwa-install-gate__status" data-pwa-gate-status role="status" aria-live="polite"></p>
      <form class="pwa-install-gate__form" data-pwa-gate-form>
        <label class="pwa-install-gate__label" for="pwa-gate-email-input">E-mail</label>
        <input
          class="pwa-install-gate__input"
          id="pwa-gate-email-input"
          name="email"
          type="email"
          autocomplete="email"
          required
          placeholder="seu@email.com"
        />
        <button class="btn-gold" type="submit" data-pwa-gate-bind>Vincular e-mail</button>
      </form>
      <div class="pwa-install-gate__pending" data-pwa-gate-pending hidden>
        <p class="pwa-install-gate__hint">
          O Mensageiro partiu. Confirme o selo na caixa de entrada — e o reino das promoções. Depois volte e toque em Instalar.
        </p>
        <button type="button" class="btn-gold" data-pwa-gate-resend>Reenviar selo</button>
      </div>
      <div class="pwa-install-gate__actions">
        <button type="button" class="btn-gold btn-gold--ghost" data-pwa-gate-dismiss>Agora não</button>
      </div>
    </div>
  `;

  const close = () => {
    hideGate();
  };

  overlay.querySelectorAll('[data-pwa-gate-dismiss]').forEach((btn) => {
    btn.addEventListener('click', () => {
      markDismissed();
      hideBanner();
      close();
    });
  });

  overlay.querySelector('[data-pwa-gate-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const session = getSession();
    if (!session?.token) return;
    const form = event.currentTarget;
    const email = String(form.elements.email?.value || '').trim();
    if (!email) {
      setGateStatus('Informe um e-mail.', true);
      return;
    }
    const bindBtn = overlay.querySelector('[data-pwa-gate-bind]');
    if (bindBtn) bindBtn.disabled = true;
    setGateStatus('Chamando o Mensageiro…');
    try {
      const result = await bindEmail(session.token, email);
      const nextUser = result.user || {
        ...user,
        email: result.email ?? email,
        emailVerifiedAt: result.emailVerifiedAt ?? null,
      };
      if (!needsMessengerSeal(nextUser)) {
        setGateStatus('Selo reconhecido.');
        await proceedInstall(pendingInstallMode || mode);
        return;
      }
      renderGateForm(nextUser);
      if (result.mailSent === false) {
        setGateStatus('Não foi possível enviar o Mensageiro. Avise o Mestre.', true);
      } else {
        setGateStatus('O Mensageiro partiu. Confirme o selo na caixa de entrada.');
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao vincular o e-mail.';
      setGateStatus(message, true);
    } finally {
      if (bindBtn) bindBtn.disabled = false;
    }
  });

  overlay.querySelector('[data-pwa-gate-resend]')?.addEventListener('click', async () => {
    const session = getSession();
    if (!session?.token) return;
    const resendBtn = overlay.querySelector('[data-pwa-gate-resend]');
    if (resendBtn) resendBtn.disabled = true;
    setGateStatus('Chamando o Mensageiro…');
    try {
      const result = await requestEmailVerification(session.token);
      if (result?.mailSent === false) {
        setGateStatus('Não foi possível reenviar. Avise o Mestre.', true);
      } else {
        setGateStatus('Se o selo ainda estiver pendente, o Mensageiro já partiu. Olhe a caixa — e o reino das promoções.');
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao chamar o Mensageiro.';
      setGateStatus(message, true);
    } finally {
      if (resendBtn) resendBtn.disabled = false;
    }
  });

  document.body.appendChild(overlay);
  gateEl = overlay;
  renderGateForm(user);
  requestAnimationFrame(() => {
    overlay.classList.add('is-visible');
    overlay.querySelector('#pwa-gate-email-input')?.focus();
  });
}

/**
 * Gate de e-mail antes de instalar.
 * @param {'chromium' | 'ios'} mode
 */
async function handleInstallIntent(mode) {
  try {
    const user = await resolveCurrentUser();
    if (!user) {
      markDismissed();
      hideBanner();
      return;
    }
    if (needsMessengerSeal(user)) {
      openEmailGate(user, mode);
      return;
    }
    await proceedInstall(mode);
  } catch (error) {
    console.warn('[pwa] gate failed', error);
    openEmailGate(
      { role: 'student', email: null, emailVerifiedAt: null },
      mode,
    );
    setGateStatus('Não foi possível verificar o selo. Vincule o e-mail para continuar.', true);
  }
}

function renderBanner({ mode }) {
  if (bannerEl || typeof document === 'undefined') return;

  const card = document.createElement('aside');
  card.className = 'pwa-install';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-labelledby', 'pwa-install-title');
  card.setAttribute('aria-describedby', 'pwa-install-body');

  let bodyText =
    'Acesso rápido na área de trabalho — abre como app, sem barra do navegador.';
  let primaryHtml =
    '<button type="button" class="btn-gold" data-pwa-action="install">Instalar</button>';

  if (mode === 'ios') {
    bodyText =
      'Acesso rápido na tela inicial — abre como app. Continue para confirmar o e-mail (se preciso) e ver como adicionar.';
    primaryHtml =
      '<button type="button" class="btn-gold" data-pwa-action="continue">Continuar</button>';
  } else if (mode === 'ios-instructions') {
    bodyText =
      'No Safari: toque em Compartilhar e depois em Adicionar à Tela de Início.';
    primaryHtml =
      '<button type="button" class="btn-gold" data-pwa-action="ok">Entendi</button>';
  } else if (mode === 'manual-hint') {
    bodyText =
      'Se o diálogo não aparecer: no Chrome, use o ícone de instalar na barra de endereço — ou abra pelo atalho se o app já estiver na área de trabalho.';
    primaryHtml =
      '<button type="button" class="btn-gold" data-pwa-action="ok">Entendi</button>';
  }

  card.innerHTML = `
    <div class="pwa-install__panel">
      <div class="pwa-install__copy">
        <p class="pwa-install__title" id="pwa-install-title">Instalar o app</p>
        <p class="pwa-install__body" id="pwa-install-body">${bodyText}</p>
      </div>
      <div class="pwa-install__actions">
        ${primaryHtml}
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

  card.querySelector('[data-pwa-action="install"]')?.addEventListener('click', () => {
    void handleInstallIntent('chromium');
  });

  card.querySelector('[data-pwa-action="continue"]')?.addEventListener('click', () => {
    void handleInstallIntent('ios');
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
    refreshInstallButtons();
    if (!shouldOffer() || bannerEl || gateEl) return;
    renderBanner({ mode: 'chromium' });
  });

  window.addEventListener('appinstalled', () => {
    markInstalled();
    deferredPrompt = null;
    hideGate();
    hideBanner();
    refreshInstallButtons();
  });

  window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change', () => {
    refreshInstallButtons();
  });
}

/**
 * Inicia registro PWA, botão no menu e, se couber, o convite flutuante.
 * Seguro chamar várias vezes (idempotente).
 */
export function maybeOfferInstall() {
  if (typeof window === 'undefined') return;

  mountInstallButton();

  if (started) {
    refreshInstallButtons();
    return;
  }
  started = true;

  ensureManifestLink();
  bindBeforeInstallPrompt();

  void registerServiceWorker();
  refreshInstallButtons();

  if (!shouldOffer()) return;

  window.setTimeout(() => {
    if (!shouldOffer() || bannerEl || gateEl) return;
    if (deferredPrompt) {
      renderBanner({ mode: 'chromium' });
      return;
    }
    if (isIosSafari()) {
      renderBanner({ mode: 'ios' });
    }
  }, SHOW_DELAY_MS);
}
