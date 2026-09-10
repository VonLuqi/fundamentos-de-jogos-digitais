/**
 * Banner "Voltar à inscrição" em páginas de aula (?fromNote=)
 * e foco na área de atividade (#aula-atividade).
 */

'use strict';

import { ApiError, ROUTES, getNote, getSession } from './api.js';
import { isActivityNoteId } from './grimorio-activity-notes.js';

const ACTIVITY_HASH = 'aula-atividade';
const OFICINA_TAB = 'oficina';

function activateLessonTab(tabId) {
  const tabs = document.querySelectorAll('.tab[data-tab]');
  const panels = document.querySelectorAll('.tab-panel');
  if (!tabs.length || !panels.length) return false;

  let found = false;
  tabs.forEach((tab) => {
    const match = tab.getAttribute('data-tab') === tabId;
    tab.classList.toggle('is-active', match);
    tab.setAttribute('aria-selected', match ? 'true' : 'false');
    if (match) found = true;
  });
  panels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === tabId);
  });
  return found;
}

export function focusLessonActivityArea({ smooth = true } = {}) {
  activateLessonTab(OFICINA_TAB);
  const anchor = document.getElementById(ACTIVITY_HASH);
  if (!anchor) return false;

  const scroll = () => {
    anchor.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'start',
    });
  };

  window.requestAnimationFrame(() => {
    window.setTimeout(scroll, 40);
  });
  return true;
}

function shouldFocusActivity(fromNoteRaw) {
  if (window.location.hash.replace(/^#/, '') === ACTIVITY_HASH) return true;
  return isActivityNoteId(fromNoteRaw);
}

export function initFromNoteBanner({ token } = {}) {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('fromNote');
  if (!raw) {
    if (window.location.hash.replace(/^#/, '') === ACTIVITY_HASH) {
      focusLessonActivityArea();
    }
    return;
  }

  const sessionToken = token || getSession()?.token;
  if (!sessionToken) return;

  const host = document.querySelector('.app-shell__content') || document.querySelector('main');
  if (!host) return;

  const bar = document.createElement('p');
  bar.className = 'grimorio-from-note';
  bar.id = 'grimorio-from-note';
  bar.innerHTML = '<span class="grimorio-from-note__label">…</span>';
  host.prepend(bar);

  if (shouldFocusActivity(raw)) {
    focusLessonActivityArea();
  }

  if (isActivityNoteId(raw)) {
    bar.replaceChildren();
    const link = document.createElement('a');
    link.className = 'grimorio-from-note__link';
    link.href = ROUTES.grimorioNota(raw);
    link.textContent = '← Voltar à atividade';
    bar.appendChild(link);
    return;
  }

  const noteId = Number(raw);
  if (!Number.isInteger(noteId) || noteId <= 0) {
    bar.remove();
    return;
  }

  getNote(sessionToken, noteId)
    .then((payload) => {
      const title = payload.note?.title || 'inscrição';
      bar.replaceChildren();
      const link = document.createElement('a');
      link.className = 'grimorio-from-note__link';
      link.href = ROUTES.grimorioNota(noteId);
      link.textContent = `← Voltar: ${title}`;
      bar.appendChild(link);
    })
    .catch((error) => {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        bar.remove();
        return;
      }
      bar.replaceChildren();
      const link = document.createElement('a');
      link.className = 'grimorio-from-note__link';
      link.href = ROUTES.grimorioNota(noteId);
      link.textContent = '← Voltar à inscrição';
      bar.appendChild(link);
    });
}
