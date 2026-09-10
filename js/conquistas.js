/**
 * Álbum de Relíquias — página própria de conquistas (`pages/conquistas.html`).
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  ROUTES,
  fillTrailheadField,
  logout,
  normalizeAchievementRarity,
  requireSession,
} from './api.js';
import {
  fillAchievementArtHost,
  fillAchievementDescription,
  fillLockedAchievementDescription,
  getAchievementById,
  getAchievementCollectionStats,
  getAlbumSlotState,
  rarityLabelForAchievement,
  renderAchievementsList,
  SOBERANO_ACHIEVEMENT_ID,
  stopVeiledDescScramble,
} from './achievements-ui.js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let currentUser = null;
let lastFocusedSlot = null;

function showApiWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function updateAlbumCounter() {
  const el = document.getElementById('album-counter');
  if (!el || !currentUser) return;
  const { unlocked, total } = getAchievementCollectionStats(currentUser);
  el.textContent = `${unlocked} / ${total} relíquias descobertas`;
}

function setShellInert(inert) {
  const shell = document.querySelector('[data-shell]');
  if (!shell) return;
  if (inert) shell.setAttribute('aria-hidden', 'true');
  else shell.removeAttribute('aria-hidden');
}

async function openRelicModal(achievement, state) {
  const modal = document.getElementById('relic-modal');
  const panel = modal?.querySelector('.relic-modal__panel');
  const art = document.getElementById('relic-modal-art');
  const rarityEl = document.getElementById('relic-modal-rarity');
  const titleEl = document.getElementById('relic-modal-title');
  const descEl = document.getElementById('relic-modal-desc');
  const metaEl = document.getElementById('relic-modal-meta');
  const closeBtn = document.getElementById('relic-modal-close');
  if (!modal || !panel || !art || !rarityEl || !titleEl || !descEl || !metaEl) return;

  stopVeiledDescScramble(descEl);

  const rarity = normalizeAchievementRarity(achievement.rarity, achievement.difficulty);
  panel.dataset.rarity = state === 'mystery' ? 'unknown' : rarity;
  panel.dataset.state = state;
  art.classList.remove('is-silhouette', 'is-bw', 'has-art', 'has-emoji');

  if (state === 'mystery') {
    const isSoberano = String(achievement.id) === SOBERANO_ACHIEVEMENT_ID;
    await fillAchievementArtHost(art, achievement, { grayscale: true });
    panel.dataset.rarity = isSoberano ? rarity : 'unknown';
    rarityEl.textContent = isSoberano ? rarityLabelForAchievement(achievement) : 'Desconhecida';
    titleEl.textContent = isSoberano ? '???' : 'Relíquia Misteriosa';
    fillLockedAchievementDescription(
      descEl,
      achievement,
      'Um segredo ainda não revelado. Explore as aulas e as oferendas para descobri-lo.',
    );
    metaEl.textContent = isSoberano ? 'Coroa velada do Domínio' : 'Slot oculto do álbum';
  } else if (state === 'locked') {
    await fillAchievementArtHost(art, achievement, { grayscale: true });
    rarityEl.textContent = rarityLabelForAchievement(achievement);
    fillTrailheadField(titleEl, achievement.name, achievement.trailhead?.nameIndexes);
    fillLockedAchievementDescription(
      descEl,
      achievement,
      'Esta relíquia ainda não foi conquistada. O caminho continua no Salão e na Trilha.',
    );
    metaEl.textContent = 'Figurinha bloqueada';
  } else {
    await fillAchievementArtHost(art, achievement, { grayscale: false });
    rarityEl.textContent = rarityLabelForAchievement(achievement);
    fillTrailheadField(titleEl, achievement.name, achievement.trailhead?.nameIndexes);
    fillAchievementDescription(descEl, achievement);
    metaEl.textContent = currentUser?.role === 'admin'
      ? 'Visão do Mestre — catálogo completo'
      : 'Relíquia descoberta';
  }

  modal.hidden = false;
  modal.classList.add('is-open');
  document.body.classList.add('is-relic-modal-open');
  setShellInert(true);
  closeBtn?.focus();
}

function closeRelicModal({ restoreHash = true } = {}) {
  const modal = document.getElementById('relic-modal');
  if (!modal || modal.hidden) return;
  stopVeiledDescScramble(document.getElementById('relic-modal-desc'));
  modal.classList.remove('is-open');
  modal.hidden = true;
  document.body.classList.remove('is-relic-modal-open');
  setShellInert(false);

  if (restoreHash && window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  if (lastFocusedSlot?.isConnected) {
    const button = lastFocusedSlot.querySelector('.achievement-slot__face');
    button?.focus({ preventScroll: true });
  }
}

function focusAlbumSlot(achievementId, { openModal = true } = {}) {
  const slot = document.getElementById(`relic-${achievementId}`);
  if (!slot) return false;

  document.querySelectorAll('.achievement-slot.is-focused').forEach((el) => {
    el.classList.remove('is-focused');
  });
  slot.classList.add('is-focused');
  slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
  lastFocusedSlot = slot;

  const achievement = getAchievementById(achievementId);
  if (!achievement || !currentUser) return true;

  const state = getAlbumSlotState(currentUser, achievement);
  if (openModal) openRelicModal(achievement, state);
  return true;
}

function handleDeepLink() {
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (!raw) return;
  const achievementId = raw.startsWith('relic-') ? raw.slice('relic-'.length) : raw;
  if (!getAchievementById(achievementId)) return;
  window.requestAnimationFrame(() => {
    focusAlbumSlot(achievementId, { openModal: true });
  });
}

function renderAlbum() {
  const grid = document.getElementById('album-grid');
  if (!grid || !currentUser) return;

  renderAchievementsList(grid, currentUser, {
    mode: 'album',
    onSlotClick: (achievement, state, slotEl) => {
      lastFocusedSlot = slotEl;
      window.history.replaceState(null, '', `#${achievement.id}`);
      openRelicModal(achievement, state);
      slotEl.classList.add('is-focused');
      document.querySelectorAll('.achievement-slot.is-focused').forEach((el) => {
        if (el !== slotEl) el.classList.remove('is-focused');
      });
    },
  });

  updateAlbumCounter();
}

function initRelicModal() {
  const modal = document.getElementById('relic-modal');
  const panel = modal?.querySelector('.relic-modal__panel');

  document.getElementById('relic-modal-close')?.addEventListener('click', () => closeRelicModal());
  modal?.addEventListener('click', (event) => {
    if (event.target.id === 'relic-modal') closeRelicModal();
  });

  window.addEventListener('keydown', (event) => {
    if (!modal || modal.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeRelicModal();
      return;
    }

    if (event.key !== 'Tab' || !panel) return;
    const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
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
  });

  window.addEventListener('hashchange', () => {
    if (!window.location.hash) {
      closeRelicModal({ restoreHash: false });
      return;
    }
    handleDeepLink();
  });
}

async function handleLogout() {
  await logout();
  window.location.href = ROUTES.auth();
}

async function init() {
  initRelicModal();

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

  initAppShell({
    route: 'conquistas',
    role: currentUser.role === 'admin' ? 'admin' : 'student',
    onLogout: handleLogout,
  });

  renderAlbum();
  handleDeepLink();
}

document.addEventListener('DOMContentLoaded', init);
