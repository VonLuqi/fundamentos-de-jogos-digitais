'use strict';

const NEXT = '/submundo/hecate-encruzilhada';
const EXPECTED = 'PERSEPHONE_PASS';

const form = document.getElementById('asfodelos-form');
const statusEl = document.getElementById('asfodelos-status');

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = String(document.getElementById('asfodelos-pass')?.value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (value !== EXPECTED) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'O eco ainda é só chiado.';
    }
    return;
  }
  if (statusEl) {
    statusEl.dataset.tone = 'ok';
    statusEl.textContent = 'O caminho se abre entre as flores pálidas…';
  }
  window.location.assign(NEXT);
});
