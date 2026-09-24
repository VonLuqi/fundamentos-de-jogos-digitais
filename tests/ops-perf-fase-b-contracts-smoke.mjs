/**
 * Smoke Fase B / Task B1 — contratos + doc 04 + load scaffold (sem binário k6).
 * docs/otimizacoes/02-tasks-fase-b-rtt-batching.md · 04-tasks-k6-carga.md
 *
 * Uso: node tests/ops-perf-fase-b-contracts-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const contratos = read('docs/otimizacoes/contratos-fase-b.md');
const faseB = read('docs/otimizacoes/02-tasks-fase-b-rtt-batching.md');
const doc04 = read('docs/otimizacoes/04-tasks-k6-carga.md');
const baseline = read('docs/load-results/BASELINE-POST-A.md');
const loadReadme = read('docs/load-results/README.md');
const master = read('docs/otimizacoes/00-master-plan.md');
const pkg = read('package.json');

assert(contratos.includes('fase-b.v1'), 'contratos com versão fase-b.v1');
assert(contratos.includes('/api/session-bootstrap'), 'contrato bootstrap');
assert(contratos.includes('despertar_persist_and_award'), 'contrato RPC');
assert(contratos.includes('p_user_id integer'), 'RPC user id integer');
assert(contratos.includes('DESPERTAR_SYNC_RPC'), 'flag D3');
assert(contratos.includes('sanitizeUser'), 'DTO user = sanitizeUser');
assert(contratos.includes('clientEpoch'), 'extensão Fase A clientEpoch');
assert(contratos.includes('echoEpoch'), 'extensão Fase A echoEpoch');

assert(/D1–D8|congelad/i.test(faseB) || faseB.includes('**Congelado**'), 'Task 0 congelada no doc B');
assert(faseB.includes('contratos-fase-b.md'), 'Fase B aponta contratos');
assert(faseB.includes('04-tasks-k6-carga.md'), 'Fase B aponta doc 04');

assert(doc04.includes('C1') && doc04.includes('C3'), 'doc 04 cobre C1 e C3');
assert(doc04.includes('tests/load/c1-login-boot.js'), 'doc 04 referencia C1 script');
assert(doc04.includes('tests/load/c3-despertar-sync.js'), 'doc 04 referencia C3 script');
assert(doc04.includes('BASELINE-POST-A'), 'doc 04 referencia baseline');

assert(baseline.includes('pending_staging_run') || baseline.includes('measured'), 'baseline tem status');
assert(baseline.includes('p95'), 'baseline tem tabela p95');
assert(loadReadme.includes('LOAD_USERNAME'), 'load-results README documenta env');

assert(master.includes('04-tasks-k6-carga.md'), 'Master Plan linka doc 04');
assert(pkg.includes('ops-perf-fase-b-contracts-smoke.mjs'), 'npm check inclui este smoke');

[
  'tests/load/c1-login-boot.js',
  'tests/load/c2-aula.js',
  'tests/load/c3-despertar-sync.js',
  'tests/load/lib/config.js',
  'tests/load/lib/auth.js',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `load script: ${rel}`);
});

const c1 = read('tests/load/c1-login-boot.js');
const c3 = read('tests/load/c3-despertar-sync.js');
assert(c1.includes('auth_login') || c1.includes('login'), 'C1 faz login');
assert(c1.includes('session-bootstrap'), 'C1 tenta bootstrap');
assert(c3.includes('stateSync'), 'C3 stateSync');
assert(c3.includes('despertar_sync'), 'C3 tag despertar_sync');

if (errors.length) {
  console.error('ops-perf-fase-b-contracts-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-b-contracts-smoke OK');
console.log('  contratos fase-b.v1 + doc 04 + tests/load C1–C3');
