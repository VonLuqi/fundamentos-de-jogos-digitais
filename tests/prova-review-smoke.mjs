/**
 * Smoke — gabarito / review do aluno após graded
 * Uso: node tests/prova-review-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertNoAnswerKeyLeak,
  buildStudentReview,
  studentAttemptPayload,
} from '../api/_lib/prova/attempt-dto.js';
import { MC_ANSWER_KEY } from '../api/_lib/prova/answer-key-modulo1.js';
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

const html = read('pages/prova.html');
const js = read('js/prova.js');
const css = read('css/prova.css');
const dto = read('api/_lib/prova/attempt-dto.js');
const handler = read('api/prova.js');
const pkg = read('package.json');

assert(html.includes('prova-done-review'), 'HTML review');
assert(html.includes('prova-done-review-list'), 'HTML lista review');
assert(js.includes('renderReview'), 'JS renderReview');
assert(js.includes('loadDoneWithReview') || js.includes('openDonePanel'), 'JS carrega review');
assert(js.includes('payload.review'), 'JS usa payload.review');
assert(css.includes('.prova-review'), 'CSS review');
assert(dto.includes('buildStudentReview'), 'DTO buildStudentReview');
assert(handler.includes('allowGradedReview'), 'API allowGradedReview no getAttempt');
assert(PROVA_COPY.doneReviewTitle.toLowerCase().includes('gabarito'), 'copy gabarito');
assert(pkg.includes('prova-review-smoke.mjs'), 'npm check inclui review smoke');

const attempt = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  exam_id: 'modulo1-provacao',
  status: 'graded',
  started_at: '2026-01-01T10:00:00Z',
  ends_at: '2026-01-01T11:30:00Z',
  submitted_at: '2026-01-01T11:00:00Z',
  current_question_index: 0,
  mc_score: 2,
  discursive_score: 1,
  final_score: 3,
  graded_at: '2026-01-01T12:00:00Z',
  admin_notes: JSON.stringify({
    discursiveComments: { q13: 'Explicou o círculo bem.' },
    general: 'Boa prova.',
  }),
};

const rows = [
  { question_id: 'q01', choice: MC_ANSWER_KEY.q01, is_correct: true, points_awarded: 1 },
  { question_id: 'q02', choice: 'A', is_correct: false, points_awarded: 0 },
  { question_id: 'q13', text_answer: 'Contrato de regras ao apertar Play.', points_awarded: 1 },
];

assert(buildStudentReview({ ...attempt, status: 'submitted' }, rows) === null, 'sem review antes do graded');

const review = buildStudentReview(attempt, rows);
assert(review && review.items.length === 20, '20 itens no review');
assert(review.generalNote === 'Boa prova.', 'nota geral');
const q01 = review.items.find((i) => i.questionId === 'q01');
assert(q01?.correctChoice === MC_ANSWER_KEY.q01 && q01.isCorrect === true, 'MC acerto + gabarito');
assert(q01?.comment, 'MC tem justificativa');
const q02 = review.items.find((i) => i.questionId === 'q02');
assert(q02?.isCorrect === false && q02.studentChoice === 'A', 'MC erro');
const q13 = review.items.find((i) => i.questionId === 'q13');
assert(q13?.comment.includes('círculo') && q13.pointsAwarded === 1, 'discursiva com comentário');
assert(!('rubric' in q13), 'sem rubrica interna na discursiva');

const payload = studentAttemptPayload(attempt, rows);
assert(payload.review?.items?.length === 20, 'payload inclui review');
assertNoAnswerKeyLeak(payload, { allowGradedReview: true });
let blocked = false;
try {
  assertNoAnswerKeyLeak(payload);
} catch {
  blocked = true;
}
assert(blocked, 'sem allowGradedReview bloqueia leak');

const waitingPayload = studentAttemptPayload({ ...attempt, status: 'submitted', final_score: null }, rows);
assert(!waitingPayload.review, 'submitted sem review');
assertNoAnswerKeyLeak(waitingPayload);

if (errors.length) {
  console.error('FALHAS prova-review-smoke:');
  for (const e of errors) console.error(`  · ${e}`);
  process.exit(1);
}

console.log('OK prova-review-smoke');
console.log('  · review pós-graded com MC + discursivas');
console.log('  · gabarito/comentários só após Fechar nota');
