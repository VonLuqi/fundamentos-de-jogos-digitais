/**
 * Companheiros de Jornada — UI do Salão Espiritual (`pages/salao-espiritual.html`).
 * Consome as actions de amigos em /api/progress via js/api.js.
 */

'use strict';

import {
  ApiError,
  ROUTES,
  loadAvatarImage,
  listFriends,
  searchFriends,
  requestFriend,
  respondFriend,
  removeFriend,
} from './api.js';

const SEARCH_DEBOUNCE_MS = 280;
const MIN_QUERY_LEN = 1;
const COMPANIONS_FLASH_KEY = 'companionsFlash';
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

function setFeedback(node, message, tone = '') {
  if (!node) return;
  node.textContent = message || '';
  node.dataset.tone = tone || '';
}

function friendlyFriendError(message) {
  const text = String(message || '');
  if (/limite|completa \(25\)|companheiros atingido/i.test(text)) {
    return 'Sua companhia já está completa (25). Rompa um vínculo para oferecer outro.';
  }
  if (/já existe|pendente|em viagem/i.test(text)) {
    return 'Este convite já está em viagem.';
  }
  if (/já.*companheiro|já.*vínculo|selado|already/i.test(text)) {
    return 'Este vínculo já foi selado.';
  }
  if (/não encontrado|nenhuma alma|username/i.test(text) && /alma|aluno|encontrad/i.test(text)) {
    return 'Nenhuma alma com esse username.';
  }
  if (/si mesmo|a si/i.test(text)) {
    return 'Não se oferece vínculo a si mesmo.';
  }
  return text || 'Os laços estão inacessíveis no momento.';
}


function companionMirrorHref(username) {
  return ROUTES.companheiro(username);
}

export function confirmBreakBond(label) {
  const dialog = document.getElementById('bond-confirm');
  const desc = document.getElementById('bond-confirm-desc');
  const cancelBtn = document.getElementById('bond-confirm-cancel');
  const okBtn = document.getElementById('bond-confirm-ok');
  const panel = dialog?.querySelector('.bond-confirm__panel');

  if (!dialog || !desc || !cancelBtn || !okBtn || !panel) {
    return Promise.resolve(window.confirm(`Romper o vínculo com ${label}?`));
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
      document.body.classList.remove('is-bond-confirm-open');
      window.removeEventListener('keydown', onKeyDown);
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      dialog.removeEventListener('click', onBackdrop);
      if (previousFocus?.focus) {
        previousFocus.focus({ preventScroll: true });
      }
    };

    desc.textContent = `Deseja romper o vínculo com ${label}?`;
    dialog.hidden = false;
    dialog.classList.add('is-open');
    document.body.classList.add('is-bond-confirm-open');
    window.addEventListener('keydown', onKeyDown);
    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    dialog.addEventListener('click', onBackdrop);
    window.requestAnimationFrame(() => cancelBtn.focus());
  });
}

function buildCompanionRow(entry, { mode, onAction }) {
  const user = entry.user || {};
  const username = user.username || '—';
  const fullName = user.fullName || username;
  const handle = `@${username}`;
  const li = el('li', 'companions-list__item');
  li.dataset.friendshipId = String(entry.friendshipId || '');
  li.dataset.username = username;

  const avatarBtn = el('a', 'companions-list__avatar');
  if (mode === 'accepted' && user.username) {
    avatarBtn.href = companionMirrorHref(user.username);
    avatarBtn.setAttribute('aria-label', `Abrir Espelho de ${handle}`);
  } else {
    avatarBtn.href = '#';
    avatarBtn.setAttribute('aria-disabled', 'true');
    avatarBtn.setAttribute('tabindex', '-1');
    avatarBtn.addEventListener('click', (event) => event.preventDefault());
  }

  const img = el('img', 'companions-list__glyph');
  img.alt = '';
  img.width = 40;
  img.height = 40;
  loadAvatarImage(img, user.avatarIndex ?? 0);
  avatarBtn.appendChild(img);

  const meta = el('div', 'companions-list__meta');
  const handleEl = el('p', 'companions-list__handle', handle);
  const name = el('p', 'companions-list__name', fullName);
  meta.append(handleEl, name);

  const actions = el('div', 'companions-list__actions');

  if (mode === 'accepted') {
    const open = el('a', 'companions-list__link', 'Espelho completo');
    open.href = companionMirrorHref(user.username);
    open.setAttribute('aria-label', `Ver Espelho completo de ${handle}`);
    const remove = el('button', 'companions-list__action companions-list__action--danger', 'Romper');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Romper vínculo com ${handle}`);
    remove.addEventListener('click', () => onAction?.('remove', entry));
    actions.append(open, remove);
  } else if (mode === 'incoming') {
    const accept = el('button', 'companions-list__action companions-list__action--accept', 'Aceitar');
    accept.type = 'button';
    accept.setAttribute('aria-label', `Aceitar vínculo de ${handle}`);
    accept.addEventListener('click', () => onAction?.('accept', entry));
    const decline = el('button', 'companions-list__action companions-list__action--danger', 'Recusar');
    decline.type = 'button';
    decline.setAttribute('aria-label', `Recusar vínculo de ${handle}`);
    decline.addEventListener('click', () => onAction?.('decline', entry));
    actions.append(accept, decline);
  } else if (mode === 'outgoing') {
    const cancel = el('button', 'companions-list__action companions-list__action--ghost', 'Cancelar');
    cancel.type = 'button';
    cancel.setAttribute('aria-label', `Cancelar convite enviado para ${handle}`);
    cancel.addEventListener('click', () => onAction?.('cancel', entry));
    actions.append(cancel);
  }

  li.append(avatarBtn, meta, actions);
  return li;
}

/**
 * @param {{
 *   root: HTMLElement,
 *   getToken: () => string|null,
 *   onChange?: () => void | Promise<void>,
 * }} options
 */
export function initCompanionsPanel({ root, getToken, onChange } = {}) {
  if (!root) {
    return { refresh: async () => {} };
  }

  const countEl = root.querySelector('#companions-count')
    || document.getElementById('companions-count');
  const feedbackEl = root.querySelector('#companions-feedback');
  const statusEl = root.querySelector('#companions-status');
  const form = root.querySelector('#companions-invite-form');
  const searchInput = root.querySelector('#companions-search');
  const suggestionsEl = root.querySelector('#companions-suggestions');
  const incomingWrap = root.querySelector('#companions-incoming-wrap');
  const incomingList = root.querySelector('#companions-incoming');
  const incomingBadge = root.querySelector('#companions-incoming-badge');
  const incomingEmpty = root.querySelector('#companions-incoming-empty');
  const outgoingWrap = root.querySelector('#companions-outgoing-wrap');
  const outgoingList = root.querySelector('#companions-outgoing');
  const outgoingEmpty = root.querySelector('#companions-outgoing-empty');
  const acceptedList = root.querySelector('#companions-accepted');
  const emptyEl = root.querySelector('#companions-empty');
  const inviteBtn = root.querySelector('#companions-invite-btn');

  let searchTimer = null;
  let lastQuery = '';
  let busy = false;
  let activeSuggestionIndex = -1;

  function token() {
    return typeof getToken === 'function' ? getToken() : null;
  }

  function hideSuggestions() {
    if (!suggestionsEl || !searchInput) return;
    suggestionsEl.hidden = true;
    suggestionsEl.replaceChildren();
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.removeAttribute('aria-activedescendant');
    activeSuggestionIndex = -1;
  }

  function highlightSuggestion(index) {
    const options = Array.from(suggestionsEl?.querySelectorAll('[role="option"]') || []);
    options.forEach((option, i) => {
      const active = i === index;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-selected', String(active));
    });
    activeSuggestionIndex = index;
  }

  function showSuggestions(results) {
    if (!suggestionsEl || !searchInput) return;
    suggestionsEl.replaceChildren();
    activeSuggestionIndex = -1;

    const actionable = (results || []).filter((row) => row.relation === 'none');
    if (actionable.length === 0) {
      hideSuggestions();
      return;
    }

    actionable.forEach((row, index) => {
      const option = el('li', 'companions-suggestions__item');
      option.setAttribute('role', 'option');
      option.id = `companions-suggestion-${index}`;
      option.tabIndex = -1;
      option.setAttribute('aria-selected', 'false');

      const handle = el('span', 'companions-suggestions__handle', `@${row.username}`);
      const label = el('span', 'companions-suggestions__name', row.fullName || row.username);
      option.append(handle, label);

      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        searchInput.value = row.username;
        hideSuggestions();
        searchInput.focus();
      });

      suggestionsEl.appendChild(option);
    });

    suggestionsEl.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
  }

  async function runSearch(query) {
    const q = String(query || '').trim();
    lastQuery = q;
    if (q.length < MIN_QUERY_LEN) {
      hideSuggestions();
      return;
    }

    const activeToken = token();
    if (!activeToken) return;

    try {
      const { results } = await searchFriends(activeToken, q);
      if (lastQuery !== q) return;
      showSuggestions(results);
    } catch {
      if (lastQuery !== q) return;
      hideSuggestions();
    }
  }

  function renderLists(payload) {
    const accepted = payload?.accepted || [];
    const incoming = payload?.incoming || [];
    const outgoing = payload?.outgoing || [];
    const limit = payload?.limit ?? 25;
    const count = payload?.count ?? accepted.length;

    if (countEl) {
      countEl.textContent = `${count} / ${limit}`;
      countEl.setAttribute('aria-label', `${count} de ${limit} companheiros`);
    }

    const atLimit = count >= limit;
    if (inviteBtn) {
      inviteBtn.disabled = atLimit;
      inviteBtn.title = atLimit
        ? 'Sua companhia já está completa (25). Rompa um vínculo para oferecer outro.'
        : '';
    }
    if (searchInput) searchInput.disabled = atLimit;
    if (atLimit && feedbackEl && !feedbackEl.textContent) {
      setFeedback(
        feedbackEl,
        'Sua companhia já está completa (25). Rompa um vínculo para oferecer outro.',
        'error'
      );
    } else if (!atLimit && feedbackEl?.dataset.tone === 'error'
      && /companhia já está completa/i.test(feedbackEl.textContent || '')) {
      setFeedback(feedbackEl, '');
    }

    if (incomingList && incomingWrap && incomingBadge) {
      incomingList.replaceChildren();
      incoming.forEach((entry) => {
        incomingList.appendChild(buildCompanionRow(entry, { mode: 'incoming', onAction: handleRowAction }));
      });
      incomingBadge.textContent = String(incoming.length);
      incomingWrap.hidden = false;
      if (incomingEmpty) {
        incomingEmpty.hidden = incoming.length > 0;
        incomingEmpty.textContent = 'Nenhum convite aguarda sua resposta.';
      }
    }

    if (outgoingList && outgoingWrap) {
      outgoingList.replaceChildren();
      outgoing.forEach((entry) => {
        outgoingList.appendChild(buildCompanionRow(entry, { mode: 'outgoing', onAction: handleRowAction }));
      });
      outgoingWrap.hidden = false;
      if (outgoingEmpty) {
        outgoingEmpty.hidden = outgoing.length > 0;
        outgoingEmpty.textContent = 'Nenhum convite em viagem.';
      }
    }

    if (acceptedList && emptyEl) {
      acceptedList.replaceChildren();
      accepted.forEach((entry) => {
        acceptedList.appendChild(buildCompanionRow(entry, { mode: 'accepted', onAction: handleRowAction }));
      });
      emptyEl.hidden = accepted.length > 0;
      emptyEl.textContent = 'Nenhum companheiro ao seu lado… ainda.';
    }
  }

  async function refresh({ silent = false } = {}) {
    const activeToken = token();
    if (!activeToken) return;

    if (!silent && statusEl) {
      setFeedback(statusEl, 'Consultando os laços do Domínio…');
    }

    try {
      const payload = await listFriends(activeToken);
      renderLists(payload);
      if (statusEl) setFeedback(statusEl, '');
    } catch (error) {
      const message = friendlyFriendError(
        error instanceof ApiError ? error.message : 'Os laços estão inacessíveis no momento.'
      );
      if (statusEl) setFeedback(statusEl, message, 'error');
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = 'Os laços estão inacessíveis no momento.';
      }
      if (incomingEmpty) {
        incomingEmpty.hidden = false;
        incomingEmpty.textContent = 'Os laços estão inacessíveis no momento.';
      }
      if (outgoingEmpty) {
        outgoingEmpty.hidden = false;
        outgoingEmpty.textContent = 'Os laços estão inacessíveis no momento.';
      }
    }
  }

  async function handleRowAction(kind, entry) {
    if (busy) return;
    const activeToken = token();
    if (!activeToken || !entry?.friendshipId) return;

    if (kind === 'remove') {
      const label = entry.user?.username ? `@${entry.user.username}` : 'este companheiro';
      const confirmed = await confirmBreakBond(label);
      if (!confirmed) {
        setFeedback(feedbackEl, 'Vínculo mantido.', 'ok');
        return;
      }
    }

    busy = true;
    try {
      if (kind === 'accept') {
        await respondFriend(activeToken, {
          decision: 'accept',
          friendshipId: entry.friendshipId,
        });
        setFeedback(feedbackEl, `Vínculo aceito com @${entry.user?.username || 'companheiro'}.`, 'ok');
      } else if (kind === 'decline') {
        await respondFriend(activeToken, {
          decision: 'decline',
          friendshipId: entry.friendshipId,
        });
        setFeedback(feedbackEl, 'Convite recusado.', 'ok');
      } else if (kind === 'cancel') {
        await removeFriend(activeToken, { friendshipId: entry.friendshipId });
        setFeedback(feedbackEl, 'Convite cancelado.', 'ok');
      } else if (kind === 'remove') {
        const label = entry.user?.username ? `@${entry.user.username}` : 'este companheiro';
        await removeFriend(activeToken, { friendshipId: entry.friendshipId });
        setFeedback(feedbackEl, `Vínculo com ${label} rompido.`, 'ok');
      }
      await refresh({ silent: true });
      if (typeof onChange === 'function') await onChange();
    } catch (error) {
      const message = friendlyFriendError(
        error instanceof ApiError ? error.message : 'Não foi possível atualizar o vínculo.'
      );
      setFeedback(feedbackEl, message, 'error');
    } finally {
      busy = false;
    }
  }

  searchInput?.addEventListener('input', () => {
    const value = searchInput.value;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      runSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  });

  searchInput?.addEventListener('keydown', (event) => {
    const options = Array.from(suggestionsEl?.querySelectorAll('[role="option"]') || []);
    const open = suggestionsEl && !suggestionsEl.hidden && options.length > 0;

    if (event.key === 'Escape') {
      hideSuggestions();
      return;
    }

    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = activeSuggestionIndex < options.length - 1 ? activeSuggestionIndex + 1 : 0;
      highlightSuggestion(next);
      searchInput.setAttribute('aria-activedescendant', options[next].id);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = activeSuggestionIndex > 0 ? activeSuggestionIndex - 1 : options.length - 1;
      highlightSuggestion(next);
      searchInput.setAttribute('aria-activedescendant', options[next].id);
      return;
    }

    if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
      event.preventDefault();
      const selected = options[activeSuggestionIndex];
      const handle = selected?.querySelector('.companions-suggestions__handle')?.textContent || '';
      const username = handle.replace(/^@/, '');
      if (username) {
        searchInput.value = username;
        hideSuggestions();
      }
    }
  });

  searchInput?.addEventListener('blur', () => {
    window.setTimeout(hideSuggestions, 120);
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const username = String(searchInput?.value || '').trim();
    if (!username) {
      setFeedback(feedbackEl, 'Informe o username do aluno.', 'error');
      searchInput?.focus();
      return;
    }

    const activeToken = token();
    if (!activeToken) return;

    busy = true;
    if (inviteBtn) inviteBtn.disabled = true;

    try {
      await requestFriend(activeToken, username);
      setFeedback(feedbackEl, `Convite enviado para @${username}.`, 'ok');
      if (searchInput) searchInput.value = '';
      hideSuggestions();
      await refresh({ silent: true });
      if (typeof onChange === 'function') await onChange();
    } catch (error) {
      const message = friendlyFriendError(
        error instanceof ApiError ? error.message : 'Não foi possível enviar o convite.'
      );
      setFeedback(feedbackEl, message, 'error');
      const countNow = Number.parseInt(String(countEl?.textContent || '0').split('/')[0], 10);
      if (inviteBtn) inviteBtn.disabled = Number.isFinite(countNow) && countNow >= 25;
      if (searchInput) searchInput.disabled = Number.isFinite(countNow) && countNow >= 25;
    } finally {
      busy = false;
    }
  });

  refresh();
  consumeCompanionsFlash(feedbackEl);

  return { refresh };
}

function consumeCompanionsFlash(feedbackEl) {
  try {
    const message = sessionStorage.getItem(COMPANIONS_FLASH_KEY);
    if (!message) return;
    sessionStorage.removeItem(COMPANIONS_FLASH_KEY);
    setFeedback(feedbackEl, message, 'error');
  } catch {
    // ignore
  }
}
