'use strict';

import { ApiError, getSession, underworldJudgment } from '../api.js';

const NEXT = '/submundo/persefone-jardim';
const EXPECTED = 'key_elestial_hades';

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

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = String(document.getElementById('elisios-pass')?.value || '').trim();
  if (value !== EXPECTED) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = 'Os juízes permanecem mudos.';
    }
    return;
  }
  if (statusEl) {
    statusEl.dataset.tone = 'ok';
    statusEl.textContent = 'Os juízes se calam. O jardim chama…';
  }
  window.location.assign(NEXT);
});
