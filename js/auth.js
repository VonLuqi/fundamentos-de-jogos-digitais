/**
 * ============================================================
 * PACTO DE SANGUE — Login / Cadastro (consumindo /api/auth)
 * ============================================================
 * Toda a autenticação agora acontece no BACKEND serverless.
 * O navegador guarda apenas `activeSession` (token opaco), nunca
 * senhas nem progresso — quem manda em XP e conquistas é o servidor.
 *
 * Game Feel:
 *  - Erro de credencial → Screen Shake + mensagem em vermelho-sangue.
 *  - Botão em estado "selando..." durante o fetch, evitando duplo envio.
 * ============================================================
 */

'use strict';

import { login, register, confirmEmail, requestPasswordReset, confirmPasswordReset, saveSession, getSession, clearSession, validateSession, ROUTES, ApiError } from './api.js';

/* ============================
   1. UI HELPERS
   ============================ */
function showError(el, message) {
  if (el) el.textContent = message;
}

function clearError(el) {
  if (el) el.textContent = '';
}

/** Re-dispara a animação CSS de screen-shake (feedback de "não"). */
function triggerScreenShake() {
  const wrapper = document.getElementById('shake-wrapper');
  if (!wrapper) return;

  wrapper.classList.remove('is-shaking');
  void wrapper.offsetHeight; // força reflow para reiniciar a animação
  wrapper.classList.add('is-shaking');
  wrapper.addEventListener('animationend', () => wrapper.classList.remove('is-shaking'), { once: true });
}

/** Trava/destrava o botão durante a requisição — evita duplo submit. */
function setBusy(form, busy, busyLabel) {
  const button = form.querySelector('.btn-pact');
  const label = button?.querySelector('.btn-pact__label');
  if (!button || !label) return;

  if (busy) {
    button.dataset.originalLabel = label.textContent;
    label.textContent = busyLabel;
    button.disabled = true;
    button.classList.add('is-busy');
  } else {
    label.textContent = button.dataset.originalLabel ?? label.textContent;
    button.disabled = false;
    button.classList.remove('is-busy');
  }
}

function redirectToDashboard() {
  window.setTimeout(() => {
    window.location.href = ROUTES.dashboard();
  }, 320);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function confirmSessionBeforeRedirect(token, fallbackUser) {
  const delays = [0, 220, 600];

  for (const delay of delays) {
    if (delay > 0) await wait(delay);
    try {
      const { user } = await validateSession(token);
      saveSession({ token, name: user.name, role: user.role });
      return user;
    } catch {
      // tenta novamente para absorver falhas transitórias de consistência/rede
    }
  }

  if (fallbackUser) {
    saveSession({ token, name: fallbackUser.name, role: fallbackUser.role });
    return fallbackUser;
  }

  throw new ApiError('Sessão não pôde ser confirmada.', 401);
}

/* ============================
   2. TOGGLE LOGIN / CADASTRO / MENSAGEIRO
   ============================ */
const FORGOT_SUCCESS_COPY = 'Se houver uma alma com esse nome e um e-mail confirmado, o Mensageiro já partiu. Olhe a caixa de entrada — e o reino das promoções.';

const MODE_SUBTITLES = {
  login: 'Assine seu nome no tomo dos iniciados para adentrar o Domínio.',
  register: 'Firmar um pacto é criar uma nova alma no Domínio — começando do zero.',
  forgot: 'O Mensageiro só parte se o selo desta alma estiver confirmado.',
  reset: 'Sele uma nova Palavra de Passagem para reabrir o Pacto.',
};

let activateMode = () => {};
let pendingResetToken = '';

function initModeToggle() {
  const btnLogin = document.getElementById('mode-login');
  const btnRegister = document.getElementById('mode-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const formForgot = document.getElementById('form-forgot');
  const formReset = document.getElementById('form-reset');
  const toggle = document.querySelector('.pact-mode-toggle');
  const subtitle = document.getElementById('pact-subtitle');

  if (!btnLogin || !btnRegister || !formLogin || !formRegister) return;

  activateMode = function activateMode(mode) {
    const isLogin = mode === 'login';
    const isRegister = mode === 'register';
    const isForgot = mode === 'forgot';
    const isReset = mode === 'reset';

    btnLogin.classList.toggle('is-active', isLogin);
    btnLogin.setAttribute('aria-selected', String(isLogin));
    btnRegister.classList.toggle('is-active', isRegister);
    btnRegister.setAttribute('aria-selected', String(isRegister));

    formLogin.classList.toggle('is-active', isLogin);
    formRegister.classList.toggle('is-active', isRegister);
    formForgot?.classList.toggle('is-active', isForgot);
    formReset?.classList.toggle('is-active', isReset);

    if (toggle) toggle.hidden = isReset || isForgot;

    if (subtitle && MODE_SUBTITLES[mode]) {
      subtitle.textContent = MODE_SUBTITLES[mode];
    }
  };

  btnLogin.addEventListener('click', () => activateMode('login'));
  btnRegister.addEventListener('click', () => activateMode('register'));
  document.getElementById('open-forgot')?.addEventListener('click', () => {
    const statusEl = document.getElementById('forgot-status');
    clearError(statusEl);
    statusEl?.classList.remove('is-error');
    activateMode('forgot');
  });
  document.getElementById('forgot-back')?.addEventListener('click', () => activateMode('login'));
}

/* ============================
   3. SUBMISSÕES (fetch → /api/auth)
   ============================ */
async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorEl = document.getElementById('login-error');
  clearError(errorEl);

  const name = form.elements.name.value;
  const password = form.elements.password.value;

  setBusy(form, true, 'Selando...');
  try {
    const { token, user } = await login(name, password);
    await confirmSessionBeforeRedirect(token, user);
    redirectToDashboard();
  } catch (error) {
    clearSession();
    setBusy(form, false);
    const message = error instanceof ApiError ? error.message : 'Falha ao contatar o Domínio.';
    showError(errorEl, message);
    triggerScreenShake();
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorEl = document.getElementById('register-error');
  clearError(errorEl);

  const fullName = form.elements.full_name.value;
  const turma = form.elements.turma.value;
  const username = form.elements.username.value;
  const email = form.elements.email.value;
  const password = form.elements.password.value;
  const passwordConfirm = form.elements.password_confirm.value;

  // Validação local só para a confirmação (o resto é validado no servidor).
  if (password !== passwordConfirm) {
    showError(errorEl, 'As palavras de passagem não coincidem.');
    triggerScreenShake();
    return;
  }

  setBusy(form, true, 'Firmando...');
  try {
    const { token, user } = await register(fullName, turma, username, password, email);
    await confirmSessionBeforeRedirect(token, user);
    redirectToDashboard();
  } catch (error) {
    clearSession();
    setBusy(form, false);
    const message = error instanceof ApiError ? error.message : 'Falha ao contatar o Domínio.';
    showError(errorEl, message);
    triggerScreenShake();
  }
}

async function handleForgotSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const statusEl = document.getElementById('forgot-status');
  clearError(statusEl);
  statusEl?.classList.remove('is-error');

  const username = String(form.elements.username.value || '').trim();
  const email = String(form.elements.email.value || '').trim();

  if (!username || !email) {
    statusEl?.classList.add('is-error');
    showError(statusEl, 'Informe o nome da alma e o e-mail.');
    return;
  }

  setBusy(form, true, 'Chamando...');
  try {
    await requestPasswordReset(username, email);
    showError(statusEl, FORGOT_SUCCESS_COPY);
  } catch {
    // O servidor responde 200 mesmo quando não envia. Rede caída: mesma copy,
    // para não ensinar se a conta existe.
    showError(statusEl, FORGOT_SUCCESS_COPY);
  } finally {
    setBusy(form, false);
  }
}

async function handleResetSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorEl = document.getElementById('reset-error');
  clearError(errorEl);

  const token = pendingResetToken || new URLSearchParams(window.location.search).get('reset') || '';
  const password = form.elements.password.value;
  const passwordConfirm = form.elements.password_confirm.value;

  if (!token) {
    showError(errorEl, 'Este selo expirou ou já foi usado. Chame o Mensageiro de novo.');
    triggerScreenShake();
    return;
  }

  if (password !== passwordConfirm) {
    showError(errorEl, 'As palavras de passagem não coincidem.');
    triggerScreenShake();
    return;
  }

  setBusy(form, true, 'Selando...');
  try {
    await confirmPasswordReset(token, password);
    pendingResetToken = '';
    const url = new URL(window.location.href);
    url.searchParams.delete('reset');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

    const notice = document.getElementById('verify-result');
    if (notice) {
      notice.hidden = false;
      notice.classList.remove('is-error');
      notice.textContent = 'Nova Palavra selada. Entre no Domínio.';
    }
    activateMode('login');
    setBusy(form, false);
  } catch (error) {
    setBusy(form, false);
    const message = error instanceof ApiError ? error.message : 'Falha ao contatar o Domínio.';
    showError(errorEl, message);
    triggerScreenShake();
  }
}

let authInteractionsBound = false;

function bindAuthInteractions() {
  if (authInteractionsBound) return;

  initModeToggle();

  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const formForgot = document.getElementById('form-forgot');
  const formReset = document.getElementById('form-reset');
  if (formLogin) formLogin.addEventListener('submit', handleLoginSubmit);
  if (formRegister) formRegister.addEventListener('submit', handleRegisterSubmit);
  if (formForgot) formForgot.addEventListener('submit', handleForgotSubmit);
  if (formReset) formReset.addEventListener('submit', handleResetSubmit);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') window.location.href = ROUTES.home();
  });

  authInteractionsBound = true;
}

/* ============================
   4. BOOT
   ============================ */
async function consumeVerifyLink() {
  const params = new URLSearchParams(window.location.search);
  const verifyToken = params.get('verify');
  const resultEl = document.getElementById('verify-result');
  if (!verifyToken || !resultEl) return;

  resultEl.hidden = false;
  resultEl.classList.remove('is-error');
  resultEl.textContent = 'Reconhecendo o selo...';

  try {
    await confirmEmail(verifyToken);
    resultEl.textContent = 'Selo reconhecido. Pode entrar no Domínio.';
    const url = new URL(window.location.href);
    url.searchParams.delete('verify');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  } catch (error) {
    resultEl.classList.add('is-error');
    resultEl.textContent = error instanceof ApiError
      ? error.message
      : 'Este selo não pôde ser reconhecido.';
  }
}

async function init() {
  // Os handlers de submit precisam existir imediatamente para evitar
  // envio nativo enquanto a checagem assíncrona de sessão roda.
  bindAuthInteractions();

  const params = new URLSearchParams(window.location.search);
  pendingResetToken = params.get('reset') || '';

  if (pendingResetToken) {
    activateMode('reset');
  } else if (window.location.hash === '#register') {
    activateMode('register');
  }

  await consumeVerifyLink();

  const verifyResult = document.getElementById('verify-result');
  if (verifyResult && !verifyResult.hidden && verifyResult.classList.contains('is-error')) {
    return;
  }

  if (pendingResetToken) return;

  const session = getSession();
  if (session?.token) {
    try {
      await validateSession(session.token);
      window.location.replace(ROUTES.dashboard());
      return;
    } catch {
      // Sessão inválida/expirada: limpa e permanece na tela de login.
      clearSession();
    }
  }
}

function bootAuthPage() {
  init().catch(() => {
    // Em erro de rede, mantém usuário na tela de login em vez de loopar.
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAuthPage, { once: true });
} else {
  bootAuthPage();
}
