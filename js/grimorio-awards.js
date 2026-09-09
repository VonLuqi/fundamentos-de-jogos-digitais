/**
 * Toast leve de conquistas do Grimório (+ fila via sessionStorage após redirect).
 */

'use strict';

import { ACHIEVEMENTS, getAchievementById } from './game-catalog.js';

const QUEUE_KEY = 'grimorioAwardQueue';
const TOAST_MS = 3200;

function hasAwards(awarded) {
  return Boolean(awarded && Array.isArray(awarded.achievements) && awarded.achievements.length > 0);
}

export function queueGrimoireAwards(awarded) {
  if (!hasAwards(awarded) || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(awarded));
  } catch {
    /* ignore quota */
  }
}

export function consumeQueuedGrimoireAwards() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(QUEUE_KEY);
    const parsed = JSON.parse(raw);
    return hasAwards(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function ensureToastHost() {
  let host = document.getElementById('grimorio-award-toast');
  if (host) return host;
  host = document.createElement('div');
  host.id = 'grimorio-award-toast';
  host.className = 'grimorio-award-toast';
  host.hidden = true;
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  document.body.appendChild(host);
  return host;
}

function resolveAchievement(id) {
  return getAchievementById(id) || ACHIEVEMENTS.find((entry) => entry.id === id) || null;
}

/**
 * Mostra toast leve (um card; se houver várias, lista nomes curtos).
 */
export function showGrimoireAwardToast(awarded) {
  if (!hasAwards(awarded) || typeof document === 'undefined') return;

  const host = ensureToastHost();
  const ids = awarded.achievements;
  const details = ids
    .map((id) => resolveAchievement(id))
    .filter(Boolean);

  const title = details.length === 1
    ? (details[0].name || 'Relíquia')
    : `${details.length} relíquias do Grimório`;
  const xp = Number(awarded.xp) || 0;
  const sub = details.length === 1
    ? (details[0].desc || '')
    : details.map((entry) => entry.name).join(' · ');

  host.replaceChildren();
  const card = document.createElement('div');
  card.className = 'grimorio-award-toast__card';

  const icon = document.createElement('span');
  icon.className = 'grimorio-award-toast__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = details[0]?.icon || '✦';

  const body = document.createElement('div');
  body.className = 'grimorio-award-toast__body';

  const kicker = document.createElement('p');
  kicker.className = 'grimorio-award-toast__kicker';
  kicker.textContent = xp > 0 ? `Relíquia · +${xp} XP` : 'Relíquia desbloqueada';

  const name = document.createElement('p');
  name.className = 'grimorio-award-toast__title';
  name.textContent = title;

  body.append(kicker, name);
  if (sub) {
    const desc = document.createElement('p');
    desc.className = 'grimorio-award-toast__desc';
    desc.textContent = sub.length > 140 ? `${sub.slice(0, 137)}…` : sub;
    body.appendChild(desc);
  }

  card.append(icon, body);
  host.appendChild(card);
  host.hidden = false;
  host.classList.add('is-visible');

  window.clearTimeout(host._hideTimer);
  host._hideTimer = window.setTimeout(() => {
    host.classList.remove('is-visible');
    window.setTimeout(() => {
      host.hidden = true;
      host.replaceChildren();
    }, 280);
  }, TOAST_MS);
}

export function flushQueuedGrimoireAwards() {
  const queued = consumeQueuedGrimoireAwards();
  if (queued) showGrimoireAwardToast(queued);
  return queued;
}

export function presentGrimoireAwards(awarded, { persistAcrossRedirect = false } = {}) {
  if (!hasAwards(awarded)) return;
  if (persistAcrossRedirect) {
    queueGrimoireAwards(awarded);
    return;
  }
  showGrimoireAwardToast(awarded);
}
