/**
 * Smoke Task D4 — visão do aluno pós-envio / nota liberada
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-d4-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attemptStudentDto } from '../api/_lib/prova/attempt-dto.js';
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

['pages/prova.html', 'js/prova.js', 'js/prova/copy.js', 'css/prova.css'].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const html = read('pages/prova.html');
const js = read('js/prova.js');
const css = read('css/prova.css');
const plano = read('docs/plano-prova-modulo1-online.md');

assert(html.includes('prova-done-result'), 'HTML resultado graded');
assert(html.includes('prova-done-breakdown'), 'HTML breakdown');
assert(html.includes('prova-done-review'), 'HTML gabarito/review');
assert(html.includes('prova-btn-refresh-status'), 'botão atualizar status');
assert(js.includes('refreshDoneStatus'), 'JS refresh status');
assert(js.includes('renderReview') || js.includes('done-review'), 'JS pinta gabarito');
assert(js.includes('doneBreakdown') || js.includes('prova-done-mc-value') || js.includes('doneMcValue'), 'pinta breakdown');
assert(js.includes('PROVA_COPY.doneHeading') || js.includes('doneHeading'), 'usa copy awaiting');
assert(css.includes('.prova-result'), 'CSS resultado');
assert(css.includes('.prova-review'), 'CSS review');
assert(PROVA_COPY.doneHeading.toLowerCase().includes('aguardando'), 'copy aguardando');
assert(/Task D4[\s\S]*\[x\].*Aguardando|Task D4[\s\S]*\[x\].*breakdown/i.test(plano), 'plano D4');

const waiting = attemptStudentDto({
  id: '1',
  exam_id: 'modulo1-provacao',
  status: 'submitted',
  started_at: '2026-01-01T10:00:00Z',
  ends_at: '2026-01-01T11:30:00Z',
  submitted_at: '2026-01-01T11:00:00Z',
  current_question_index: 19,
  mc_score: 10,
  final_score: null,
});
assert(waiting.awaitingGrade === true, 'submitted awaiting');
assert(waiting.finalScore === undefined && waiting.mcScore === undefined, 'sem nota parcial antes do graded');

const graded = attemptStudentDto({
  id: '1',
  exam_id: 'modulo1-provacao',
  status: 'graded',
  started_at: '2026-01-01T10:00:00Z',
  ends_at: '2026-01-01T11:30:00Z',
  submitted_at: '2026-01-01T11:00:00Z',
  current_question_index: 19,
  mc_score: 10,
  discursive_score: 6.5,
  final_score: 16.5,
  graded_at: '2026-01-01T12:00:00Z',
});
assert(graded.awaitingGrade === false, 'graded not awaiting');
assert(graded.finalScore === 16.5 && graded.mcScore === 10 && graded.discursiveScore === 6.5, 'breakdown scores');
assert(graded.mcMax === 12 && graded.discursiveMax === 8 && graded.totalMax === 20, 'max caps');
assert(!('correctChoice' in graded), 'sem gabarito no DTO aluno');

if (errors.length) {
  console.error('prova-d4-smoke FAIL:');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}

console.log('prova-d4-smoke OK');
