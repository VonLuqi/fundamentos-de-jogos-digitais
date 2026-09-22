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
} from './api.js';

const SORT_LABELS = Object.freeze({
  xp: 'XP',
  achievements: 'Relíquias',
  juizoBest: 'Juízo',
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

function renderRows(body, entries, selfId) {
  if (!body) return;
  body.replaceChildren();
  if (!entries.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.textContent = 'Nenhuma alma neste escopo ainda.';
    tr.append(td);
    body.append(tr);
    return;
  }

  for (const row of entries) {
    const tr = document.createElement('tr');
    if (Number(row.userId) === Number(selfId)) tr.classList.add('is-self');

    const cells = [
      row.rank,
      row.fullName || row.username || '—',
      row.turma || '—',
      formatNumber(row.xp),
      formatNumber(row.achievements),
      formatNumber(row.juizoBest),
    ];
    cells.forEach((value, index) => {
      const td = document.createElement('td');
      td.textContent = escapeCell(value);
      if (index === 1 && row.username) {
        td.title = `@${row.username}`;
      }
      tr.append(td);
    });
    body.append(tr);
  }
}

function renderSelf(panel, lineEl, self, total, sort, inTop) {
  if (!panel || !lineEl) return;
  if (!self) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const sortLabel = SORT_LABELS[sort] || sort;
  const metric = sort === 'achievements'
    ? `${formatNumber(self.achievements)} relíquias`
    : sort === 'juizoBest'
      ? `recorde ${formatNumber(self.juizoBest)}`
      : `${formatNumber(self.xp)} XP`;
  const note = inTop
    ? 'Estás no top do Placar.'
    : `Fora do top — ainda assim o Domínio registra tua posição.`;
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
    scope: 'turma',
    sort: 'xp',
    turma: '',
    selfId: session.user?.id ?? null,
  };

  const body = document.getElementById('ranking-body');
  const meta = document.getElementById('ranking-meta');
  const selfPanel = document.getElementById('ranking-self');
  const selfLine = document.getElementById('ranking-self-line');
  const turmaWrap = document.getElementById('ranking-turma-wrap');
  const turmaSelect = document.getElementById('ranking-turma');

  const scopeButtons = [...document.querySelectorAll('[data-ranking-scope]')];
  const sortButtons = [...document.querySelectorAll('[data-ranking-sort]')];

  function syncChips() {
    scopeButtons.forEach((btn) => {
      const on = btn.getAttribute('data-ranking-scope') === state.scope;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    sortButtons.forEach((btn) => {
      const on = btn.getAttribute('data-ranking-sort') === state.sort;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function syncTurmaFilter(payload) {
    const show = Boolean(isAdmin && state.scope === 'turma');
    if (turmaWrap) turmaWrap.hidden = !show;
    if (!show || !turmaSelect) return;
    const list = Array.isArray(payload?.turmasDisponiveis) ? payload.turmasDisponiveis : [];
    const current = payload?.turma || state.turma || list[0] || '';
    turmaSelect.replaceChildren();
    for (const turma of list) {
      const option = document.createElement('option');
      option.value = turma;
      option.textContent = turma;
      if (turma === current) option.selected = true;
      turmaSelect.append(option);
    }
    state.turma = current;
  }

  async function refresh() {
    clearWarning();
    setText(meta, 'Consultando o Domínio…');
    const token = getSession()?.token;
    if (!token) {
      showWarning('Sessão inválida.');
      return;
    }
    try {
      const payload = await leaderboardGet(token, {
        scope: state.scope,
        sort: state.sort,
        turma: state.scope === 'turma' && isAdmin ? state.turma : undefined,
      });
      syncTurmaFilter(payload);
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      renderRows(body, entries, state.selfId);
      const scopeLabel = payload.scope === 'global'
        ? 'Global'
        : `Turma ${payload.turma || '—'}`;
      setText(
        meta,
        `${scopeLabel} · ordenado por ${SORT_LABELS[payload.sort] || payload.sort} · ${formatNumber(payload.total || 0)} almas · top ${payload.topN || 50}`,
      );
      const inTop = entries.some((row) => Number(row.userId) === Number(state.selfId));
      renderSelf(selfPanel, selfLine, payload.self, payload.total, payload.sort, inTop);
    } catch (error) {
      if (error instanceof ApiError && error.payload?.error === 'messenger_seal_required') {
        showWarning(error.payload?.message || error.message);
      } else {
        showWarning(error instanceof ApiError ? error.message : 'O Placar não respondeu.');
      }
      if (body) {
        body.replaceChildren();
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.textContent = '—';
        tr.append(td);
        body.append(tr);
      }
      setText(meta, 'Placar indisponível.');
      if (selfPanel) selfPanel.hidden = true;
    }
  }

  scopeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-ranking-scope');
      if (!next || next === state.scope) return;
      state.scope = next;
      syncChips();
      refresh();
    });
  });

  sortButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-ranking-sort');
      if (!next || next === state.sort) return;
      state.sort = next;
      syncChips();
      refresh();
    });
  });

  turmaSelect?.addEventListener('change', () => {
    state.turma = turmaSelect.value;
    refresh();
  });

  syncChips();
  await refresh();
}

document.addEventListener('DOMContentLoaded', init);
