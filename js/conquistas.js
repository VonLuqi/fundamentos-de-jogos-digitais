/**
 * Álbum de Relíquias — página própria de conquistas (`pages/conquistas.html`).
 */

'use strict';

import { initAppShell } from './app-shell.js?v=20261021f';
import {
  ApiError,
  ROUTES,
  fillTrailheadField,
  logout,
  normalizeAchievementRarity,
  requireSession,
  getSession,
} from './api.js?v=20261021f';
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
} from './achievements-ui.js?v=20261021f';

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
let activeInspectedAchievement = null;
let activeInspectedState = 'locked';
let currentAlbumFilter = 'all';
let currentRarityFilter = 'all';

const STATE_FILTER_LABELS = Object.freeze({
  all: 'Todas',
  unlocked: 'Descobertas',
  locked: 'Bloqueadas',
  secret: 'Segredos',
});

const RARITY_FILTER_LABELS = Object.freeze({
  all: 'Todas as Raridades',
  stone: 'Pedra',
  copper: 'Cobre',
  silver: 'Prata',
  gold: 'Ouro',
  rainbow: 'Arco-Íris',
  unique: 'Única',
});

const RARITY_STARS = Object.freeze({
  unknown: '✦ ✦ ✦',
  stone: '★ ☆ ☆',
  copper: '★ ★ ☆',
  silver: '★ ★ ★',
  gold: '★ ★ ★ ★',
  rainbow: '★ ★ ★ ★ ★',
  unique: '♛ ★ ★ ★ ★ ★',
});

function starsForRarity(rarity, state) {
  if (state === 'mystery' && rarity === 'unknown') return RARITY_STARS.unknown;
  return RARITY_STARS[rarity] || RARITY_STARS.stone;
}

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

async function populateRelicDetailHost({
  achievement,
  state,
  containerEl,
  artEl,
  rarityEl,
  starsEl,
  eyebrowEl,
  titleEl,
  descEl,
  metaEl,
}) {
  if (!achievement || !containerEl || !artEl || !rarityEl || !titleEl || !descEl || !metaEl) return;

  stopVeiledDescScramble(descEl);

  const rarity = normalizeAchievementRarity(achievement.rarity, achievement.difficulty);
  const isSoberano = String(achievement.id) === SOBERANO_ACHIEVEMENT_ID;
  const effectiveRarity = state === 'mystery' && !isSoberano ? 'unknown' : rarity;

  containerEl.dataset.rarity = effectiveRarity;
  containerEl.dataset.state = state;
  artEl.classList.remove('is-silhouette', 'is-bw', 'has-art', 'has-emoji');

  if (starsEl) {
    starsEl.textContent = starsForRarity(effectiveRarity, state);
  }

  if (state === 'mystery') {
    await fillAchievementArtHost(artEl, achievement, { grayscale: true });
    rarityEl.textContent = isSoberano ? rarityLabelForAchievement(achievement) : 'Segredo Oculto';
    if (eyebrowEl) {
      eyebrowEl.textContent = isSoberano ? 'Relíquia Soberana · Velada' : 'Cofre Selado · Segredo';
    }
    titleEl.textContent = isSoberano ? '???' : 'Relíquia Misteriosa';
    fillLockedAchievementDescription(
      descEl,
      achievement,
      'Um segredo ainda não revelado. Explore as aulas e as oferendas para descobri-lo.',
    );
    metaEl.textContent = isSoberano ? 'Coroa velada do Domínio' : 'Slot oculto do álbum';
  } else if (state === 'locked') {
    await fillAchievementArtHost(artEl, achievement, { grayscale: true });
    rarityEl.textContent = rarityLabelForAchievement(achievement);
    if (eyebrowEl) {
      eyebrowEl.textContent = 'Nicho Bloqueado';
    }
    fillTrailheadField(titleEl, achievement.name, achievement.trailhead?.nameIndexes);
    fillLockedAchievementDescription(
      descEl,
      achievement,
      'Esta relíquia ainda não foi conquistada. O caminho continua no Salão e na Trilha.',
    );
    metaEl.textContent = 'Figurinha bloqueada';
  } else {
    await fillAchievementArtHost(artEl, achievement, { grayscale: false });
    rarityEl.textContent = rarityLabelForAchievement(achievement);
    if (eyebrowEl) {
      eyebrowEl.textContent = achievement.hidden ? 'Segredo Descoberto' : 'Relíquia em Exibição';
    }
    fillTrailheadField(titleEl, achievement.name, achievement.trailhead?.nameIndexes);
    fillAchievementDescription(descEl, achievement);
    metaEl.textContent = currentUser?.role === 'admin'
      ? 'Visão do Mestre — catálogo completo'
      : 'Relíquia descoberta';
  }
}

async function updateRelicInspector(achievement, state) {
  const inspector = document.getElementById('relic-inspector');
  if (!inspector || !achievement) return;

  const panel = inspector.querySelector('.relic-inspector__panel') || inspector;
  activeInspectedAchievement = achievement;
  activeInspectedState = state;

  await populateRelicDetailHost({
    achievement,
    state,
    containerEl: panel,
    artEl: document.getElementById('relic-inspector-art'),
    rarityEl: document.getElementById('relic-inspector-rarity'),
    starsEl: document.getElementById('relic-inspector-stars'),
    eyebrowEl: document.getElementById('relic-inspector-eyebrow'),
    titleEl: document.getElementById('relic-inspector-title'),
    descEl: document.getElementById('relic-inspector-desc'),
    metaEl: document.getElementById('relic-inspector-meta'),
  });

  inspector.dataset.rarity = panel.dataset.rarity || 'stone';
  inspector.dataset.state = panel.dataset.state || state;
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

  await populateRelicDetailHost({
    achievement,
    state,
    containerEl: panel,
    artEl: art,
    rarityEl,
    titleEl,
    descEl,
    metaEl,
  });

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

function focusAlbumSlot(achievementId, { openModal = false, scroll = true } = {}) {
  const slot = document.getElementById(`relic-${achievementId}`);
  if (!slot) return false;

  document.querySelectorAll('.achievement-slot.is-focused').forEach((el) => {
    el.classList.remove('is-focused');
  });
  slot.classList.add('is-focused');
  if (scroll) {
    slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  lastFocusedSlot = slot;

  const achievement = getAchievementById(achievementId);
  if (!achievement || !currentUser) return true;

  const state = getAlbumSlotState(currentUser, achievement);
  void updateRelicInspector(achievement, state);
  if (openModal) openRelicModal(achievement, state);
  return true;
}

function handleDeepLink() {
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (!raw) return false;
  const achievementId = raw.startsWith('relic-') ? raw.slice('relic-'.length) : raw;
  if (!getAchievementById(achievementId)) return false;
  window.requestAnimationFrame(() => {
    focusAlbumSlot(achievementId, { openModal: false, scroll: true });
  });
  return true;
}

function slotMatchesStateFilter(slot, stateFilter) {
  const state = slot.dataset.state || 'locked';
  const isSecret = slot.dataset.secret === 'true';
  if (stateFilter === 'unlocked') return state === 'unlocked';
  if (stateFilter === 'locked') return state !== 'unlocked';
  if (stateFilter === 'secret') return isSecret;
  return true;
}

function slotMatchesRarityFilter(slot, rarityFilter) {
  if (!rarityFilter || rarityFilter === 'all') return true;
  const rarity = slot.dataset.rarity || 'stone';
  return rarity === rarityFilter;
}

function updateCabinetFilterButtonLabels(slots) {
  document.querySelectorAll('[data-album-filter]').forEach((btn) => {
    const key = btn.dataset.albumFilter || 'all';
    const baseLabel = STATE_FILTER_LABELS[key] || btn.textContent.trim();
    const count = slots.filter(
      (slot) => slotMatchesStateFilter(slot, key) && slotMatchesRarityFilter(slot, currentRarityFilter),
    ).length;
    btn.textContent = `${baseLabel} (${count})`;
  });

  document.querySelectorAll('[data-album-rarity]').forEach((btn) => {
    const key = btn.dataset.albumRarity || 'all';
    const baseLabel = RARITY_FILTER_LABELS[key] || btn.textContent.trim();
    const count = slots.filter(
      (slot) => slotMatchesStateFilter(slot, currentAlbumFilter) && slotMatchesRarityFilter(slot, key),
    ).length;
    btn.textContent = key === 'all' ? baseLabel : `${baseLabel} (${count})`;
  });
}

function applyAlbumFilter(filterValue = currentAlbumFilter, rarityValue = currentRarityFilter) {
  currentAlbumFilter = filterValue;
  currentRarityFilter = rarityValue;
  const grid = document.getElementById('album-grid');
  if (!grid) return;

  document.querySelectorAll('[data-album-filter]').forEach((btn) => {
    const active = btn.dataset.albumFilter === currentAlbumFilter;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  document.querySelectorAll('[data-album-rarity]').forEach((btn) => {
    const active = btn.dataset.albumRarity === currentRarityFilter;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  const slots = Array.from(grid.querySelectorAll('.achievement-slot'));
  let visibleCount = 0;

  slots.forEach((slot) => {
    const visible =
      slotMatchesStateFilter(slot, currentAlbumFilter) &&
      slotMatchesRarityFilter(slot, currentRarityFilter);
    slot.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  updateCabinetFilterButtonLabels(slots);

  let emptyEl = grid.querySelector('[data-filter-empty]');
  if (visibleCount === 0 && slots.length > 0) {
    if (!emptyEl) {
      emptyEl = document.createElement('li');
      emptyEl.className = 'achievement-empty';
      emptyEl.dataset.filterEmpty = 'true';
      grid.appendChild(emptyEl);
    }
    emptyEl.textContent =
      currentAlbumFilter === 'locked' && currentUser?.role === 'admin'
        ? 'Nenhuma relíquia bloqueada (Visão do Mestre — todas as 68 relíquias estão reveladas).'
        : 'Nenhuma relíquia corresponde aos filtros selecionados.';
    emptyEl.hidden = false;
  } else if (emptyEl) {
    emptyEl.hidden = true;
  }

  const focusedSlot = grid.querySelector('.achievement-slot.is-focused');
  if (visibleCount > 0 && (!focusedSlot || focusedSlot.hidden)) {
    selectInitialInspectorSlot();
  }
}

function selectInitialInspectorSlot() {
  const grid = document.getElementById('album-grid');
  if (!grid || !currentUser) return;
  const visibleSlots = Array.from(grid.querySelectorAll('.achievement-slot:not([hidden])'));
  const preferredSlot =
    visibleSlots.find((el) => el.dataset.achievementId && el.dataset.achievementId !== SOBERANO_ACHIEVEMENT_ID) ||
    visibleSlots[0] ||
    grid.querySelector('.achievement-slot');
  const firstId = preferredSlot?.dataset?.achievementId;
  if (!firstId) return;
  focusAlbumSlot(firstId, { openModal: false, scroll: false });
}

function handleSlotInspect(achievement, state, slotEl, { scrollInspectorOnMobile = false } = {}) {
  lastFocusedSlot = slotEl;
  slotEl.classList.add('is-focused');
  document.querySelectorAll('.achievement-slot.is-focused').forEach((el) => {
    if (el !== slotEl) el.classList.remove('is-focused');
  });

  void updateRelicInspector(achievement, state);

  if (scrollInspectorOnMobile && window.matchMedia('(max-width: 960px)').matches) {
    document.getElementById('relic-inspector')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }
}

function renderAlbum() {
  const grid = document.getElementById('album-grid');
  if (!grid || !currentUser) return;

  void renderAchievementsList(grid, currentUser, {
    mode: 'album',
    onSlotHover: (achievement, state, slotEl) => {
      handleSlotInspect(achievement, state, slotEl, { scrollInspectorOnMobile: false });
    },
    onSlotClick: (achievement, state, slotEl) => {
      handleSlotInspect(achievement, state, slotEl, { scrollInspectorOnMobile: true });
    },
  }).then(() => {
    applyAlbumFilter(currentAlbumFilter, currentRarityFilter);
    if (!window.location.hash) {
      selectInitialInspectorSlot();
    }
  });

  updateAlbumCounter();
}

function initKeepsakeCabinetControls() {
  document.querySelectorAll('[data-album-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyAlbumFilter(btn.dataset.albumFilter || 'all', currentRarityFilter);
    });
  });

  document.querySelectorAll('[data-album-rarity]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyAlbumFilter(currentAlbumFilter, btn.dataset.albumRarity || 'all');
    });
  });

  document.getElementById('relic-inspector-expand')?.addEventListener('click', () => {
    if (!activeInspectedAchievement) return;
    window.history.replaceState(null, '', `#${activeInspectedAchievement.id}`);
    openRelicModal(activeInspectedAchievement, activeInspectedState);
  });
}

function initRelicModal() {
  initKeepsakeCabinetControls();
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
    token: getSession()?.token ?? null,
  });

  renderAlbum();
  handleDeepLink();
}

document.addEventListener('DOMContentLoaded', init);
