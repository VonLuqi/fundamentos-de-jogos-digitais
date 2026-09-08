/**
 * Trilha do Herói — página própria de aulas (`pages/aulas.html`).
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  LESSONS,
  ROUTES,
  fetchLessonsPublishMap,
  getSession,
  logout,
  requireSession,
  setLessonGate,
} from './api.js';
import {
  PUBLISHED_GATE_KEY,
  isLessonPublished,
  renderModulesTrail,
} from './lessons-ui.js';

let currentUser = null;
let currentToken = null;
let publishMap = {};

function showApiWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function updateTrailMeta() {
  const meta = document.getElementById('trail-meta');
  if (!meta || !currentUser) return;

  const completed = Array.isArray(currentUser.completedLessons) ? currentUser.completedLessons : [];
  const publishedCount = LESSONS.filter((lesson) => isLessonPublished(lesson.id, publishMap)).length;
  const doneCount = currentUser.role === 'admin'
    ? LESSONS.length
    : LESSONS.filter((lesson) => completed.includes(lesson.id)).length;

  meta.textContent = currentUser.role === 'admin'
    ? `Mestre: ${publishedCount} de ${LESSONS.length} aulas liberadas para a turma.`
    : `${doneCount} concluída(s) · ${publishedCount} liberada(s) de ${LESSONS.length}.`;
}

function appendAdminToggle(lesson, _state, row) {
  if (currentUser?.role !== 'admin') return;

  const published = isLessonPublished(lesson.id, publishMap);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = [
    'lesson-row__publish',
    published ? 'is-on' : 'is-off',
  ].join(' ');
  toggle.textContent = published ? 'Liberada' : 'Liberar';
  toggle.setAttribute(
    'aria-label',
    published
      ? `Bloquear ${lesson.title} para a turma`
      : `Liberar ${lesson.title} para a turma`
  );
  toggle.setAttribute('aria-pressed', String(published));

  toggle.addEventListener('click', async () => {
    const next = !published;
    toggle.disabled = true;
    toggle.textContent = next ? 'Liberando…' : 'Bloqueando…';
    try {
      const result = await setLessonGate(currentToken, lesson.id, PUBLISHED_GATE_KEY, next);
      publishMap = {
        ...publishMap,
        [lesson.id]: Boolean(result?.gates?.published),
      };
      renderTrail();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao atualizar liberação.';
      showApiWarning(message);
      toggle.disabled = false;
      toggle.textContent = published ? 'Liberada' : 'Liberar';
    }
  });

  row.appendChild(toggle);
}

function renderTrail() {
  const container = document.getElementById('trail-modules');
  if (!container || !currentUser) return;

  renderModulesTrail(container, currentUser, {
    publishMap,
    afterRow: appendAdminToggle,
  });
  updateTrailMeta();
}

async function handleLogout() {
  await logout();
  window.location.href = ROUTES.auth();
}

async function init() {
  let result;
  try {
    result = await requireSession();
  } catch (error) {
    showApiWarning(
      error instanceof ApiError
        ? error.message
        : 'A API não respondeu. Rode `vercel dev` localmente ou publique no Vercel.'
    );
    return;
  }

  if (!result) return;

  currentUser = result.user;
  currentToken = getSession()?.token ?? null;

  initAppShell({
    route: 'aulas',
    role: currentUser.role === 'admin' ? 'admin' : 'student',
    onLogout: handleLogout,
  });

  try {
    publishMap = await fetchLessonsPublishMap(currentToken, LESSONS.map((lesson) => lesson.id));
  } catch {
    publishMap = Object.fromEntries(LESSONS.map((lesson) => [lesson.id, lesson.id === 'aula1']));
  }

  renderTrail();
}

document.addEventListener('DOMContentLoaded', init);
