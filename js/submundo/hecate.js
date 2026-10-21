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

const form = document.getElementById('hecate-form');
const statusEl = document.getElementById('hecate-status');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = String(document.getElementById('hecate-pass')?.value || '').trim();
  if (!value) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'A relíquia ainda guarda silêncio.';
    }
    return;
  }

  try {
    const result = await postUnderworldStep({ stage: 'hecate', pass: value });
    if (!result?.ok || !result?.nextPath) {
      if (statusEl) {
        statusEl.dataset.tone = 'error';
        statusEl.textContent = result?.message || 'A relíquia ainda guarda silêncio.';
      }
      return;
    }
    if (statusEl) {
      statusEl.dataset.tone = 'ok';
      statusEl.textContent = result.message || 'As três vias se alinham…';
    }
    window.location.assign(resolveSubmundoPath(result.nextPath));
  } catch {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'A relíquia ainda guarda silêncio.';
    }
  }
});
