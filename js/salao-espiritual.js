/**
 * Salão Espiritual — hub de turma e companheiros.
 */

'use strict';

import { initAppShell } from './app-shell.js';
import { ApiError, getSession, logout, requireSession } from './api.js';
import { initCompanionsPanel } from './friends-ui.js';
import { initTurmaPanel } from './turma-ui.js';

async function init() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    const box = document.getElementById('api-warning');
    const text = document.getElementById('api-warning-text');
    if (box && text) {
      text.textContent =
        error instanceof ApiError
          ? error.message
          : 'Os laços estão inacessíveis no momento.';
      box.hidden = false;
    }
    return;
  }

  if (!session) return;

  initAppShell({
    route: 'salao',
    role: session.user?.role === 'admin' ? 'admin' : 'student',
    onLogout: async () => {
      await logout();
    },
  });

  const token = session.token || getSession()?.token || null;
  const getToken = () => token || getSession()?.token || null;
  const feedbackEl = document.getElementById('companions-feedback');

  /** @type {{ refresh: Function } | null} */
  let turmaApi = null;
  /** @type {{ refresh: Function } | null} */
  let companionsApi = null;

  companionsApi = initCompanionsPanel({
    root: document.getElementById('companions-panel'),
    getToken,
    onChange: async () => {
      await turmaApi?.refresh({ silent: true });
    },
  });

  turmaApi = initTurmaPanel({
    root: document.getElementById('turma-panel'),
    getToken,
    feedbackEl,
    isAdmin: session.user?.role === 'admin',
    onChange: async () => {
      await companionsApi?.refresh({ silent: true });
    },
  });
}

document.addEventListener('DOMContentLoaded', init);
