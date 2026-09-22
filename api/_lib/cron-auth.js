/**
 * Auth compartilhada para rotas /api/cron/* (CRON_SECRET).
 * Authorization: Bearer $CRON_SECRET  ou  x-cron-secret: $CRON_SECRET
 */

import crypto from 'node:crypto';

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function extractCronSecret(req) {
  const auth = String(req?.headers?.authorization || req?.headers?.Authorization || '');
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const header =
    req?.headers?.['x-cron-secret']
    || req?.headers?.['X-Cron-Secret']
    || '';
  return String(header).trim();
}

/**
 * @param {import('http').IncomingMessage | { headers?: Record<string, string> }} req
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function authorizeCron(req) {
  const expected = String(process.env.CRON_SECRET || '').trim();
  if (!expected) {
    return { ok: false, status: 503, error: 'CRON_SECRET não configurado.' };
  }
  const provided = extractCronSecret(req);
  if (!provided || !timingSafeEqualString(provided, expected)) {
    return { ok: false, status: 401, error: 'Não autorizado.' };
  }
  return { ok: true };
}
