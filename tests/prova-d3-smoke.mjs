/**
 * Smoke Task D3 — correção manual + finalize
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-d3-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAdminAttemptDetail,
  normalizeAttemptId,
  normalizeDiscursiveQuestionId,
  parseAttemptAdminNotes,
  serializeAttemptAdminNotes,
  sumDiscursivePoints,
} from '../api/_lib/prova/admin-grade.js';
import { normalizeDiscursivePoints } from '../api/_lib/prova/answer-key-modulo1.js';

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
  'api/_lib/prova/admin-grade.js',
  'api/prova.js',
  'js/prova-admin.js',
  'pages/prova-admin.html',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const handler = read('api/prova.js');
const apiJs = read('js/api.js');
const js = read('js/prova-admin.js');
const html = read('pages/prova-admin.html');
const pkg = read('package.json');
const plano = read('docs/plano-prova-modulo1-online.md');

assert(handler.includes("action === 'adminGetAttempt'"), 'API adminGetAttempt');
assert(handler.includes("action === 'adminScoreDiscursive'"), 'API adminScoreDiscursive');
assert(handler.includes("action === 'adminFinalizeGrade'"), 'API adminFinalizeGrade');
assert(apiJs.includes('provaAdminGetAttempt'), 'wrapper get');
assert(apiJs.includes('provaAdminScoreDiscursive'), 'wrapper score');
assert(apiJs.includes('provaAdminFinalizeGrade'), 'wrapper finalize');
assert(html.includes('prova-admin-detail'), 'HTML detalhe');
assert(html.includes('prova-admin-finalize'), 'HTML fechar nota');
assert(html.includes('prova-admin-integrity'), 'HTML timeline');
assert(js.includes('paintDetail'), 'JS paintDetail');
assert(js.includes('provaAdminFinalizeGrade'), 'JS finalize');
assert(js.includes('correctChoice') || js.includes('Gabarito'), 'mostra gabarito MC');
assert(pkg.includes('admin-grade.js') || pkg.includes('prova-admin.js'), 'npm check');
assert(/Task D3[\s\S]*\[x\].*adminFinalizeGrade|Task D3[\s\S]*\[x\].*Fechar nota/i.test(plano), 'plano D3');

assert(normalizeAttemptId('not-uuid') === null, 'uuid inválido');
assert(normalizeAttemptId('550e8400-e29b-41d4-a716-446655440000'), 'uuid ok');
assert(normalizeDiscursiveQuestionId('q13') === 'q13', 'q13 discursiva');
assert(normalizeDiscursiveQuestionId('q01') === null, 'q01 não discursiva');
assert(normalizeDiscursivePoints(0.5) === 0.5, 'points 0.5');
assert(normalizeDiscursivePoints(1.5) === null, 'points >1');

const notes = parseAttemptAdminNotes(JSON.stringify({
  discursiveComments: { q13: 'bom' },
  general: 'ok',
}));
assert(notes.discursiveComments.q13 === 'bom', 'parse comments');
const ser = serializeAttemptAdminNotes(notes);
assert(ser.includes('q13') && ser.includes('bom'), 'serialize');

assert(sumDiscursivePoints([
  { question_id: 'q13', points_awarded: 1 },
  { question_id: 'q14', points_awarded: 0.5 },
  { question_id: 'q01', points_awarded: 1 },
]) === 1.5, 'sum discursive');

const detail = buildAdminAttemptDetail(
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    exam_id: 'modulo1-provacao',
    user_id: 2,
    status: 'submitted',
    started_at: '2026-01-01T10:00:00Z',
    ends_at: '2026-01-01T11:30:00Z',
    submitted_at: '2026-01-01T11:00:00Z',
    current_question_index: 19,
    mc_score: 10,
    discursive_score: null,
    final_score: null,
    integrity_summary: { blurCount: 1, leaveCount: 0 },
    admin_notes: ser,
  },
  { id: 2, full_name: 'Ana', username: 'ana', turma: 'TCG01' },
  [
    { question_id: 'q01', choice: 'A', is_correct: true, points_awarded: 1 },
    { question_id: 'q13', text_answer: 'resposta', points_awarded: 1 },
  ],
  [{ id: 1, event_type: 'tab_blur', created_at: '2026-01-01T10:30:00Z', meta: {} }],
);
assert(detail.answers?.length === 20, `20 questões no detalhe, veio ${detail.answers?.length}`);
assert(detail.answers.find((a) => a.questionId === 'q01')?.correctChoice, 'MC com gabarito');
assert(detail.answers.find((a) => a.questionId === 'q13')?.rubric, 'discursiva com rubrica');
assert(detail.answers.find((a) => a.questionId === 'q13')?.comment === 'bom', 'comment');
assert(detail.grading.canScore === true, 'canScore');
assert(detail.grading.locked === false, 'not locked');
assert(detail.integrityEvents.length === 1, 'timeline');

const graded = buildAdminAttemptDetail(
  { ...detail, status: 'graded', final_score: 18, id: detail.id, exam_id: 'modulo1-provacao', user_id: 2, started_at: 'x', ends_at: 'y', integrity_summary: {} },
  { id: 2, full_name: 'Ana', turma: 'TCG01' },
  [],
  [],
);
// rebuild properly
const lockedDetail = buildAdminAttemptDetail(
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    exam_id: 'modulo1-provacao',
    user_id: 2,
    status: 'graded',
    started_at: '2026-01-01T10:00:00Z',
    ends_at: '2026-01-01T11:30:00Z',
    submitted_at: '2026-01-01T11:00:00Z',
    mc_score: 10,
    discursive_score: 8,
    final_score: 18,
    integrity_summary: {},
  },
  { id: 2, full_name: 'Ana', turma: 'TCG01' },
  [],
  [],
);
assert(lockedDetail.grading.locked === true, 'graded locked');
assert(lockedDetail.grading.canScore === false, 'graded no score');

if (errors.length) {
  console.error('prova-d3-smoke FAIL:');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}

console.log('prova-d3-smoke OK');
