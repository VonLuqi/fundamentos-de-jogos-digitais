/**
 * Smoke Task C1 — redirect global “voltar = prova”
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-c1-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

[
  'api/_lib/prova/active-attempt.js',
  'api/session-bootstrap.js',
  'js/api.js',
  'pages/prova.html',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const active = read('api/_lib/prova/active-attempt.js');
const bootstrap = read('api/session-bootstrap.js');
const apiJs = read('js/api.js');
const provaHtml = read('pages/prova.html');
const contratos = read('docs/otimizacoes/contratos-fase-b.md');
const plano = read('docs/plano-prova-modulo1-online.md');

assert(active.includes('export async function loadProvaGateForUser'), 'active-attempt exporta loadProvaGateForUser');
assert(active.includes("status', 'in_progress'") || active.includes('status", "in_progress"') || active.includes(".eq('status', 'in_progress')"), 'filtra in_progress');

assert(bootstrap.includes('loadProvaGateForUser'), 'bootstrap usa loadProvaGateForUser');
assert(bootstrap.includes('gates:') && bootstrap.includes('prova:'), 'bootstrap responde gates.prova');
assert(bootstrap.includes('inProgress'), 'bootstrap inclui inProgress');

assert(apiJs.includes('redirectIfProvaInProgress'), 'cliente redirectIfProvaInProgress');
assert(apiJs.includes('shouldSkipProvaInProgressRedirect'), 'skip prova/auth/admin');
assert(apiJs.includes('enforceProvaInProgressRedirect'), 'fallback legado');
assert(apiJs.includes("gates?.prova?.inProgress") || apiJs.includes('gates.prova'), 'lê gates.prova');
assert(/requireSession[\s\S]*redirectIfProvaInProgress/.test(apiJs), 'requireSession chama redirect');
assert(apiJs.includes('/prova.html') || apiJs.includes('ROUTES.prova'), 'redirect para prova');
assert(apiJs.includes("route === 'prova'") || apiJs.includes("path.includes('/prova.html')"), 'exceção prova.html');
assert(apiJs.includes("route === 'auth'") || apiJs.includes("path.includes('/auth.html')"), 'exceção auth.html');
assert(apiJs.includes('prova-admin') || apiJs.includes("role === 'admin'"), 'exceção admin');

assert(provaHtml.includes('não pausa') || provaHtml.includes('nao pausa'), 'copy: tempo não pausa');
assert(contratos.includes('gates.prova') || contratos.includes('"prova"'), 'contrato bootstrap aditivo gates.prova');
assert(/Task C1[\s\S]*\[x\].*loadProvaGateForUser|Task C1[\s\S]*\[x\].*in_progress/i.test(plano), 'plano marca C1 feito');

if (errors.length) {
  console.error('prova-c1-smoke FAIL:');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}

console.log('prova-c1-smoke OK');
