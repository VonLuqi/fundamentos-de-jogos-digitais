/**
 * Smoke Fase B / Task B2 — session-bootstrap unificado.
 * docs/otimizacoes/02-tasks-fase-b-rtt-batching.md · contratos-fase-b.md §1
 *
 * Uso: node tests/ops-perf-fase-b-bootstrap-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sessionBootstrapHandler from '../api/session-bootstrap.js';
import { sanitizeUser } from '../api/_lib/sanitize-user.js';

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

const bootstrapSrc = read('api/session-bootstrap.js');
const sanitizeSrc = read('api/_lib/sanitize-user.js');
const authSrc = read('api/auth.js');
const apiJs = read('js/api.js');
const shellSrc = read('js/app-shell.js');
const local = read('local-server.mjs');
const contratos = read('docs/otimizacoes/contratos-fase-b.md');
const faseB = read('docs/otimizacoes/02-tasks-fase-b-rtt-batching.md');
const pkg = read('package.json');

assert(fs.existsSync(path.join(root, 'api/session-bootstrap.js')), 'api/session-bootstrap.js existe');
assert(bootstrapSrc.includes("route: 'session-bootstrap'"), 'métricas route=session-bootstrap');
assert(bootstrapSrc.includes("action: 'bootstrap'") || bootstrapSrc.includes("metricsSetAction('bootstrap')"), 'action=bootstrap');
assert(bootstrapSrc.includes('isDespertarPublished'), 'lê gate via isDespertarPublished');
assert(bootstrapSrc.includes('metricsSetGateCache'), 'preenche gate_cache');
assert(bootstrapSrc.includes('sanitizeUser'), 'usa sanitizeUser');
assert(bootstrapSrc.includes('loadValidSession'), 'valida sessão');

assert(sanitizeSrc.includes('export function sanitizeUser'), 'sanitize-user export');
assert(authSrc.includes("from './_lib/sanitize-user.js'"), 'auth reusa sanitize compartilhado');

assert(apiJs.includes('fetchSessionBootstrap'), 'cliente fetchSessionBootstrap');
assert(apiJs.includes('getBootstrapGates'), 'cliente getBootstrapGates');
assert(apiJs.includes('/session-bootstrap'), 'cliente chama /session-bootstrap');
assert(apiJs.includes('isBootstrapFallbackStatus') || (apiJs.includes('404') && apiJs.includes('503')), 'fallback 404/503');
assert(/requireSession[\s\S]*fetchSessionBootstrap/.test(apiJs), 'requireSession prefere bootstrap');

assert(shellSrc.includes('getBootstrapGates'), 'shell usa cache de gates do bootstrap');
assert(shellSrc.includes('despertarPublished'), 'shell aceita despertarPublished');

assert(local.includes('session-bootstrap'), 'local-server wire');
assert(local.includes('sessionBootstrapHandler'), 'local-server handler import');

assert(contratos.includes('/api/session-bootstrap'), 'contrato D4');
assert(/Task B2|session-bootstrap/i.test(faseB), 'doc Fase B cobre B2');
assert(pkg.includes('ops-perf-fase-b-bootstrap-smoke.mjs'), 'npm check inclui este smoke');
assert(pkg.includes('api/session-bootstrap.js'), 'npm check syntax-check bootstrap');

{
  const sanitized = sanitizeUser({
    id: 1,
    full_name: 'Teste Alma',
    username: 'teste',
    password_hash: 'secret',
    password: 'x',
    conquistas: ['aula1_completa'],
    email: null,
    email_verified_at: null,
    role: 'student',
  });
  assert(sanitized && !('password_hash' in sanitized), 'sanitize remove password_hash');
  assert(sanitized.achievements?.[0] === 'aula1_completa', 'sanitize mapeia conquistas→achievements');
  assert(sanitized.fullName === 'Teste Alma', 'sanitize fullName');
}

{
  const res = makeRes();
  await sessionBootstrapHandler({ method: 'GET', query: {} }, res);
  assert(res.statusCode === 400 || res.statusCode === 503, 'sem token → 400 (ou 503 offline)');
  assert(res.body?.ok === false, 'erro body ok=false');
}

{
  const res = makeRes();
  await sessionBootstrapHandler({ method: 'POST', query: { token: 'x' } }, res);
  assert(res.statusCode === 405 || res.statusCode === 503, 'POST → 405 (ou 503 offline)');
}

if (errors.length) {
  console.error('ops-perf-fase-b-bootstrap-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-b-bootstrap-smoke OK');
console.log('  endpoint + cliente + shell + wire local + handler 400 sem token');
