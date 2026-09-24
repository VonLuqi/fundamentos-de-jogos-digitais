/**
 * Harness de QA da Task 8 + diag de sync (Fase A / A1).
 * Vivo só em localhost / 127.0.0.1 — morto em produção.
 */

import { cmp } from '../core/decimal.js';

export const HARNESS_GRANT = '1000000000';

function isLocalHost(loc) {
  if (!loc) return false;
  const host = String(loc.hostname || '');
  return host === 'localhost' || host === '127.0.0.1';
}

export function harnessEnabled(loc = typeof location !== 'undefined' ? location : null) {
  if (!isLocalHost(loc)) return false;
  try {
    const search = loc.search ?? '';
    return new URLSearchParams(search).get('harness') === '1';
  } catch {
    return false;
  }
}

/**
 * Instrumentação anti-rubberband (Fase A Task A1).
 * Ativa com ?harness=1 ou ?syncDiag=1 em localhost — sem spam em produção.
 */
export function syncDiagEnabled(loc = typeof location !== 'undefined' ? location : null) {
  if (!isLocalHost(loc)) return false;
  if (harnessEnabled(loc)) return true;
  try {
    const search = loc.search ?? '';
    return new URLSearchParams(search).get('syncDiag') === '1';
  } catch {
    return false;
  }
}

/** @param {string} phase @param {Record<string, unknown>} [data] */
export function logSyncDiag(phase, data = {}) {
  if (typeof console === 'undefined' || typeof console.debug !== 'function') return;
  console.debug(`[despertar-sync-diag] ${phase}`, data);
}

export function applyHarnessGrant(state, loc) {
  if (!state || !harnessEnabled(loc)) return false;
  if (cmp(state.runSouls, HARNESS_GRANT) >= 0) return false;
  state.grantSouls(HARNESS_GRANT);
  return true;
}
