/**
 * Espelho do Companheiro — perfil público + álbum read-only.
 * Rota: pages/companheiro.html?u=<username>[#achievementId]
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  ROUTES,
  getSession,
  loadAvatarImage,
  logout,
  requireSession,
  fetchFriendProfile,
} from './api.js';
import {
  getAchievementById,
  getAchievementCollectionStats,
  getAlbumSlotModel,
  rarityLabelForAchievement,
  renderAchievementsList,
} from './achievements-ui.js';

const COMPANIONS_FLASH_KEY = 'companionsFlash';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let viewerUser = null;
let friendUser = null;
let lastFocusedSlot = null;

function showApiWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function redirectToDashboard(message) {
  try {
    if (message) sessionStorage.setItem(COMPANIONS_FLASH_KEY, message);
  } catch {
    // ignore storage failures
  }
  window.location.replace(ROUTES.dashboard());
}

function usernameFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get('u') || params.get('username') || '').trim();
}

function toAlbumUser(profile) {
  return {
    // Nunca passar role admin ao álbum — evita “tudo liberado” por privilégio.
    role: 'student',
    achievements: Array.isArray(profile.achievements)
      ? profile.achievements.map((id) => String(id))
      : [],
    name: profile.fullName || profile.username,
    username: profile.username,
  };
}

function renderMirrorProfile(profile) {
  const section = document.getElementById('mirror-profile');
  const avatar = document.getElementById('mirror-avatar');
  if (section) section.hidden = false;
  if (avatar) loadAvatarImage(avatar, profile.avatarIndex ?? 0);

  const nameEl = document.getElementById('mirror-name');
  const handleEl = document.getElementById('mirror-handle');
  const rankEl = document.getElementById('mirror-rank');
  const turmaEl = document.getElementById('mirror-turma');
  const levelEl = document.getElementById('mirror-level');
  const xpEl = document.getElementById('mirror-xp');
  const lessonsEl = document.getElementById('mirror-lessons');
  const isAdmin = profile.role === 'admin';

  if (nameEl) nameEl.textContent = profile.fullName || profile.username || '—';
  if (handleEl) handleEl.textContent = `@${profile.username || '—'}`;
  if (rankEl) rankEl.textContent = profile.rank || (isAdmin ? 'Mestre do Infinito' : '—');
  if (turmaEl) turmaEl.textContent = isAdmin ? 'Domínio' : (profile.turma || '—');
  if (levelEl) levelEl.textContent = isAdmin ? '∞' : String(profile.level ?? '—');
  if (xpEl) xpEl.textContent = isAdmin ? '∞ XP' : `${Number(profile.xp || 0)} XP`;
  if (lessonsEl) lessonsEl.textContent = String(profile.completedLessonsCount ?? 0);

  document.title = `${profile.fullName || profile.username} — Espelho | Fundamentos de Jogos Digitais`;
}

function updateAlbumCounter() {
  const el = document.getElementById('mirror-album-counter');
  if (!el || !friendUser) return;
  const { unlocked, total } = getAchievementCollectionStats(friendUser, { visitorView: true });
  el.textContent = `${unlocked} / ${total} relíquias neste Espelho`;
}

function setShellInert(inert) {
  const shell = document.querySelector('[data-shell]');
  if (!shell) return;
  if (inert) shell.setAttribute('aria-hidden', 'true');
  else shell.removeAttribute('aria-hidden');
}

const MIRROR_SECRET_DESC =
  'O segredo desta relíquia permanece velado neste Espelho. Descubra-a por conta própria na Trilha e nas oferendas.';

function mirrorSlotOptions() {
  return { visitorView: true, viewerUser };
}

function openRelicModal(achievement, model = null) {
  const modal = document.getElementById('relic-modal');
  const panel = modal?.querySelector('.relic-modal__panel');
  const art = document.getElementById('relic-modal-art');
  const rarityEl = document.getElementById('relic-modal-rarity');
  const titleEl = document.getElementById('relic-modal-title');
  const descEl = document.getElementById('relic-modal-desc');
  const metaEl = document.getElementById('relic-modal-meta');
  const closeBtn = document.getElementById('relic-modal-close');
  if (!modal || !panel || !art || !rarityEl || !titleEl || !descEl || !metaEl || !friendUser) return;

  const slot = model && typeof model === 'object' && model.kind
    ? model
    : getAlbumSlotModel(friendUser, achievement, mirrorSlotOptions());

  const rarityName = rarityLabelForAchievement(achievement);
  panel.dataset.rarity = slot.rarity;
  panel.dataset.state = slot.kind;
  if (slot.isSecret) {
    if (slot.revealText && slot.applySecretStyle) panel.dataset.secret = 'revealed';
    else if (slot.revealText) panel.dataset.secret = 'known';
    else if (slot.applySecretStyle) panel.dataset.secret = 'veiled-styled';
    else panel.dataset.secret = 'veiled';
  } else {
    delete panel.dataset.secret;
  }
  art.classList.remove('is-silhouette');
  rarityEl.hidden = false;

  if (slot.isSecret) {
    // Q2-C: texto pelo observador; chrome pelo espelhado.
    if (slot.revealText) {
      art.textContent = achievement.icon;
      titleEl.textContent = achievement.name;
      descEl.textContent = achievement.desc;
      metaEl.textContent = slot.applySecretStyle
        ? 'Segredo revelado neste Espelho'
        : 'Segredo conhecido — ainda não conquistado neste Espelho';
    } else {
      art.textContent = '?';
      titleEl.textContent = '???';
      descEl.textContent = MIRROR_SECRET_DESC;
      metaEl.textContent = slot.applySecretStyle
        ? 'Segredo velado no Espelho'
        : 'Segredo velado — ainda não conquistado neste Espelho';
    }

    if (slot.showRarityBadge) {
      rarityEl.textContent = rarityName;
    } else {
      rarityEl.textContent = '';
      rarityEl.hidden = true;
    }
  } else if (slot.kind === 'locked') {
    art.textContent = achievement.icon;
    art.classList.add('is-silhouette');
    rarityEl.textContent = rarityName;
    titleEl.textContent = achievement.name;
    descEl.textContent = 'Esta relíquia ainda não foi conquistada por este companheiro.';
    metaEl.textContent = 'Figurinha bloqueada no Espelho';
  } else {
    art.textContent = achievement.icon;
    rarityEl.textContent = rarityName;
    titleEl.textContent = achievement.name;
    descEl.textContent = achievement.desc;
    metaEl.textContent = 'Relíquia revelada no Espelho';
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
  if (!achievement || !friendUser) return true;

  const model = getAlbumSlotModel(friendUser, achievement, mirrorSlotOptions());
  if (openModal) openRelicModal(achievement, model);
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
  const grid = document.getElementById('mirror-album-grid');
  if (!grid || !friendUser) return;

  renderAchievementsList(grid, friendUser, {
    mode: 'album',
    visitorView: true,
    viewerUser,
    // VFX WebGL estoura o grid do álbum no Espelho; usa só o fallback CSS.
    applyRainbowVfx: false,
    emptyMessage: 'Nenhuma relíquia neste Espelho ainda.',
    onSlotClick: (achievement, _state, slotEl) => {
      lastFocusedSlot = slotEl;
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}#${achievement.id}`
      );
      const model = getAlbumSlotModel(friendUser, achievement, mirrorSlotOptions());
      openRelicModal(achievement, model);
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

  const username = usernameFromQuery();
  if (!username) {
    redirectToDashboard('Informe um companheiro para abrir o Espelho.');
    return;
  }

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

  viewerUser = result.user;
  const token = getSession()?.token;
  if (!token) {
    redirectToDashboard('Sessão inválida.');
    return;
  }

  initAppShell({
    route: 'companheiro',
    role: viewerUser.role === 'admin' ? 'admin' : 'student',
    onLogout: handleLogout,
  });

  if (String(viewerUser.username || '').toLowerCase() === username.toLowerCase()) {
    window.location.replace(ROUTES.conquistas());
    return;
  }

  try {
    const { profile } = await fetchFriendProfile(token, { username });
    if (!profile) {
      redirectToDashboard('Companheiro não encontrado ou vínculo ainda não aceito.');
      return;
    }
    friendUser = toAlbumUser(profile);
    renderMirrorProfile(profile);
    renderAlbum();
    handleDeepLink();
  } catch (error) {
    const message = error instanceof ApiError
      ? error.message
      : 'Não foi possível abrir o Espelho deste companheiro.';
    redirectToDashboard(message);
  }
}

document.addEventListener('DOMContentLoaded', init);

export { COMPANIONS_FLASH_KEY };
