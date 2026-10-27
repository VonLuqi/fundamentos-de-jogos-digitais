'use strict';

import { siteBasePath } from '../api.js?v=20261021i';

const GATE_STORAGE_KEY = 'underworld_gate_ok';

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

function consumeUnderworldGateEcho() {
  try {
    if (sessionStorage.getItem(GATE_STORAGE_KEY) !== '1') return null;
    sessionStorage.removeItem(GATE_STORAGE_KEY);
    return 'Você atravessou o portão do Salão. Quem conhece o caminho não precisa de botão — a URL é o mapa.';
  } catch {
    return null;
  }
}

const form = document.getElementById('tartaro-form');
const statusEl = document.getElementById('tartaro-status');

const gateEcho = consumeUnderworldGateEcho();
if (gateEcho && statusEl) {
  statusEl.dataset.tone = 'ok';
  statusEl.textContent = gateEcho;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = String(document.getElementById('tartaro-pass')?.value || '').trim();
  if (!value) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'As runas ainda dormem.';
    }
    return;
  }

  try {
    const result = await postUnderworldStep({ stage: 'tartaro', pass: value });
    if (!result?.ok || !result?.nextPath) {
      if (statusEl) {
        statusEl.dataset.tone = 'error';
        statusEl.textContent = result?.message || 'As runas ainda dormem.';
      }
      return;
    }
    if (statusEl) {
      statusEl.dataset.tone = 'ok';
      statusEl.textContent = result.message || 'O abismo cede…';
    }
    window.location.assign(resolveSubmundoPath(result.nextPath));
  } catch {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'As runas ainda dormem.';
    }
  }
});
