/**
 * ============================================================
 * API CLIENT — Ponte entre o Frontend e as rotas /api do Vercel
 * ============================================================
 * Responsabilidades:
 *   1. Guardar APENAS a sessão ativa no localStorage
 *      (`activeSession` = { token, name, role, savedAt }).
 *      Nenhum dado de progresso é confiado ao navegador — XP e
 *      conquistas vêm sempre do servidor.
 *   2. Expor helpers `fetch()` tipados para /api/auth, /api/progress e /api/despertar.
 *   3. Fornecer um guard de rota (`requireSession`) que redireciona
 *      para o Pacto de Sangue quando não há sessão ativa.
 * ============================================================
 */

'use strict';

import { installDevtoolsGuard } from './devtools-guard.js';

/* ---------- Única chave permitida no localStorage ---------- */
const SESSION_KEY = 'activeSession';

/* ---------- Imagens de avatar ----------
   Fonte de verdade: assets/avatars/catalog.stub.json.
   O arquivo é carregado uma vez e cacheado para manter a UI responsiva. */
const AVATAR_CATALOG_FILE = 'assets/avatars/catalog.stub.json';
const AVATAR_FALLBACK_FILE = 'hades.webp';

/** Taxonomia: primárias na faixa; subtags sob o `+`. `todos` é só UI. */
const AVATAR_PRIMARY_TAG_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'mitologia', label: 'Mitologia', kind: 'primary', children: Object.freeze(['olimpo', 'norse-god']) }),
  Object.freeze({ id: 'memes', label: 'Memes', kind: 'primary', children: Object.freeze(['br-memes', 'chad']) }),
  Object.freeze({ id: 'jogos', label: 'Jogos', kind: 'primary', children: Object.freeze(['mortal-kombat', 'indie']) }),
  Object.freeze({ id: 'anime', label: 'Anime', kind: 'primary', children: Object.freeze(['shonen', 'kawaii']) }),
  Object.freeze({ id: 'animais', label: 'Animais', kind: 'primary', children: Object.freeze(['gatos', 'caes']) }),
  Object.freeze({ id: 'cultura-pop', label: 'Cultura Pop', kind: 'primary', children: Object.freeze(['disney-sanrio', 'cartoon']) }),
]);

const AVATAR_SUB_TAG_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'olimpo', label: 'Olimpo', kind: 'sub', parent: 'mitologia' }),
  Object.freeze({ id: 'norse-god', label: 'God of War', kind: 'sub', parent: 'mitologia' }),
  Object.freeze({ id: 'br-memes', label: 'Memes BR', kind: 'sub', parent: 'memes' }),
  Object.freeze({ id: 'chad', label: 'Chad', kind: 'sub', parent: 'memes' }),
  Object.freeze({ id: 'mortal-kombat', label: 'Mortal Kombat', kind: 'sub', parent: 'jogos' }),
  Object.freeze({ id: 'indie', label: 'Indie', kind: 'sub', parent: 'jogos' }),
  Object.freeze({ id: 'shonen', label: 'Shonen', kind: 'sub', parent: 'anime' }),
  Object.freeze({ id: 'kawaii', label: 'Kawaii', kind: 'sub', parent: 'anime' }),
  Object.freeze({ id: 'gatos', label: 'Gatos', kind: 'sub', parent: 'animais' }),
  Object.freeze({ id: 'caes', label: 'Cães', kind: 'sub', parent: 'animais' }),
  Object.freeze({ id: 'disney-sanrio', label: 'Disney / Sanrio', kind: 'sub', parent: 'cultura-pop' }),
  Object.freeze({ id: 'cartoon', label: 'Cartoon', kind: 'sub', parent: 'cultura-pop' }),
]);

/** Primárias + subtags (whitelist do stub). */
const AVATAR_TAG_DEFINITIONS = Object.freeze([
  ...AVATAR_PRIMARY_TAG_DEFINITIONS,
  ...AVATAR_SUB_TAG_DEFINITIONS,
]);

const AVATAR_TAG_IDS = new Set(AVATAR_TAG_DEFINITIONS.map((tag) => tag.id));
const AVATAR_SUB_BY_ID = new Map(AVATAR_SUB_TAG_DEFINITIONS.map((tag) => [tag.id, tag]));
const AVATAR_FILTER_ALL_ID = 'todos';

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

/** Mantém só ids da taxonomia, sem duplicata, na ordem do stub. */
function normalizeAvatarTags(rawTags) {
  if (!Array.isArray(rawTags)) return [];

  const seen = new Set();
  const tags = [];

  for (const value of rawTags) {
    const id = String(value ?? '').trim().toLowerCase();
    if (!id || !AVATAR_TAG_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    tags.push(id);
  }

  return tags;
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
      const tags = normalizeAvatarTags(entry?.tags);

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
        tags: Object.freeze(tags),
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
    tags: Object.freeze(['mitologia']),
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

/** Tags primárias da faixa (sem `todos`). */
export function getAvatarTagDefinitions() {
  return AVATAR_PRIMARY_TAG_DEFINITIONS;
}

export function getAvatarPrimaryTagDefinitions() {
  return AVATAR_PRIMARY_TAG_DEFINITIONS;
}

/** Subtags; passe `parentId` para filtrar filhas de um grupo. */
export function getAvatarSubTagDefinitions(parentId = null) {
  if (!parentId) return AVATAR_SUB_TAG_DEFINITIONS;
  const parent = String(parentId);
  return Object.freeze(
    AVATAR_SUB_TAG_DEFINITIONS.filter((tag) => tag.parent === parent)
  );
}

export function getAvatarParentTagId(tagId) {
  return AVATAR_SUB_BY_ID.get(String(tagId || ''))?.parent || null;
}

/** Chips do filtro: Todos + tags primárias. */
export function getAvatarFilterTagDefinitions() {
  return Object.freeze([
    Object.freeze({ id: AVATAR_FILTER_ALL_ID, label: 'Todos', kind: 'all' }),
    ...AVATAR_PRIMARY_TAG_DEFINITIONS,
  ]);
}

export function isAvatarFilterAllTag(tagId) {
  return String(tagId || '') === AVATAR_FILTER_ALL_ID;
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
 * Aguarda o catálogo (senão `avatarSafeIndex` colapsa tudo no fallback único).
 * Nunca lança: resolve `true`/`false` conforme o sucesso final.
 */
export async function loadAvatarImage(imgEl, index) {
  await ensureAvatarCatalogLoaded();

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
   As páginas vivem em vários níveis:
   - `/index.html`
   - `/pages/*.html`
   - `/pages/submundo/*.html` (arquivo direto)
   - `/submundo/*` (URL limpa do ARG via rewrite)

   A API é sempre absoluta a partir da raiz do domínio — o que
   funciona igual no Vercel e no `vercel dev`.
   ============================================================ */
const API_BASE = '/api';

/** Caminho relativo até a raiz do site, a partir da página atual. */
export function rootPath() {
  const pathname = String(window.location?.pathname || '/');
  // Arquivo direto: /pages/submundo/estige-obolo.html
  if (pathname.includes('/pages/submundo/')) return '../..';
  // URL limpa do ARG: /submundo/estige-obolo
  if (/(^|\/)submundo(\/|$)/.test(pathname)) return '..';
  if (pathname.includes('/pages/')) return '..';
  return '.';
}

export const ROUTES = {
  home: () => `${rootPath()}/index.html`,
  auth: () => `${rootPath()}/pages/auth.html`,
  dashboard: () => `${rootPath()}/pages/dashboard.html`,
  aulas: () => `${rootPath()}/pages/aulas.html`,
  conquistas: () => `${rootPath()}/pages/conquistas.html`,
  salao: () => `${rootPath()}/pages/salao-espiritual.html`,
  grimorio: () => `${rootPath()}/pages/grimorio.html`,
  grimorioNota: (id) => {
    const base = `${rootPath()}/pages/grimorio.html`;
    if (!id) return base;
    return `${base}?id=${encodeURIComponent(id)}`;
  },
  grimorioEditar: (id) => {
    const base = `${rootPath()}/pages/grimorio-editar.html`;
    if (!id) return base;
    return `${base}?id=${encodeURIComponent(id)}`;
  },
  companheiro: (username) => {
    const base = `${rootPath()}/pages/companheiro.html`;
    if (!username) return base;
    return `${base}?u=${encodeURIComponent(username)}`;
  },
  souls: () => `${rootPath()}/pages/souls.html`,
  despertar: () => `${rootPath()}/pages/despertar.html`,
  ranking: () => `${rootPath()}/pages/ranking.html`,
  classindDle: () => `${rootPath()}/pages/classind-dle.html`,
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
  setBootstrapGates(null);
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
    email: raw.email ?? null,
    emailVerifiedAt: raw.emailVerifiedAt ?? raw.email_verified_at ?? null,
    hasDespertarState: Boolean(raw.hasDespertarState),
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

export function register(fullName, turma, username, password, email) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'register', fullName, turma, username, password, email }),
  });
}

export function requestEmailVerification(token) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'requestEmailVerification', token }),
  });
}

export function bindEmail(token, email) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'bindEmail', token, email }),
  });
}

export function confirmEmail(token) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'confirmEmail', token }),
  });
}

export function requestPasswordReset(username, email) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'requestPasswordReset', username, email }),
  });
}

export function requestLegacyEmailBind(username, code, email) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'requestLegacyEmailBind', username, code, email }),
  });
}

export function rotateRecoveryCode(token) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'rotateRecoveryCode', token }),
  });
}

export function confirmPasswordReset(token, password) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'confirmPasswordReset', token, password }),
  });
}

export function trackLessonView(token, lessonId) {
  enqueueLessonEvent(token, { type: 'lessonView', lessonId });
  return Promise.resolve({ ok: true, queued: true });
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

/**
 * Boot unificado (Fase B / B2): sessão + perfil + gate Despertar.
 * @see docs/otimizacoes/contratos-fase-b.md §1
 */
export async function fetchSessionBootstrap(token) {
  const payload = await request(
    `/session-bootstrap?token=${encodeURIComponent(token)}`,
    { method: 'GET' },
  );
  const gates = payload?.gates && typeof payload.gates === 'object'
    ? payload.gates
    : { despertar: { published: false } };
  return {
    ...payload,
    user: normalizeUser(payload.user),
    gates: {
      despertar: {
        published: Boolean(gates?.despertar?.published),
      },
    },
  };
}

/** Cache em memória do último bootstrap (mesmo page-load → shell sem 2º GET de gate). */
let bootstrapGatesCache = null;

/**
 * @returns {{ token: string, gates: { despertar: { published: boolean } } } | null}
 */
export function getBootstrapGates() {
  return bootstrapGatesCache;
}

function setBootstrapGates(token, gates) {
  if (!token || !gates) {
    bootstrapGatesCache = null;
    return;
  }
  bootstrapGatesCache = { token, gates };
}

function isBootstrapFallbackStatus(status) {
  return status === 404 || status === 405 || status === 503;
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

export async function underworldJudgment(token) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'underworldJudgment' }),
  });
}

export async function underworldRedeem(token, submittedHash) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'underworldRedeem',
      submittedHash,
    }),
  });
  return {
    ...payload,
    user: payload.user ? normalizeUser(payload.user) : null,
  };
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

/** Gate transversal de O Despertar (lesson_gates.lesson_id). */
export const DESPERTAR_GATE_ID = 'despertar';
export const DESPERTAR_NAV_LABEL = 'O Despertar';
export const DESPERTAR_NAV_LOCKED_LABEL = 'O Despertar · em breve';
export const DESPERTAR_SEALED_ERROR = 'despertar_sealed';

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

/** Lê se o Acheron está aberto para a turma. Default: selado. */
export async function fetchDespertarPublished(token) {
  try {
    const result = await fetchLessonGates(token, DESPERTAR_GATE_ID);
    return Boolean(result?.gates?.published);
  } catch {
    return false;
  }
}

/** Mapa lessonId → published (boolean). Uma única action batch (Task 2). */
export async function fetchLessonsPublishMap(token, lessonIds = []) {
  const ids = lessonIds.length > 0
    ? lessonIds
    : LESSONS.map((lesson) => lesson.id);

  try {
    const result = await request('/progress', {
      method: 'POST',
      body: JSON.stringify({ token, action: 'lessonGatesBatch', lessonIds: ids }),
    });
    if (result?.gates && typeof result.gates === 'object') {
      return Object.fromEntries(
        ids.map((id) => {
          const published = result.gates[id]?.published;
          if (typeof published === 'boolean') return [id, published];
          return [id, id === 'aula1'];
        }),
      );
    }
  } catch {
    // fallback N+1 abaixo
  }

  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const result = await fetchLessonGates(token, id);
        if (typeof result?.gates?.published === 'boolean') {
          return [id, result.gates.published];
        }
      } catch {
        // fallback abaixo
      }
      return [id, id === 'aula1'];
    }),
  );

  return Object.fromEntries(entries);
}

export function getLessonParagraph(token, lessonId) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'getLessonParagraph', lessonId }),
  });
}

export function listMyLessonParagraphs(token) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'listMyLessonParagraphs' }),
  });
}

/** Intervalo de flush do buffer de aula (B6 / D6): 8–15 s. */
export const LESSON_EVENTS_FLUSH_MS = 10_000;
const LESSON_EVENTS_BATCH_MAX = 20;

/** @type {Array<{ token: string, type: string, lessonId?: string, paragraph?: string, clientTs: number, _qid: number }>} */
let lessonEventQueue = [];
let lessonEventFlushTimer = null;
let lessonEventInFlight = null;
let lessonBatchSupported = true;
let lessonEventSeq = 0;
let lessonLifecycleBound = false;

function isLessonBatchFallbackStatus(status) {
  return status === 404 || status === 405 || status === 501;
}

/**
 * Enfileira evento de aula (lessonView / lessonParagraph). Retorna índice lógico na fila.
 * @returns {number} queue id (para casar com results[].index após flush)
 */
export function enqueueLessonEvent(token, event = {}) {
  if (!token) return -1;
  const type = String(event.type || '');
  if (type !== 'lessonView' && type !== 'lessonParagraph') return -1;

  // Coalesce: um view por lessonId; parágrafo mais recente por lessonId.
  if (type === 'lessonView') {
    const lessonId = String(event.lessonId || '');
    lessonEventQueue = lessonEventQueue.filter(
      (item) => !(item.token === token && item.type === 'lessonView' && item.lessonId === lessonId),
    );
  }
  if (type === 'lessonParagraph') {
    const lessonId = String(event.lessonId || '');
    lessonEventQueue = lessonEventQueue.filter(
      (item) => !(item.token === token && item.type === 'lessonParagraph' && item.lessonId === lessonId),
    );
  }

  const _qid = lessonEventSeq;
  lessonEventSeq += 1;
  lessonEventQueue.push({
    token,
    type,
    lessonId: event.lessonId,
    paragraph: event.paragraph,
    clientTs: Number(event.clientTs) || Date.now(),
    _qid,
  });

  ensureLessonLifecycleHooks();
  scheduleLessonEventsFlush();
  return _qid;
}

function scheduleLessonEventsFlush() {
  if (lessonEventFlushTimer != null) return;
  lessonEventFlushTimer = window.setTimeout(() => {
    lessonEventFlushTimer = null;
    flushLessonEvents({ reason: 'timer' }).catch(() => {});
  }, LESSON_EVENTS_FLUSH_MS);
}

function ensureLessonLifecycleHooks() {
  if (lessonLifecycleBound || typeof window === 'undefined') return;
  lessonLifecycleBound = true;
  const flushSoon = () => {
    flushLessonEvents({ reason: 'lifecycle' }).catch(() => {});
  };
  window.addEventListener('pagehide', flushSoon);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSoon();
  });
}

/**
 * Envia o buffer via lessonEventsBatch; fallback item-a-item se 404/405.
 * @param {{ reason?: string }} [options]
 */
export async function flushLessonEvents(options = {}) {
  if (lessonEventInFlight) return lessonEventInFlight;
  if (lessonEventQueue.length === 0) return { ok: true, results: [] };

  if (lessonEventFlushTimer != null) {
    window.clearTimeout(lessonEventFlushTimer);
    lessonEventFlushTimer = null;
  }

  const batch = lessonEventQueue.splice(0, LESSON_EVENTS_BATCH_MAX);
  const token = batch[0]?.token;
  if (!token) return { ok: true, results: [] };

  // Itens de outro token voltam para a fila.
  const sameToken = [];
  const deferred = [];
  for (const item of batch) {
    if (item.token === token) sameToken.push(item);
    else deferred.push(item);
  }
  if (deferred.length) lessonEventQueue = deferred.concat(lessonEventQueue);

  const events = sameToken.map(({ type, lessonId, paragraph, clientTs }) => ({
    type,
    lessonId,
    paragraph,
    clientTs,
  }));

  lessonEventInFlight = (async () => {
    try {
      if (lessonBatchSupported) {
        try {
          const payload = await request('/progress', {
            method: 'POST',
            body: JSON.stringify({ token, action: 'lessonEventsBatch', events }),
          });
          const results = Array.isArray(payload?.results)
            ? payload.results.map((row, i) => ({
              ...row,
              index: sameToken[i]?._qid ?? row.index,
            }))
            : [];
          return { ok: true, results, reason: options.reason || null };
        } catch (error) {
          if (error instanceof ApiError && isLessonBatchFallbackStatus(error.status)) {
            lessonBatchSupported = false;
          } else {
            // Devolve à fila e propaga (rede / 5xx).
            lessonEventQueue = sameToken.concat(lessonEventQueue);
            throw error;
          }
        }
      }

      // Fallback legado: um POST por evento.
      const results = [];
      let legacyParagraph = null;
      for (const item of sameToken) {
        try {
          if (item.type === 'lessonView') {
            await request('/progress', {
              method: 'POST',
              body: JSON.stringify({
                token: item.token,
                action: 'lessonView',
                lessonId: item.lessonId,
              }),
            });
            results.push({ ok: true, index: item._qid, type: 'lessonView', lessonId: item.lessonId });
          } else if (item.type === 'lessonParagraph') {
            const payload = await request('/progress', {
              method: 'POST',
              body: JSON.stringify({
                token: item.token,
                action: 'saveLessonParagraph',
                lessonId: item.lessonId,
                paragraph: item.paragraph,
              }),
            });
            legacyParagraph = payload;
            results.push({
              ok: true,
              index: item._qid,
              type: 'lessonParagraph',
              lessonId: payload?.lessonId ?? item.lessonId,
              paragraph: payload?.paragraph ?? item.paragraph,
              updatedAt: payload?.updatedAt,
              user: payload?.user,
              awarded: payload?.awarded ?? null,
            });
          }
        } catch (itemError) {
          results.push({
            ok: false,
            index: item._qid,
            type: item.type,
            error: itemError?.message || 'Falha no evento.',
            status: itemError?.status || 500,
          });
        }
      }
      return {
        ok: true,
        results,
        legacy: legacyParagraph,
        reason: options.reason || null,
      };
    } finally {
      lessonEventInFlight = null;
      if (lessonEventQueue.length > 0) scheduleLessonEventsFlush();
    }
  })();

  return lessonEventInFlight;
}

/** Só para testes. */
export function __resetLessonEventsQueueForTests() {
  lessonEventQueue = [];
  lessonEventFlushTimer = null;
  lessonEventInFlight = null;
  lessonBatchSupported = true;
  lessonEventSeq = 0;
}

export async function saveLessonParagraph(token, lessonId, paragraph) {
  const queuedIndex = enqueueLessonEvent(token, {
    type: 'lessonParagraph',
    lessonId,
    paragraph,
  });
  const flush = await flushLessonEvents({ reason: 'saveLessonParagraph' });
  const mine = Array.isArray(flush?.results)
    ? flush.results.find((row) => row.index === queuedIndex)
    : null;
  if (mine && mine.ok === false) {
    throw new ApiError(mine.error || 'Falha ao salvar o registro.', mine.status || 400, mine);
  }
  if (mine?.ok) {
    return {
      ok: true,
      lessonId: mine.lessonId,
      paragraph: mine.paragraph,
      updatedAt: mine.updatedAt,
      user: mine.user ? normalizeUser(mine.user) : undefined,
      awarded: mine.awarded ?? null,
      batch: true,
    };
  }
  if (flush?.ok && flush?.legacy) {
    return {
      ...flush.legacy,
      user: flush.legacy.user ? normalizeUser(flush.legacy.user) : undefined,
    };
  }
  throw new ApiError('Falha ao salvar o registro.', 500, flush);
}

export async function listUsers(token) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'listUsers' }),
  });
  return { ...payload, users: (payload.users ?? []).map(normalizeUser) };
}

/* ---------- Espelho da Alma (admin) ---------- */

export async function adminUpdateProfile(token, targetUserId, fields = {}) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'adminUpdateProfile',
      targetUserId,
      fullName: fields.fullName,
      turma: fields.turma,
      avatarIndex: fields.avatarIndex,
    }),
  });
  return { ...payload, user: payload.user ? normalizeUser(payload.user) : null };
}

export async function adminAdjustXp(token, targetUserId, { mode, xp, reason }) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'adminAdjustXp',
      targetUserId,
      mode,
      xp,
      reason,
    }),
  });
  return { ...payload, user: payload.user ? normalizeUser(payload.user) : null };
}

export async function adminSetLessonCompleted(token, targetUserId, lessonId, completed) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'adminSetLessonCompleted',
      targetUserId,
      lessonId,
      completed,
    }),
  });
  return { ...payload, user: payload.user ? normalizeUser(payload.user) : null };
}

export async function adminGrantAchievement(token, targetUserId, achievementId) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'adminGrantAchievement',
      targetUserId,
      achievementId,
    }),
  });
  return { ...payload, user: payload.user ? normalizeUser(payload.user) : null };
}

export async function adminRevokeAchievement(token, targetUserId, achievementId) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'adminRevokeAchievement',
      targetUserId,
      achievementId,
    }),
  });
  return { ...payload, user: payload.user ? normalizeUser(payload.user) : null };
}

export async function adminClearEmailSeal(token, targetUserId) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'adminClearEmailSeal',
      targetUserId,
    }),
  });
  return { ...payload, user: payload.user ? normalizeUser(payload.user) : null };
}

export function adminInvalidateSessions(token, targetUserId) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'adminInvalidateSessions',
      targetUserId,
    }),
  });
}

export function adminForceTempPassword(token, targetUserId) {
  return request('/auth', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'adminForceTempPassword',
      targetUserId,
    }),
  });
}

/* ============================================================
   5b. COMPANHEIROS DE JORNADA
   ============================================================ */
function normalizeFriendCard(raw) {
  if (!raw) return raw;
  return {
    ...raw,
    fullName: raw.fullName ?? raw.full_name ?? raw.username,
    avatarIndex: raw.avatarIndex ?? raw.avatar_index ?? 0,
  };
}

function normalizeFriendshipEntry(entry) {
  if (!entry) return entry;
  return {
    ...entry,
    user: normalizeFriendCard(entry.user),
  };
}

export async function listFriends(token) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'friendsList' }),
  });
  return {
    ...payload,
    accepted: (payload.accepted ?? []).map(normalizeFriendshipEntry),
    incoming: (payload.incoming ?? []).map(normalizeFriendshipEntry),
    outgoing: (payload.outgoing ?? []).map(normalizeFriendshipEntry),
  };
}

function normalizeClassmateCard(raw) {
  if (!raw) return raw;
  return {
    ...normalizeFriendCard(raw),
    bondStatus: raw.bondStatus || 'none',
    friendshipId: raw.friendshipId ?? null,
  };
}

/** Colegas da turma (Salão Espiritual). Admin pode passar `{ turma }` ou omitir para todas. */
export async function listClassmates(token, { turma } = {}) {
  const body = { token, action: 'classmatesList' };
  if (turma != null && String(turma).trim() !== '') {
    body.turma = String(turma).trim();
  }
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return {
    ...payload,
    turmasDisponiveis: Array.isArray(payload.turmasDisponiveis) ? payload.turmasDisponiveis : [],
    classmates: (payload.classmates ?? []).map(normalizeClassmateCard),
  };
}

/**
 * Placar do Domínio (Task 20 + B5).
 * @param {string} token
 * @param {{ scope?: 'turma'|'global', sort?: 'xp'|'achievements'|'juizoBest', turma?: string, limit?: number }} [options]
 */
export async function leaderboardGet(token, { scope = 'turma', sort = 'xp', turma, limit } = {}) {
  const body = {
    token,
    action: 'leaderboardGet',
    scope,
    sort,
  };
  if (turma != null && String(turma).trim() !== '') {
    body.turma = String(turma).trim();
  }
  if (limit != null && Number.isFinite(Number(limit))) {
    body.limit = Number(limit);
  }
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function searchFriends(token, query) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'friendSearch', query }),
  }).then((payload) => ({
    ...payload,
    results: (payload.results ?? []).map(normalizeFriendCard),
  }));
}

export function requestFriend(token, username) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'friendRequest', username }),
  }).then((payload) => ({
    ...payload,
    friendship: normalizeFriendshipEntry(payload.friendship),
  }));
}

export function respondFriend(token, { decision, friendshipId, friendUserId } = {}) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'friendRespond',
      decision,
      friendshipId,
      friendUserId,
    }),
  }).then((payload) => ({
    ...payload,
    friendship: normalizeFriendshipEntry(payload.friendship),
  }));
}

export function removeFriend(token, { friendshipId, friendUserId, username } = {}) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'friendRemove',
      friendshipId,
      friendUserId,
      username,
    }),
  });
}

export async function fetchFriendProfile(token, { username, friendUserId } = {}) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'friendProfile',
      username,
      friendUserId,
    }),
  });
  const mirrorMode = payload.profile?.mirrorMode
    || (payload.includeAchievements === false ? 'turma' : 'companion');
  return {
    ...payload,
    bondStatus: payload.bondStatus || null,
    includeAchievements: Boolean(payload.includeAchievements),
    profile: payload.profile
      ? {
          ...normalizeFriendCard(payload.profile),
          mirrorMode,
          achievements: mirrorMode === 'companion'
            ? (payload.profile.achievements ?? [])
            : [],
          completedLessonsCount: mirrorMode === 'companion'
            ? (payload.profile.completedLessonsCount ?? 0)
            : undefined,
          xp: mirrorMode === 'companion' ? payload.profile.xp : undefined,
        }
      : null,
  };
}

/* ============================================================
   5c. GRIMÓRIO PESSOAL
   ============================================================ */
function normalizeNote(raw) {
  if (!raw) return raw;
  return {
    ...raw,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    sharedWith: Array.isArray(raw.sharedWith) ? raw.sharedWith : [],
    sharedWithUsernames: Array.isArray(raw.sharedWithUsernames) ? raw.sharedWithUsernames : [],
    lessonId: raw.lessonId ?? raw.lesson_id ?? null,
    clonedFromNoteId: raw.clonedFromNoteId ?? raw.cloned_from_note_id ?? null,
    clonedFrom: raw.clonedFrom || null,
    events: Array.isArray(raw.events) ? raw.events : [],
    unreadEventsCount: Number(raw.unreadEventsCount || 0),
    pinned: Boolean(raw.pinned),
  };
}

export async function listNotes(token, { includeShared = false } = {}) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'notesList', includeShared }),
  });
  return {
    ...payload,
    notes: (payload.notes ?? []).map(normalizeNote),
    sharedWithMe: (payload.sharedWithMe ?? []).map(normalizeNote),
  };
}

export async function getNote(token, noteId) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'noteGet', noteId }),
  });
  return {
    ...payload,
    note: normalizeNote(payload.note),
  };
}

export async function createNote(token, fields = {}) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'noteCreate',
      title: fields.title,
      body: fields.body,
      pinned: fields.pinned,
      tags: fields.tags,
      lessonId: fields.lessonId,
    }),
  });
  return { ...payload, note: normalizeNote(payload.note) };
}

export async function updateNote(token, noteId, fields = {}) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'noteUpdate',
      noteId,
      title: fields.title,
      body: fields.body,
      pinned: fields.pinned,
      tags: fields.tags,
      lessonId: fields.lessonId,
    }),
  });
  return { ...payload, note: normalizeNote(payload.note) };
}

export function deleteNote(token, noteId) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'noteDelete', noteId }),
  });
}

export async function shareNote(token, noteId, sharedWithUserId) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'noteShare',
      noteId,
      sharedWithUserId,
    }),
  });
  return { ...payload, note: normalizeNote(payload.note) };
}

export async function unshareNote(token, noteId, sharedWithUserId) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({
      token,
      action: 'noteUnshare',
      noteId,
      sharedWithUserId,
    }),
  });
  return { ...payload, note: normalizeNote(payload.note) };
}

export async function cloneNote(token, noteId) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'noteClone', noteId }),
  });
  return { ...payload, note: normalizeNote(payload.note) };
}

export async function refuseNoteShare(token, noteId) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'noteRefuseShare', noteId }),
  });
}

export async function ackNoteEvents(token, noteId) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'noteEventsAck', noteId }),
  });
}

export async function listNotesAdmin(token) {
  return request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'notesListAdmin' }),
  });
}

export async function listNotesForUser(token, targetUserId) {
  const payload = await request('/progress', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'notesListForUser', targetUserId }),
  });
  return {
    ...payload,
    notes: (payload.notes ?? []).map(normalizeNote),
  };
}

/* ============================================================
   5.1 O DESPERTAR (clicker — /api/despertar)
   ============================================================ */
export function despertarStateGet(token) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'stateGet' }),
  });
}

/** Admin: apaga despertar_states de todos os alunos (não toca no Mestre). */
export function despertarResetStudents(token) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'stateResetStudents' }),
  });
}

/** Admin: reseta conquistas do Despertar + planta sandbox na própria Estela. */
export function despertarDebugSandbox(token) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'debugSandbox' }),
  });
}

/** Admin: zera a própria Estela + remove conquistas do Despertar. */
export function despertarDebugReset(token) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'debugReset' }),
  });
}

/** Admin: concede recursos (preset) na própria Estela. */
export function despertarDebugGrant(token, grantId) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'debugGrant', grantId }),
  });
}

export function despertarStateSync(token, clientState) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'stateSync', clientState }),
  });
}

export function despertarPrestige(token) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'prestige' }),
  });
}

export function despertarTalentBuy(token, talentId) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'talentBuy', talentId }),
  });
}

export function despertarVerdictBuy(token, purchaseId) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'verdictBuy', purchaseId }),
  });
}

export function despertarJuizoStart(token) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'juizoStart' }),
  });
}

export function despertarJuizoGuess(token, choice) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'juizoGuess', choice }),
  });
}

export function despertarJuizoAbandon(token) {
  return request('/despertar', {
    method: 'POST',
    body: JSON.stringify({ token, action: 'juizoAbandon' }),
  });
}

/* ============================================================
   5.2 CLASSIND-DLE (votação live — /api/classind)
   ============================================================ */
export function classindRequest(token, action, payload = {}) {
  return request('/classind', {
    method: 'POST',
    body: JSON.stringify({ token, action, ...payload }),
  });
}

export function classindCreateRoom(token, options = {}) {
  return classindRequest(token, 'createRoom', options);
}

export function classindJoinRoom(token, code) {
  return classindRequest(token, 'joinRoom', { code });
}

export function classindGetState(token, { roomId, code } = {}) {
  return classindRequest(token, 'getState', { roomId, code });
}

export function classindStartRound(token, { roomId, roundIndex } = {}) {
  return classindRequest(token, 'startRound', { roomId, roundIndex });
}

export function classindCastVote(token, { roomId, choice } = {}) {
  return classindRequest(token, 'castVote', { roomId, choice });
}

export function classindReveal(token, { roomId } = {}) {
  return classindRequest(token, 'reveal', { roomId });
}

export function classindNextRound(token, { roomId } = {}) {
  return classindRequest(token, 'nextRound', { roomId });
}

export function classindShowRanking(token, { roomId } = {}) {
  return classindRequest(token, 'showRanking', { roomId });
}

export function classindCloseRoom(token, { roomId } = {}) {
  return classindRequest(token, 'closeRoom', { roomId });
}

export function classindPing(token, { roomId } = {}) {
  return classindRequest(token, 'ping', { roomId });
}

export function classindListRoster(token, { roomId } = {}) {
  return classindRequest(token, 'listRoomRoster', { roomId });
}

/* ============================================================
   6. GUARD DE ROTA
   ============================================================
   Chamado no boot das páginas protegidas. Se não houver sessão
   (ou se o servidor a rejeitar), redireciona imediatamente para
   o Pacto de Sangue.
   Hard-gate Task 3: aluno sem e-mail confirmado vai ao Painel (?selo=1),
   exceto na própria superfície do Painel.
   ============================================================ */

/** Aluno (não-admin) sem emailVerifiedAt precisa selar o Mensageiro. */
export function needsMessengerSeal(user) {
  if (!user || user.role === 'admin') return false;
  return !user.emailVerifiedAt;
}

export function messengerSealDashboardUrl() {
  return `${ROUTES.dashboard()}?selo=1`;
}

function isDashboardPath() {
  const path = String(window.location?.pathname || '');
  return /dashboard\.html$/i.test(path);
}

export async function requireSession(options = {}) {
  const session = getSession();
  if (!session) {
    window.location.replace(ROUTES.auth());
    return null;
  }

  const allowUnsealed = () => options.allowUnsealed === true
    || (options.allowUnsealed !== false && isDashboardPath());

  const finishOk = (user, gates = null) => {
    saveSession({ token: session.token, name: user.name, role: user.role });
    if (gates) setBootstrapGates(session.token, gates);
    else setBootstrapGates(null);

    if (needsMessengerSeal(user) && !allowUnsealed()) {
      window.location.replace(messengerSealDashboardUrl());
      return null;
    }

    return { session, user, gates };
  };

  const validateLegacy = async () => {
    const { user } = await validateSession(session.token);
    return finishOk(user, null);
  };

  try {
    try {
      const boot = await fetchSessionBootstrap(session.token);
      return finishOk(boot.user, boot.gates);
    } catch (bootError) {
      if (bootError instanceof ApiError && isBootstrapFallbackStatus(bootError.status)) {
        return await validateLegacy();
      }
      throw bootError;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Segunda chance para inconsistências transitórias entre login e leitura da sessão.
      try {
        await wait(250);
        try {
          const boot = await fetchSessionBootstrap(session.token);
          return finishOk(boot.user, boot.gates);
        } catch (bootError) {
          if (bootError instanceof ApiError && isBootstrapFallbackStatus(bootError.status)) {
            return await validateLegacy();
          }
          if (bootError instanceof ApiError && bootError.status === 401) {
            throw bootError;
          }
          throw bootError;
        }
      } catch {
        clearSession();
        setBootstrapGates(null);
        window.location.replace(ROUTES.auth());
        return null;
      }
    }
    // Erro de rede/API fora do ar: propaga para a página exibir aviso.
    throw error;
  }
}

/**
 * Guard de páginas/ações do Mestre.
 * Aluno autenticado é redirecionado ao Painel (deep link de Almas, etc.).
 * @param {{ redirectTo?: string }} [options]
 */
export async function requireAdmin(options = {}) {
  const result = await requireSession();
  if (!result) return null;

  if (result.user?.role !== 'admin') {
    const target = options.redirectTo || ROUTES.dashboard();
    window.location.replace(target);
    return null;
  }

  return result;
}

/* ============================================================
   7. REGRAS DE APRESENTAÇÃO COMPARTILHADAS
   (conquistas + níveis: data/game-catalog.json via js/game-catalog.js)
   ============================================================ */
export {
  ACHIEVEMENT_DIFFICULTY,
  ACHIEVEMENT_RARITY,
  ACHIEVEMENT_RARITY_LABELS,
  ACHIEVEMENTS,
  DEFAULT_ACHIEVEMENT_RARITY,
  DIFFICULTY_TO_RARITY,
  GAME_CATALOG,
  LEVEL_BANDS,
  LEVEL_XP_BASE,
  MAX_LEVEL,
  RANKS,
  getAchievementById,
  getAchievementDifficulty,
  getAchievementRarity,
  getAchievementVeiledDescription,
  getAchievementXp,
  isMaxLevel,
  levelForXp,
  mapAchievementDetails,
  normalizeAchievementRarity,
  describeLevelProgress,
  rankForLevel,
  rankForXp,
  rarityFromDifficulty,
  buildTrailheadTextNode,
  fillTrailheadField,
  xpQuotaForXp,
  xpRequiredForLevel,
  xpToReachLevel,
  xpWithinLevel,
} from './game-catalog.js';

export const MODULES = [
  {
    id: 'modulo1',
    number: 'M1',
    title: 'Fundações, Cultura e Interface',
    subtitle: 'Aulas 1 a 4 · trilha inicial',
    lessons: [
      {
        id: 'aula1',
        number: '01',
        title: 'O Círculo Mágico e a Interface Amigável da Engine',
        subtitle: 'Conceitos de jogos, leitura da Godot 4 e prática no Inspector',
        rewardXp: 30,
      },
      {
        id: 'aula2',
        number: '02',
        title: 'O Glossário do Desenvolvedor e o Player na Tela',
        subtitle: 'Core Loop, Grokking, Assets · Cenas, Nós, Input Map e movimento mínimo',
        rewardXp: 30,
      },
      {
        id: 'aula3',
        number: '03',
        title: 'Homo Ludens, Identidade e Expressão Cultural',
        subtitle: 'Cultura como jogo · Pixel art, importação e herói brasileiro',
        rewardXp: 30,
      },
      {
        id: 'aula4',
        number: '04',
        title: 'A Linha do Tempo das Plataformas e as Restrições Técnicas',
        subtitle: 'Histórico de hardware · Viewport retrô e stretch clássico',
        rewardXp: 30,
      },
      {
        id: 'aula5',
        number: '05',
        title: 'Classificação Indicativa (ClassInd), IARC e Design Saudável',
        subtitle: 'Faixas etárias · ClassInd-dle · Adequação de público',
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

installDevtoolsGuard();
