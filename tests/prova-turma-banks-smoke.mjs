/**
 * Smoke — bancos de questões por turma (TCG01 variante / TCG02 canônico).
 * Uso: node tests/prova-turma-banks-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MC_ANSWER_KEY,
  QUESTIONS,
  gradeMultipleChoice,
} from '../api/_lib/prova/index.js';
import {
  MC_ANSWER_KEY_TCG01,
  QUESTIONS_TCG01,
} from '../api/_lib/prova/questions-modulo1-tcg01.js';
import {
  getMcAnswerKeyForTurma,
  getQuestionsForTurma,
  resolveQuestionBankTurma,
} from '../api/_lib/prova/questions-by-turma.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(QUESTIONS.length === 20, 'TCG02 tem 20 questões');
assert(QUESTIONS_TCG01.length === 20, 'TCG01 tem 20 questões');
assert(resolveQuestionBankTurma('TCG01') === 'TCG01', 'TCG01 bank');
assert(resolveQuestionBankTurma('TCG02') === 'TCG02', 'TCG02 bank');
assert(resolveQuestionBankTurma(null) === 'TCG02', 'default TCG02');
assert(getQuestionsForTurma('TCG01') === QUESTIONS_TCG01, 'getQuestions TCG01');
assert(getQuestionsForTurma('TCG02') === QUESTIONS, 'getQuestions TCG02');

const ids02 = QUESTIONS.map((q) => q.id).join(',');
const ids01 = QUESTIONS_TCG01.map((q) => q.id).join(',');
assert(ids01 === ids02, 'mesmos IDs q01–q20');

let differingLetters = 0;
for (const id of Object.keys(MC_ANSWER_KEY)) {
  assert(MC_ANSWER_KEY_TCG01[id], `gabarito TCG01 cobre ${id}`);
  if (MC_ANSWER_KEY[id] !== MC_ANSWER_KEY_TCG01[id]) differingLetters += 1;
}
assert(differingLetters === 12, `todas as 12 letras MC diferem (veio ${differingLetters})`);

// Mesma escolha “B” no q01: correta no TCG02, errada no TCG01
const g02 = gradeMultipleChoice({ q01: 'B' }, { answerKey: getMcAnswerKeyForTurma('TCG02') });
const g01 = gradeMultipleChoice({ q01: 'B' }, { answerKey: getMcAnswerKeyForTurma('TCG01') });
assert(g02.results[0].isCorrect === true, 'q01=B certa no TCG02');
assert(g01.results[0].isCorrect === false, 'q01=B errada no TCG01 (anti-cola)');

const g01ok = gradeMultipleChoice({ q01: 'D' }, { answerKey: getMcAnswerKeyForTurma('TCG01') });
assert(g01ok.results[0].isCorrect === true, 'q01=D certa no TCG01');

// Enunciados não são cópia byte-a-byte
let reworded = 0;
for (let i = 0; i < 20; i += 1) {
  if (QUESTIONS[i].prompt !== QUESTIONS_TCG01[i].prompt) reworded += 1;
}
assert(reworded >= 12, `enunciados reescritos (>=12), veio ${reworded}`);

const handler = fs.readFileSync(path.join(root, 'api/prova.js'), 'utf8');
assert(handler.includes('turma: user.turma'), 'API passa turma do aluno');
assert(fs.existsSync(path.join(root, 'api/_lib/prova/questions-modulo1-tcg01.js')), 'arquivo TCG01');

if (errors.length) {
  console.error('prova-turma-banks-smoke FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('prova-turma-banks-smoke OK');
