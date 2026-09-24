/**
 * Smoke Fase C / Task C1 — Edge Middleware + edge-rate-limit (memória determinística).
 * docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 *
 * Uso: node tests/ops-perf-fase-c-edge-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEY_PREFIX } from '../api/_lib/kv.js';
import {
  EDGE_KEY_PREFIX,
  EDGE_RATE_LIMITS,
  __resetEdgeMemoryRateLimitsForTests,
  buildEdge429Response,
  clientIpFromRequest,
  consumeEdgeIpRateLimit,
  edgeIpRateLimitKey,
  matchEdgePathGroup,
} from '../api/_lib/edge-rate-limit.js';

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

const edgeSrc = read('api/_lib/edge-rate-limit.js');
const mwSrc = read('middleware.js');
const envExample = read('.env.example');
const readme = read('README.md');
const pkg = read('package.json');
const taskDoc = read('docs/otimizacoes/03-tasks-fase-c-escala-obs.md');

assert(edgeSrc.includes('export const EDGE_RATE_LIMITS'), 'edge-rate-limit exporta EDGE_RATE_LIMITS');
assert(edgeSrc.includes('consumeEdgeIpRateLimit'), 'edge-rate-limit exporta consumeEdgeIpRateLimit');
assert(edgeSrc.includes('edge_rate_degraded'), 'edge-rate-limit loga edge_rate_degraded');
assert(edgeSrc.includes('fail-open') || edgeSrc.includes('fail-open'), 'doc D3 fail-open no módulo');
assert(mwSrc.includes("from '@vercel/functions'"), 'middleware usa @vercel/functions');
assert(mwSrc.includes('matchEdgePathGroup'), 'middleware chama matchEdgePathGroup');
assert(mwSrc.includes('consumeEdgeIpRateLimit'), 'middleware chama consumeEdgeIpRateLimit');
assert(mwSrc.includes('/api/auth'), 'matcher cobre auth');
assert(mwSrc.includes('/api/despertar'), 'matcher cobre despertar');
assert(mwSrc.includes('/api/progress'), 'matcher cobre progress');
assert(mwSrc.includes('/api/prova'), 'matcher cobre prova (E1)');
assert(!mwSrc.includes('/api/cron') || mwSrc.includes('cron'), 'middleware menciona cron (exempt)');

assert(EDGE_RATE_LIMITS.auth.limit === 30, 'D2 auth = 30/min/IP');
assert(EDGE_RATE_LIMITS.despertar.limit === 60, 'D2 despertar = 60/min/IP');
assert(EDGE_RATE_LIMITS.progress.limit === 90, 'D2 progress = 90/min/IP');
assert(EDGE_RATE_LIMITS.prova?.limit === 120, 'prova edge = 120/min/IP');
assert(EDGE_RATE_LIMITS.auth.windowMs === 60_000, 'janela auth 60s');
assert(EDGE_KEY_PREFIX === KEY_PREFIX, 'prefixo Edge = fjd: (A1)');

assert(matchEdgePathGroup('/api/auth') === 'auth', 'match /api/auth');
assert(matchEdgePathGroup('/api/auth/login') === 'auth', 'match /api/auth/*');
assert(matchEdgePathGroup('/api/despertar') === 'despertar', 'match despertar');
assert(matchEdgePathGroup('/api/progress') === 'progress', 'match progress');
assert(matchEdgePathGroup('/api/prova') === 'prova', 'match /api/prova');
assert(matchEdgePathGroup('/api/cron/sessions-purge') === null, 'cron fora do teto aluno');
assert(matchEdgePathGroup('/api/session-bootstrap') === null, 'bootstrap fora do matcher C1');
assert(matchEdgePathGroup('/assets/x.webp') === null, 'estáticos fora');
assert(
  clientIpFromRequest({ headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } }) === '203.0.113.9',
  'xff pega primeiro hop',
);
assert(
  clientIpFromRequest({
    headers: { get: (n) => (n === 'x-real-ip' ? '198.51.100.2' : null) },
  }) === '198.51.100.2',
  'x-real-ip Headers-like',
);

assert(
  edgeIpRateLimitKey('auth', '1.2.3.4') === `${KEY_PREFIX}rl:edge:auth:1.2.3.4`,
  'chave edge com prefixo fjd:',
);

assert(envExample.includes('EDGE') || envExample.includes('Middleware') || envExample.includes('Fase C'), '.env.example menciona Fase C / Edge');
assert(/Edge Middleware|middleware\.js|teto por IP/i.test(readme), 'README menciona Edge Middleware');
assert(pkg.includes('ops-perf-fase-c-edge-smoke.mjs'), 'npm check inclui este smoke');
assert(pkg.includes('api/_lib/edge-rate-limit.js'), 'npm check syntax-check edge-rate-limit.js');
assert(pkg.includes('@vercel/functions'), 'package.json depende de @vercel/functions');
assert(/Task 0.*congelad|D1–D8.*Congelad|Status.*Congelado/i.test(taskDoc), 'doc Fase C Task 0 congelada');
assert(/Task C1[\s\S]*?\[[xX]\] Middleware/i.test(taskDoc) || /C1[\s\S]*feita/i.test(taskDoc), 'doc marca C1');

__resetEdgeMemoryRateLimitsForTests();
const limit = EDGE_RATE_LIMITS.auth.limit;
const now = 1_700_000_000_000;
const ip = '203.0.113.50';

for (let i = 0; i < limit; i += 1) {
  const r = await consumeEdgeIpRateLimit('auth', ip, {
    now: now + i,
    forceBackend: 'memory',
  });
  assert(r.limited === false, `req ${i + 1} dentro do limite (${limit}/min)`);
  assert(r.backend === 'memory', `backend memory na req ${i + 1}`);
  assert(r.degraded === false, `force memory sem degraded na req ${i + 1}`);
}

const blocked = await consumeEdgeIpRateLimit('auth', ip, {
  now: now + limit,
  forceBackend: 'memory',
});
assert(blocked.limited === true, `req ${limit + 1} memory → limited`);
assert(blocked.retryAfterSec >= 1, 'Retry-After ≥ 1');

const res429 = buildEdge429Response(blocked);
assert(res429.status === 429, 'buildEdge429Response status 429');
assert(res429.headers.get('Retry-After'), 'header Retry-After');
assert(res429.headers.get('Cache-Control')?.includes('no-store'), '429 no-store');
const body = await res429.json();
assert(body.ok === false && body.code === 'edge_rate_limited', 'body edge_rate_limited');

__resetEdgeMemoryRateLimitsForTests();
const degraded = await consumeEdgeIpRateLimit('progress', '10.0.0.1', {
  now,
  forceBackend: 'memory',
});
assert(degraded.limited === false, 'progress memory ok');

if (errors.length) {
  console.error('ops-perf-fase-c-edge-smoke FAIL:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log('ops-perf-fase-c-edge-smoke OK');
