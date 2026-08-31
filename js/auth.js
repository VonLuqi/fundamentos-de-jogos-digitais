/**
 * ============================================================
 * PACTO DE SANGUE — Login / Cadastro (localStorage)
 * ============================================================
 * Toda a "persistência" desta tela usa `localStorage`. O contrato
 * de dados (a forma dos objetos salvos) segue o que o futuro
 * back-end em PHP/SQL irá consumir:
 *
 *    localStorage['fjg_users']  → Array<UserAccount>
 *    localStorage['fjg_session']→ { name: string }
 *
 * Onde UserAccount = {
 *    name: string,            // chave de login (case-insensitive)
 *    password: string,        // EM TEXTO PLANO — apenas para simulação!
 *    avatarIndex: number,     // índice do avatar escolhido
 *    xp: number,              // XP total acumulado
 *    achievements: string[],  // ids das conquistas desbloqueadas
 *    completedLessons: string[], // ids das aulas concluídas
 *    createdAt: string,       // ISO date
 * }
 *
 * IMPORTANTE: isto é um stub. No mundo real, o envio irá para um
 * endpoint PHP e a senha NUNCA será persistida em claro.
 * ============================================================
 */

'use strict';

/* ---------- Chaves de persistência ---------- */
const STORAGE_KEYS = {
  USERS: 'fjg_users',
  SESSION: 'fjg_session',
};

/* ---------- Avatares pré-definidos (espelhados no dashboard.js) ---------- */
const AVATAR_GLYPHS = ['◆', '♠', '♥', '♣', '♦', '★'];

/* ============================
   1. HELPERS DE STORAGE
   ============================ */
function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) return [];
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.warn('[AUTH] Falha ao ler usuários do localStorage:', error);
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (error) {
    console.error('[AUTH] Não foi possível salvar usuários no localStorage:', error);
  }
}

function setSession(userName) {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ name: userName }));
  } catch (error) {
    console.error('[AUTH] Falha ao criar sessão:', error);
  }
}

function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

/* ============================
   2. VALIDAÇÕES
   ============================ */
function findUser(users, name) {
  const lookup = name.trim().toLowerCase();
  return users.find((user) => user.name.trim().toLowerCase() === lookup) ?? null;
}

function validateCredentials(name, password) {
  const errors = [];
  if (!name || name.trim().length < 2) {
    errors.push('O nome da alma precisa de ao menos 2 letras.');
  }
  if (!password || password.length < 4) {
    errors.push('A palavra de passagem precisa de ao menos 4 símbolos.');
  }
  return errors;
}

/* ============================
   3. UI — helpers
   ============================ */
function showError(el, messages) {
  if (!el) return;
  el.textContent = messages.join(' ');
}

function clearError(el) {
  if (!el) return;
  el.textContent = '';
}

/** Re-dispara a animação CSS de screen-shake. */
function triggerScreenShake() {
  const wrapper = document.getElementById('shake-wrapper');
  if (!wrapper) return;

  // Remove, força reflow e readiciona para reiniciar a animação.
  wrapper.classList.remove('is-shaking');
  // eslint-disable-next-line no-unused-expressions
  wrapper.offsetHeight;
  wrapper.classList.add('is-shaking');

  // Remove a class ao final para poder reaplicá-la em falhas futuras.
  wrapper.addEventListener('animationend', () => wrapper.classList.remove('is-shaking'), { once: true });
}

/** Redireciona para o Dashboard com um breve feedback visual. */
function redirectToDashboard() {
  // Pequeno atraso para o jogador ver o "sucesso" do botão.
  window.setTimeout(() => {
    window.location.href = './dashboard.html';
  }, 350);
}

/* ============================
   4. TOGGLE LOGIN / CADASTRO
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
        : 'Firmar um pacto é criar uma nova alma no Domínio.';
    }
  }

  btnLogin.addEventListener('click', () => activateMode('login'));
  btnRegister.addEventListener('click', () => activateMode('register'));
}

/* ============================
   5. HANDLERS DE SUBMISSÃO
   ============================ */
function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorEl = document.getElementById('login-error');
  clearError(errorEl);

  const name = form.elements.name.value;
  const password = form.elements.password.value;

  const validations = validateCredentials(name, password);
  if (validations.length > 0) {
    showError(errorEl, validations);
    triggerScreenShake();
    return;
  }

  const users = loadUsers();
  const user = findUser(users, name);

  if (!user || user.password !== password) {
    showError(errorEl, ['O nome da alma ou a palavra de passagem estão errados.']);
    triggerScreenShake();
    return;
  }

  setSession(user.name);
  redirectToDashboard();
}

function handleRegisterSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorEl = document.getElementById('register-error');
  clearError(errorEl);

  const name = form.elements.name.value;
  const password = form.elements.password.value;
  const passwordConfirm = form.elements.password_confirm.value;

  const validations = validateCredentials(name, password);
  if (validations.length > 0) {
    showError(errorEl, validations);
    triggerScreenShake();
    return;
  }

  if (password !== passwordConfirm) {
    showError(errorEl, ['As palavras de passagem não coincidem.']);
    triggerScreenShake();
    return;
  }

  const users = loadUsers();
  if (findUser(users, name)) {
    showError(errorEl, ['Essa alma já assinou o tomo. Tente "Entrar".']);
    triggerScreenShake();
    return;
  }

  const newUser = {
    name: name.trim(),
    password, // stub: será substituído por hash quando o back-end chegar
    avatarIndex: Math.floor(Math.random() * AVATAR_GLYPHS.length),
    xp: 0,
    achievements: ['primeiro_sangue'], // conquista de exemplo (ex.: Completou a Aula 1)
    completedLessons: [],
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);
  setSession(newUser.name);
  redirectToDashboard();
}

/* ============================
   6. BOOT
   ============================ */
function init() {
  // Se já há sessão ativa, pula direto para o Dashboard.
  if (getSession()) {
    redirectToDashboard();
    return;
  }

  initModeToggle();

  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  if (formLogin) formLogin.addEventListener('submit', handleLoginSubmit);
  if (formRegister) formRegister.addEventListener('submit', handleRegisterSubmit);

  // Botão ESC volta ao menu (atalho de teclado).
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      window.location.href = '../index.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
