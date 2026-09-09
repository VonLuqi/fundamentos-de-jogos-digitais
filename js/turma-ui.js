/**
 * Turma — lista de colegas no Salão Espiritual.
 * Consome `classmatesList` e actions de vínculo via js/api.js.
 */

'use strict';

import {
  ApiError,
  ROUTES,
  describeLevelProgress,
  loadAvatarImage,
  listClassmates,
  requestFriend,
  respondFriend,
  removeFriend,
} from './api.js';
import { confirmBreakBond } from './friends-ui.js';

const BOND_ORDER = {
  incoming: 0,
  outgoing: 1,
  accepted: 2,
  none: 3,
};

const PENDING_FIRST_ORDER = {
  incoming: 0,
  outgoing: 1,
  none: 2,
  accepted: 3,
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function setFeedback(node, message, tone = '') {
  if (!node) return;
  node.textContent = message || '';
  node.dataset.tone = tone || '';
}

function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function badgeLabel(bondStatus) {
  if (bondStatus === 'accepted') return 'Ao seu lado';
  if (bondStatus === 'outgoing') return 'Convite enviado';
  if (bondStatus === 'incoming') return 'Convite recebido';
  return '';
}

function mirrorHref(username) {
  return ROUTES.companheiro(username);
}

function buildTurmaRow(classmate, { onAction, showTurma = false }) {
  const username = classmate.username || '—';
  const fullName = classmate.fullName || username;
  const handle = `@${username}`;
  const bondStatus = classmate.bondStatus || 'none';
  const li = el('li', 'companions-list__item turma-list__item');
  li.dataset.userId = String(classmate.id || '');
  li.dataset.username = username;
  li.dataset.bondStatus = bondStatus;

  const avatarBtn = el('a', 'companions-list__avatar');
  avatarBtn.href = mirrorHref(username);
  avatarBtn.setAttribute(
    'aria-label',
    bondStatus === 'accepted'
      ? `Abrir Espelho completo de ${handle}`
      : `Abrir Espelho da Turma de ${handle}`
  );

  const img = el('img', 'companions-list__glyph');
  img.alt = '';
  img.width = 40;
  img.height = 40;
  loadAvatarImage(img, classmate.avatarIndex ?? 0);
  avatarBtn.appendChild(img);

  const meta = el('div', 'companions-list__meta');
  const handleEl = el('p', 'companions-list__handle', handle);
  const name = el('p', 'companions-list__name', fullName);
  const progress = describeLevelProgress(classmate.xp, {
    isAdmin: classmate.role === 'admin',
  });
  const rankParts = [
    showTurma && classmate.turma ? String(classmate.turma) : null,
    progress.rank || classmate.rank,
    (classmate.level != null || progress.levelLabel)
      ? `Nv. ${progress.shortLevelLabel || classmate.level}`
      : null,
  ].filter(Boolean);
  const rankLine = el('p', 'turma-list__rank', rankParts.join(' · ') || '—');
  meta.append(handleEl, name, rankLine);

  const badgeText = badgeLabel(bondStatus);
  if (badgeText) {
    const badge = el('span', `turma-badge turma-badge--${bondStatus}`, badgeText);
    meta.appendChild(badge);
  }

  const actions = el('div', 'companions-list__actions');

  const mirror = el(
    'a',
    'companions-list__link',
    bondStatus === 'accepted' ? 'Espelho completo' : 'Espelho'
  );
  mirror.href = mirrorHref(username);
  mirror.setAttribute('aria-label', mirror.textContent + ` de ${handle}`);
  actions.appendChild(mirror);

  if (bondStatus === 'none') {
    const invite = el('button', 'companions-list__action companions-list__action--accept', 'Oferecer vínculo');
    invite.type = 'button';
    invite.setAttribute('aria-label', `Oferecer vínculo a ${handle}`);
    invite.addEventListener('click', () => onAction?.('invite', classmate));
    actions.appendChild(invite);
  } else if (bondStatus === 'incoming') {
    const accept = el('button', 'companions-list__action companions-list__action--accept', 'Aceitar');
    accept.type = 'button';
    accept.addEventListener('click', () => onAction?.('accept', classmate));
    const decline = el('button', 'companions-list__action companions-list__action--danger', 'Recusar');
    decline.type = 'button';
    decline.addEventListener('click', () => onAction?.('decline', classmate));
    actions.append(accept, decline);
  } else if (bondStatus === 'outgoing') {
    const cancel = el('button', 'companions-list__action companions-list__action--ghost', 'Cancelar');
    cancel.type = 'button';
    cancel.addEventListener('click', () => onAction?.('cancel', classmate));
    actions.appendChild(cancel);
  } else if (bondStatus === 'accepted') {
    const remove = el('button', 'companions-list__action companions-list__action--danger', 'Romper vínculo');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Romper vínculo com ${handle}`);
    remove.addEventListener('click', () => onAction?.('remove', classmate));
    actions.appendChild(remove);
  }

  li.append(avatarBtn, meta, actions);
  return li;
}

function sortClassmates(list, mode) {
  const copy = [...list];
  copy.sort((a, b) => {
    const nameA = normalizeSearch(a.username || a.fullName);
    const nameB = normalizeSearch(b.username || b.fullName);
    if (mode === 'bonded') {
      const d = (BOND_ORDER[a.bondStatus] ?? 9) - (BOND_ORDER[b.bondStatus] ?? 9);
      if (d !== 0) return d;
    } else if (mode === 'pending') {
      const d = (PENDING_FIRST_ORDER[a.bondStatus] ?? 9) - (PENDING_FIRST_ORDER[b.bondStatus] ?? 9);
      if (d !== 0) return d;
    }
    return nameA.localeCompare(nameB, 'pt');
  });
  return copy;
}

/**
 * @param {{
 *   root: HTMLElement,
 *   getToken: () => string|null,
 *   onChange?: () => void | Promise<void>,
 *   feedbackEl?: HTMLElement|null,
 *   isAdmin?: boolean,
 * }} options
 */
export function initTurmaPanel({
  root,
  getToken,
  onChange,
  feedbackEl = null,
  isAdmin = false,
} = {}) {
  if (!root) {
    return { refresh: async () => {} };
  }

  const ADMIN_TURMA_KEY = 'salaoAdminTurma';
  const listEl = root.querySelector('#turma-list');
  const emptyEl = root.querySelector('#turma-empty');
  const statusEl = root.querySelector('#turma-status');
  const countEl = root.querySelector('#turma-count');
  const summaryEl = document.getElementById('salao-turma-summary');
  const searchInput = root.querySelector('#turma-search');
  const sortSelect = root.querySelector('#turma-sort');
  const skeletonEl = root.querySelector('#turma-skeleton');
  const adminFilterWrap = root.querySelector('#turma-admin-filter-wrap');
  const adminFilter = root.querySelector('#turma-admin-filter');

  let allClassmates = [];
  let turmaCode = null;
  let viewingAllTurmas = false;
  let busy = false;

  function token() {
    return typeof getToken === 'function' ? getToken() : null;
  }

  function readStoredAdminTurma() {
    try {
      const raw = sessionStorage.getItem(ADMIN_TURMA_KEY);
      if (raw == null) return '';
      return String(raw);
    } catch {
      return '';
    }
  }

  function storeAdminTurma(value) {
    try {
      sessionStorage.setItem(ADMIN_TURMA_KEY, String(value ?? ''));
    } catch {
      // ignore
    }
  }

  function selectedAdminTurma() {
    if (!isAdmin) return null;
    const fromSelect = adminFilter ? String(adminFilter.value || '').trim() : '';
    if (fromSelect) return fromSelect;
    const stored = String(readStoredAdminTurma() || '').trim();
    return stored || null;
  }

  function populateAdminFilter(turmas = []) {
    if (!isAdmin || !adminFilter || !adminFilterWrap) return;
    adminFilterWrap.hidden = false;
    const preferred = String(adminFilter.value || readStoredAdminTurma() || '').trim();
    adminFilter.replaceChildren();
    adminFilter.appendChild(new Option('Todas as turmas', ''));
    turmas.forEach((code) => {
      adminFilter.appendChild(new Option(code, code));
    });
    if (preferred && turmas.includes(preferred)) {
      adminFilter.value = preferred;
    } else {
      adminFilter.value = '';
    }
  }

  function setLoading(isLoading) {
    if (skeletonEl) skeletonEl.hidden = !isLoading;
    if (listEl) listEl.hidden = isLoading;
    if (isLoading && emptyEl) emptyEl.hidden = true;
  }

  function updateCounts(visibleCount) {
    const total = allClassmates.length;
    const alunosLabel = total === 1 ? '1 aluno' : `${total} alunos`;
    let label = alunosLabel;
    if (turmaCode) {
      label = `${turmaCode} · ${alunosLabel}`;
    } else if (isAdmin && viewingAllTurmas) {
      label = `Todas · ${alunosLabel}`;
    }

    if (countEl) countEl.textContent = label;
    if (summaryEl) summaryEl.textContent = label;
    if (listEl && visibleCount !== total && total > 0) {
      listEl.setAttribute(
        'aria-label',
        `Colegas da turma (${visibleCount} de ${total} visíveis)`
      );
    }
  }

  function render() {
    if (!listEl || !emptyEl) return;

    const query = normalizeSearch(searchInput?.value);
    const sortMode = sortSelect?.value || 'alpha';

    let filtered = allClassmates;
    if (query) {
      filtered = allClassmates.filter((row) => {
        const hay = normalizeSearch(`${row.username} ${row.fullName} ${row.turma || ''}`);
        return hay.includes(query);
      });
    }

    const sorted = sortClassmates(filtered, sortMode);
    listEl.replaceChildren();
    sorted.forEach((row) => {
      listEl.appendChild(buildTurmaRow(row, {
        onAction: handleRowAction,
        showTurma: viewingAllTurmas,
      }));
    });

    updateCounts(sorted.length);

    if (allClassmates.length === 0) {
      emptyEl.hidden = false;
      if (isAdmin && turmaCode) {
        emptyEl.textContent = 'Nenhum aluno nesta turma.';
      } else if (isAdmin) {
        emptyEl.textContent = 'Nenhum aluno registrado no Domínio.';
      } else {
        emptyEl.textContent = 'A turma ainda não despertou neste Salão.';
      }
    } else if (sorted.length === 0) {
      emptyEl.hidden = false;
      emptyEl.textContent = 'Nenhum colega corresponde à busca.';
    } else {
      emptyEl.hidden = true;
    }
  }

  async function notifyChange() {
    if (typeof onChange === 'function') {
      await onChange();
    }
  }

  async function refresh({ silent = false } = {}) {
    const activeToken = token();
    if (!activeToken) return;

    if (!silent) {
      setLoading(true);
      setFeedback(statusEl, 'Consultando a turma…');
    }

    try {
      const turmaOpt = isAdmin ? selectedAdminTurma() : null;
      const payload = await listClassmates(
        activeToken,
        isAdmin && turmaOpt ? { turma: turmaOpt } : {}
      );
      allClassmates = payload.classmates || [];
      turmaCode = payload.turma || null;
      viewingAllTurmas = Boolean(isAdmin && !turmaCode);
      if (isAdmin) {
        populateAdminFilter(payload.turmasDisponiveis || []);
        const after = String(adminFilter?.value || '');
        storeAdminTurma(after);
        if (turmaOpt && after !== turmaOpt) {
          setLoading(false);
          return refresh({ silent: true });
        }
      }
      setLoading(false);
      render();
      setFeedback(statusEl, '');
    } catch (error) {
      setLoading(false);
      const message = error instanceof ApiError
        ? error.message
        : 'Os laços estão inacessíveis no momento.';
      setFeedback(statusEl, message, 'error');
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = 'Os laços estão inacessíveis no momento.';
      }
      if (listEl) listEl.replaceChildren();
      allClassmates = [];
      updateCounts(0);
    }
  }

  async function handleRowAction(kind, classmate) {
    if (busy) return;
    const activeToken = token();
    if (!activeToken || !classmate) return;

    const handle = classmate.username ? `@${classmate.username}` : 'este colega';
    const fb = feedbackEl || statusEl;

    if (kind === 'remove') {
      const confirmed = await confirmBreakBond(handle);
      if (!confirmed) {
        setFeedback(fb, 'Vínculo mantido.', 'ok');
        return;
      }
    }

    busy = true;
    try {
      if (kind === 'invite') {
        await requestFriend(activeToken, classmate.username);
        setFeedback(fb, `Convite enviado para ${handle}.`, 'ok');
      } else if (kind === 'accept') {
        await respondFriend(activeToken, {
          decision: 'accept',
          friendshipId: classmate.friendshipId,
          friendUserId: classmate.id,
        });
        setFeedback(fb, `Vínculo aceito com ${handle}.`, 'ok');
      } else if (kind === 'decline') {
        await respondFriend(activeToken, {
          decision: 'decline',
          friendshipId: classmate.friendshipId,
          friendUserId: classmate.id,
        });
        setFeedback(fb, 'Convite recusado.', 'ok');
      } else if (kind === 'cancel' || kind === 'remove') {
        await removeFriend(activeToken, {
          friendshipId: classmate.friendshipId,
          friendUserId: classmate.id,
          username: classmate.username,
        });
        setFeedback(
          fb,
          kind === 'remove' ? `Vínculo com ${handle} rompido.` : 'Convite cancelado.',
          'ok'
        );
      }

      await refresh({ silent: true });
      await notifyChange();
    } catch (error) {
      let message = error instanceof ApiError
        ? error.message
        : 'Não foi possível atualizar o vínculo.';
      if (/limite/i.test(message) && /25|companheiro|companhia/i.test(message)) {
        message = 'Sua companhia já está completa (25). Rompa um vínculo para oferecer outro.';
      } else if (/já existe|pendente|em viagem/i.test(message)) {
        message = 'Este convite já está em viagem.';
      } else if (/já.*vínculo|já.*companheiro|selado|already/i.test(message)) {
        message = 'Este vínculo já foi selado.';
      } else if (/nenhuma alma|não encontrado|aluno não/i.test(message)) {
        message = 'Nenhuma alma com esse username.';
      } else if (/si mesmo/i.test(message)) {
        message = 'Não se oferece vínculo a si mesmo.';
      }
      setFeedback(fb, message, 'error');
    } finally {
      busy = false;
    }
  }

  searchInput?.addEventListener('input', () => render());
  sortSelect?.addEventListener('change', () => render());

  if (isAdmin && adminFilterWrap && adminFilter) {
    adminFilterWrap.hidden = false;
    adminFilter.addEventListener('change', () => {
      storeAdminTurma(adminFilter.value || '');
      refresh();
    });
  }

  refresh();

  return { refresh };
}
