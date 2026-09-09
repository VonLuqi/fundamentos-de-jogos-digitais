/**
 * Edição / criação de inscrição do Grimório.
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  LESSONS,
  ROUTES,
  createNote,
  fetchLessonsPublishMap,
  getNote,
  getSession,
  logout,
  requireSession,
  updateNote,
} from './api.js';
import { bindTagChipEditor } from './grimorio-tags.js';
import { isLessonPublished } from './lessons-ui.js';

const TITLE_MAX = 120;
const BODY_MAX = 8000;

function showApiWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function setFeedback(message, tone = '') {
  const node = document.getElementById('note-feedback');
  if (!node) return;
  node.textContent = message || '';
  node.dataset.tone = tone || '';
}

function noteIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function fillLessonSelect(publishMap = {}, selected = null) {
  const select = document.getElementById('note-lesson');
  const hint = document.getElementById('note-lesson-hint');
  if (!select) return;

  const selectedId = selected ? String(selected) : '';
  select.replaceChildren();
  select.appendChild(new Option('— Nenhuma —', ''));

  LESSONS.forEach((lesson) => {
    const published = isLessonPublished(lesson.id, publishMap);
    if (!published && lesson.id !== selectedId) return;

    const label = `${lesson.number || ''} ${lesson.title}`.trim();
    const option = document.createElement('option');
    option.value = lesson.id;
    option.textContent = published ? label : `${label} (não liberada)`;
    select.appendChild(option);
  });

  if (selectedId) {
    select.value = selectedId;
    if (select.value !== selectedId) {
      const orphan = document.createElement('option');
      orphan.value = selectedId;
      orphan.textContent = `${selectedId} (vínculo mantido)`;
      select.appendChild(orphan);
      select.value = selectedId;
    }
  }

  const lockedKept = Boolean(selectedId && !isLessonPublished(selectedId, publishMap));
  if (hint) {
    hint.hidden = !lockedKept;
    hint.textContent = lockedKept
      ? 'Esta aula não está liberada na Trilha; o vínculo antigo é mantido.'
      : '';
  }
}

function updateCharCounts() {
  const titleInput = document.getElementById('note-title');
  const bodyInput = document.getElementById('note-body');
  const titleCount = document.getElementById('note-title-count');
  const bodyCount = document.getElementById('note-body-count');
  if (titleInput && titleCount) {
    const len = titleInput.value.length;
    titleCount.textContent = `${len} / ${TITLE_MAX}`;
    titleCount.dataset.tone = len >= TITLE_MAX ? 'warn' : '';
  }
  if (bodyInput && bodyCount) {
    const len = bodyInput.value.length;
    bodyCount.textContent = `${len} / ${BODY_MAX}`;
    bodyCount.dataset.tone = len >= BODY_MAX ? 'warn' : '';
  }
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
  const noteId = noteIdFromQuery();
  const isNew = !noteId;

  const titleInput = document.getElementById('note-title');
  const bodyInput = document.getElementById('note-body');
  const pinnedInput = document.getElementById('note-pinned');
  const lessonSelect = document.getElementById('note-lesson');
  const form = document.getElementById('note-form');
  const pageTitle = document.getElementById('note-page-title');
  const saveBtn = document.getElementById('note-save');
  const backLink = document.getElementById('note-back-link');
  const cancelLink = document.getElementById('note-cancel');

  const tagEditor = bindTagChipEditor({
    input: document.getElementById('note-tags-input'),
    chipsEl: document.getElementById('note-tags-chips'),
    hiddenInput: document.getElementById('note-tags-hidden'),
  });

  let publishMap = {};
  try {
    publishMap = await fetchLessonsPublishMap(token);
  } catch {
    publishMap = Object.fromEntries(LESSONS.map((lesson) => [lesson.id, lesson.id === 'aula1']));
  }

  fillLessonSelect(publishMap, null);
  updateCharCounts();
  titleInput?.addEventListener('input', updateCharCounts);
  bodyInput?.addEventListener('input', updateCharCounts);
  lessonSelect?.addEventListener('change', () => {
    fillLessonSelect(publishMap, lessonSelect.value || null);
  });

  let currentNote = null;

  if (!isNew) {
    try {
      const payload = await getNote(token, noteId);
      if (!payload.canEdit || payload.readOnly) {
        window.location.replace(ROUTES.grimorioNota(noteId));
        return;
      }
      currentNote = payload.note;
      titleInput.value = currentNote.title || '';
      bodyInput.value = currentNote.body || '';
      pinnedInput.checked = Boolean(currentNote.pinned);
      tagEditor.setTags(currentNote.tags || []);
      fillLessonSelect(publishMap, currentNote.lessonId || null);
      updateCharCounts();
      if (pageTitle) pageTitle.innerHTML = 'EDITAR <span class="accent">INSCRIÇÃO</span>';
      if (backLink) backLink.href = ROUTES.grimorioNota(noteId);
      if (cancelLink) cancelLink.href = ROUTES.grimorioNota(noteId);
    } catch (error) {
      showApiWarning(
        error instanceof ApiError ? error.message : 'Não foi possível abrir a inscrição.'
      );
      return;
    }
  } else if (pageTitle) {
    pageTitle.innerHTML = 'NOVA <span class="accent">INSCRIÇÃO</span>';
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fields = {
      title: titleInput.value,
      body: bodyInput.value,
      tags: tagEditor.getTags(),
      pinned: pinnedInput.checked,
      lessonId: lessonSelect?.value || null,
    };

    if (!String(fields.title || '').trim()) {
      setFeedback('Toda inscrição precisa de um título.', 'error');
      titleInput?.focus();
      return;
    }

    if (saveBtn) saveBtn.disabled = true;
    setFeedback('Guardando inscrição…');

    try {
      if (isNew || !currentNote?.id) {
        const result = await createNote(token, fields);
        window.location.replace(ROUTES.grimorioNota(result.note.id));
        return;
      }

      const result = await updateNote(token, currentNote.id, fields);
      window.location.replace(ROUTES.grimorioNota(result.note.id));
    } catch (error) {
      setFeedback(
        error instanceof ApiError ? error.message : 'O Grimório não responde… tente de novo.',
        'error'
      );
      if (saveBtn) saveBtn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
