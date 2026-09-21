/**
 * Harness de QA da Task 8.
 * Vivo só com ?harness=1 em localhost / 127.0.0.1 — morto em produção.
 */

import { cmp } from '../core/decimal.js';

export const HARNESS_GRANT = '1000000000';

export function harnessEnabled(loc = typeof location !== 'undefined' ? location : null) {
  if (!loc) return false;
  const host = String(loc.hostname || '');
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  try {
    const search = loc.search ?? '';
    return new URLSearchParams(search).get('harness') === '1';
  } catch {
    return false;
  }
}

export function applyHarnessGrant(state, loc) {
  if (!state || !harnessEnabled(loc)) return false;
  if (cmp(state.runSouls, HARNESS_GRANT) >= 0) return false;
  state.grantSouls(HARNESS_GRANT);
  return true;
}
