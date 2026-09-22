/**
 * Smoke Fase C / Task C5 — pg pool Transaction (flag off + fallback).
 * docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 *
 * Uso: node tests/ops-perf-fase-c-pg-pool-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PG_POOL_MAX_DEFAULT,
  PG_POOL_MAX_MAX,
  PG_POOL_MAX_MIN,
  __resetPgPoolForTests,
  getPgPoolMax,
  getRuntimeDatabaseUrl,
  inferPgPoolMode,
  isDespertarPgPoolEnabled,
} from '../api/_lib/pg-pool.js';
import {
  isDespertarSyncRpcEnabled,
} from '../api/_lib/despertar-persist-rpc.js';

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

const pgSrc = read('api/_lib/pg-pool.js');
const persistSrc = read('api/_lib/despertar-persist-rpc.js');
const envExample = read('.env.example');
const readme = read('README.md');
const doc03 = read('docs/otimizacoes/03-tasks-fase-c-escala-obs.md');
const pkg = read('package.json');

assert(pgSrc.includes('DATABASE_URL_RUNTIME'), 'pg-pool documenta DATABASE_URL_RUNTIME');
assert(pgSrc.includes('DESPERTAR_PG_POOL'), 'pg-pool flag DESPERTAR_PG_POOL');
assert(pgSrc.includes('allowExitOnIdle'), 'pool serverless allowExitOnIdle');
assert(pgSrc.includes('PG_POOL_MAX_MAX') || pgSrc.includes('max: 3') || PG_POOL_MAX_MAX === 3, 'max ≤ 3');
assert(pgSrc.includes('callDespertarPersistAndAwardViaPg'), 'viaPg export');
assert(!/new Client\(|client\.connect\(/.test(pgSrc) || pgSrc.includes('Pool'), 'usa Pool não Client avulso');

assert(persistSrc.includes('isDespertarPgPoolEnabled'), 'persist tenta pg');
assert(persistSrc.includes('pg_pool_fallback=1'), 'fallback log');
assert(persistSrc.includes('callDespertarPersistAndAwardViaPg'), 'persist chama viaPg');

assert(envExample.includes('DATABASE_URL_RUNTIME'), '.env.example DATABASE_URL_RUNTIME');
assert(envExample.includes('DESPERTAR_PG_POOL'), '.env.example DESPERTAR_PG_POOL');
assert(/DATABASE_URL_RUNTIME|DESPERTAR_PG_POOL|Transaction/i.test(readme), 'README menciona pooler C5');
assert(/Task C5[\s\S]*?\[[xX]\]|C5[\s\S]*feita/i.test(doc03), 'doc 03 marca C5');
assert(doc03.includes('DATABASE_URL_RUNTIME'), 'doc 03 documenta env');
assert(pkg.includes('ops-perf-fase-c-pg-pool-smoke.mjs'), 'npm check inclui smoke');
assert(pkg.includes('api/_lib/pg-pool.js'), 'npm check syntax-check pg-pool');

assert(PG_POOL_MAX_DEFAULT === 2, 'max default 2');
assert(PG_POOL_MAX_MIN === 1 && PG_POOL_MAX_MAX === 3, 'clamp 1–3');
assert(getPgPoolMax() >= 1 && getPgPoolMax() <= 3, 'getPgPoolMax clamp');

assert(inferPgPoolMode('postgresql://x:y@aws-0-us.pooler.supabase.com:6543/postgres') === 'transaction', '6543 → transaction');
assert(inferPgPoolMode('postgresql://postgres:y@db.xxx.supabase.co:5432/postgres') === 'session', '5432 → session');

__resetPgPoolForTests();
const prevPool = process.env.DESPERTAR_PG_POOL;
const prevUrl = process.env.DATABASE_URL_RUNTIME;
delete process.env.DESPERTAR_PG_POOL;
delete process.env.DATABASE_URL_RUNTIME;

assert(isDespertarPgPoolEnabled() === false, 'flag default off');
assert(getRuntimeDatabaseUrl() === '', 'sem RUNTIME url');

// Flag off: callDespertarPersistAndAward não deve exigir pg (smoke estático já cobre).
// Flag on sem URI: getPgPool → null
process.env.DESPERTAR_PG_POOL = '1';
assert(isDespertarPgPoolEnabled() === true, 'flag on');
__resetPgPoolForTests();

process.env.DESPERTAR_PG_POOL = prevPool;
process.env.DATABASE_URL_RUNTIME = prevUrl;
__resetPgPoolForTests();

void isDespertarSyncRpcEnabled;

if (errors.length) {
  console.error('ops-perf-fase-c-pg-pool-smoke FAIL:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log('ops-perf-fase-c-pg-pool-smoke OK');
console.log('  · flag off default · DATABASE_URL_RUNTIME · max 1–3 · fallback log');
