'use strict';

import { consumeUnderworldGateEcho } from '../underworld-gate.js';

const NEXT = '/submundo/asfodelos-sussurros';
const EXPECTED = 'CERBERUS-UNBOUND';

function resolveSubmundoPath(nextPath) {
  const p = String(window.location?.pathname || '');
  for (const marker of ['/pages/submundo/', '/pages/', '/submundo/']) {
    const idx = p.indexOf(marker);
    if (idx > 0) return `${p.slice(0, idx)}${nextPath.replace(/\/+$/, '')}/`;
  }
  return nextPath;
}

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
      statusEl.textContent = 'As runas ainda dormem.';
    }
    return;
  }
  if (statusEl) {
    statusEl.dataset.tone = 'ok';
    statusEl.textContent = 'O abismo cede…';
  }
  window.location.assign(resolveSubmundoPath(NEXT));
});
