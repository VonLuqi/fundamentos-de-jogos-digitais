/**
 * Portão do Submundo — eco glitch no Salão dos Heróis.
 * Palavra-passe = anagrama das runas (TARTARO OCULTO) → /submundo/tartaro-oculto
 *
 * Juice é CSS-first (RGB split, flicker, rift) para não competir com o
 * canvas @vfx-js do arco-íris no body.
 */

'use strict';

import { setRainbowVfxSuspended } from './achievements-ui.js';

const GATE_DESTINATION = '/submundo/tartaro-oculto';
const GATE_STORAGE_KEY = 'underworld_gate_ok';
const ACCEPTED_PASSES = new Set(['tartaro oculto', 'tartaro-oculto']);

const IDLE_LABEL = '░';
const IDLE_VARIANTS = ['░', '▒', '·', '∶', '╎', '¦'];
const CORRUPT_GLYPHS = '█▓▒░¤†‡∆◊║│¦';
const TITLE_CLEAN = 'Portão do submundo';

const reducedMotionQuery = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

let gateBound = false;
let failCount = 0;
let corruptTimer = null;
let titleGlitchTimer = null;

function normalizePass(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function isAcceptedPass(value) {
  const normalized = normalizePass(value);
  if (ACCEPTED_PASSES.has(normalized)) return true;
  return normalized.replace(/-/g, ' ') === 'tartaro oculto'
    || normalized.replace(/\s+/g, '-') === 'tartaro-oculto';
}

function startCorruptLoop(label) {
  if (!label || reducedMotionQuery.matches || corruptTimer) return;
  corruptTimer = window.setInterval(() => {
    if (document.hidden) return;
    const next = Math.random() > 0.55
      ? IDLE_LABEL
      : IDLE_VARIANTS[Math.floor(Math.random() * IDLE_VARIANTS.length)]
        || CORRUPT_GLYPHS[Math.floor(Math.random() * CORRUPT_GLYPHS.length)];
    label.dataset.glitch = next;
    label.textContent = next;
  }, 720);
}

function stopCorruptLoop() {
  if (corruptTimer) {
    clearInterval(corruptTimer);
    corruptTimer = null;
  }
}

function corruptTitleOnce(title) {
  if (!title) return;
  if (Math.random() > 0.4) {
    title.dataset.glitch = TITLE_CLEAN;
    title.textContent = TITLE_CLEAN;
    return;
  }
  const chars = [...TITLE_CLEAN];
  const swaps = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < swaps; i += 1) {
    const idx = Math.floor(Math.random() * chars.length);
    if (chars[idx] === ' ') continue;
    chars[idx] = CORRUPT_GLYPHS[Math.floor(Math.random() * CORRUPT_GLYPHS.length)];
  }
  const next = chars.join('');
  title.dataset.glitch = next;
  title.textContent = next;
}

function startTitleGlitch() {
  const title = document.getElementById('underworld-gate-title');
  if (!title || reducedMotionQuery.matches || titleGlitchTimer) return;
  title.dataset.glitch = TITLE_CLEAN;
  title.textContent = TITLE_CLEAN;
  titleGlitchTimer = window.setInterval(() => corruptTitleOnce(title), 380);
}

function stopTitleGlitch() {
  if (titleGlitchTimer) {
    clearInterval(titleGlitchTimer);
    titleGlitchTimer = null;
  }
  const title = document.getElementById('underworld-gate-title');
  if (title) {
    title.dataset.glitch = TITLE_CLEAN;
    title.textContent = TITLE_CLEAN;
  }
}

function setGateStatus(message, tone = '') {
  const status = document.getElementById('underworld-gate-status');
  if (!status) return;
  status.textContent = message || '';
  status.dataset.tone = tone || '';
}

function openGateModal() {
  const modal = document.getElementById('underworld-gate-modal');
  const input = document.getElementById('underworld-gate-input');
  if (!modal) return;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('is-open'));
  setRainbowVfxSuspended(true, 'underworld-gate');
  startTitleGlitch();
  setGateStatus('');
  if (input) {
    input.value = '';
    input.focus();
  }
  document.body.classList.add('underworld-gate-modal-open');
}

function closeGateModal() {
  const modal = document.getElementById('underworld-gate-modal');
  if (!modal) return;
  modal.classList.remove('is-open', 'is-error-shake');
  document.body.classList.remove('underworld-gate-modal-open');
  stopTitleGlitch();
  setRainbowVfxSuspended(false, 'underworld-gate');
  window.setTimeout(() => {
    if (!modal.classList.contains('is-open')) modal.hidden = true;
  }, 280);
}

function playClickBurst(gate) {
  if (!gate || reducedMotionQuery.matches) return;
  const burst = document.createElement('span');
  burst.className = 'underworld-gate__burst';
  burst.setAttribute('aria-hidden', 'true');
  gate.appendChild(burst);
  window.setTimeout(() => burst.remove(), 520);
}

function playSuccessRift() {
  return new Promise((resolve) => {
    if (reducedMotionQuery.matches) {
      resolve();
      return;
    }
    const rift = document.createElement('div');
    rift.className = 'underworld-gate-rift';
    rift.setAttribute('aria-hidden', 'true');
    rift.innerHTML = [
      '<span class="underworld-gate-rift__scan"></span>',
      '<span class="underworld-gate-rift__bar"></span>',
      '<span class="underworld-gate-rift__copy">O portão cede…</span>',
    ].join('');
    document.body.appendChild(rift);
    requestAnimationFrame(() => rift.classList.add('is-active'));
    window.setTimeout(() => {
      rift.remove();
      resolve();
    }, 820);
  });
}

async function handleGateSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = document.getElementById('underworld-gate-input');
  const submitBtn = document.getElementById('underworld-gate-submit');
  const value = input?.value || '';

  if (!isAcceptedPass(value)) {
    failCount += 1;
    setGateStatus('O Cérbero não reconhece essa voz.', 'error');
    const modal = document.getElementById('underworld-gate-modal');
    modal?.classList.remove('is-error-shake');
    void modal?.offsetWidth;
    modal?.classList.add('is-error-shake');
    if (failCount >= 3 && submitBtn) {
      submitBtn.disabled = true;
      window.setTimeout(() => {
        submitBtn.disabled = false;
      }, 1200);
    }
    return;
  }

  failCount = 0;
  setGateStatus('O portão cede…', 'ok');
  try {
    sessionStorage.setItem(GATE_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }

  if (submitBtn) submitBtn.disabled = true;
  form?.classList.add('is-success');
  await playSuccessRift();
  window.location.assign(GATE_DESTINATION);
}

/** Inicializa o portão glitch do Salão. */
export function initUnderworldGate() {
  if (gateBound) return;
  const gate = document.getElementById('underworld-gate');
  const label = document.getElementById('underworld-gate-label');
  const modal = document.getElementById('underworld-gate-modal');
  const form = document.getElementById('underworld-gate-form');
  const closeBtn = document.getElementById('underworld-gate-close');
  if (!gate || !modal || !form) return;
  gateBound = true;

  if (label) {
    label.dataset.glitch = IDLE_LABEL;
    label.textContent = IDLE_LABEL;
    label.classList.add('is-gate-css-fallback');
    startCorruptLoop(label);
  }

  const open = () => {
    playClickBurst(gate);
    gate.classList.add('is-activated');
    window.setTimeout(() => {
      gate.classList.remove('is-activated');
      openGateModal();
    }, reducedMotionQuery.matches ? 0 : 180);
  };

  gate.addEventListener('click', open);
  form.addEventListener('submit', handleGateSubmit);
  closeBtn?.addEventListener('click', closeGateModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeGateModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeGateModal();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopCorruptLoop();
    else if (label) startCorruptLoop(label);
  });
}

/** Eco no Tártaro quando o herói veio pelo portão do Salão. */
export function consumeUnderworldGateEcho() {
  try {
    if (sessionStorage.getItem(GATE_STORAGE_KEY) !== '1') return null;
    sessionStorage.removeItem(GATE_STORAGE_KEY);
    return 'Você atravessou o portão do Salão. Quem conhece o caminho não precisa de botão — a URL é o mapa.';
  } catch {
    return null;
  }
}
