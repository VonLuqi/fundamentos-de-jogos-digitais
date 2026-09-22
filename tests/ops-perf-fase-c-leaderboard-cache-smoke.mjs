/**
 * Smoke Fase C / Task C4 — cache KV do leaderboard (TTL ≤ 60 s + invalidate).
 * docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 *
 * Uso: node tests/ops-perf-fase-c-leaderboard-cache-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEY_PREFIX } from '../api/_lib/kv.js';
import { assembleLeaderboard } from '../api/_lib/leaderboard.js';
import {
  LEADERBOARD_CACHE_TTL_SEC_DEFAULT,
  LEADERBOARD_CACHE_TTL_SEC_MAX,
  LEADERBOARD_CACHE_TTL_SEC_MIN,
  __resetLeaderboardCacheForTests,
  getLeaderboardCacheTtlSec,
  invalidateLeaderboardCache,
  isLeaderboardKvCacheEnabled,
  leaderboardCacheKey,
  readLeaderboardCache,
  selfFromCachedEntries,
  writeLeaderboardCache,
} from '../api/_lib/leaderboard-cache.js';
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

const cacheSrc = read('api/_lib/leaderboard-cache.js');
const handlerSrc = read('api/_lib/progress/leaderboard-handler.js');
const surface = readProgressSurface(root);
const envExample = read('.env.example');
const readme = read('README.md');
const doc03 = read('docs/otimizacoes/03-tasks-fase-c-escala-obs.md');
const pkg = read('package.json');

assert(cacheSrc.includes('LEADERBOARD_KV_CACHE'), 'flag LEADERBOARD_KV_CACHE');
assert(cacheSrc.includes('invalidateLeaderboardCache'), 'export invalidate');
assert(cacheSrc.includes('LEADERBOARD_CACHE_TTL_SEC_MAX'), 'TTL max documentado no código');
assert(LEADERBOARD_CACHE_TTL_SEC_MAX === 60, 'stale máximo 60 s');
assert(LEADERBOARD_CACHE_TTL_SEC_MIN === 30, 'TTL mínimo 30 s');
assert(LEADERBOARD_CACHE_TTL_SEC_DEFAULT === 45, 'TTL partida 45 s');
assert(getLeaderboardCacheTtlSec() >= 30 && getLeaderboardCacheTtlSec() <= 60, 'TTL clamp 30–60');

assert(handlerSrc.includes('readLeaderboardCache'), 'handler lê cache');
assert(handlerSrc.includes('writeLeaderboardCache'), 'handler grava cache');
assert(handlerSrc.includes('rpc+kv') || handlerSrc.includes("via:"), 'via rpc+kv');

assert(surface.includes('invalidateLeaderboardCache'), 'invalidate nos paths quentes');
assert(surface.includes('awardAchievementIds'), 'award path presente');
assert(/redeem[\s\S]*invalidateLeaderboardCache|invalidateLeaderboardCache[\s\S]*redeem/i.test(surface)
  || read('api/_lib/progress/redeem.js').includes('invalidateLeaderboardCache'),
  'redeem invalida');
assert(read('api/despertar.js').includes('invalidateLeaderboardCache'), 'despertar invalida');
assert(read('api/_lib/progress/admin.js').includes('invalidateLeaderboardCache'), 'admin invalida');

assert(envExample.includes('LEADERBOARD_KV_CACHE'), '.env.example documenta flag');
assert(envExample.includes('LEADERBOARD_CACHE_TTL_SEC') || envExample.includes('TTL'), '.env.example TTL');
assert(/LEADERBOARD_KV_CACHE|snapshot.*[Pp]lacar|leaderboard.*cache/i.test(readme), 'README menciona cache');
assert(/Task C4[\s\S]*?\[[xX]\]|C4[\s\S]*feita/i.test(doc03), 'doc 03 marca C4');
assert(pkg.includes('ops-perf-fase-c-leaderboard-cache-smoke.mjs'), 'npm check inclui smoke');
assert(pkg.includes('api/_lib/leaderboard-cache.js'), 'npm check syntax-check cache');

const key = leaderboardCacheKey({ scope: 'turma', turma: 'TCG01', sort: 'xp', limit: 25, gen: 0 });
assert(key.startsWith(KEY_PREFIX), 'chave com prefixo fjd:');
assert(key.includes('lb:'), 'chave lb');
assert(key.includes('TCG01') && key.includes('xp'), 'chave scope/turma/sort');

__resetLeaderboardCacheForTests();
const prevFlag = process.env.LEADERBOARD_KV_CACHE;
process.env.LEADERBOARD_KV_CACHE = '1';

{
  const users = [
    { id: 1, username: 'zeta', full_name: 'Z', turma: 'TCG01', xp: 50, conquistas: ['a'] },
    { id: 2, username: 'alfa', full_name: 'A', turma: 'TCG01', xp: 100, conquistas: ['a', 'b'] },
    { id: 3, username: 'beta', full_name: 'B', turma: 'TCG01', xp: 100, conquistas: [] },
  ];
  const juizo = new Map([[1, 0], [2, 5], [3, 1]]);
  const payload = assembleLeaderboard(users, juizo, { sort: 'xp', viewerUserId: 1, topN: 2 });

  const written = await writeLeaderboardCache({
    scope: 'turma',
    turma: 'TCG01',
    sort: 'xp',
    limit: 2,
    entries: payload.entries,
    total: payload.total,
    forceBackend: 'memory',
  });
  assert(written.ok && written.backend === 'memory', 'write memory ok');

  const hit = await readLeaderboardCache({
    scope: 'turma',
    turma: 'TCG01',
    sort: 'xp',
    limit: 2,
    forceBackend: 'memory',
  });
  assert(hit.hit === true, 'read hit');
  assert(hit.entries.length === 2, 'cached topN');
  assert(hit.entries[0].username === payload.entries[0].username, 'paridade top-1 snapshot vs assemble');
  assert(hit.total === payload.total, 'paridade total');

  const selfInTop = selfFromCachedEntries(hit.entries, 2);
  assert(selfInTop?.userId === 2, 'self no top via cache');
  const selfOut = selfFromCachedEntries(hit.entries, 1);
  assert(selfOut === null, 'self fora do top → null (miss semântico)');

  await invalidateLeaderboardCache({ forceBackend: 'memory' });
  const afterInv = await readLeaderboardCache({
    scope: 'turma',
    turma: 'TCG01',
    sort: 'xp',
    limit: 2,
    forceBackend: 'memory',
  });
  assert(afterInv.hit === false, 'invalidate → miss');
}

process.env.LEADERBOARD_KV_CACHE = prevFlag;
__resetLeaderboardCacheForTests();

// Flag default off (sem env)
delete process.env.LEADERBOARD_KV_CACHE;
assert(isLeaderboardKvCacheEnabled() === false, 'flag default off');

if (errors.length) {
  console.error('ops-perf-fase-c-leaderboard-cache-smoke FAIL:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log('ops-perf-fase-c-leaderboard-cache-smoke OK');
console.log('  · TTL≤60s · flag off default · paridade top-N memory · invalidate');
