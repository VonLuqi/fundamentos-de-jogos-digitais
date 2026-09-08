/**
 * Grimório Pessoal — índice de anotações.
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  ROUTES,
  getSession,
  listNotes,
  logout,
  requireSession,
} from './api.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function showApiWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function noteHref(id) {
  return `${ROUTES.grimorioNota(id)}`;
}

function buildNoteCard(note, { shared = false } = {}) {
  const li = el('li', 'grimorio-card');
  const link = el('a', 'grimorio-card__link');
  link.href = noteHref(note.id);

  const title = el('h3', 'grimorio-card__title', note.title || 'Sem título');
  if (note.pinned) {
    const pin = el('span', 'grimorio-card__pin', 'Fixada');
    title.appendChild(document.createTextNode(' '));
    title.appendChild(pin);
  }

  const metaParts = [];
  if (shared && note.owner?.username) metaParts.push(`de @${note.owner.username}`);
  const updated = formatDate(note.updatedAt);
  if (updated) metaParts.push(updated);
  if (note.sharedWithCount > 0 && !shared) {
    metaParts.push(
      note.sharedWithCount === 1
        ? '1 revelação'
        : `${note.sharedWithCount} revelações`
    );
  }

  const meta = el('p', 'grimorio-card__meta', metaParts.join(' · '));
  link.append(title, meta);

  if (Array.isArray(note.tags) && note.tags.length) {
    const tags = el('p', 'grimorio-card__tags', note.tags.map((t) => `#${t}`).join(' '));
    link.appendChild(tags);
  }

  li.appendChild(link);
  return li;
}

function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function init() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    showApiWarning(
      error instanceof ApiError
        ? error.message
        : 'O Grimório não responde… tente de novo.'
    );
    return;
  }
  if (!session) return;

  initAppShell({
    route: 'grimorio',
    role: session.user?.role === 'admin' ? 'admin' : 'student',
    onLogout: async () => {
      await logout();
    },
  });

  const token = session.token || getSession()?.token;
  const listEl = document.getElementById('grimorio-list');
  const emptyEl = document.getElementById('grimorio-empty');
  const sharedWrap = document.getElementById('grimorio-shared-wrap');
  const sharedList = document.getElementById('grimorio-shared-list');
  const sharedEmpty = document.getElementById('grimorio-shared-empty');
  const statusEl = document.getElementById('grimorio-status');
  const softEl = document.getElementById('grimorio-softwarn');
  const searchInput = document.getElementById('grimorio-search');

  let ownNotes = [];
  let sharedNotes = [];

  function render() {
    const q = normalizeSearch(searchInput?.value);
    const filterFn = (note) => {
      if (!q) return true;
      const hay = normalizeSearch(
        `${note.title} ${(note.tags || []).join(' ')} ${note.owner?.username || ''}`
      );
      return hay.includes(q);
    };

    const ownVisible = ownNotes.filter(filterFn);
    listEl.replaceChildren();
    ownVisible.forEach((note) => listEl.appendChild(buildNoteCard(note)));
    if (ownNotes.length === 0) {
      emptyEl.textContent = 'O Grimório espera a primeira inscrição.';
      emptyEl.hidden = false;
    } else if (ownVisible.length === 0) {
      emptyEl.textContent = 'Nenhuma inscrição corresponde à busca.';
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
    }

    const sharedVisible = sharedNotes.filter(filterFn);
    if (sharedWrap) {
      sharedWrap.hidden = false;
      sharedList.replaceChildren();
      sharedVisible.forEach((note) => {
        sharedList.appendChild(buildNoteCard(note, { shared: true }));
      });
      if (sharedEmpty) {
        if (sharedNotes.length === 0) {
          sharedEmpty.hidden = false;
          sharedEmpty.textContent = 'Nada foi revelado a você… ainda.';
        } else if (sharedVisible.length === 0) {
          sharedEmpty.hidden = false;
          sharedEmpty.textContent = 'Nenhuma revelação corresponde à busca.';
        } else {
          sharedEmpty.hidden = true;
        }
      }
    }
  }

  if (statusEl) statusEl.textContent = 'Abrindo o Grimório…';

  try {
    const payload = await listNotes(token, { includeShared: true });
    ownNotes = payload.notes || [];
    sharedNotes = payload.sharedWithMe || [];
    if (softEl && payload.softWarning) {
      softEl.hidden = false;
      softEl.textContent = payload.softWarningMessage
        || `O Grimório engrossa… (${payload.count} inscrições).`;
    } else if (softEl) {
      softEl.hidden = true;
      softEl.textContent = '';
    }
    if (statusEl) statusEl.textContent = '';
    render();
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = error instanceof ApiError
        ? error.message
        : 'O Grimório não responde… tente de novo.';
      statusEl.dataset.tone = 'error';
    }
    emptyEl.hidden = false;
    emptyEl.textContent = 'O Grimório não responde… tente de novo.';
  }

  searchInput?.addEventListener('input', () => render());
}

document.addEventListener('DOMContentLoaded', init);
