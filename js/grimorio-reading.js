/**
 * Painel de leitura do Grimório (workspace ou deep link).
 */

'use strict';

import {
  ApiError,
  LESSONS,
  ROUTES,
  ackNoteEvents,
  cloneNote,
  deleteNote,
  getNote,
  listFriends,
  refuseNoteShare,
  shareNote,
  unshareNote,
} from './api.js';
import { renderTagChips } from './grimorio-tags.js';
import { presentGrimoireAwards } from './grimorio-awards.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function setFeedback(message, tone = '') {
  const node = document.getElementById('note-feedback');
  if (!node) return;
  node.textContent = message || '';
  node.dataset.tone = tone || '';
}

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR');
}

function lessonLabel(lessonId) {
  const lesson = LESSONS.find((item) => item.id === lessonId);
  if (!lesson) return lessonId;
  return `${lesson.number || ''} ${lesson.title}`.trim();
}

export function openConfirmDialog({
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
      if (previousFocus?.focus) previousFocus.focus({ preventScroll: true });
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

function eventLabel(event) {
  const who = event.actor?.username ? `@${event.actor.username}` : 'Um companheiro';
  if (event.kind === 'cloned_by') return `${who} copiou para o próprio Grimório`;
  if (event.kind === 'veiled_by_recipient') return `${who} velou esta revelação`;
  if (event.kind === 'veiled_by_owner') return `Você velou para ${who}`;
  return `${who} · ${event.kind}`;
}

function updateShareBadge(count) {
  const badge = document.getElementById('note-share-badge');
  const openBtn = document.getElementById('note-share-open');
  if (!badge) return;
  const n = Math.max(0, Number(count) || 0);
  if (n > 0) {
    badge.hidden = false;
    badge.textContent = String(n);
    openBtn?.setAttribute('aria-label', `Revelar ao companheiro, ${n} já revelado${n === 1 ? '' : 's'}`);
  } else {
    badge.hidden = true;
    badge.textContent = '0';
    openBtn?.setAttribute('aria-label', 'Revelar ao companheiro');
  }
}

function setShareTriggerVisible(visible) {
  const openBtn = document.getElementById('note-share-open');
  if (!openBtn) return;
  openBtn.hidden = !visible;
  if (!visible) {
    openBtn.setAttribute('aria-expanded', 'false');
    updateShareBadge(0);
    if (isShareModalOpen()) closeShareModal({ restoreFocus: false });
  }
}

function isShareModalOpen() {
  const modal = document.getElementById('note-share-modal');
  return Boolean(modal && !modal.hidden && modal.classList.contains('is-open'));
}

function closeShareModal({ restoreFocus = true } = {}) {
  const modal = document.getElementById('note-share-modal');
  const openBtn = document.getElementById('note-share-open');
  if (!modal || modal.hidden) return;

  modal.classList.remove('is-open');
  modal.hidden = true;
  document.body.classList.remove('is-note-share-open');
  openBtn?.setAttribute('aria-expanded', 'false');
  window.removeEventListener('keydown', onShareModalKeyDown);
  modal.removeEventListener('click', onShareModalBackdrop);

  if (restoreFocus && openBtn && !openBtn.hidden) {
    openBtn.focus({ preventScroll: true });
  }
}

function onShareModalKeyDown(event) {
  const modal = document.getElementById('note-share-modal');
  const panel = modal?.querySelector('.note-share-modal__panel');
  if (!modal || modal.hidden || !panel) return;

  if (event.key === 'Escape') {
    const nestedConfirm = document.querySelector('.grimorio-confirm.is-open');
    if (nestedConfirm) return;
    event.preventDefault();
    closeShareModal();
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
}

function onShareModalBackdrop(event) {
  if (event.target?.id === 'note-share-modal') {
    closeShareModal();
  }
}

function openShareModal() {
  const modal = document.getElementById('note-share-modal');
  const panel = modal?.querySelector('.note-share-modal__panel');
  const openBtn = document.getElementById('note-share-open');
  const select = document.getElementById('note-share-select');
  const closeBtn = document.getElementById('note-share-close');
  if (!modal || !panel) return;
  if (!modal.hidden && modal.classList.contains('is-open')) return;

  window.removeEventListener('keydown', onShareModalKeyDown);
  modal.removeEventListener('click', onShareModalBackdrop);

  modal.hidden = false;
  document.body.classList.add('is-note-share-open');
  openBtn?.setAttribute('aria-expanded', 'true');
  window.addEventListener('keydown', onShareModalKeyDown);
  modal.addEventListener('click', onShareModalBackdrop);

  window.requestAnimationFrame(() => {
    modal.classList.add('is-open');
    const focusTarget = select && !select.disabled ? select : closeBtn;
    focusTarget?.focus({ preventScroll: true });
  });
}

function renderShareList(note, companions, onUnshare) {
  const list = document.getElementById('note-share-list');
  const select = document.getElementById('note-share-select');
  if (!list || !select) return;

  const shared = note.sharedWith || [];
  list.replaceChildren();
  updateShareBadge(shared.length);

  if (shared.length === 0) {
    list.appendChild(el('li', 'note-share__empty', 'Nada revelado a companheiros… ainda.'));
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

/**
 * @param {{
 *   token: string,
 *   noteId: number|string,
 *   preloaded?: {
 *     note: object,
 *     canEdit?: boolean,
 *     canClone?: boolean,
 *     canRefuse?: boolean,
 *     readOnly?: boolean,
 *   } | null,
 *   onDeleted?: () => void,
 *   onRefused?: () => void,
 *   onCloned?: (noteId: number) => void,
 *   isStale?: () => boolean,
 * }} options
 */
export async function loadGrimorioReading(options) {
  const {
    token,
    noteId,
    preloaded = null,
    onDeleted,
    onRefused,
    onCloned,
    isStale = () => false,
  } = options;

  const viewRoot = document.getElementById('note-view');
  const emptyEl = document.getElementById('grimorio-reading-empty');
  const titleEl = document.getElementById('note-view-title');
  const metaEl = document.getElementById('note-view-meta');
  const originEl = document.getElementById('note-view-origin');
  const tagsEl = document.getElementById('note-view-tags');
  const bodyEl = document.getElementById('note-view-body');
  const pinEl = document.getElementById('note-view-pin');
  const contextLabel = document.getElementById('note-view-context-label');
  const contextDot = document.getElementById('note-view-context-dot');
  const lessonLink = document.getElementById('note-view-lesson-link');
  const editLink = document.getElementById('note-edit-link');
  const deleteBtn = document.getElementById('note-delete');
  const cloneBtn = document.getElementById('note-clone');
  const refuseBtn = document.getElementById('note-refuse');
  const shareBtn = document.getElementById('note-share-btn');
  const shareSelect = document.getElementById('note-share-select');
  const eventsSection = document.getElementById('note-events');
  const eventsList = document.getElementById('note-events-list');

  let currentNote = null;
  let companions = [];
  let canEdit = false;
  let canClone = false;
  let canRefuse = false;

  async function loadCompanions() {
    try {
      const payload = await listFriends(token);
      companions = payload.accepted || [];
    } catch {
      companions = [];
    }
  }

  function refreshShareUi(note) {
    if (!canEdit || !note?.id) {
      setShareTriggerVisible(false);
      return;
    }
    setShareTriggerVisible(true);
    renderShareList(note, companions, async (userId) => {
      const confirmed = await openConfirmDialog({
        dialogId: 'note-veil-confirm',
        cancelId: 'note-veil-cancel',
        okId: 'note-veil-ok',
        fallbackMessage: 'O companheiro deixará de ver esta inscrição.',
      });
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

  function renderEvents(events) {
    if (!eventsSection || !eventsList) return;
    if (!canEdit || !events?.length) {
      eventsSection.hidden = true;
      return;
    }
    eventsSection.hidden = false;
    eventsList.replaceChildren();
    events.forEach((event) => {
      const li = el('li', 'note-events__item', eventLabel(event));
      if (!event.readAt) li.classList.add('is-unread');
      const time = el('span', 'note-events__time', formatDate(event.createdAt));
      li.appendChild(time);
      eventsList.appendChild(li);
    });
  }

  function renderNote(payload) {
    currentNote = payload.note;
    canEdit = Boolean(payload.canEdit) && !payload.readOnly;
    canClone = Boolean(payload.canClone) && !canEdit;
    canRefuse = Boolean(payload.canRefuse) && !canEdit;

    if (emptyEl) emptyEl.hidden = true;
    if (viewRoot) viewRoot.hidden = false;

    if (titleEl) {
      titleEl.textContent = currentNote.title || 'Sem título';
    }

    if (pinEl) {
      pinEl.hidden = !currentNote.pinned;
    }

    if (contextLabel) {
      if (currentNote.isActivityNote) {
        contextLabel.textContent = currentNote.lessonId
          ? `Atividade · ${lessonLabel(currentNote.lessonId)}`
          : 'Nota de atividade';
      } else if (!canEdit && currentNote.owner?.username) {
        contextLabel.textContent = `Revelada · @${currentNote.owner.username}`;
      } else if (currentNote.lessonId) {
        contextLabel.textContent = `Trilha · ${lessonLabel(currentNote.lessonId)}`;
      } else if (currentNote.pinned) {
        contextLabel.textContent = 'Fixada';
      } else {
        contextLabel.textContent = 'Sua inscrição';
      }
    }

    if (contextDot) {
      contextDot.className = 'note-canvas__dot';
      if (currentNote.isActivityNote) contextDot.classList.add('is-atividade');
      else if (!canEdit) contextDot.classList.add('is-revelada');
      else if (currentNote.pinned) contextDot.classList.add('is-fixada');
      else if (currentNote.lessonId) contextDot.classList.add('is-trilha');
      else contextDot.classList.add('is-propria');
    }

    const metaParts = [];
    if (currentNote.owner?.username && !canEdit) {
      metaParts.push(`de @${currentNote.owner.username}`);
    }
    if (currentNote.updatedAt) metaParts.push(formatDate(currentNote.updatedAt));
    if (currentNote.createdAt && currentNote.createdAt !== currentNote.updatedAt) {
      metaParts.push(`criada ${formatDate(currentNote.createdAt)}`);
    }
    if (metaEl) metaEl.textContent = metaParts.join(' · ');

    if (originEl) {
      const originUser = currentNote.clonedFrom?.owner?.username;
      if (originUser) {
        originEl.hidden = false;
        originEl.textContent = `Transcrita de @${originUser}`;
      } else {
        originEl.hidden = true;
        originEl.textContent = '';
      }
    }

    renderTagChips(tagsEl, currentNote.tags || [], { removable: false });

    if (bodyEl) {
      bodyEl.textContent = currentNote.body || '';
    }

    if (lessonLink) {
      if (currentNote.lessonId) {
        const label = currentNote.isActivityNote
          ? `Abrir atividade · ${lessonLabel(currentNote.lessonId)}`
          : `Abrir na Trilha · ${lessonLabel(currentNote.lessonId)}`;
        lessonLink.hidden = false;
        const qs = `?fromNote=${encodeURIComponent(String(currentNote.id))}`;
        const hash = currentNote.isActivityNote ? '#aula-atividade' : '';
        lessonLink.href = `${ROUTES.lesson(currentNote.lessonId)}${qs}${hash}`;
        lessonLink.title = label;
        lessonLink.setAttribute('aria-label', label);
      } else {
        lessonLink.hidden = true;
        lessonLink.removeAttribute('href');
      }
    }

    if (editLink) {
      editLink.hidden = !canEdit;
      editLink.href = canEdit ? ROUTES.grimorioEditar(currentNote.id) : '#';
    }
    if (deleteBtn) deleteBtn.hidden = !canEdit;
    if (cloneBtn) cloneBtn.hidden = !canClone;
    if (refuseBtn) refuseBtn.hidden = !canRefuse;

    refreshShareUi(canEdit ? currentNote : null);
    renderEvents(currentNote.events || []);
    setFeedback('');
  }

  function clearReading() {
    currentNote = null;
    setShareTriggerVisible(false);
    if (isShareModalOpen()) closeShareModal({ restoreFocus: false });
    if (viewRoot) viewRoot.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
    setFeedback('');
  }

  await loadCompanions();
  if (isStale()) return { clear: clearReading };

  try {
    const payload = preloaded || await getNote(token, noteId);
    if (isStale()) return { clear: clearReading };
    renderNote(payload);
    if (
      !preloaded
      && payload.canEdit
      && (payload.note?.events || []).some((event) => !event.readAt)
    ) {
      ackNoteEvents(token, noteId).catch(() => {});
    }
  } catch (error) {
    if (isStale()) return { clear: clearReading };
    clearReading();
    setFeedback(
      error instanceof ApiError ? error.message : 'Não foi possível abrir a inscrição.',
      'error'
    );
    throw error;
  }

  const onDelete = async () => {
    if (!currentNote?.id || !canEdit) return;
    const confirmed = await openConfirmDialog({
      dialogId: 'note-delete-confirm',
      cancelId: 'note-delete-cancel',
      okId: 'note-delete-ok',
      fallbackMessage: 'Esta página do Grimório será perdida. Confirma?',
    });
    if (!confirmed) {
      setFeedback('Inscrição mantida.', 'ok');
      return;
    }
    try {
      setFeedback('Rasgando inscrição…');
      await deleteNote(token, currentNote.id);
      clearReading();
      onDeleted?.();
    } catch (error) {
      setFeedback(
        error instanceof ApiError ? error.message : 'Falha ao rasgar.',
        'error'
      );
    }
  };

  const onClone = async () => {
    if (!currentNote?.id || !canClone) return;
    const confirmed = await openConfirmDialog({
      dialogId: 'note-clone-confirm',
      cancelId: 'note-clone-cancel',
      okId: 'note-clone-ok',
      fallbackMessage: 'Clonar esta inscrição para o seu Grimório?',
    });
    if (!confirmed) return;
    try {
      setFeedback('Clonando inscrição…');
      const result = await cloneNote(token, currentNote.id);
      presentGrimoireAwards(result.awarded);
      onCloned?.(result.note.id);
    } catch (error) {
      setFeedback(
        error instanceof ApiError ? error.message : 'Falha ao clonar.',
        'error'
      );
    }
  };

  const onRefuse = async () => {
    if (!currentNote?.id || !canRefuse) return;
    const confirmed = await openConfirmDialog({
      dialogId: 'note-refuse-confirm',
      cancelId: 'note-refuse-cancel',
      okId: 'note-refuse-ok',
      fallbackMessage: 'Recusar esta revelação?',
    });
    if (!confirmed) return;
    try {
      setFeedback('Recusando revelação…');
      await refuseNoteShare(token, currentNote.id);
      clearReading();
      onRefused?.();
    } catch (error) {
      setFeedback(
        error instanceof ApiError ? error.message : 'Falha ao recusar.',
        'error'
      );
    }
  };

  const onShare = async () => {
    if (!currentNote?.id || !canEdit) return;
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
      presentGrimoireAwards(result.awarded);
      setFeedback(
        result.awarded?.achievements?.length
          ? 'Inscrição revelada · relíquia despertou.'
          : 'Inscrição revelada ao companheiro.',
        'ok'
      );
    } catch (error) {
      setFeedback(
        error instanceof ApiError ? error.message : 'Falha ao revelar.',
        'error'
      );
    }
  };

  deleteBtn?.replaceWith(deleteBtn.cloneNode(true));
  cloneBtn?.replaceWith(cloneBtn.cloneNode(true));
  refuseBtn?.replaceWith(refuseBtn.cloneNode(true));
  shareBtn?.replaceWith(shareBtn.cloneNode(true));
  document.getElementById('note-share-open')?.replaceWith(
    document.getElementById('note-share-open').cloneNode(true)
  );
  document.getElementById('note-share-close')?.replaceWith(
    document.getElementById('note-share-close').cloneNode(true)
  );

  const deleteFresh = document.getElementById('note-delete');
  const cloneFresh = document.getElementById('note-clone');
  const refuseFresh = document.getElementById('note-refuse');
  const shareFresh = document.getElementById('note-share-btn');
  const shareOpenFresh = document.getElementById('note-share-open');
  const shareCloseFresh = document.getElementById('note-share-close');

  if (deleteFresh) deleteFresh.hidden = !canEdit;
  if (cloneFresh) cloneFresh.hidden = !canClone;
  if (refuseFresh) refuseFresh.hidden = !canRefuse;
  setShareTriggerVisible(canEdit);
  if (canEdit) updateShareBadge((currentNote?.sharedWith || []).length);

  deleteFresh?.addEventListener('click', onDelete);
  cloneFresh?.addEventListener('click', onClone);
  refuseFresh?.addEventListener('click', onRefuse);
  shareFresh?.addEventListener('click', onShare);
  shareOpenFresh?.addEventListener('click', () => {
    if (!canEdit || !currentNote?.id) return;
    openShareModal();
  });
  shareCloseFresh?.addEventListener('click', () => closeShareModal());

  return {
    clear: clearReading,
    getNote: () => currentNote,
  };
}

export function hideGrimorioReading() {
  const viewRoot = document.getElementById('note-view');
  const emptyEl = document.getElementById('grimorio-reading-empty');
  if (isShareModalOpen()) closeShareModal({ restoreFocus: false });
  setShareTriggerVisible(false);
  if (viewRoot) viewRoot.hidden = true;
  if (emptyEl) emptyEl.hidden = false;
  setFeedback('');
}
