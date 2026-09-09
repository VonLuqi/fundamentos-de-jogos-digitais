/**
 * Grimório Pessoal — workspace (coleções · lista · leitura).
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  LESSONS,
  ROUTES,
  getSession,
  listNotes,
  logout,
  requireSession,
} from './api.js';
import { hideGrimorioReading, loadGrimorioReading } from './grimorio-reading.js';
import { renderTagChips } from './grimorio-tags.js';
import { flushQueuedGrimoireAwards } from './grimorio-awards.js';

const EXCERPT_MAX = 120;

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

function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function excerptBody(body) {
  const text = String(body || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= EXCERPT_MAX) return text;
  const slice = text.slice(0, EXCERPT_MAX);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}

function lessonShortLabel(lessonId) {
  const lesson = LESSONS.find((item) => item.id === lessonId);
  if (!lesson) return lessonId;
  return (lesson.number || lesson.title || lessonId).trim();
}

function noteIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function colecaoFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('colecao') || 'suas';
}

function contextDotClass(note, shared) {
  if (shared) return 'is-revelada';
  if (note.pinned) return 'is-fixada';
  if (note.lessonId) return 'is-trilha';
  return 'is-propria';
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

  flushQueuedGrimoireAwards();

  const token = session.token || getSession()?.token;
  const workspace = document.getElementById('grimorio-workspace');
  const collectionsEl = document.getElementById('grimorio-collections');
  const listEl = document.getElementById('grimorio-list');
  const emptyEl = document.getElementById('grimorio-empty');
  const listHeading = document.getElementById('grimorio-list-heading');
  const listCount = document.getElementById('grimorio-list-count');
  const statusEl = document.getElementById('grimorio-status');
  const softEl = document.getElementById('grimorio-softwarn');
  const searchInput = document.getElementById('grimorio-search');
  const newLink = document.getElementById('grimorio-new');
  const readingBack = document.getElementById('grimorio-reading-back');
  if (newLink) newLink.href = ROUTES.grimorioEditar();

  let ownNotes = [];
  let sharedNotes = [];
  let activeColecao = colecaoFromQuery();
  let selectedId = noteIdFromQuery();
  let readingHandle = null;
  let readingSeq = 0;

  function syncUrl({ replace = true } = {}) {
    const params = new URLSearchParams();
    if (activeColecao && activeColecao !== 'suas') {
      params.set('colecao', activeColecao);
    }
    if (selectedId) params.set('id', String(selectedId));
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
    if (replace) {
      window.history.replaceState({ grimorio: true }, '', next);
    } else {
      window.history.pushState({ grimorio: true }, '', next);
    }
  }

  function setMobileView(view) {
    if (!workspace) return;
    workspace.dataset.mobileView = view;
    if (readingBack) readingBack.hidden = view !== 'reading';
  }

  function allIndexedNotes() {
    return [
      ...ownNotes.map((note) => ({ note, shared: false })),
      ...sharedNotes.map((note) => ({ note, shared: true })),
    ];
  }

  function buildCollectionDefs() {
    const defs = [
      { key: 'suas', label: 'Suas', count: ownNotes.length },
      { key: 'reveladas', label: 'Reveladas', count: sharedNotes.length },
      {
        key: 'fixadas',
        label: 'Fixadas',
        count: ownNotes.filter((n) => n.pinned).length,
      },
    ];

    const lessonCounts = new Map();
    ownNotes.forEach((note) => {
      if (!note.lessonId) return;
      lessonCounts.set(note.lessonId, (lessonCounts.get(note.lessonId) || 0) + 1);
    });
    sharedNotes.forEach((note) => {
      if (!note.lessonId) return;
      lessonCounts.set(note.lessonId, (lessonCounts.get(note.lessonId) || 0) + 1);
    });
    [...lessonCounts.entries()]
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .forEach(([lessonId, count]) => {
        defs.push({
          key: `trilha:${lessonId}`,
          label: `Trilha · ${lessonShortLabel(lessonId)}`,
          count,
        });
      });

    const tagCounts = new Map();
    const bumpTags = (note) => {
      (note.tags || []).forEach((tag) => {
        const key = String(tag || '').trim();
        if (!key) return;
        tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
      });
    };
    ownNotes.forEach(bumpTags);
    sharedNotes.forEach(bumpTags);
    [...tagCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .forEach(([tag, count]) => {
        defs.push({
          key: `marca:${tag}`,
          label: `#${tag}`,
          count,
        });
      });

    return defs;
  }

  function notesForColecao(key) {
    if (key === 'reveladas') {
      return sharedNotes.map((note) => ({ note, shared: true }));
    }
    if (key === 'fixadas') {
      return ownNotes.filter((n) => n.pinned).map((note) => ({ note, shared: false }));
    }
    if (key.startsWith('trilha:')) {
      const lessonId = key.slice('trilha:'.length);
      return allIndexedNotes().filter(({ note }) => note.lessonId === lessonId);
    }
    if (key.startsWith('marca:')) {
      const tag = key.slice('marca:'.length).toLowerCase();
      return allIndexedNotes().filter(({ note }) =>
        (note.tags || []).some((item) => String(item).toLowerCase() === tag)
      );
    }
    return ownNotes.map((note) => ({ note, shared: false }));
  }

  function collectionLabel(key) {
    const def = buildCollectionDefs().find((item) => item.key === key);
    return def?.label || 'Inscrições';
  }

  function renderCollections() {
    if (!collectionsEl) return;
    const defs = buildCollectionDefs();
    if (!defs.some((item) => item.key === activeColecao)) {
      activeColecao = 'suas';
    }

    collectionsEl.replaceChildren();

    const primary = defs.filter((d) => !d.key.startsWith('trilha:') && !d.key.startsWith('marca:'));
    const trilhas = defs.filter((d) => d.key.startsWith('trilha:'));
    const marcas = defs.filter((d) => d.key.startsWith('marca:'));

    const appendGroup = (title, items) => {
      if (!items.length) return;
      if (title) {
        collectionsEl.appendChild(el('p', 'grimorio-collections__group', title));
      }
      const ul = el('ul', 'grimorio-collections__list');
      items.forEach((item) => {
        const li = el('li', 'grimorio-collections__item');
        const btn = el('button', 'grimorio-collections__btn');
        btn.type = 'button';
        btn.dataset.colecao = item.key;
        if (item.key === activeColecao) {
          btn.classList.add('is-active');
          btn.setAttribute('aria-current', 'true');
        }
        const label = el('span', 'grimorio-collections__label', item.label);
        const count = el('span', 'grimorio-collections__count', String(item.count));
        btn.append(label, count);
        btn.addEventListener('click', () => {
          activeColecao = item.key;
          renderCollections();
          renderList();
          syncUrl();
        });
        li.appendChild(btn);
        ul.appendChild(li);
      });
      collectionsEl.appendChild(ul);
    };

    appendGroup(null, primary);
    appendGroup('Por trilha', trilhas);
    appendGroup('Por marca', marcas);
  }

  function buildFeedItem({ note, shared }) {
    const li = el('li', 'grimorio-feed__item');
    const btn = el('button', 'grimorio-feed__btn');
    btn.type = 'button';
    btn.dataset.noteId = String(note.id);
    if (Number(note.id) === Number(selectedId)) {
      btn.classList.add('is-selected');
      btn.setAttribute('aria-current', 'true');
    }

    const dot = el('span', `grimorio-feed__dot ${contextDotClass(note, shared)}`);
    dot.setAttribute('aria-hidden', 'true');

    const main = el('span', 'grimorio-feed__main');

    const topRow = el('span', 'grimorio-feed__top');
    let context = 'Sua';
    if (shared) context = 'Revelada';
    else if (note.pinned) context = 'Fixada';
    else if (note.lessonId) context = lessonShortLabel(note.lessonId);
    topRow.appendChild(el('span', 'grimorio-feed__context', context));
    const updated = formatDate(note.updatedAt);
    if (updated) topRow.appendChild(el('span', 'grimorio-feed__date', updated));

    const titleRow = el('span', 'grimorio-feed__title-row');
    const title = el('span', 'grimorio-feed__title', note.title || 'Sem título');
    titleRow.appendChild(title);
    if (!shared && note.unreadEventsCount > 0) {
      titleRow.appendChild(
        el(
          'span',
          'grimorio-card__badge',
          note.unreadEventsCount === 1 ? '1 eco' : `${note.unreadEventsCount} ecos`
        )
      );
    }

    const excerpt = el('span', 'grimorio-feed__excerpt', excerptBody(note.body));

    main.append(topRow, titleRow);
    if (excerpt.textContent) main.appendChild(excerpt);

    if (Array.isArray(note.tags) && note.tags.length) {
      const tagsWrap = el('div', 'note-tags__chips note-tags__chips--readonly note-tags__chips--hash grimorio-feed__tags');
      main.appendChild(tagsWrap);
      renderTagChips(tagsWrap, note.tags.slice(0, 4), { removable: false });
    }

    btn.append(dot, main);
    btn.addEventListener('click', () => {
      selectNote(note.id, { shared });
    });
    li.appendChild(btn);
    return li;
  }

  function renderList() {
    const q = normalizeSearch(searchInput?.value);
    const base = notesForColecao(activeColecao);
    const visible = base.filter(({ note }) => {
      if (!q) return true;
      const hay = normalizeSearch(
        `${note.title} ${note.body || ''} ${(note.tags || []).join(' ')} ${note.owner?.username || ''}`
      );
      return hay.includes(q);
    });

    if (listHeading) listHeading.textContent = collectionLabel(activeColecao);
    if (listCount) {
      listCount.textContent = visible.length === 1
        ? '1 inscrição'
        : `${visible.length} inscrições`;
    }

    listEl.replaceChildren();
    visible.forEach((entry) => listEl.appendChild(buildFeedItem(entry)));

    if (base.length === 0) {
      emptyEl.hidden = false;
      if (activeColecao === 'suas') {
        emptyEl.textContent = 'O Grimório espera a primeira inscrição.';
      } else if (activeColecao === 'reveladas') {
        emptyEl.textContent = 'Nada foi revelado a você… ainda.';
      } else if (activeColecao === 'fixadas') {
        emptyEl.textContent = 'Nenhuma inscrição fixada.';
      } else {
        emptyEl.textContent = 'Nada nesta coleção… ainda.';
      }
    } else if (visible.length === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = 'Nenhuma inscrição corresponde à busca.';
    } else {
      emptyEl.hidden = true;
    }
  }

  async function selectNote(id, { shared = false } = {}) {
    selectedId = Number(id) || null;
    if (!selectedId) {
      readingHandle?.clear?.();
      hideGrimorioReading();
      setMobileView('list');
      renderList();
      syncUrl();
      return;
    }

    if (shared || notesForColecao('reveladas').some(({ note }) => Number(note.id) === selectedId)) {
      if (activeColecao === 'suas') {
        // keep current collection; selection can span collections
      }
    }

    renderList();
    syncUrl();
    setMobileView('reading');

    const seq = ++readingSeq;
    if (statusEl) statusEl.textContent = '';
    try {
      readingHandle = await loadGrimorioReading({
        token,
        noteId: selectedId,
        isStale: () => seq !== readingSeq,
        onDeleted: async () => {
          selectedId = null;
          await refreshNotes();
          hideGrimorioReading();
          setMobileView('list');
          syncUrl();
        },
        onRefused: async () => {
          selectedId = null;
          await refreshNotes();
          hideGrimorioReading();
          setMobileView('list');
          syncUrl();
        },
        onCloned: async (newId) => {
          await refreshNotes();
          activeColecao = 'suas';
          renderCollections();
          await selectNote(newId);
        },
      });
      if (seq !== readingSeq) return;
    } catch (error) {
      if (seq !== readingSeq) return;
      if (statusEl) {
        statusEl.textContent = error instanceof ApiError
          ? error.message
          : 'Não foi possível abrir a inscrição.';
        statusEl.dataset.tone = 'error';
      }
    }
  }

  async function refreshNotes() {
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
    renderCollections();
    renderList();
  }

  readingBack?.addEventListener('click', () => {
    selectedId = null;
    readingHandle?.clear?.();
    hideGrimorioReading();
    setMobileView('list');
    renderList();
    syncUrl();
  });

  searchInput?.addEventListener('input', () => renderList());

  window.addEventListener('popstate', () => {
    activeColecao = colecaoFromQuery();
    selectedId = noteIdFromQuery();
    renderCollections();
    renderList();
    if (selectedId) {
      selectNote(selectedId);
    } else {
      hideGrimorioReading();
      setMobileView('list');
    }
  });

  if (statusEl) statusEl.textContent = 'Abrindo o Grimório…';

  try {
    await refreshNotes();
    if (statusEl) statusEl.textContent = '';
    syncUrl();
    if (selectedId) {
      await selectNote(selectedId);
    } else {
      hideGrimorioReading();
      setMobileView('list');
    }
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
}

document.addEventListener('DOMContentLoaded', init);
