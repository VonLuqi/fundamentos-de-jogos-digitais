/**
 * Smoke Task D1 — gate Prova + Ferramentas do Mestre
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-d1-smoke.mjs
 * Runtime do gate: tests/prova-multiexam-smoke.mjs (PHP ProvaService).
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
  'backend/src/Controllers/ProvaController.php',
  'backend/src/Services/Prova/ProvaService.php',
  'js/api.js',
  'js/dashboard.js',
  'pages/dashboard.html',
  'pages/prova-admin.html',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const handler = read('backend/src/Controllers/ProvaController.php');
const svc = read('backend/src/Services/Prova/ProvaService.php');
const apiJs = read('js/api.js');
const dashJs = read('js/dashboard.js');
const dashHtml = read('pages/dashboard.html');
const adminHtml = read('pages/prova-admin.html');
const plano = read('docs/plano-prova-modulo1-online.md');

assert(handler.includes("action === 'adminSetExamOpen'"), 'API adminSetExamOpen');
assert(handler.includes("action === 'adminGetProvaOverview'"), 'API adminGetProvaOverview');
assert(handler.includes('parseAdminSetExamOpenBody'), 'usa parseAdminSetExamOpenBody');
assert(svc.includes('function examGateFromRow'), 'ProvaService examGateFromRow');
assert(svc.includes("'all', 'todas', 'both', 'open_all'"), 'gate mode=all');
assert(apiJs.includes('provaAdminSetExamOpen'), 'wrapper set open');
assert(apiJs.includes('provaAdminGetOverview'), 'wrapper overview');
assert(dashHtml.includes('btn-prova-modulo1'), 'botão master-tools');
assert(!dashHtml.includes('prova-preview'), 'sem card preview no painel (prova em Aulas)');
assert(dashJs.includes('openProvaGateModal'), 'modal gate');
assert(dashJs.includes("mode: 'TCG01'") || dashJs.includes('mode: "TCG01"'), 'UI TCG01');
assert(dashJs.includes("mode: 'closed'") || dashJs.includes('Fechada'), 'UI fechada');
assert(
  dashJs.includes('uma turma ou todas') || dashJs.includes('só faz 1 vez') || dashJs.includes('Liberar Todas'),
  'copy admin',
);
assert(dashJs.includes("mode: 'all'") || dashHtml.includes('data-inline-prova-mode="all"'), 'UI todas as turmas');
assert(adminHtml.includes('data-gate-mode="all"'), 'hub Liberar todas');
assert(/Task D1[\s\S]*\[x\].*adminSetExamOpen/i.test(plano), 'plano marca D1');

if (errors.length) {
  console.error('prova-d1-smoke FAIL:');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}

console.log('prova-d1-smoke OK');
