'use strict';

const NEXT = '/submundo/elisios-julgamento';
const EXPECTED = 'HECATE_TORCH_KEY_777';

const form = document.getElementById('hecate-form');
const statusEl = document.getElementById('hecate-status');

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = String(document.getElementById('hecate-pass')?.value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (value !== EXPECTED) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'A relíquia ainda guarda silêncio.';
    }
    return;
  }
  if (statusEl) {
    statusEl.dataset.tone = 'ok';
    statusEl.textContent = 'As três vias se alinham…';
  }
  window.location.assign(NEXT);
});
