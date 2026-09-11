'use strict';

import { consumeUnderworldGateEcho } from '../underworld-gate.js';

const NEXT = '/submundo/asfodelos-sussurros';
const EXPECTED = 'CERBERUS-UNBOUND';

const form = document.getElementById('tartaro-form');
const statusEl = document.getElementById('tartaro-status');

const gateEcho = consumeUnderworldGateEcho();
if (gateEcho && statusEl) {
  statusEl.dataset.tone = 'ok';
  statusEl.textContent = gateEcho;
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = String(document.getElementById('tartaro-pass')?.value || '')
    .trim()
    .toUpperCase();
  if (value !== EXPECTED) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Os portões permanecem fechados.';
    }
    return;
  }
  if (statusEl) {
    statusEl.dataset.tone = 'ok';
    statusEl.textContent = 'O abismo cede…';
  }
  window.location.assign(NEXT);
});
