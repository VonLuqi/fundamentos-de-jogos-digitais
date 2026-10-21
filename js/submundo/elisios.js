'use strict';

import { ApiError, getSession, underworldJudgment, underworldStep } from '../api.js';

function resolveSubmundoPath(nextPath) {
  const p = String(window.location?.pathname || '');
  for (const marker of ['/pages/submundo/', '/pages/', '/submundo/']) {
    const idx = p.indexOf(marker);
    if (idx > 0) return `${p.slice(0, idx)}${nextPath.replace(/\/+$/, '')}/`;
  }
  return nextPath;
}

const judgeBtn = document.getElementById('elisios-judge');
const statusEl = document.getElementById('elisios-status');
const form = document.getElementById('elisios-form');

judgeBtn?.addEventListener('click', async () => {
  const session = getSession();
  if (!session?.token) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Os juízes só ouvem heróis sob pacto. Entre no Domínio e volte.';
    }
    return;
  }
  if (statusEl) {
    statusEl.dataset.tone = '';
    statusEl.textContent = 'Consultando o tribunal…';
  }
  try {
    const payload = await underworldJudgment(session.token);
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = payload.message || 'Acesso Negado pelos Juízes';
    }
    if (form) form.hidden = false;
  } catch (error) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = error instanceof ApiError
        ? error.message
        : 'O tribunal não respondeu.';
    }
  }
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = String(document.getElementById('elisios-pass')?.value || '').trim();
  if (!value) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Os juízes permanecem mudos.';
    }
    return;
  }

  try {
    const session = getSession();
    const result = await underworldStep({
      stage: 'elisios',
      pass: value,
      ...(session?.token ? { token: session.token } : {}),
    });
    if (!result?.ok || !result?.nextPath) {
      if (statusEl) {
        statusEl.dataset.tone = 'error';
        statusEl.textContent = result?.message || 'Os juízes permanecem mudos.';
      }
      return;
    }
    if (statusEl) {
      statusEl.dataset.tone = 'ok';
      statusEl.textContent = result.message || 'Os juízes se calam. O jardim chama…';
    }
    window.location.assign(resolveSubmundoPath(result.nextPath));
  } catch {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Os juízes permanecem mudos.';
    }
  }
});
