'use strict';

import { siteBasePath } from '../api.js?v=20261021i';

function resolveSubmundoPath(nextPath) {
  const root = siteBasePath();
  return `${root}${String(nextPath || '').replace(/\/+$/, '')}/`;
}

async function postUnderworldStep(payload) {
  const root = siteBasePath();
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
