/**
 * Placar do Domínio — UI (Task 20).
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  getSession,
  leaderboardGet,
  logout,
  requireSession,
  seasonArchiveGet,
} from './api.js';
import { applyPodiumClasses, podiumTierForRank } from './podium-vfx.js';
import { formatSouls } from './hades-despertar/ui/NumberFormatter.js';
import { renderSeasonBoardsMarkup } from './hades-despertar/ui/pauseVeil.js';
import { SEASON_HALL_COPY } from './hades-despertar/config/season-closed.js';

const SORT_LABELS = Object.freeze({
  xp: 'XP',
  achievements: 'Relíquias',
  juizoBest: 'Juízo',
  prestigeCount: 'Catábases',
  lifetimeSouls: 'Almas totais',
});

function setText(node, value) {
  if (!node) return;
  const next = String(value);
  if (node.textContent !== next) node.textContent = next;
}

function showWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function clearWarning() {
  const box = document.getElementById('api-warning');
  if (box) box.hidden = true;
}

function formatNumber(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR');
}

function escapeCell(value) {
  return String(value ?? '');
}

const RANKING_CACHE_KEY = 'hades_ranking_cache_v1';
const RANKING_CACHE_TTL_MS = 30_000;
const rankingMemoryCache = new Map();

function rankingCacheKey(scope, sort, turma = '') {
  return `${scope}:${sort}:${turma || ''}`;
}

function readRankingCache(key) {
  const mem = rankingMemoryCache.get(key);
  if (mem && Date.now() - mem.ts < RANKING_CACHE_TTL_MS) return mem.payload;
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(RANKING_CACHE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    const entry = all?.[key];
    if (!entry?.payload || Date.now() - Number(entry.ts || 0) > RANKING_CACHE_TTL_MS) return null;
    rankingMemoryCache.set(key, entry);
    return entry.payload;
  } catch {
    return null;
  }
}

function writeRankingCache(key, payload) {
  const entry = { ts: Date.now(), payload };
  rankingMemoryCache.set(key, entry);
  try {
    if (typeof sessionStorage === 'undefined') return;
    const raw = sessionStorage.getItem(RANKING_CACHE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[key] = entry;
    sessionStorage.setItem(RANKING_CACHE_KEY, JSON.stringify(all));
  } catch {
    /* quota / private mode */
  }
}

function renderRows(body, entries, selfId) {
  if (!body) return;
  if (!entries.length) {
    body.replaceChildren();
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.textContent = 'Nenhuma alma neste escopo ainda.';
    tr.append(td);
    body.append(tr);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const row of entries) {
    const tr = document.createElement('tr');
    if (Number(row.userId) === Number(selfId)) tr.classList.add('is-self');
    applyPodiumClasses(tr, row.rank);
    const podium = podiumTierForRank(row.rank);

    const cells = [
      row.rank,
      row.fullName || row.username || '—',
      row.turma || '—',
      formatNumber(row.xp),
      formatNumber(row.achievements),
      formatNumber(row.juizoBest),
      formatNumber(row.prestigeCount),
      formatSouls(row.lifetimeSouls == null || row.lifetimeSouls === '' ? '0' : String(row.lifetimeSouls)),
    ];
    cells.forEach((value, index) => {
      const td = document.createElement('td');
      if (index === 0) {
        td.textContent = escapeCell(value);
        if (podium) {
          td.className = 'ranking-table__rank';
          td.title = podium.label;
        }
      } else if (index === 1) {
        const name = escapeCell(value);
        if (podium) {
          const span = document.createElement('span');
          span.className = `ranking-table__name ranking-table__name--podium-${podium.rank}`;
          span.textContent = name;
          if (podium.rank === 1) {
            span.classList.add('is-podium-glitch');
            span.dataset.glitch = name;
          }
          td.append(span);
        } else {
          td.textContent = name;
        }
        if (row.username) td.title = `@${row.username}`;
      } else {
        td.textContent = escapeCell(value);
      }
      tr.append(td);
    });
    fragment.append(tr);
  }
  body.replaceChildren(fragment);
}

function renderSelf(panel, lineEl, self, total, sort, inTop) {
  if (!panel || !lineEl) return;
  if (!self) {
    panel.hidden = true;
    applyPodiumClasses(panel, null);
    return;
  }
  panel.hidden = false;
  applyPodiumClasses(panel, self.rank);
  const sortLabel = SORT_LABELS[sort] || sort;
  const metric = sort === 'achievements'
    ? `${formatNumber(self.achievements)} relíquias`
    : sort === 'juizoBest'
      ? `recorde ${formatNumber(self.juizoBest)}`
      : sort === 'prestigeCount'
        ? `${formatNumber(self.prestigeCount)} catábases`
        : sort === 'lifetimeSouls'
          ? `${formatSouls(self.lifetimeSouls == null || self.lifetimeSouls === '' ? '0' : String(self.lifetimeSouls))} almas`
          : `${formatNumber(self.xp)} XP`;
  const podium = podiumTierForRank(self.rank);
  const note = podium
    ? `Pódio ${podium.label}.`
    : inTop
      ? 'Estás no top do Placar.'
      : 'Fora do top — ainda assim o Domínio registra tua posição.';
  setText(
    lineEl,
    `#${self.rank} de ${formatNumber(total)} · ${metric} · ${sortLabel}. ${note}`,
  );
}

async function init() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    showWarning(
      error instanceof ApiError
        ? error.message
        : 'O Placar está inacessível no momento.',
    );
    return;
  }
  if (!session) return;

  const isAdmin = session.user?.role === 'admin';
  initAppShell({
    route: 'ranking',
    role: isAdmin ? 'admin' : 'student',
    onLogout: async () => {
      await logout();
    },
    token: getSession()?.token ?? null,
  });

  const state = {
    scope: 'global',
    sort: 'xp',
    selfId: session.user?.id ?? null,
  };

  const body = document.getElementById('ranking-body');
  const meta = document.getElementById('ranking-meta');
  const selfPanel = document.getElementById('ranking-self');
  const selfLine = document.getElementById('ranking-self-line');
  const sortButtons = [...document.querySelectorAll('[data-ranking-sort]')];

  function syncChips() {
    sortButtons.forEach((btn) => {
      const on = btn.getAttribute('data-ranking-sort') === state.sort;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function applyPayload(payload) {
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    renderRows(body, entries, state.selfId);
    setText(
      meta,
      `Global · ordenado por ${SORT_LABELS[payload.sort] || payload.sort} · ${formatNumber(payload.total || 0)} almas · top ${payload.topN || 50}`,
    );
    const inTop = entries.some((row) => Number(row.userId) === Number(state.selfId));
    renderSelf(selfPanel, selfLine, payload.self, payload.total, payload.sort, inTop);
  }

  async function refresh() {
    clearWarning();
    const token = getSession()?.token;
    if (!token) {
      showWarning('Sessão inválida.');
      return;
    }
    const cacheKey = rankingCacheKey(state.scope, state.sort);
    const cached = readRankingCache(cacheKey);
    if (cached) {
      applyPayload(cached);
    } else {
      setText(meta, 'Consultando o Domínio…');
      body?.closest('.ranking-table')?.classList.add('is-refreshing');
    }
    try {
      const payload = await leaderboardGet(token, {
        scope: 'global',
        sort: state.sort,
      });
      writeRankingCache(cacheKey, payload);
      applyPayload(payload);
    } catch (error) {
      if (error instanceof ApiError && error.payload?.error === 'messenger_seal_required') {
        showWarning(error.payload?.message || error.message);
      } else {
        showWarning(error instanceof ApiError ? error.message : 'O Placar não respondeu.');
      }
      if (!cached && body) {
        body.replaceChildren();
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 8;
        td.textContent = '—';
        tr.append(td);
        body.append(tr);
      }
      if (!cached) {
        setText(meta, 'Placar indisponível.');
        if (selfPanel) selfPanel.hidden = true;
      }
    } finally {
      body?.closest('.ranking-table')?.classList.remove('is-refreshing');
    }
  }

  sortButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-ranking-sort');
      if (!next || next === state.sort) return;
      state.sort = next;
      syncChips();
      refresh();
    });
  });

  syncChips();
  await refresh();
  await loadSeasonArchive(getSession()?.token ?? null);
}

async function loadSeasonArchive(token) {
  const section = document.getElementById('ranking-season-archive');
  const boards = document.getElementById('ranking-season-boards');
  const body = document.getElementById('ranking-season-archive-body');
  if (!section || !boards) return;
  if (!token) {
    section.hidden = true;
    return;
  }
  boards.innerHTML = renderSeasonBoardsMarkup(null, { loading: true });
  section.hidden = false;
  try {
    const result = await seasonArchiveGet(token, { seasonId: 1 });
    const archive = result?.archive;
    if (!archive?.boards) {
      boards.innerHTML = renderSeasonBoardsMarkup(null, { emptyCopy: SEASON_HALL_COPY.empty });
      if (body) body.textContent = SEASON_HALL_COPY.empty;
      return;
    }
    if (body) {
      body.textContent = archive.label
        ? `${archive.label} · congelado em ${archive.closedAt || '—'}`
        : SEASON_HALL_COPY.body;
    }
    boards.innerHTML = renderSeasonBoardsMarkup(archive.boards, { emptyCopy: SEASON_HALL_COPY.empty });
  } catch {
    boards.innerHTML = renderSeasonBoardsMarkup(null, { emptyCopy: SEASON_HALL_COPY.error });
    if (body) body.textContent = SEASON_HALL_COPY.error;
  }
}

document.addEventListener('DOMContentLoaded', init);
