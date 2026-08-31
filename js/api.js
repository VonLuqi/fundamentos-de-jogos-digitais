/**
 * ============================================================
 * API CLIENT — Ponte entre o Frontend e as rotas /api do Vercel
 * ============================================================
 * Responsabilidades:
 *   1. Guardar APENAS a sessão ativa no localStorage
 *      (`activeSession` = { token, name, role, savedAt }).
 *      Nenhum dado de progresso é confiado ao navegador — XP e
 *      conquistas vêm sempre do servidor.
 *   2. Expor helpers `fetch()` tipados para /api/auth e /api/progress.
 *   3. Fornecer um guard de rota (`requireSession`) que redireciona
 *      para o Pacto de Sangue quando não há sessão ativa.
 * ============================================================
 */

'use strict';

/* ---------- Única chave permitida no localStorage ---------- */
const SESSION_KEY = 'activeSession';

/* ---------- Avatares (espelhado no backend: AVATAR_COUNT = 6) ---------- */
export const AVATAR_GLYPHS = ['◆', '♠', '♥', '♣', '♦', '★'];

/* ============================================================
   1. RESOLUÇÃO DE CAMINHOS
   ============================================================
   As páginas vivem em dois níveis (`/index.html` e `/pages/*.html`),
   mas a API é sempre absoluta a partir da raiz do domínio — o que
   funciona igual no Vercel e no `vercel dev`.
   ============================================================ */
const API_BASE = '/api';

/** Caminho relativo até a raiz do site, a partir da página atual. */
export function rootPath() {
  return window.location.pathname.includes('/pages/') ? '..' : '.';
}

export const ROUTES = {
  home: () => `${rootPath()}/index.html`,
  auth: () => `${rootPath()}/pages/auth.html`,
  dashboard: () => `${rootPath()}/pages/dashboard.html`,
  lesson: (id) => `${rootPath()}/pages/${id}.html`,
};

/* ============================================================
   2. SESSÃO ATIVA (localStorage — só o token e o mínimo de UI)
   ============================================================ */
export function saveSession({ token, name, role }) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token, name, role, savedAt: new Date().toISOString() })
    );
  } catch (error) {
    console.error('[API] Não foi possível salvar a sessão:', error);
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session && session.token ? session : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/* ============================================================
   3. TRANSPORTE HTTP
   ============================================================ */
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Resposta sem corpo JSON (ex.: 404 estático quando a API não está rodando)
    throw new ApiError(
      'A API não respondeu. Rode `vercel dev` localmente ou publique no Vercel.',
      response.status
    );
  }

  if (!response.ok || payload.ok === false) {
    throw new ApiError(payload?.error ?? 'Erro desconhecido no Domínio.', response.status, payload);
  }
  return payload;
}

/** Erro de API com status HTTP, para o frontend decidir a reação (shake, redirect...). */
export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

/* ============================================================
   4. ROTAS DE AUTENTICAÇÃO
   ============================================================ */
export function login(name, password) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'login', username: name, password }),
  });
}

export function register(name, password) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'register', username: name, password }),
  });
}

export async function logout() {
  const session = getSession();
  clearSession();
  if (!session) return;
  try {
    await request('/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'logout', token: session.token }),
    });
  } catch {
    // Logout é "best effort": a sessão local já foi apagada.
  }
}

/** Valida a sessão no servidor e devolve o usuário atualizado. */
export function validateSession(token) {
  return request(`/auth?token=${encodeURIComponent(token)}`, { method: 'GET' });
}

/* ============================================================
   5. ROTAS DE PROGRESSO
   ============================================================ */
export function fetchProfile(token) {
  return request(`/progress?token=${encodeURIComponent(token)}`, { method: 'GET' });
}

export function redeemCode(token, code) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'redeem', code }),
  });
}

export function setAvatar(token, avatarIndex) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'avatar', avatarIndex }),
  });
}

export function listCodes(token) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'listCodes' }),
  });
}

export function listUsers(token) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'listUsers' }),
  });
}

/* ============================================================
   6. GUARD DE ROTA
   ============================================================
   Chamado no boot das páginas protegidas. Se não houver sessão
   (ou se o servidor a rejeitar), redireciona imediatamente para
   o Pacto de Sangue.
   ============================================================ */
export async function requireSession() {
  const session = getSession();
  if (!session) {
    window.location.replace(ROUTES.auth());
    return null;
  }

  try {
    const { user } = await validateSession(session.token);
    // Mantém o cache de UI (nome/role) alinhado ao servidor.
    saveSession({ token: session.token, name: user.name, role: user.role });
    return { session, user };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearSession();
      window.location.replace(ROUTES.auth());
      return null;
    }
    // Erro de rede/API fora do ar: propaga para a página exibir aviso.
    throw error;
  }
}

/* ============================================================
   7. REGRAS DE APRESENTAÇÃO COMPARTILHADAS
   ============================================================ */
export const LEVEL_XP_BASE = 100;

export const RANKS = [
  { minXp: 0, title: 'Alma Novata' },
  { minXp: 20, title: 'Iniciado do Tártaro' },
  { minXp: 60, title: 'Operador do Tártaro' },
  { minXp: 120, title: 'Veterano do Submundo' },
  { minXp: 240, title: 'Campeão Érebo' },
];

export function rankForXp(xp) {
  const match = RANKS.filter((r) => xp >= r.minXp).pop();
  return match ? match.title : RANKS[0].title;
}

export function levelForXp(xp) {
  return Math.max(1, Math.floor(xp / LEVEL_XP_BASE) + 1);
}

export function xpWithinLevel(xp) {
  return xp % LEVEL_XP_BASE;
}

export const ACHIEVEMENTS = [
  { id: 'primeiro_sangue', icon: '🩸', name: 'Primeiro Sangue', desc: 'Completou a Aula 1.' },
  { id: 'escudeiro', icon: '🛡️', name: 'Escudeiro', desc: 'Concluir 2 aulas.' },
  { id: 'arquiteto', icon: '⚙️', name: 'Arquiteto de Mapas', desc: 'Concluir a Aula 1 com 20 XP.' },
  { id: 'cacador_echos', icon: '🔥', name: 'Caçador de Ecos', desc: 'Alcançar 20 XP.' },
  { id: 'desvendador', icon: '✦', name: 'Desvendador', desc: 'Desbloquear 3 conquistas.' },
  { id: 'campeao', icon: '👑', name: 'Campeão do Submundo', desc: 'Alcançar 120 XP.' },
];

export const LESSONS = [
  { id: 'aula1', number: '01', title: 'A Regra do Jogo', subtitle: 'O Framework MDA e Mecânicas', rewardXp: 20 },
  { id: 'aula2', number: '02', title: '????????', subtitle: 'Requisito: Concluir Aula Anterior', rewardXp: 20 },
  { id: 'aula3', number: '03', title: '????????', subtitle: 'Requisito: Concluir Aula Anterior', rewardXp: 20 },
];
