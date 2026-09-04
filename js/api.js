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
   Fonte de verdade: assets/avatars/catalog.stub.json.
   O arquivo é carregado uma vez e cacheado para manter a UI responsiva. */
const AVATAR_CATALOG_FILE = 'assets/avatars/catalog.stub.json';
const AVATAR_FALLBACK_FILE = 'hades.webp';

let avatarCatalog = [];
let avatarCatalogPromise = null;

function normalizeAvatarSearchTerm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function labelFromAvatarFile(fileName) {
  const base = String(fileName || '')
    .replace(/\.webp$/i, '')
    .replace(/-/g, ' ')
    .trim();

  if (!base) return 'Avatar';

  return base
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeAvatarCatalog(rawCatalog) {
  const safeRaw = Array.isArray(rawCatalog) ? rawCatalog : [];

  return safeRaw
    .map((entry, index) => {
      const file = String(entry?.file || '').trim();
      if (!file || !/\.webp$/i.test(file)) return null;

      const label = String(entry?.label || '').trim() || labelFromAvatarFile(file);
      const aliases = Array.isArray(entry?.searchTerms) ? entry.searchTerms : [];
      const baseName = file.replace(/\.webp$/i, '').replace(/-/g, ' ');

      const searchTerms = Array.from(new Set([
        label,
        baseName,
        file,
        `avatar ${index + 1}`,
        String(index + 1),
        ...aliases,
      ].map(normalizeAvatarSearchTerm).filter(Boolean)));

      return Object.freeze({
        file,
        label,
        searchTerms,
        legacyIndex: index,
      });
    })
    .filter(Boolean);
}

function avatarCatalogUrl() {
  return `${rootPath()}/${AVATAR_CATALOG_FILE}`;
}

function defaultAvatarCatalog() {
  return [Object.freeze({
    file: AVATAR_FALLBACK_FILE,
    label: 'Hades',
    searchTerms: [normalizeAvatarSearchTerm('hades'), 'avatar 1', '1'],
    legacyIndex: 0,
  })];
}

function currentAvatarCatalog() {
  return avatarCatalog.length > 0 ? avatarCatalog : defaultAvatarCatalog();
}

async function ensureAvatarCatalogLoaded() {
  if (!avatarCatalogPromise) {
    avatarCatalogPromise = fetch(avatarCatalogUrl(), { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar catalogo (${response.status})`);
        }

        const payload = await response.json();
        const normalized = normalizeAvatarCatalog(payload);
        avatarCatalog = normalized.length > 0 ? normalized : defaultAvatarCatalog();
        return avatarCatalog;
      })
      .catch(() => {
        avatarCatalog = defaultAvatarCatalog();
        return avatarCatalog;
      });
  }

  return avatarCatalogPromise;
}

function avatarUrlByIndex(index) {
  const meta = getAvatarMetaByIndex(index);
  const file = meta?.file || AVATAR_FALLBACK_FILE;
  return `${rootPath()}/assets/avatars/${file}`;
}

export function getAvatarCatalog() {
  return currentAvatarCatalog();
}

export function getAvatarMetaByIndex(index) {
  const catalog = currentAvatarCatalog();
  return catalog[avatarSafeIndex(index)] || catalog[0] || null;
}

/** Quantidade de avatares disponível na galeria estática. */
export async function detectAvatarCount() {
  const catalog = await ensureAvatarCatalogLoaded();
  return catalog.length;
}

/** Quantidade de avatares disponível na galeria estática. */
export function getAvatarCount() {
  const count = currentAvatarCatalog().length;
  return count > 0 ? count : 1;
}

/**
 * Normaliza qualquer índice (inclusive valores antigos/fora do intervalo
 * salvos antes de uma mudança na quantidade de arquivos) para o intervalo
 * válido `[0, getAvatarCount())`, com wrap-around (módulo sempre positivo).
 */
export function avatarSafeIndex(index) {
  const count = getAvatarCount();
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

/**
 * Carrega, em `imgEl`, a imagem do avatar de índice `index` usando um
 * caminho único e estático. Se a imagem não existir, cai de volta para
 * o avatar 0, sem varrer extensões nem disparar a sequência de 404s.
 * Nunca lança: resolve `true`/`false` conforme o sucesso final.
 */
export function loadAvatarImage(imgEl, index) {
  return new Promise((resolve) => {
    const safeIndex = avatarSafeIndex(index);
    const fallbackUrl = avatarUrlByIndex(0);
    let fallbackTried = safeIndex === 0;
    const cleanup = () => {
      imgEl.onload = null;
      imgEl.onerror = null;
    };

    imgEl.onload = () => {
      cleanup();
      resolve(true);
    };

    imgEl.onerror = () => {
      if (fallbackTried) {
        cleanup();
        resolve(false);
        return;
      }

      fallbackTried = true;
      imgEl.src = fallbackUrl;
    };

    imgEl.src = avatarUrlByIndex(safeIndex) || fallbackUrl;
  });
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

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

export function register(fullName, turma, username, password) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'register', fullName, turma, username, password }),
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

export async function submitMinigameRun(token, xp, durationSeconds = 0) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'addRunXP',
      xp: Number(xp) || 0,
      duration: Number(durationSeconds) || 0,
    }),
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
      // Segunda chance para inconsistências transitórias entre login e leitura da sessão.
      try {
        await wait(250);
        const { user } = await validateSession(session.token);
        saveSession({ token: session.token, name: user.name, role: user.role });
        return { session, user };
      } catch {
        clearSession();
        window.location.replace(ROUTES.auth());
        return null;
      }
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

export const ACHIEVEMENT_RARITY = Object.freeze({
  STONE: 'stone',
  COPPER: 'copper',
  SILVER: 'silver',
  GOLD: 'gold',
  RAINBOW: 'rainbow',
});

export const ACHIEVEMENT_RARITY_LABELS = Object.freeze({
  [ACHIEVEMENT_RARITY.STONE]: 'Pedra',
  [ACHIEVEMENT_RARITY.COPPER]: 'Cobre',
  [ACHIEVEMENT_RARITY.SILVER]: 'Prata',
  [ACHIEVEMENT_RARITY.GOLD]: 'Ouro',
  [ACHIEVEMENT_RARITY.RAINBOW]: 'Arco-íris',
});

export const ACHIEVEMENT_DIFFICULTY = Object.freeze({
  TRIVIAL: 'trivial',
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  MYTHIC: 'mythic',
});

export const DIFFICULTY_TO_RARITY = Object.freeze({
  [ACHIEVEMENT_DIFFICULTY.TRIVIAL]: ACHIEVEMENT_RARITY.STONE,
  [ACHIEVEMENT_DIFFICULTY.EASY]: ACHIEVEMENT_RARITY.COPPER,
  [ACHIEVEMENT_DIFFICULTY.MEDIUM]: ACHIEVEMENT_RARITY.SILVER,
  [ACHIEVEMENT_DIFFICULTY.HARD]: ACHIEVEMENT_RARITY.GOLD,
  [ACHIEVEMENT_DIFFICULTY.MYTHIC]: ACHIEVEMENT_RARITY.RAINBOW,
});

export const DEFAULT_ACHIEVEMENT_RARITY = ACHIEVEMENT_RARITY.STONE;

export function rarityFromDifficulty(difficulty) {
  return DIFFICULTY_TO_RARITY[difficulty] || DEFAULT_ACHIEVEMENT_RARITY;
}

export function normalizeAchievementRarity(rarity, difficulty = null) {
  if (typeof rarity === 'string' && ACHIEVEMENT_RARITY_LABELS[rarity]) {
    return rarity;
  }
  return rarityFromDifficulty(difficulty);
}

const RAW_ACHIEVEMENTS = [
  {
    id: 'aula1_concluida',
    icon: '🏁',
    name: 'Primeira Travessia',
    desc: 'Concluir a Aula 01 e realizar sua primeira oferenda ao Estige.',
    difficulty: ACHIEVEMENT_DIFFICULTY.TRIVIAL,
    hidden: false,
  },
  {
    id: 'gdd_integracao_documental',
    icon: '📜',
    name: 'Escriba do Submundo',
    desc: 'Entregar a integração documental do GDD da Aula 01.',
    difficulty: ACHIEVEMENT_DIFFICULTY.EASY,
    hidden: false,
  },
  {
    id: 'segredo_cartografo_do_inspector',
    icon: '🧭',
    name: 'Cartógrafo do Inspector',
    desc: 'Segredo descoberto: registrar ao menos 3 testes diferentes na Aula 01.',
    difficulty: ACHIEVEMENT_DIFFICULTY.MEDIUM,
    hidden: true,
  },
  {
    id: 'segredo_alquimista_da_fisica',
    icon: '⚗️',
    name: 'Alquimista da Física',
    desc: 'Segredo descoberto: relacionar massa, gravidade, fricção e elasticidade no relatório.',
    difficulty: ACHIEVEMENT_DIFFICULTY.HARD,
    hidden: true,
  },
  {
    id: 'segredo_juramento_do_circulo',
    icon: '🔮',
    name: 'Juramento do Círculo',
    desc: 'Segredo descoberto: fechar o relatório com a síntese completa das seis variáveis.',
    difficulty: ACHIEVEMENT_DIFFICULTY.MYTHIC,
    hidden: true,
  },
];

export const ACHIEVEMENTS = RAW_ACHIEVEMENTS.map((achievement) => ({
  ...achievement,
  rarity: normalizeAchievementRarity(achievement.rarity, achievement.difficulty),
}));

export const MODULES = [
  {
    id: 'modulo1',
    number: 'M1',
    title: 'Fundações, Cultura e Interface',
    subtitle: 'Aulas 1 a 5 · 10h',
    lessons: [
      {
        id: 'aula1',
        number: '01',
        title: 'O Círculo Mágico e a Interface Amigável da Engine',
        subtitle: 'Conceitos de jogos, leitura da Godot 4 e prática no Inspector',
        rewardXp: 30,
      },
    ],
  },
];

export const LESSONS = MODULES.flatMap((module) => module.lessons.map((lesson) => ({
  ...lesson,
  moduleId: module.id,
  moduleNumber: module.number,
  moduleTitle: module.title,
  moduleSubtitle: module.subtitle,
})));
