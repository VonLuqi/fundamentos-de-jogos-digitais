/**
 * Smoke Fase A / Task A1 — cliente KV + rate-limit-kv (memória determinística).
 * docs/otimizacoes/01-tasks-fase-a-contencao.md
 *
 * Uso: node tests/ops-perf-fase-a-kv-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isKvConfigured, kvKey, KEY_PREFIX } from '../api/_lib/kv.js';
import {
  GAME_RATE_LIMITS,
  __resetMemoryRateLimitsForTests,
  applyRetryAfterHeader,
  consumeGameRateLimit,
  consumeRateLimit,
  gameRateLimitKey,
} from '../api/_lib/rate-limit-kv.js';
import { readProgressSurface } from './_helpers/progress-surface.mjs';

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

const kvSrc = read('api/_lib/kv.js');
const rlSrc = read('api/_lib/rate-limit-kv.js');
const envExample = read('.env.example');
const gitignore = read('.gitignore');
const readme = read('README.md');
const pkg = read('package.json');
const taskDoc = read('docs/otimizacoes/01-tasks-fase-a-contencao.md');

assert(kvSrc.includes('export async function getKv'), 'kv.js exporta getKv');
assert(kvSrc.includes('isKvConfigured'), 'kv.js exporta isKvConfigured');
assert(kvSrc.includes('KV_REST_API_URL'), 'kv.js menciona KV_REST_API_URL');
assert(rlSrc.includes('export async function consumeRateLimit'), 'rate-limit-kv exporta consumeRateLimit');
assert(rlSrc.includes('applyRetryAfterHeader'), 'rate-limit-kv exporta applyRetryAfterHeader');
assert(rlSrc.includes("backend: 'kv'|'memory'") || rlSrc.includes("'kv'|'memory'"), 'contrato backend kv|memory');
assert(GAME_RATE_LIMITS.despertar_sync.limit === 12, 'D2 sync = 12/min');
assert(GAME_RATE_LIMITS.despertar_juizo.limit === 2, 'D2 juizo = 2/s');
assert(GAME_RATE_LIMITS.underworld_redeem.limit === 12, 'D2 underworld = 12/min');

assert(envExample.includes('KV_REST_API_URL'), '.env.example documenta KV_REST_API_URL');
assert(envExample.includes('KV_REST_API_TOKEN'), '.env.example documenta KV_REST_API_TOKEN');
assert(gitignore.includes('!.env.example'), '.gitignore permite .env.example');
assert(/Vercel KV|KV_REST_API/i.test(readme), 'README menciona KV');
assert(pkg.includes('ops-perf-fase-a-kv-smoke.mjs'), 'npm check inclui este smoke');
assert(pkg.includes('api/_lib/kv.js'), 'npm check syntax-check kv.js');
assert(pkg.includes('api/_lib/rate-limit-kv.js'), 'npm check syntax-check rate-limit-kv.js');
assert(/Task 0|D1–D6|congelad/i.test(taskDoc), 'doc Fase A cobre Task 0');

assert(kvKey('rl', 'x') === `${KEY_PREFIX}rl:x`, 'kvKey aplica prefixo fjd:');
assert(gameRateLimitKey('despertar_sync', 'u1').includes('rl:despertar:sync'), 'game key sync');

__resetMemoryRateLimitsForTests();
const limit = 3;
const windowMs = 60_000;
const baseKey = 'test:smoke:memory:a1';
const now = 1_700_000_000_000;

for (let i = 0; i < limit; i += 1) {
  const r = await consumeRateLimit({
    key: baseKey,
    limit,
    windowMs,
    now: now + i,
    forceBackend: 'memory',
  });
  assert(r.limited === false, `hit ${i + 1}/${limit} não deve limitar`);
  assert(r.backend === 'memory', 'backend memory forçado');
  assert(r.degraded === false, 'force memory sem degraded');
  assert(r.remaining === limit - (i + 1), `remaining após hit ${i + 1}`);
}

const blocked = await consumeRateLimit({
  key: baseKey,
  limit,
  windowMs,
  now: now + limit,
  forceBackend: 'memory',
});
assert(blocked.limited === true, 'N+1 hit deve limitar (memory)');
assert(blocked.remaining === 0, 'remaining 0 quando limited');
assert(blocked.retryAfterSec >= 1, 'retryAfterSec >= 1');

const headers = {};
const fakeRes = { setHeader(name, value) { headers[name] = value; } };
applyRetryAfterHeader(fakeRes, blocked);
assert(headers['Retry-After'] === String(Math.max(1, Math.ceil(blocked.retryAfterSec))), 'Retry-After setado');

__resetMemoryRateLimitsForTests();
const game = await consumeGameRateLimit('despertar_sync', 'user-smoke', {
  now,
  forceBackend: 'memory',
});
assert(game.limited === false, 'consumeGameRateLimit sync ok');
assert(game.remaining === GAME_RATE_LIMITS.despertar_sync.limit - 1, 'remaining sync');

// A2 wiring — callers usam o helper (Maps locais removidos)
const despertarApi = read('api/despertar.js');
const progressApi = readProgressSurface(root);
assert(despertarApi.includes('consumeGameRateLimit'), 'despertar usa consumeGameRateLimit');
assert(despertarApi.includes("'despertar_sync'") || despertarApi.includes('"despertar_sync"'), 'despertar sync kind');
assert(despertarApi.includes("'despertar_juizo'") || despertarApi.includes('"despertar_juizo"'), 'despertar juizo kind');
assert(despertarApi.includes('applyRetryAfterHeader'), 'despertar Retry-After');
assert(!despertarApi.includes('syncAttempts'), 'despertar sem Map syncAttempts');
assert(!despertarApi.includes('juizoGuessAttempts'), 'despertar sem Map juizoGuessAttempts');
assert(progressApi.includes('consumeGameRateLimit'), 'progress usa consumeGameRateLimit');
assert(progressApi.includes("'underworld_redeem'") || progressApi.includes('"underworld_redeem"'), 'underworld kind');
assert(progressApi.includes('applyRetryAfterHeader'), 'progress Retry-After');
assert(!progressApi.includes('underworldRedeemAttempts'), 'progress sem Map underworldRedeemAttempts');
assert(!read('api/_lib/auth-rate.js').includes('consumeGameRateLimit'), 'auth-rate DB intacto (A2)');

// Sem KV no CI típico: isKvConfigured false e consume cai em memory sem throw.
const noForce = await consumeRateLimit({
  key: 'test:smoke:auto',
  limit: 1,
  windowMs: 1000,
  now,
});
assert(noForce.backend === 'memory' || noForce.backend === 'kv', 'backend válido sem force');
assert(typeof isKvConfigured() === 'boolean', 'isKvConfigured boolean');

if (errors.length) {
  console.error('ops-perf-fase-a-kv-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-a-kv-smoke OK');
console.log(`  kv_configured=${isKvConfigured()} (memory path exercised)`);
