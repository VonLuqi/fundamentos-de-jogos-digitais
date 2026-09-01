'use strict';

import { requireSession, ROUTES } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  (async function boot() {
    try {
      const result = await requireSession();
      if (!result) return;
    } catch {
      window.location.replace(ROUTES.dashboard());
    }
  })();
});
