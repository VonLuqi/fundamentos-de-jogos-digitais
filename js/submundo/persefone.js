'use strict';

function resolveSubmundoRoot() {
  const p = String(window.location?.pathname || '');
  for (const marker of ['/pages/submundo/', '/pages/', '/submundo/']) {
    const idx = p.indexOf(marker);
    if (idx >= 0) return p.slice(0, idx);
  }
  return '';
}

function resolveSubmundoPath(nextPath) {
  const root = resolveSubmundoRoot();
  return `${root}${String(nextPath || '').replace(/\/+$/, '')}/`;
}

async function postUnderworldStep(payload) {
  const root = resolveSubmundoRoot();
  const res = await fetch(`${root}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'underworldStep', ...payload }),
  });
  return res.json();
}

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

// Estado inicial do mortal — o detetive deve elevar autoridade e sementes no navegador.
setCookie(ROLE_COOKIE, 'mortal');
try {
  localStorage.setItem(SEEDS_KEY, '0');
} catch {
  /* storage bloqueado */
}

claimBtn?.addEventListener('click', async () => {
  const role = getCookie(ROLE_COOKIE);
  let seeds = '0';
  try {
    seeds = String(localStorage.getItem(SEEDS_KEY) || '0');
  } catch {
    seeds = '0';
  }

  try {
    const result = await postUnderworldStep({ stage: 'persefone_claim', role, seeds });
    if (!result?.ok || !result?.seal) {
      if (statusEl) {
        statusEl.dataset.tone = 'error';
        statusEl.textContent = result?.message || 'Ainda és mortal neste jardim.';
      }
      if (whisper) {
        whisper.textContent = result?.whisper
          || 'O trono rejeita quem ainda não provou das sementes nem reivindicou o consórcio.';
      }
      return;
    }

    if (whisper) {
      whisper.textContent = result.whisper || 'O jardim cede. O selo do trono desperta.';
    }
    if (statusEl) {
      statusEl.dataset.tone = 'ok';
      statusEl.textContent = result.message || `Selo revelado: ${result.seal}`;
    }
    if (form) form.hidden = false;
    if (passInput) passInput.value = result.seal;
  } catch {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Ainda és mortal neste jardim.';
    }
  }
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = String(passInput?.value || '').trim();
  if (!value) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Ainda és mortal neste jardim.';
    }
    return;
  }

  try {
    const result = await postUnderworldStep({ stage: 'persefone', pass: value });
    if (!result?.ok || !result?.nextPath) {
      if (statusEl) {
        statusEl.dataset.tone = 'error';
        statusEl.textContent = result?.message || 'Ainda és mortal neste jardim.';
      }
      return;
    }
    if (statusEl) {
      statusEl.dataset.tone = 'ok';
      statusEl.textContent = result.message || 'As romãs abrem o caminho…';
    }
    window.location.assign(resolveSubmundoPath(result.nextPath));
  } catch {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Ainda és mortal neste jardim.';
    }
  }
});
