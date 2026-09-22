/**
 * Smoke Fase C / Task C2 — runbook + k6 C4–C6 + docs (estático, sem binário k6).
 * docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 *
 * Uso: node tests/ops-perf-fase-c-obs-smoke.mjs
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

const required = [
  'docs/load-results/RUNBOOK-CAPACIDADE.md',
  'tests/load/c4-ranking.js',
  'tests/load/c5-classind-poll.js',
  'tests/load/c6-abuse.js',
  'tests/load/c1-login-boot.js',
  'tests/load/c3-despertar-sync.js',
  'docs/otimizacoes/04-tasks-k6-carga.md',
  'docs/otimizacoes/03-tasks-fase-c-escala-obs.md',
];

for (const rel of required) {
  assert(fs.existsSync(path.join(root, rel)), `existe ${rel}`);
}

const runbook = read('docs/load-results/RUNBOOK-CAPACIDADE.md');
const doc04 = read('docs/otimizacoes/04-tasks-k6-carga.md');
const doc03 = read('docs/otimizacoes/03-tasks-fase-c-escala-obs.md');
const readmeLoad = read('docs/load-results/README.md');
const pkg = read('package.json');
const config = read('tests/load/lib/config.js');
const c4 = read('tests/load/c4-ranking.js');
const c5 = read('tests/load/c5-classind-poll.js');
const c6 = read('tests/load/c6-abuse.js');

assert(/incidente.*conex/i.test(runbook) || /conexões altas/i.test(runbook), 'runbook tem incidente conexões');
assert(/Tabela de alertas/i.test(runbook), 'runbook tem tabela de alertas');
assert(runbook.includes('c1-login-boot.js'), 'runbook menciona C1');
assert(runbook.includes('c3-despertar-sync.js'), 'runbook menciona C3');
assert(runbook.includes('c4-ranking.js'), 'runbook menciona C4');
assert(runbook.includes('[metrics]'), 'runbook menciona [metrics]');
assert(/Supabase/i.test(runbook) && /Vercel/i.test(runbook), 'runbook checklist Supabase+Vercel');

assert(doc04.includes('c4-ranking.js'), 'doc 04 lista C4');
assert(doc04.includes('c5-classind-poll.js'), 'doc 04 lista C5');
assert(doc04.includes('c6-abuse.js'), 'doc 04 lista C6');
assert(doc04.includes('RUNBOOK-CAPACIDADE'), 'doc 04 aponta runbook');

assert(/Task 0 \+ C1 \+ C2 feitas|C2 feitas/i.test(doc03) || /C2[\s\S]*feita/i.test(doc03), 'doc 03 marca C2');
assert(/\[[xX]\] Runbook/i.test(doc03), 'checklist C2 runbook marcada');
assert(/Medido \(preencher\)/i.test(doc03) || /\|\s*Medido/i.test(doc03), 'apêndice DoD C tem coluna Medido');

assert(readmeLoad.includes('RUNBOOK-CAPACIDADE'), 'load-results README aponta runbook');
assert(pkg.includes('ops-perf-fase-c-obs-smoke.mjs'), 'npm check inclui este smoke');

assert(c4.includes('leaderboardGet'), 'C4 chama leaderboardGet');
assert(c4.includes('leaderboard_get'), 'C4 tag leaderboard_get');
assert(c5.includes('getState'), 'C5 chama getState');
assert(c5.includes('/api/classind'), 'C5 bate /api/classind');
assert(c6.includes('abuse_login') || c6.includes('abuse'), 'C6 cenário abuso');
assert(c6.includes('429'), 'C6 espera 429');
assert(config.includes('lbScope') || config.includes('LOAD_LB'), 'config expõe LB env');

if (errors.length) {
  console.error('ops-perf-fase-c-obs-smoke FAIL:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log('ops-perf-fase-c-obs-smoke OK');
console.log('  · RUNBOOK-CAPACIDADE + k6 C4–C6 + docs 03/04');
