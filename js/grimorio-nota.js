/**
 * Página de inscrição do Grimório (criar / editar / revelar).
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  LESSONS,
  ROUTES,
  createNote,
  deleteNote,
  fetchLessonsPublishMap,
  getNote,
  getSession,
  listFriends,
  logout,
  requireSession,
  shareNote,
  unshareNote,
  updateNote,
} from './api.js';
import { isLessonPublished } from './lessons-ui.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const TITLE_MAX = 120;
const BODY_MAX = 8000;

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

function setFeedback(message, tone = '') {
  const node = document.getElementById('note-feedback');
  if (!node) return;
  node.textContent = message || '';
  node.dataset.tone = tone || '';
}

function setSoftWarning(payload) {
  const softEl = document.getElementById('note-softwarn');
  if (!softEl) return;
  if (payload?.softWarning) {
    softEl.hidden = false;
    softEl.textContent = payload.softWarningMessage
      || `O Grimório engrossa… (${payload.count} inscrições).`;
  } else {
    softEl.hidden = true;
    softEl.textContent = '';
  }
}

function noteIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseTags(value) {
  return String(value || '')
    .split(/[,;#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
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
    option.textContent = published
      ? label
      : `${label} (não liberada)`;
    select.appendChild(option);
  });

  if (selectedId) {
    select.value = selectedId;
    if (select.value !== selectedId) {
      // fallback se a aula sumiu do catálogo
      const orphan = document.createElement('option');
      orphan.value = selectedId;
      orphan.textContent = `${selectedId} (vínculo mantido)`;
      select.appendChild(orphan);
      select.value = selectedId;
    }
  }

  const lockedKept = Boolean(
    selectedId && !isLessonPublished(selectedId, publishMap)
  );
  if (hint) {
    hint.hidden = !lockedKept;
    hint.textContent = lockedKept
      ? 'Esta aula não está liberada na Trilha; o vínculo antigo é mantido.'
      : '';
  }
}

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR');
}

function openConfirmDialog({
  dialogId,
  cancelId,
  okId,
  fallbackMessage,
}) {
  const dialog = document.getElementById(dialogId);
  const cancelBtn = document.getElementById(cancelId);
  const okBtn = document.getElementById(okId);
  const panel = dialog?.querySelector('.grimorio-confirm__panel');

  if (!dialog || !cancelBtn || !okBtn || !panel) {
    return Promise.resolve(window.confirm(fallbackMessage));
  }

  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((node) => !node.hasAttribute('disabled') && node.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onCancel = () => finish(false);
    const onOk = () => finish(true);
    const onBackdrop = (event) => {
      if (event.target === dialog) finish(false);
    };

    const cleanup = () => {
      dialog.classList.remove('is-open');
      dialog.hidden = true;
      document.body.classList.remove('is-grimorio-confirm-open');
      window.removeEventListener('keydown', onKeyDown);
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      dialog.removeEventListener('click', onBackdrop);
      if (previousFocus?.focus) {
        previousFocus.focus({ preventScroll: true });
      }
    };

    dialog.hidden = false;
    dialog.classList.add('is-open');
    document.body.classList.add('is-grimorio-confirm-open');
    window.addEventListener('keydown', onKeyDown);
    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    dialog.addEventListener('click', onBackdrop);
    window.requestAnimationFrame(() => cancelBtn.focus());
  });
}

function confirmDelete() {
  return openConfirmDialog({
    dialogId: 'note-delete-confirm',
    cancelId: 'note-delete-cancel',
    okId: 'note-delete-ok',
    fallbackMessage: 'Esta página do Grimório será perdida. Confirma?',
  });
}

function confirmVeil() {
  return openConfirmDialog({
    dialogId: 'note-veil-confirm',
    cancelId: 'note-veil-cancel',
    okId: 'note-veil-ok',
    fallbackMessage: 'O companheiro deixará de ver esta inscrição.',
  });
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

function renderShareList(note, companions, onUnshare) {
  const list = document.getElementById('note-share-list');
  const select = document.getElementById('note-share-select');
  if (!list || !select) return;

  const shared = note.sharedWith || [];
  list.replaceChildren();

  if (shared.length === 0) {
    const empty = el('li', 'note-share__empty', 'Nada revelado a companheiros… ainda.');
    list.appendChild(empty);
  } else {
    shared.forEach((person) => {
      const li = el('li', 'note-share__item');
      const label = el('span', null, `@${person.username}`);
      const btn = el('button', 'note-share__veil', 'Velar novamente');
      btn.type = 'button';
      btn.setAttribute('aria-label', `Velar novamente para @${person.username}`);
      btn.addEventListener('click', () => onUnshare?.(person.userId));
      li.append(label, btn);
      list.appendChild(li);
    });
  }

  const sharedIds = new Set(shared.map((p) => Number(p.userId)));
  select.replaceChildren();
  select.appendChild(new Option('— Companheiro —', ''));
  companions
    .filter((entry) => !sharedIds.has(Number(entry.user?.id)))
    .forEach((entry) => {
      const user = entry.user || {};
      select.appendChild(
        new Option(`@${user.username} — ${user.fullName || user.username}`, String(user.id))
      );
    });
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
  const tagsInput = document.getElementById('note-tags');
  const pinnedInput = document.getElementById('note-pinned');
  const lessonSelect = document.getElementById('note-lesson');
  const form = document.getElementById('note-form');
  const deleteBtn = document.getElementById('note-delete');
  const shareSection = document.getElementById('note-share');
  const shareBtn = document.getElementById('note-share-btn');
  const shareSelect = document.getElementById('note-share-select');
  const pageTitle = document.getElementById('note-page-title');
  const metaEl = document.getElementById('note-meta');
  const saveBtn = document.getElementById('note-save');

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
  let companions = [];
  let readOnly = false;

  async function loadCompanions() {
    try {
      const payload = await listFriends(token);
      companions = payload.accepted || [];
    } catch {
      companions = [];
    }
  }

  function refreshShareUi(note) {
    if (!shareSection || readOnly || !note?.id) {
      if (shareSection) shareSection.hidden = true;
      return;
    }
    shareSection.hidden = false;
    renderShareList(note, companions, async (userId) => {
      const confirmed = await confirmVeil();
      if (!confirmed) {
        setFeedback('Revelação mantida.', 'ok');
        return;
      }
      try {
        const result = await unshareNote(token, note.id, userId);
        currentNote = result.note;
        refreshShareUi(currentNote);
        setFeedback('Inscrição velada novamente.', 'ok');
      } catch (error) {
        setFeedback(
          error instanceof ApiError ? error.message : 'Falha ao velar.',
          'error'
        );
      }
    });
  }

  function applyNoteToForm(note, { canEdit }) {
    currentNote = note;
    readOnly = !canEdit;
    titleInput.value = note.title || '';
    bodyInput.value = note.body || '';
    tagsInput.value = (note.tags || []).join(', ');
    pinnedInput.checked = Boolean(note.pinned);
    fillLessonSelect(publishMap, note.lessonId || null);
    updateCharCounts();

    [titleInput, bodyInput, tagsInput, pinnedInput, lessonSelect].forEach((node) => {
      if (node) node.disabled = readOnly;
    });

    if (pageTitle) {
      pageTitle.innerHTML = readOnly
        ? 'INSCRIÇÃO <span class="accent">REVELADA</span>'
        : 'EDITAR <span class="accent">INSCRIÇÃO</span>';
    }
    if (metaEl) {
      metaEl.hidden = false;
      metaEl.textContent = [
        note.createdAt ? `Criada em ${formatDate(note.createdAt)}` : null,
        note.updatedAt ? `Atualizada em ${formatDate(note.updatedAt)}` : null,
      ].filter(Boolean).join(' · ');
    }

    if (saveBtn) saveBtn.hidden = readOnly;
    if (deleteBtn) deleteBtn.hidden = readOnly;
    refreshShareUi(canEdit ? note : null);
  }

  await loadCompanions();

  if (!isNew) {
    try {
      const payload = await getNote(token, noteId);
      const canEdit = Boolean(payload.canEdit) && !payload.readOnly;
      applyNoteToForm(payload.note, { canEdit });
    } catch (error) {
      showApiWarning(
        error instanceof ApiError ? error.message : 'Não foi possível abrir a inscrição.'
      );
      return;
    }
  } else if (pageTitle) {
    pageTitle.innerHTML = 'NOVA <span class="accent">INSCRIÇÃO</span>';
    if (shareSection) shareSection.hidden = true;
    if (deleteBtn) deleteBtn.hidden = true;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (readOnly) return;

    const fields = {
      title: titleInput.value,
      body: bodyInput.value,
      tags: parseTags(tagsInput.value),
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
      applyNoteToForm(result.note, { canEdit: true });
      setSoftWarning(result);
      setFeedback('Inscrição atualizada.', 'ok');
    } catch (error) {
      setFeedback(
        error instanceof ApiError ? error.message : 'O Grimório não responde… tente de novo.',
        'error'
      );
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  deleteBtn?.addEventListener('click', async () => {
    if (!currentNote?.id || readOnly) return;
    const confirmed = await confirmDelete();
    if (!confirmed) {
      setFeedback('Inscrição guardada.', 'ok');
      return;
    }
    try {
      setFeedback('Rasgando inscrição…');
      await deleteNote(token, currentNote.id);
      window.location.replace(ROUTES.grimorio());
    } catch (error) {
      setFeedback(
        error instanceof ApiError ? error.message : 'Falha ao rasgar.',
        'error'
      );
    }
  });

  shareBtn?.addEventListener('click', async () => {
    if (!currentNote?.id || readOnly) return;
    const targetId = Number(shareSelect?.value);
    if (!targetId) {
      setFeedback('Escolha um companheiro.', 'error');
      return;
    }
    try {
      setFeedback('Revelando inscrição…');
      const result = await shareNote(token, currentNote.id, targetId);
      currentNote = result.note;
      refreshShareUi(currentNote);
      setFeedback('Inscrição revelada ao companheiro.', 'ok');
    } catch (error) {
      setFeedback(
        error instanceof ApiError ? error.message : 'Falha ao revelar.',
        'error'
      );
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
