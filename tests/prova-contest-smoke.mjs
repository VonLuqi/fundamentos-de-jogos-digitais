/**
 * Smoke — contestação de nota (aluno + admin)
 * Uso: node tests/prova-contest-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contestDtoFromAttempt,
  normalizeContestAdminAction,
  normalizeContestMessage,
  PROVA_CONTEST_MESSAGE_MAX,
} from '../api/_lib/prova/contest.js';
import { attemptStudentDto } from '../api/_lib/prova/attempt-dto.js';
import { buildAdminAttemptDetail } from '../api/_lib/prova/admin-grade.js';
import { ADMIN_AUDIT_ACTIONS } from '../api/_lib/admin-audit.js';
import { PROVA_COPY } from '../js/prova/copy.js';

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

const migration = read('db/migrate-2026-09-24-prova-contestacao.sql');
const contestLib = read('api/_lib/prova/contest.js');
const handler = read('api/prova.js');
const apiJs = read('js/api.js');
const studentJs = read('js/prova.js');
const adminJs = read('js/prova-admin.js');
const studentHtml = read('pages/prova.html');
const adminHtml = read('pages/prova-admin.html');
const adminCss = read('css/prova-admin.css');
const pkg = read('package.json');

assert(migration.includes('contest_status'), 'migration contest_status');
assert(migration.includes('contest_student_message'), 'migration student message');
assert(contestLib.includes('contestDtoFromAttempt'), 'contest.js DTO');
assert(handler.includes("action === 'contestGrade'"), 'API contestGrade');
assert(handler.includes("action === 'adminRespondContest'"), 'API adminRespondContest');
assert(handler.includes("action === 'adminResetAttempt'"), 'API adminResetAttempt');
assert(handler.includes("action === 'adminResetAllAttempts'"), 'API adminResetAllAttempts');
assert(handler.includes('ADMIN_AUDIT_ACTIONS.respondProvaContest'), 'audit respond');
assert(handler.includes('ADMIN_AUDIT_ACTIONS.reopenProvaGrade'), 'audit reopen');
assert(handler.includes('ADMIN_AUDIT_ACTIONS.resetProvaAttempt'), 'audit reset');
assert(handler.includes('ADMIN_AUDIT_ACTIONS.resetAllProvaAttempts'), 'audit reset all');
assert(apiJs.includes('provaContestGrade'), 'client provaContestGrade');
assert(apiJs.includes('provaAdminRespondContest'), 'client provaAdminRespondContest');
assert(apiJs.includes('provaAdminResetAttempt'), 'client provaAdminResetAttempt');
assert(apiJs.includes('provaAdminResetAllAttempts'), 'client provaAdminResetAllAttempts');
assert(studentHtml.includes('prova-done-contest'), 'HTML contest aluno');
assert(studentJs.includes('renderContest'), 'JS renderContest');
assert(studentJs.includes('submitContest'), 'JS submitContest');
assert(adminHtml.includes('prova-admin-contest'), 'HTML contest admin');
assert(adminHtml.includes('prova-admin-reset'), 'HTML reset admin');
assert(adminHtml.includes('prova-admin-reset-all'), 'HTML reset all');
assert(adminHtml.includes('prova-admin-dialog-reset'), 'HTML dialog reset');
assert(adminCss.includes('prova-admin-detail[hidden]'), 'CSS detail hidden');
assert(adminJs.includes('paintContestPanel'), 'JS paintContestPanel');
assert(adminJs.includes('resetAttempt'), 'JS resetAttempt');
assert(adminJs.includes('resetAllAttempts'), 'JS resetAllAttempts');
assert(adminJs.includes("respondContest('answer')"), 'JS answer contest');
assert(adminJs.includes("respondContest('reopen')"), 'JS reopen contest');
assert(PROVA_COPY.contestTitle.toLowerCase().includes('contestar'), 'copy contest');
assert(ADMIN_AUDIT_ACTIONS.respondProvaContest, 'audit action respond');
assert(ADMIN_AUDIT_ACTIONS.reopenProvaGrade, 'audit action reopen');
assert(ADMIN_AUDIT_ACTIONS.resetProvaAttempt, 'audit action reset');
assert(handler.includes('contestMessage'), 'API finalize com contestMessage');
assert(adminHtml.includes('prova-admin-dialog-finalize-message'), 'HTML mensagem na revisão');
assert(adminJs.includes('contestMessage'), 'JS envia contestMessage no finalize');
assert(pkg.includes('prova-contest-smoke.mjs'), 'npm check inclui contest smoke');
assert(pkg.includes('api/_lib/prova/contest.js'), 'npm check inclui contest.js');

assert(normalizeContestMessage('') === null, 'mensagem vazia');
assert(normalizeContestMessage('  ok  ') === 'ok', 'mensagem trim');
assert(normalizeContestMessage('x'.repeat(PROVA_CONTEST_MESSAGE_MAX + 1)) === null, 'mensagem longa');
assert(normalizeContestAdminAction('answer') === 'answer', 'action answer');
assert(normalizeContestAdminAction('reabrir') === 'reopen', 'action reopen');
assert(normalizeContestAdminAction('nope') === null, 'action inválida');

const graded = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  exam_id: 'modulo1-provacao',
  user_id: 1,
  status: 'graded',
  started_at: '2026-01-01T10:00:00Z',
  ends_at: '2026-01-01T11:30:00Z',
  submitted_at: '2026-01-01T11:00:00Z',
  current_question_index: 0,
  mc_score: 10,
  discursive_score: 6,
  final_score: 16,
  graded_at: '2026-01-01T12:00:00Z',
  contest_status: null,
};

const dto = contestDtoFromAttempt(graded);
assert(dto.canContest === true, 'pode contestar após graded');
assert(dto.isOpen === false, 'não está open');

const open = contestDtoFromAttempt({
  ...graded,
  contest_status: 'open',
  contest_student_message: 'Acho que a q15 valia mais.',
});
assert(open.canContest === false, 'não contesta de novo com open');
assert(open.isOpen === true, 'isOpen');

const student = attemptStudentDto({
  ...graded,
  contest_status: 'answered',
  contest_student_message: 'q15',
  contest_admin_message: 'Mantive a nota.',
});
assert(student.contest?.status === 'answered', 'DTO aluno traz contest');
assert(student.contest?.canContest === true, 'pode contestar de novo após answered');

const detail = buildAdminAttemptDetail(
  {
    ...graded,
    contest_status: 'open',
    contest_student_message: 'Reveja a q16',
  },
  { id: 1, full_name: 'Aluno', username: 'aluno', turma: 'A' },
  [],
  [],
);
assert(detail.contest?.isOpen === true, 'admin detail contest open');
assert(detail.grading?.canReopen === true, 'admin canReopen com contest open');

if (errors.length) {
  console.error('prova-contest-smoke FAIL:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log('prova-contest-smoke OK');
