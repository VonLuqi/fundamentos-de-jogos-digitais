/**
 * Smoke Fase C / Task C7 — warmup cron (protegido, sem scrypt).
 * docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 *
 * Uso: node tests/ops-perf-fase-c-warmup-smoke.mjs
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authorizeCron } from '../api/_lib/cron-auth.js';
import warmupHandler from '../api/cron/warmup.js';

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

const warmupSrc = read('api/cron/warmup.js');
const cronAuthSrc = read('api/_lib/cron-auth.js');
const vercel = read('vercel.json');
const local = read('local-server.mjs');
const readme = read('README.md');
const envExample = read('.env.example');
const doc03 = read('docs/otimizacoes/03-tasks-fase-c-escala-obs.md');
const pkg = read('package.json');
const runbook = read('docs/load-results/RUNBOOK-CAPACIDADE.md');

assert(warmupSrc.includes('authorizeCron'), 'warmup usa authorizeCron');
assert(warmupSrc.includes('CRON_SECRET') || cronAuthSrc.includes('CRON_SECRET'), 'CRON_SECRET');
assert(!/import.*scrypt|hashPassword|verifyPassword|scryptAsync/i.test(warmupSrc), 'warmup sem hash de senha');
assert(!warmupSrc.includes('query') || !/\?secret=|CRON_SECRET=/.test(warmupSrc), 'sem secret em query');
assert(warmupSrc.includes('/api/auth'), 'pinga auth');
assert(warmupSrc.includes('/api/progress'), 'pinga progress');
assert(warmupSrc.includes('session-bootstrap'), 'pinga bootstrap');
assert(/15–30|15-30|pré-aula|pre-aula/i.test(warmupSrc), 'documenta janela pré-aula no código');

assert(cronAuthSrc.includes('timingSafeEqual'), 'cron-auth timing-safe');
assert(vercel.includes('/api/cron/warmup'), 'vercel.json agenda warmup');
assert(vercel.includes('45 11 * * 1-5'), 'schedule dias úteis 11:45 UTC');
assert(local.includes('warmup'), 'local-server wire warmup');
assert(/warmup|pré-aula|11:45|08:45/i.test(readme), 'README documenta warmup');
assert(envExample.includes('CRON_SECRET'), '.env.example CRON_SECRET');
assert(/Task C7[\s\S]*?\[[xX]\]|C7[\s\S]*feita/i.test(doc03), 'doc 03 marca C7');
assert(/15–30|pré-aula|warmup/i.test(doc03) || /pré-aula|warmup/i.test(readme), 'janela pré-aula documentada');
assert(pkg.includes('ops-perf-fase-c-warmup-smoke.mjs'), 'npm check inclui smoke');
assert(pkg.includes('api/cron/warmup.js'), 'npm check syntax-check warmup');
assert(pkg.includes('api/_lib/cron-auth.js'), 'npm check cron-auth');
assert(/warmup|C7|WARMUP-C7/i.test(runbook) || runbook.includes('cold start'), 'runbook menciona cold/warmup ou sinal afim');

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
  const denied = authorizeCron({ headers: {} });
  assert(denied.ok === false && denied.status === 401, 'sem secret → 401');
  const ok = authorizeCron({
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  assert(ok.ok === true, 'bearer ok');
}

{
  const res = makeRes();
  await warmupHandler({ method: 'GET', headers: {} }, res);
  assert(res.statusCode === 401, 'handler sem secret → 401');
}

{
  const res = makeRes();
  await warmupHandler(
    { method: 'GET', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } },
    res,
  );
  // Sem APP_BASE_URL/VERCEL_URL/host pode ser 503; com host local ok.
  assert(
    res.statusCode === 200 || res.statusCode === 503,
    `handler com secret → 200 ou 503 (got ${res.statusCode})`,
  );
  if (res.statusCode === 200) {
    assert(res.body?.ok === true && Array.isArray(res.body.pings), 'body warmup ok');
  }
}

process.env.CRON_SECRET = prevSecret;

if (errors.length) {
  console.error('ops-perf-fase-c-warmup-smoke FAIL:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log('ops-perf-fase-c-warmup-smoke OK');
console.log('  · CRON_SECRET · sem scrypt · schedule 45 11 * * 1-5 · pings auth/progress/bootstrap');
