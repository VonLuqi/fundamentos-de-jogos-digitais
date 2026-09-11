'use strict';

const NEXT = '/submundo/observatorio-sombras';
const EXPECTED = 'POMEGRANATE_6_SEEDS';
const ROLE_COOKIE = 'underworld_role';
const SEEDS_KEY = 'pomegranate_seeds';

const claimBtn = document.getElementById('persefone-claim');
const form = document.getElementById('persefone-form');
const statusEl = document.getElementById('persefone-status');
const whisper = document.getElementById('persefone-whisper');
const passInput = document.getElementById('persefone-pass');

function setCookie(name, value) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const target = `${encodeURIComponent(name)}=`;
  const parts = String(document.cookie || '').split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return '';
}

// Estado inicial do mortal — o detetive deve elevar autoridade e sementes.
setCookie(ROLE_COOKIE, 'mortal');
try {
  localStorage.setItem(SEEDS_KEY, '0');
} catch {
  /* storage bloqueado */
}

claimBtn?.addEventListener('click', () => {
  const role = getCookie(ROLE_COOKIE);
  let seeds = '0';
  try {
    seeds = String(localStorage.getItem(SEEDS_KEY) || '0');
  } catch {
    seeds = '0';
  }

  if (role !== 'queen_consort' || seeds !== '6') {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Ainda és mortal neste jardim.';
    }
    if (whisper) {
      whisper.textContent = 'O trono rejeita quem ainda não provou das sementes nem reivindicou o consórcio.';
    }
    return;
  }

  if (whisper) {
    whisper.textContent = 'O jardim cede. O selo do trono desperta.';
  }
  if (statusEl) {
    statusEl.dataset.tone = 'ok';
    statusEl.textContent = `Selo revelado: ${EXPECTED}`;
  }
  if (form) form.hidden = false;
  if (passInput) passInput.value = EXPECTED;
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = String(passInput?.value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (value !== EXPECTED) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Ainda és mortal neste jardim.';
    }
    return;
  }
  if (statusEl) {
    statusEl.dataset.tone = 'ok';
    statusEl.textContent = 'As romãs abrem o caminho…';
  }
  window.location.assign(NEXT);
});
