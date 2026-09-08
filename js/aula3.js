'use strict';

import { initAppShell } from './app-shell.js';
import { requireSession, ROUTES, logout } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  (async function boot() {
    try {
      const result = await requireSession();
      if (!result) return;
      initAppShell({
        route: 'aula3',
        role: result.user?.role === 'admin' ? 'admin' : 'student',
        onLogout: async () => {
          await logout();
          window.location.href = ROUTES.auth();
        },
      });
    } catch {
      window.location.replace(ROUTES.dashboard());
    }
  })();
});
