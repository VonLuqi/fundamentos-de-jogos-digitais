/**
 * Smoke Fase A / Task A5 — purge de sessions fora do hot path de auth.
 * docs/otimizacoes/01-tasks-fase-a-contencao.md
 *
 * Uso: node tests/ops-perf-fase-a-sessions-purge-smoke.mjs
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sessionsPurgeHandler from '../api/cron/sessions-purge.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const authSrc = read('api/auth.js');
const sessionsSrc = read('api/_lib/sessions.js');
const cronSrc = read('api/cron/sessions-purge.js');
const vercel = read('vercel.json');
const local = read('local-server.mjs');
const envExample = read('.env.example');
const readme = read('README.md');
const pkg = read('package.json');
const setup = read('db/setup.sql');
const migrate = read('db/migrate-2026-09-21-sessions-ttl-auth-rate.sql');
const taskDoc = read('docs/otimizacoes/01-tasks-fase-a-contencao.md');

assert(!authSrc.includes('purgeExpiredSessions'), 'auth.js sem purgeExpiredSessions (A5)');
assert(sessionsSrc.includes('export async function purgeExpiredSessions'), 'sessions.js mantém purge exportada');
assert(sessionsSrc.includes('.select(') && sessionsSrc.includes("delete()"), 'purge retorna deleted via select');
assert(cronSrc.includes('CRON_SECRET') || cronSrc.includes('authorizeCron'), 'cron exige CRON_SECRET');
assert(cronSrc.includes('purgeExpiredSessions'), 'cron chama purgeExpiredSessions');
assert(
  cronSrc.includes('timingSafeEqual') || read('api/_lib/cron-auth.js').includes('timingSafeEqual'),
  'cron compara secret com timing-safe',
);
assert(/"crons"/.test(vercel), 'vercel.json tem crons');
assert(vercel.includes('/api/cron/sessions-purge'), 'cron path no vercel.json');
assert(vercel.includes('0 5 * * *'), 'schedule diário 05:00 UTC');
assert(local.includes('sessions-purge'), 'local-server wire do cron');
assert(envExample.includes('CRON_SECRET'), '.env.example documenta CRON_SECRET');
assert(/CRON_SECRET|sessions-purge/i.test(readme), 'README menciona cron/CRON_SECRET');
assert(setup.includes('sessions_expires_at_idx'), 'setup tem índice expires_at');
assert(migrate.includes('sessions_expires_at_idx'), 'migration TTL tem índice');
assert(pkg.includes('ops-perf-fase-a-sessions-purge-smoke.mjs'), 'npm check inclui este smoke');
assert(pkg.includes('api/cron/sessions-purge.js'), 'npm check syntax-check do cron');
assert(/Task A5|purge/i.test(taskDoc), 'doc Fase A cobre A5');

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

const prevSecret = process.env.CRON_SECRET;
process.env.CRON_SECRET = `smoke-${crypto.randomBytes(8).toString('hex')}`;

{
  const res = makeRes();
  await sessionsPurgeHandler({ method: 'GET', headers: {} }, res);
  assert(res.statusCode === 401, 'sem secret → 401');
  assert(res.body?.ok === false, '401 body ok=false');
}

{
  const res = makeRes();
  await sessionsPurgeHandler(
    { method: 'GET', headers: { authorization: 'Bearer wrong-secret' } },
    res,
  );
  assert(res.statusCode === 401, 'secret errado → 401');
}

{
  const res = makeRes();
  await sessionsPurgeHandler({ method: 'PUT', headers: {} }, res);
  assert(res.statusCode === 405, 'método inválido → 405');
}

{
  const res = makeRes();
  await sessionsPurgeHandler(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    },
    res,
  );
  // Sem Supabase no CI típico → 503; com Supabase → 200/500 conforme DB.
  assert(
    res.statusCode === 503 || res.statusCode === 200 || res.statusCode === 500,
    `com secret autorizado: status esperado 503/200/500 (got ${res.statusCode})`,
  );
  if (res.statusCode === 503) {
    assert(/Supabase/i.test(res.body?.error || ''), '503 menciona Supabase');
  }
}

if (prevSecret === undefined) delete process.env.CRON_SECRET;
else process.env.CRON_SECRET = prevSecret;

if (errors.length) {
  console.error('ops-perf-fase-a-sessions-purge-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-a-sessions-purge-smoke OK');
console.log('  auth hot path limpo; cron protegido por CRON_SECRET');
