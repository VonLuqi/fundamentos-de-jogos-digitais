/**
 * Rate limits da Prova (Task E1) — por userId via KV/memória.
 */

import {
  applyRetryAfterHeader,
  consumeRateLimit,
} from '../rate-limit-kv.js';
import { kvKey } from '../kv.js';

export const PROVA_RATE_LIMITS = Object.freeze({
  saveAnswer: Object.freeze({
    limit: 90,
    windowMs: 60_000,
    keyPart: 'rl:prova:save',
  }),
  reportIntegrityEvent: Object.freeze({
    limit: 40,
    windowMs: 60_000,
    keyPart: 'rl:prova:integrity',
  }),
  contestGrade: Object.freeze({
    limit: 8,
    windowMs: 60 * 60_000,
    keyPart: 'rl:prova:contest',
  }),
});

/**
 * @param {keyof typeof PROVA_RATE_LIMITS} kind
 * @param {string|number} userId
 * @param {{ now?: number, forceBackend?: 'kv'|'memory' }} [opts]
 */
export async function consumeProvaRateLimit(kind, userId, opts = {}) {
  const spec = PROVA_RATE_LIMITS[kind];
  if (!spec) throw new Error(`PROVA_RATE_LIMITS desconhecido: ${kind}`);
  return consumeRateLimit({
    key: kvKey(spec.keyPart, String(userId)),
    limit: spec.limit,
    windowMs: spec.windowMs,
    now: opts.now,
    forceBackend: opts.forceBackend,
  });
}

export { applyRetryAfterHeader };
