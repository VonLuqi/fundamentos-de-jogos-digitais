/**
 * Resolve banco de questões / gabarito MC por turma.
 * TCG02 (e default) = banco canônico atual.
 * TCG01 = variante com enunciados parecidos e letras MC diferentes.
 */

import { QUESTIONS } from './questions-modulo1.js';
import { MC_ANSWER_KEY } from './answer-key-modulo1.js';
import {
  MC_ANSWER_KEY_TCG01,
  QUESTIONS_TCG01,
} from './questions-modulo1-tcg01.js';

export const PROVA_DEFAULT_TURMA_BANK = 'TCG02';

/**
 * @param {unknown} turma
 * @returns {'TCG01'|'TCG02'|null}
 */
export function normalizeProvaTurma(turma) {
  const t = String(turma || '').trim().toUpperCase();
  if (t === 'TCG01' || t === 'TCG02') return t;
  return null;
}

/**
 * Qual banco de enunciados usar para a turma do aluno.
 * @param {unknown} turma
 * @returns {'TCG01'|'TCG02'}
 */
export function resolveQuestionBankTurma(turma) {
  const t = normalizeProvaTurma(turma);
  return t === 'TCG01' ? 'TCG01' : PROVA_DEFAULT_TURMA_BANK;
}

/**
 * @param {unknown} turma
 * @returns {ReadonlyArray<object>}
 */
export function getQuestionsForTurma(turma) {
  return resolveQuestionBankTurma(turma) === 'TCG01' ? QUESTIONS_TCG01 : QUESTIONS;
}

/**
 * @param {unknown} turma
 * @returns {Readonly<Record<string, 'A'|'B'|'C'|'D'|'E'>>}
 */
export function getMcAnswerKeyForTurma(turma) {
  return resolveQuestionBankTurma(turma) === 'TCG01' ? MC_ANSWER_KEY_TCG01 : MC_ANSWER_KEY;
}

/**
 * @param {string} questionId
 * @param {unknown} turma
 */
export function getQuestionByIdForTurma(questionId, turma) {
  const id = String(questionId || '');
  return getQuestionsForTurma(turma).find((q) => q.id === id) || null;
}
