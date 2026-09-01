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

/* ---------- Imagens de avatar ----------
   Arquivos esperados em assets/avatars/ (ver assets/avatars/README.md
   para instruções de onde colocar as imagens). O índice corresponde
   ao `avatarIndex`/`avatar_index` salvo no usuário.
   Qualquer extensão de imagem comum é aceita: o cliente tenta, em
   ordem, cada extensão de AVATAR_EXTENSIONS até encontrar um arquivo
   que exista (ex.: avatar1.jpg, avatar2.png, avatar3.webp...).
   A QUANTIDADE de avatares é detectada automaticamente em tempo de
   execução (ver detectAvatarCount()) contando quantos arquivos
   `avatarN.*` existem de fato em assets/avatars/ — basta adicionar
   ou remover arquivos na pasta, nenhum número precisa ser editado
   manualmente aqui. */
export const AVATAR_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];

/* avatar1.* é sempre o fallback garantido, então o valor inicial (antes
   da detecção terminar) é 1 — nunca 0, para não quebrar o módulo. */
let avatarCount = 1;
let avatarCountPromise = null;

/* Cache: índice (0-based) -> URL já confirmada como existente. Evita
   ter que re-testar todas as extensões (AVATAR_EXTENSIONS) do zero a
   cada troca de avatar — sem isso, cada clique podia levar vários
   round-trips de rede (404 em png/jpg/jpeg antes de achar o .webp
   real, por exemplo), dando a impressão de que era preciso clicar
   mais de uma vez para a imagem mudar. */
const resolvedAvatarUrl = new Map();

/** Testa se existe algum arquivo `avatar{fileNumber}.*` (qualquer extensão). Resolve a URL encontrada, ou `null`. */
function probeAvatarFile(fileNumber) {
  const candidates = AVATAR_EXTENSIONS.map((ext) => `${rootPath()}/assets/avatars/avatar${fileNumber}.${ext}`);
  return new Promise((resolve) => {
    let i = 0;
    const img = new Image();
    const attempt = () => {
      if (i >= candidates.length) {
        resolve(null);
        return;
      }
      img.src = candidates[i++];
    };
    img.onload = () => resolve(img.src);
    img.onerror = attempt;
    attempt();
  });
}

/**
 * Detecta quantos avatares existem de fato em assets/avatars/, testando
 * sequencialmente avatar1, avatar2, avatar3... até o primeiro número que
 * não tenha nenhum arquivo correspondente (qualquer extensão). Cacheia
 * o resultado (uma única varredura por carregamento de página) e
 * atualiza o valor retornado por `getAvatarCount()`.
 * Deve ser chamada (e aguardada) antes de renderizar/ciclar avatares.
 */
export function detectAvatarCount() {
  if (avatarCountPromise) return avatarCountPromise;
  const MAX_PROBE = 200; // limite de segurança contra pastas mal configuradas
  avatarCountPromise = (async () => {
    let count = 0;
    for (let n = 1; n <= MAX_PROBE; n++) {
      // eslint-disable-next-line no-await-in-loop -- varredura sequencial e intencional
      const url = await probeAvatarFile(n);
      if (!url) break;
      resolvedAvatarUrl.set(n - 1, url);
      count = n;
    }
    avatarCount = Math.max(count, 1);
    return avatarCount;
  })();
  return avatarCountPromise;
}

/** Quantidade de avatares detectada (ver detectAvatarCount()). */
export function getAvatarCount() {
  return avatarCount;
}

/**
 * Normaliza qualquer índice (inclusive valores antigos/fora do intervalo
 * salvos antes de uma mudança na quantidade de arquivos) para o intervalo
 * válido `[0, getAvatarCount())`, com wrap-around (módulo sempre positivo).
 */
export function avatarSafeIndex(index) {
  const count = getAvatarCount();
  return ((index % count) + count) % count;
}

/** Lista de caminhos candidatos (uma extensão por vez) para o avatar de índice `index`.
 *  Se a extensão já foi descoberta (ver detectAvatarCount()/cache), ela vem
 *  primeiro na lista — assim a troca de avatar resolve em 1 requisição, não N. */
export function avatarCandidates(index) {
  const safeIndex = avatarSafeIndex(index);
  const file = safeIndex + 1;
  const generated = AVATAR_EXTENSIONS.map((ext) => `${rootPath()}/assets/avatars/avatar${file}.${ext}`);
  const cached = resolvedAvatarUrl.get(safeIndex);
  if (cached) {
    return [cached, ...generated.filter((url) => url !== cached)];
  }
  return generated;
}


/**
 * Carrega, em `imgEl`, a imagem do avatar de índice `index`, tentando
 * cada extensão suportada em ordem (ver AVATAR_EXTENSIONS) até um
 * `load` bem-sucedido. Se NENHUMA extensão existir para esse índice
 * (ex.: `avatarIndex` salvo aponta para um arquivo que o usuário ainda
 * não colocou na pasta), cai de volta para o avatar de índice 0 — que
 * deve sempre existir — em vez de deixar a tag <img> quebrada/vazia.
 * Nunca lança: resolve `true`/`false` conforme o sucesso final.
 */
export function loadAvatarImage(imgEl, index) {
  function tryIndex(candidateIndex, allowFallback) {
    const candidates = avatarCandidates(candidateIndex);
    return new Promise((resolve) => {
      let i = 0;
      const cleanup = () => {
        imgEl.onload = null;
        imgEl.onerror = null;
      };
      const attempt = () => {
        if (i >= candidates.length) {
          cleanup();
          resolve(false);
          return;
        }
        imgEl.src = candidates[i++];
      };
      imgEl.onload = () => {
        // Cacheia a extensão descoberta (caso ainda não estivesse, ex.:
        // avatar adicionado depois da varredura inicial) para que a
        // próxima troca para este índice seja instantânea.
        resolvedAvatarUrl.set(avatarSafeIndex(candidateIndex), imgEl.src);
        cleanup();
        resolve(true);
      };
      imgEl.onerror = attempt;
      attempt();
    }).then(async (loaded) => {
      if (loaded) return true;
      if (allowFallback && candidateIndex !== 0) {
        return tryIndex(0, false); // último recurso: avatar padrão (índice 0)
      }
      return false;
    });
  }

  return tryIndex(index, true);
}

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
  souls: () => `${rootPath()}/pages/souls.html`,
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

/* ============================================================
   3.1 NORMALIZAÇÃO DE USUÁRIO
   ============================================================
   O backend (Supabase) usa snake_case (`completed_lessons`,
   `avatar_index`) enquanto todo o frontend foi escrito esperando
   camelCase (`completedLessons`, `avatarIndex`). Sem esta ponte,
   `user.completedLessons` chega `undefined` e qualquer acesso a
   `.length`/`.includes` lança TypeError — interrompendo o boot
   ANTES de os event listeners serem vinculados.
   ============================================================ */
function normalizeUser(raw) {
  if (!raw) return raw;
  const fullName = raw.fullName ?? raw.full_name ?? raw.name ?? raw.username ?? 'Jogador';
  return {
    ...raw,
    name: fullName,
    fullName,
    username: raw.username ?? fullName,
    completedLessons: raw.completedLessons ?? raw.completed_lessons ?? [],
    avatarIndex: raw.avatarIndex ?? raw.avatar_index ?? 0,
    achievements: raw.achievements ?? raw.conquistas ?? [],
  };
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

export function register(fullName, username, password) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'register', fullName, username, password }),
  });
}

export function trackLessonView(token, lessonId) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'lessonView', lessonId }),
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
export async function validateSession(token) {
  const payload = await request(`/auth?token=${encodeURIComponent(token)}`, { method: 'GET' });
  return { ...payload, user: normalizeUser(payload.user) };
}

/* ============================================================
   5. ROTAS DE PROGRESSO
   ============================================================ */
export async function fetchProfile(token) {
  const payload = await request(`/progress?token=${encodeURIComponent(token)}`, { method: 'GET' });
  return { ...payload, user: normalizeUser(payload.user) };
}

export async function redeemCode(token, code) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'redeem', code }),
  });
  return { ...payload, user: normalizeUser(payload.user) };
}

export async function setAvatar(token, avatarIndex) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'avatar', avatarIndex }),
  });
  return { ...payload, user: normalizeUser(payload.user) };
}

export function listCodes(token) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'listCodes' }),
  });
}

export function generateCode(token, lessonId) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'generateCode', lessonId }),
  });
}

export function getLessonCode(token, lessonId) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'lessonCode', lessonId }),
  });
}

export function fetchLessonGates(token, lessonId) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'lessonGates', lessonId }),
  });
}

export function setLessonGate(token, lessonId, gateKey, released) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'setLessonGate', lessonId, gateKey, released }),
  });
}

export function getLessonParagraph(token, lessonId) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'getLessonParagraph', lessonId }),
  });
}

export function saveLessonParagraph(token, lessonId, paragraph) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'saveLessonParagraph', lessonId, paragraph }),
  });
}

export async function listUsers(token) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'listUsers' }),
  });
  return { ...payload, users: (payload.users ?? []).map(normalizeUser) };
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
  {
    id: 'aula1_concluida',
    icon: '🏁',
    name: 'Primeira Travessia',
    desc: 'Concluir a Aula 01 e realizar sua primeira oferenda ao Estige.',
  },
];

export const LESSONS = [
  {
    id: 'aula1',
    number: '01',
    title: 'O Círculo Mágico do Roguelite',
    subtitle: 'Teoria do jogo, Game Feel e prática na Godot',
    rewardXp: 30,
  },
];
