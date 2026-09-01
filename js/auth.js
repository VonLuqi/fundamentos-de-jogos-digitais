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

import { login, register, saveSession, getSession, ROUTES, ApiError } from './api.js';

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

/* ============================
   2. TOGGLE LOGIN / CADASTRO
   ============================ */
function initModeToggle() {
  const btnLogin = document.getElementById('mode-login');
  const btnRegister = document.getElementById('mode-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const subtitle = document.getElementById('pact-subtitle');

  if (!btnLogin || !btnRegister || !formLogin || !formRegister) return;

  function activateMode(mode) {
    const isLogin = mode === 'login';

    btnLogin.classList.toggle('is-active', isLogin);
    btnLogin.setAttribute('aria-selected', String(isLogin));
    btnRegister.classList.toggle('is-active', !isLogin);
    btnRegister.setAttribute('aria-selected', String(!isLogin));

    formLogin.classList.toggle('is-active', isLogin);
    formRegister.classList.toggle('is-active', !isLogin);

    if (subtitle) {
      subtitle.textContent = isLogin
        ? 'Assine seu nome no tomo dos iniciados para adentrar o Domínio.'
        : 'Firmar um pacto é criar uma nova alma no Domínio — começando do zero.';
    }
  }

  btnLogin.addEventListener('click', () => activateMode('login'));
  btnRegister.addEventListener('click', () => activateMode('register'));
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
    saveSession({ token, name: user.name, role: user.role });
    redirectToDashboard();
  } catch (error) {
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
  const username = form.elements.username.value;
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
    const { token, user } = await register(fullName, username, password);
    saveSession({ token, name: user.name, role: user.role });
    redirectToDashboard();
  } catch (error) {
    setBusy(form, false);
    const message = error instanceof ApiError ? error.message : 'Falha ao contatar o Domínio.';
    showError(errorEl, message);
    triggerScreenShake();
  }
}

/* ============================
   4. BOOT
   ============================ */
function init() {
  // Já autenticado? Vai direto para o Salão dos Heróis.
  if (getSession()) {
    window.location.replace(ROUTES.dashboard());
    return;
  }

  initModeToggle();

  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  if (formLogin) formLogin.addEventListener('submit', handleLoginSubmit);
  if (formRegister) formRegister.addEventListener('submit', handleRegisterSubmit);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') window.location.href = ROUTES.home();
  });
}

document.addEventListener('DOMContentLoaded', init);
