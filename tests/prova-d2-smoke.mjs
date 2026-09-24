/**
 * Smoke Task D2 — hub admin lista de tentativas
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-d2-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROVA_ALERT_BLUR_MIN,
  attemptAdminListItem,
  attemptHasAlerts,
  filterAdminAttemptItems,
  normalizeAttemptStatusFilter,
  normalizeTurmaFilter,
  sortAdminAttemptItems,
} from '../api/_lib/prova/admin-list.js';

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
  'api/_lib/prova/admin-list.js',
  'api/prova.js',
  'pages/prova-admin.html',
  'js/prova-admin.js',
  'css/prova-admin.css',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const handler = read('api/prova.js');
const apiJs = read('js/api.js');
const html = read('pages/prova-admin.html');
const js = read('js/prova-admin.js');
const dashJs = read('js/dashboard.js');
const pkg = read('package.json');
const plano = read('docs/plano-prova-modulo1-online.md');

assert(handler.includes("action === 'adminListAttempts'"), 'API adminListAttempts');
assert(apiJs.includes('provaAdminListAttempts'), 'wrapper client');
assert(apiJs.includes("provaAdmin: ()"), 'ROUTES.provaAdmin');
assert(html.includes('prova-admin-filter-turma'), 'filtro turma');
assert(html.includes('prova-admin-filter-status'), 'filtro status');
assert(html.includes('prova-admin-filter-alerts'), 'filtro alertas');
assert(html.includes('prova-admin-table'), 'tabela');
assert(html.includes('data-role-scope="admin"'), 'página admin-only');
assert(js.includes('requireAdmin'), 'requireAdmin');
assert(js.includes('provaAdminListAttempts'), 'JS lista');
assert(dashJs.includes('provaAdmin()') || dashJs.includes('ROUTES.provaAdmin'), 'dashboard link hub');
assert(pkg.includes('js/prova-admin.js'), 'npm check prova-admin.js');
assert(/Task D2[\s\S]*\[x\].*adminListAttempts|Task D2[\s\S]*\[x\].*prova-admin/i.test(plano), 'plano D2');

assert(PROVA_ALERT_BLUR_MIN === 3, 'limiar blur 3');
assert(normalizeAttemptStatusFilter('in_progress') === 'in_progress', 'status ok');
assert(normalizeAttemptStatusFilter('awaiting') === 'awaiting', 'awaiting');
assert(normalizeAttemptStatusFilter('nope') === null, 'status inválido');
assert(normalizeTurmaFilter('tcg01') === 'TCG01', 'turma');
assert(normalizeTurmaFilter('x') === null, 'turma inválida');

const item = attemptAdminListItem(
  {
    id: 'a1',
    exam_id: 'modulo1-provacao',
    user_id: 2,
    status: 'submitted',
    started_at: '2026-01-01T10:00:00Z',
    ends_at: '2026-01-01T11:30:00Z',
    submitted_at: '2026-01-01T11:00:00Z',
    current_question_index: 5,
    mc_score: 10,
    final_score: null,
    integrity_summary: { blurCount: 3, leaveCount: 1 },
  },
  { id: 2, full_name: 'Ana', username: 'ana', turma: 'TCG01' },
);
assert(item.blurCount === 3 && item.hasAlerts === true, 'alerts');
assert(item.mcScore === 10, 'mcScore admin');
assert(item.student.turma === 'TCG01', 'student turma');
assert(attemptHasAlerts({ blurCount: 2, leaveCount: 0 }) === false, 'sem alerta');
assert(attemptHasAlerts({ blurCount: 0, leaveCount: 1 }) === true, 'leave alerta');

const filtered = filterAdminAttemptItems(
  [
    item,
    attemptAdminListItem(
      {
        id: 'a2',
        exam_id: 'modulo1-provacao',
        user_id: 3,
        status: 'in_progress',
        started_at: '2026-01-01T10:00:00Z',
        ends_at: '2026-01-01T12:00:00Z',
        integrity_summary: {},
      },
      { id: 3, full_name: 'Bia', username: 'bia', turma: 'TCG02' },
    ),
  ],
  { turma: 'TCG01', alertsOnly: true },
);
assert(filtered.length === 1 && filtered[0].id === 'a1', 'filtros');

const awaiting = filterAdminAttemptItems(
  [item, { ...item, id: 'a3', status: 'timed_out', hasAlerts: false, student: { turma: 'TCG01' } }],
  { status: 'awaiting' },
);
assert(awaiting.length === 2, 'awaiting = submitted+timed_out');

const sorted = sortAdminAttemptItems([
  { id: 'x', hasAlerts: false, status: 'graded', student: { fullName: 'Zed' } },
  { id: 'y', hasAlerts: true, status: 'submitted', student: { fullName: 'Ana' } },
]);
assert(sorted[0].id === 'y', 'alertas primeiro');

if (errors.length) {
  console.error('prova-d2-smoke FAIL:');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}

console.log('prova-d2-smoke OK');
