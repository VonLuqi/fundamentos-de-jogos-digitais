'use strict';

import { siteBasePath } from '../api.js?v=20261021i';

const SESSION_KEY = 'activeSession';

function resolveSubmundoPath(nextPath) {
  const root = siteBasePath();
  return `${root}${String(nextPath || '').replace(/\/+$/, '')}/`;
}

function getActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session && session.token ? session : null;
  } catch {
    return null;
  }
}

async function postProgress(payload) {
  const root = siteBasePath();
  const res = await fetch(`${root}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'O tribunal não respondeu.');
  }
  return data;
}

const judgeBtn = document.getElementById('elisios-judge');
const statusEl = document.getElementById('elisios-status');
const form = document.getElementById('elisios-form');

judgeBtn?.addEventListener('click', async () => {
  const session = getActiveSession();
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
    const payload = await postProgress({
      token: session.token,
      action: 'underworldJudgment',
    });
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = payload.message || 'Acesso Negado pelos Juízes';
    }
    if (form) form.hidden = false;
  } catch (error) {
    if (statusEl) {
      statusEl.dataset.tone = 'error';
      statusEl.textContent = error instanceof Error
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
    const session = getActiveSession();
    const result = await postProgress({
      action: 'underworldStep',
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
