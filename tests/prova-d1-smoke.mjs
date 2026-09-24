/**
 * Smoke Task D1 — gate Prova (1 turma por vez) + Ferramentas do Mestre
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-d1-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROVA_GATE_TURMAS,
  countAttemptsByStatus,
  examGateFromRow,
  parseAdminSetExamOpenBody,
} from '../api/_lib/prova/exam-gate.js';
import { isExamOpenForUser } from '../api/_lib/prova/attempt-dto.js';

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
  'api/_lib/prova/exam-gate.js',
  'api/prova.js',
  'js/api.js',
  'js/dashboard.js',
  'pages/dashboard.html',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const handler = read('api/prova.js');
const apiJs = read('js/api.js');
const dashJs = read('js/dashboard.js');
const dashHtml = read('pages/dashboard.html');
const attemptDto = read('api/_lib/prova/attempt-dto.js');
const plano = read('docs/plano-prova-modulo1-online.md');

assert(handler.includes("action === 'adminSetExamOpen'"), 'API adminSetExamOpen');
assert(handler.includes("action === 'adminGetProvaOverview'"), 'API adminGetProvaOverview');
assert(handler.includes('parseAdminSetExamOpenBody'), 'usa parseAdminSetExamOpenBody');
assert(apiJs.includes('provaAdminSetExamOpen'), 'wrapper set open');
assert(apiJs.includes('provaAdminGetOverview'), 'wrapper overview');
assert(dashHtml.includes('btn-prova-modulo1'), 'botão master-tools');
assert(!dashHtml.includes('prova-preview'), 'sem card preview no painel (prova em Aulas)');
assert(dashJs.includes('openProvaGateModal'), 'modal gate');
assert(dashJs.includes("mode: 'TCG01'") || dashJs.includes("mode: \"TCG01\""), 'UI TCG01');
assert(dashJs.includes("mode: 'closed'") || dashJs.includes('Fechada'), 'UI fechada');
assert(dashJs.includes('uma turma por vez') || dashJs.includes('só faz 1 vez'), 'copy admin');
assert(attemptDto.includes('examGateFromRow'), 'isExamOpenForUser usa examGateFromRow');
assert(/Task D1[\s\S]*\[x\].*adminSetExamOpen/i.test(plano), 'plano marca D1');

// --- Unit gate ---
assert(PROVA_GATE_TURMAS.includes('TCG01') && PROVA_GATE_TURMAS.includes('TCG02'), 'turmas');

assert(examGateFromRow({ is_open: false, open_turmas: [] }).state === 'closed', 'seed fechada');
assert(examGateFromRow({ is_open: true, open_turmas: [] }).state === 'closed', 'is_open sem turma = fechada');
assert(examGateFromRow({ is_open: true, open_turmas: ['TCG01', 'TCG02'] }).state === 'closed', 'duas turmas = fechada efetiva');
assert(examGateFromRow({ is_open: true, open_turmas: ['TCG01'] }).state === 'TCG01', 'só TCG01');

const closed = parseAdminSetExamOpenBody({ mode: 'closed' });
assert(closed.ok && closed.is_open === false && closed.open_turmas.length === 0, 'parse closed');
const t1 = parseAdminSetExamOpenBody({ mode: 'TCG01' });
assert(t1.ok && t1.is_open && t1.open_turmas[0] === 'TCG01', 'parse TCG01');
const both = parseAdminSetExamOpenBody({ isOpen: true, openTurmas: ['TCG01', 'TCG02'] });
assert(!both.ok, 'rejeita duas turmas');

const examOpen = { is_open: true, open_turmas: ['TCG01'] };
assert(isExamOpenForUser(examOpen, { turma: 'TCG01' }) === true, 'aluno TCG01 ok');
assert(isExamOpenForUser(examOpen, { turma: 'TCG02' }) === false, 'aluno TCG02 bloqueado');
assert(isExamOpenForUser({ is_open: true, open_turmas: [] }, { turma: 'TCG01' }) === false, 'sem turma = ninguém');

const counts = countAttemptsByStatus([
  { status: 'in_progress' },
  { status: 'submitted' },
  { status: 'timed_out' },
  { status: 'graded' },
]);
assert(counts.inProgress === 1 && counts.awaitingGrade === 2 && counts.graded === 1 && counts.total === 4, 'counts');

if (errors.length) {
  console.error('prova-d1-smoke FAIL:');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}

console.log('prova-d1-smoke OK');
