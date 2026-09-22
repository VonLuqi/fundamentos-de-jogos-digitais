/**
 * Smoke Fase A / Task A3 — cache de lesson_gates (Despertar published).
 * docs/otimizacoes/01-tasks-fase-a-contencao.md
 *
 * Uso: node tests/ops-perf-fase-a-gate-cache-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DESPERTAR_GATE_ID,
  DESPERTAR_GATE_KV_TTL_MS,
  DESPERTAR_GATE_MEMO_TTL_MS,
  DESPERTAR_PUBLISHED_CACHE_KEY,
  DESPERTAR_PUBLISHED_KEY,
  __resetDespertarGateCacheForTests,
  getLastDespertarGateCacheStatus,
  invalidateDespertarPublishedCache,
  isDespertarPublished,
  isDespertarSealedForUser,
} from '../api/_lib/despertar-gate.js';
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

const gateSrc = read('api/_lib/despertar-gate.js');
const progressSrc = readProgressSurface(root);
const pkg = read('package.json');
const taskDoc = read('docs/otimizacoes/01-tasks-fase-a-contencao.md');

assert(gateSrc.includes('invalidateDespertarPublishedCache'), 'gate exporta invalidate');
assert(gateSrc.includes('getLastDespertarGateCacheStatus'), 'gate exporta status de cache');
assert(gateSrc.includes('DESPERTAR_PUBLISHED_CACHE_KEY'), 'chave KV exportada');
assert(DESPERTAR_GATE_KV_TTL_MS === 60_000, 'TTL KV = 60s (D4)');
assert(DESPERTAR_GATE_MEMO_TTL_MS > 0 && DESPERTAR_GATE_MEMO_TTL_MS <= 60_000, 'memo TTL curto');
assert(DESPERTAR_PUBLISHED_CACHE_KEY.includes('gate:despertar:published'), 'chave gate:despertar:published');
assert(progressSrc.includes('invalidateDespertarPublishedCache'), 'setLessonGate invalida cache');
assert(
  progressSrc.includes('DESPERTAR_GATE_ID') && progressSrc.includes('DESPERTAR_PUBLISHED_KEY'),
  'progress compara lesson/gate do Despertar',
);
assert(pkg.includes('ops-perf-fase-a-gate-cache-smoke.mjs'), 'npm check inclui este smoke');
assert(/Task A3|gate:despertar:published/i.test(taskDoc), 'doc Fase A cobre A3');

assert(isDespertarSealedForUser({ role: 'admin' }, false) === false, 'admin bypass selo');
assert(isDespertarSealedForUser({ role: 'student' }, false) === true, 'aluno selado se unpublished');
assert(isDespertarSealedForUser({ role: 'student' }, true) === false, 'aluno livre se published');

function makeMockSupabase({ released = false } = {}) {
  let selectCount = 0;
  return {
    get selectCount() {
      return selectCount;
    },
    from(table) {
      assert(table === 'lesson_gates', `from inesperado: ${table}`);
      return {
        select() {
          return this;
        },
        eq(col, val) {
          assert(col === 'lesson_id', 'eq lesson_id');
          assert(val === DESPERTAR_GATE_ID, 'eq despertar');
          return this;
        },
        then(resolve) {
          selectCount += 1;
          resolve({
            data: [{ gate_key: DESPERTAR_PUBLISHED_KEY, released }],
            error: null,
          });
        },
      };
    },
  };
}

__resetDespertarGateCacheForTests();
const db = makeMockSupabase({ released: true });

const first = await isDespertarPublished(db);
assert(first === true, '1ª leitura published=true');
assert(getLastDespertarGateCacheStatus() === 'miss', '1ª leitura = miss');
assert(db.selectCount === 1, '1ª leitura dispara SELECT');

const second = await isDespertarPublished(db);
assert(second === true, '2ª leitura published=true');
assert(getLastDespertarGateCacheStatus() === 'hit_memo', '2ª leitura = hit_memo');
assert(db.selectCount === 1, '2ª leitura NÃO dispara SELECT (cache quente)');

await invalidateDespertarPublishedCache();
assert(getLastDespertarGateCacheStatus() === 'n/a', 'invalidate limpa status');

const third = await isDespertarPublished(db);
assert(third === true, '3ª leitura após invalidate');
assert(getLastDespertarGateCacheStatus() === 'miss', 'pós-invalidate = miss');
assert(db.selectCount === 2, 'invalidate força novo SELECT');

__resetDespertarGateCacheForTests();
const sealedDb = makeMockSupabase({ released: false });
const sealed = await isDespertarPublished(sealedDb);
assert(sealed === false, 'default/released false = selado');
assert(await isDespertarPublished(null) === false, 'supabase null = selado');

if (errors.length) {
  console.error('ops-perf-fase-a-gate-cache-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-a-gate-cache-smoke OK');
console.log(`  memo_hit skips SELECT; invalidate → miss (selects=${db.selectCount}+${sealedDb.selectCount})`);
