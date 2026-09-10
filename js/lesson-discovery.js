/**
 * Discovery toast compartilhado das aulas (popup, fila, pulse CSS).
 * Requer no DOM: #discovery-flash, #discovery-secret-burst, #discovery-overlay,
 * #discovery-title, #discovery-list.
 */

'use strict';

import { ACHIEVEMENTS, normalizeAchievementRarity } from './api.js';
import {
  createAchievementArtNode,
  ensureAchievementArtCatalogLoaded,
  rarityLabelForAchievement,
} from './achievements-ui.js';

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let discoveryTimerId = null;
let discoveryExitTimerId = null;
let secretBurstTimerId = null;
let discoveryQueueStartTimerId = null;
const discoveryQueue = [];
let isDiscoveryQueueRunning = false;
let discoveryPulseTimerId = null;
let prefersReducedMotion = reducedMotionQuery.matches;
let lastFocusedElement = null;

const DISCOVERY_TOAST_DURATION_MS = 1500;
let DISCOVERY_TOAST_EXIT_MS = prefersReducedMotion ? 0 : 240;
let DISCOVERY_TOAST_GAP_MS = prefersReducedMotion ? 80 : 120;
const SECRET_BURST_DURATION_MS = 2400;

function rememberFocusedElement() {
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    lastFocusedElement = active;
  }
}

function restoreFocusIfCaptured(container) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  if (!container || !container.contains(active)) return;
  if (lastFocusedElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus({ preventScroll: true });
  }
}

function applyMotionPreference() {
  prefersReducedMotion = reducedMotionQuery.matches;
  DISCOVERY_TOAST_EXIT_MS = prefersReducedMotion ? 0 : 240;
  DISCOVERY_TOAST_GAP_MS = prefersReducedMotion ? 80 : 120;
  document.body.classList.toggle('is-reduced-motion', prefersReducedMotion);
}

export function initLessonDiscoveryMotion() {
  applyMotionPreference();

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', applyMotionPreference);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(applyMotionPreference);
  }
}

function flashDiscovery() {
  const flash = document.getElementById('discovery-flash');
  if (!flash) return;
  flash.classList.remove('is-active');
  void flash.offsetHeight;
  flash.classList.add('is-active');
}

function triggerDiscoveryPulse() {
  if (prefersReducedMotion) {
    document.body.classList.remove('is-discovery-pulse');
    return;
  }

  document.body.classList.remove('is-discovery-pulse');
  void document.body.offsetHeight;
  document.body.classList.add('is-discovery-pulse');

  if (discoveryPulseTimerId) {
    window.clearTimeout(discoveryPulseTimerId);
  }
  discoveryPulseTimerId = window.setTimeout(() => {
    document.body.classList.remove('is-discovery-pulse');
    discoveryPulseTimerId = null;
  }, 950);
}

function hideDiscoveryOverlay({ animated = false } = {}) {
  const overlay = document.getElementById('discovery-overlay');
  if (!overlay) return;

  if (discoveryExitTimerId) {
    window.clearTimeout(discoveryExitTimerId);
    discoveryExitTimerId = null;
  }

  if (animated && !overlay.hidden) {
    overlay.classList.add('is-leaving');
    discoveryExitTimerId = window.setTimeout(() => {
      overlay.classList.remove('is-active', 'is-leaving');
      overlay.hidden = true;
      restoreFocusIfCaptured(overlay);
      discoveryExitTimerId = null;
    }, DISCOVERY_TOAST_EXIT_MS);
    return;
  }

  overlay.classList.remove('is-active', 'is-leaving');
  overlay.hidden = true;
  restoreFocusIfCaptured(overlay);
}

function showSecretBurst() {
  const burst = document.getElementById('discovery-secret-burst');
  if (!burst) return;

  rememberFocusedElement();
  burst.hidden = false;
  burst.classList.remove('is-active');
  void burst.offsetHeight;
  burst.classList.add('is-active');
  triggerDiscoveryPulse();

  if (secretBurstTimerId) {
    window.clearTimeout(secretBurstTimerId);
    secretBurstTimerId = null;
  }

  secretBurstTimerId = window.setTimeout(() => {
    burst.classList.remove('is-active');
    burst.hidden = true;
    restoreFocusIfCaptured(burst);
    secretBurstTimerId = null;
  }, SECRET_BURST_DURATION_MS);
}

async function showDiscoveryOverlay(achievement, queueOrder = 0) {
  if (!achievement) return;

  const overlay = document.getElementById('discovery-overlay');
  const title = document.getElementById('discovery-title');
  const list = document.getElementById('discovery-list');
  if (!overlay || !title || !list) return;

  await ensureAchievementArtCatalogLoaded();

  const headline = achievement.hidden ? 'Conquista Secreta Desbloqueada' : 'Conquista Desbloqueada';
  title.textContent = headline;
  list.innerHTML = '';

  const item = document.createElement('li');
  item.className = 'discovery-card__item';
  item.style.setProperty('--item-index', '0');
  const rarity = normalizeAchievementRarity(achievement.rarity, achievement.difficulty);
  item.dataset.rarity = rarity;

  const body = document.createElement('span');
  body.className = 'discovery-card__item-body';

  const kicker = document.createElement('span');
  kicker.className = 'discovery-card__item-kicker';
  kicker.textContent = headline;

  const name = document.createElement('span');
  name.className = 'discovery-card__item-name';
  name.textContent = achievement.name;

  const art = createAchievementArtNode(achievement, {
    className: 'discovery-card__item-art',
    grayscale: false,
  });

  const desc = document.createElement('span');
  desc.className = 'discovery-card__item-desc';
  desc.textContent = achievement.desc;

  const rarityBadge = document.createElement('span');
  rarityBadge.className = 'discovery-card__item-rarity';
  rarityBadge.textContent = rarityLabelForAchievement(achievement);

  body.append(kicker, name);
  item.append(body, art, rarityBadge, desc);
  list.appendChild(item);

  if (discoveryTimerId) {
    window.clearTimeout(discoveryTimerId);
    discoveryTimerId = null;
  }

  if (discoveryExitTimerId) {
    window.clearTimeout(discoveryExitTimerId);
    discoveryExitTimerId = null;
  }

  rememberFocusedElement();
  overlay.style.setProperty('--toast-order', String(Math.max(0, Math.min(queueOrder, 4))));
  overlay.hidden = false;
  overlay.classList.remove('is-active', 'is-leaving');
  void overlay.offsetHeight;
  overlay.classList.add('is-active');
  flashDiscovery();
  triggerDiscoveryPulse();

  discoveryTimerId = window.setTimeout(() => {
    hideDiscoveryOverlay({ animated: true });
    discoveryTimerId = null;
  }, DISCOVERY_TOAST_DURATION_MS);
}

async function runDiscoveryQueue() {
  if (isDiscoveryQueueRunning) return;
  isDiscoveryQueueRunning = true;
  let queueOrder = 0;

  while (discoveryQueue.length > 0) {
    const next = discoveryQueue.shift();
    if (!next) continue;
    showDiscoveryOverlay(next, queueOrder);
    queueOrder += 1;
    await new Promise((resolve) => {
      window.setTimeout(
        resolve,
        DISCOVERY_TOAST_DURATION_MS + DISCOVERY_TOAST_EXIT_MS + DISCOVERY_TOAST_GAP_MS
      );
    });
  }

  isDiscoveryQueueRunning = false;
}

export function enqueueDiscovery(achievementIds = []) {
  if (!Array.isArray(achievementIds) || achievementIds.length === 0) return;

  const achievements = achievementIds
    .map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id))
    .filter(Boolean);

  if (achievements.length === 0) return;

  const hasSecretAchievement = achievements.some((achievement) => achievement.hidden);
  if (hasSecretAchievement) {
    showSecretBurst();
  }

  achievements.forEach((achievement) => discoveryQueue.push(achievement));
  if (isDiscoveryQueueRunning) return;

  if (discoveryQueueStartTimerId) {
    window.clearTimeout(discoveryQueueStartTimerId);
    discoveryQueueStartTimerId = null;
  }

  const queueStartDelay = hasSecretAchievement ? SECRET_BURST_DURATION_MS : 0;
  discoveryQueueStartTimerId = window.setTimeout(() => {
    discoveryQueueStartTimerId = null;
    runDiscoveryQueue();
  }, queueStartDelay);
}

export function clearDiscoveryTimersAndEffects() {
  if (discoveryTimerId) {
    window.clearTimeout(discoveryTimerId);
    discoveryTimerId = null;
  }
  if (discoveryExitTimerId) {
    window.clearTimeout(discoveryExitTimerId);
    discoveryExitTimerId = null;
  }
  if (secretBurstTimerId) {
    window.clearTimeout(secretBurstTimerId);
    secretBurstTimerId = null;
  }
  if (discoveryQueueStartTimerId) {
    window.clearTimeout(discoveryQueueStartTimerId);
    discoveryQueueStartTimerId = null;
  }
  if (discoveryPulseTimerId) {
    window.clearTimeout(discoveryPulseTimerId);
    discoveryPulseTimerId = null;
  }

  discoveryQueue.length = 0;
  isDiscoveryQueueRunning = false;

  const burst = document.getElementById('discovery-secret-burst');
  const overlay = document.getElementById('discovery-overlay');
  const flash = document.getElementById('discovery-flash');
  if (burst) {
    burst.classList.remove('is-active');
    burst.hidden = true;
  }
  if (overlay) {
    overlay.classList.remove('is-active', 'is-leaving');
    overlay.hidden = true;
  }
  if (flash) {
    flash.classList.remove('is-active');
  }
  document.body.classList.remove('is-discovery-pulse');
}

export function bindLessonDiscoveryLifecycle() {
  initLessonDiscoveryMotion();
  window.addEventListener('pagehide', clearDiscoveryTimersAndEffects);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearDiscoveryTimersAndEffects();
  });
}
