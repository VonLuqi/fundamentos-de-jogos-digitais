/**
 * Helpers de tentativa / DTO — Prova Módulo 1 (server-only).
 */

import {
  EXAM_ID,
  EXAM_TITLE,
  QUESTION_COUNT,
  TOTAL_POINTS,
  getQuestionById,
  isDiscursiveQuestionId,
  isMcQuestionId,
  sanitizeQuestionsForClient,
  gradeMultipleChoice,
  normalizeMcChoice,
} from './index.js';
import { examGateFromRow } from './exam-gate.js';
import { parseAttemptAdminNotes } from './admin-grade.js';
import { contestDtoFromAttempt } from './contest.js';
import {
  MC_JUSTIFICATIONS,
  getMcCorrectChoice,
} from './answer-key-modulo1.js';
import {
  DISCURSIVE_POINTS_EACH,
} from './questions-modulo1.js';
import {
  getMcAnswerKeyForTurma,
  getQuestionsForTurma,
  resolveQuestionBankTurma,
} from './questions-by-turma.js';

export const DEFAULT_EXAM_ID = EXAM_ID;

export function serverNowIso() {
  return new Date().toISOString();
}

export function remainingMs(endsAt, nowMs = Date.now()) {
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - nowMs);
}

export function isPastEndsAt(endsAt, nowMs = Date.now()) {
  return remainingMs(endsAt, nowMs) <= 0;
}

/**
 * Gate v1: is_open + exatamente 1 turma em open_turmas + aluno nessa turma.
 * is_open com open_turmas vazio = fechada.
 */
export function isExamOpenForUser(exam, user) {
  const gate = examGateFromRow(exam);
  if (!gate.isOpen || !gate.openTurma) return false;

  const now = Date.now();
  if (exam.opens_at) {
    const opens = new Date(exam.opens_at).getTime();
    if (!Number.isNaN(opens) && now < opens) return false;
  }
  if (exam.closes_at) {
    const closes = new Date(exam.closes_at).getTime();
    if (!Number.isNaN(closes) && now > closes) return false;
  }

  if (!user?.turma || user.turma !== gate.openTurma) return false;
  return true;
}

export function examPublicDto(exam) {
  if (!exam) return null;
  const gate = examGateFromRow(exam);
  return {
    id: exam.id,
    title: exam.title || EXAM_TITLE,
    durationMinutes: Number(exam.duration_minutes) || 90,
    totalPoints: Number(exam.total_points) || TOTAL_POINTS,
    isOpen: gate.isOpen,
    openTurmas: gate.openTurmas,
    openTurma: gate.openTurma,
    gateState: gate.state,
    opensAt: exam.opens_at || null,
    closesAt: exam.closes_at || null,
  };
}

/**
 * DTO da tentativa para o aluno.
 * Antes de graded: sem notas parciais.
 * Após graded: finalScore + breakdown; gabarito detalhado vai em `review`.
 */
export function attemptStudentDto(attempt, { nowMs = Date.now() } = {}) {
  if (!attempt) return null;
  const status = attempt.status;
  const dto = {
    id: attempt.id,
    examId: attempt.exam_id,
    status,
    startedAt: attempt.started_at,
    endsAt: attempt.ends_at,
    remainingMs: status === 'in_progress'
      ? remainingMs(attempt.ends_at, nowMs)
      : 0,
    currentQuestionIndex: Number(attempt.current_question_index) || 0,
    submittedAt: attempt.submitted_at || null,
  };
  if (status === 'submitted' || status === 'timed_out') {
    dto.awaitingGrade = true;
  }
  if (status === 'graded') {
    dto.awaitingGrade = false;
    dto.finalScore = attempt.final_score != null ? Number(attempt.final_score) : null;
    dto.mcScore = attempt.mc_score != null ? Number(attempt.mc_score) : null;
    dto.discursiveScore = attempt.discursive_score != null
      ? Number(attempt.discursive_score)
      : null;
    dto.mcMax = 12;
    dto.discursiveMax = 8;
    dto.totalMax = TOTAL_POINTS;
    dto.gradedAt = attempt.graded_at || null;
  }
  dto.contest = contestDtoFromAttempt(attempt);
  return dto;
}

/**
 * Gabarito + comentários para o aluno — só após `graded`.
 * MC: escolha do aluno, correta, acerto, justificativa curta.
 * Discursiva: texto, pontos, comentário do Mestre (sem rubrica interna).
 *
 * @param {object} attempt
 * @param {Array<object>} answerRows
 * @param {{ turma?: string|null }} [opts]
 * @returns {null|{ generalNote: string, items: Array<object>, questionBank?: string }}
 */
export function buildStudentReview(attempt, answerRows, { turma = null } = {}) {
  if (!attempt || attempt.status !== 'graded') return null;

  const byId = new Map();
  for (const row of answerRows || []) {
    if (row?.question_id) byId.set(String(row.question_id), row);
  }
  const notes = parseAttemptAdminNotes(attempt.admin_notes);
  const comments = notes.discursiveComments || {};
  const questions = getQuestionsForTurma(turma);
  const answerKey = getMcAnswerKeyForTurma(turma);

  const items = questions.map((q) => {
    const row = byId.get(q.id) || null;
    const base = {
      questionId: q.id,
      number: q.number,
      type: q.type,
      title: q.title || null,
      prompt: q.prompt,
    };

    if (q.type === 'mc') {
      const studentChoice = row?.choice || null;
      const correctChoice = getMcCorrectChoice(q.id, answerKey);
      let isCorrect = row?.is_correct == null ? null : Boolean(row.is_correct);
      if (isCorrect == null && correctChoice) {
        isCorrect = studentChoice === correctChoice;
      }
      const pointsAwarded = row?.points_awarded != null
        ? Number(row.points_awarded)
        : (isCorrect ? 1 : 0);
      return {
        ...base,
        choices: q.choices || null,
        studentChoice,
        correctChoice,
        isCorrect: Boolean(isCorrect),
        pointsAwarded,
        maxPoints: 1,
        comment: MC_JUSTIFICATIONS[q.id] || '',
      };
    }

    const pointsAwarded = row?.points_awarded != null
      ? Number(row.points_awarded)
      : 0;
    return {
      ...base,
      studentText: row?.text_answer != null ? String(row.text_answer) : '',
      pointsAwarded,
      maxPoints: DISCURSIVE_POINTS_EACH,
      comment: comments[q.id] || '',
    };
  });

  return {
    generalNote: notes.general || '',
    questionBank: resolveQuestionBankTurma(turma),
    items,
  };
}

export function answersToClientMap(rows) {
  /** @type {Record<string, { choice?: string|null, textAnswer?: string|null }>} */
  const out = {};
  for (const row of rows || []) {
    const id = row.question_id;
    if (!id) continue;
    out[id] = {
      choice: row.choice || null,
      textAnswer: row.text_answer != null ? String(row.text_answer) : null,
    };
  }
  return out;
}

export function clampQuestionIndex(index) {
  const n = Number(index);
  if (!Number.isInteger(n)) return null;
  if (n < 0 || n >= QUESTION_COUNT) return null;
  return n;
}

/**
 * Valida payload de saveAnswer.
 * @returns {{ ok: true, questionId: string, choice: string|null, textAnswer: string|null }|{ ok: false, error: string }}
 */
export function parseSaveAnswerPayload(body) {
  const questionId = String(body?.questionId ?? body?.question_id ?? '').trim();
  if (!questionId || !getQuestionById(questionId)) {
    return { ok: false, error: 'Questão inválida.' };
  }

  if (isMcQuestionId(questionId)) {
    const choice = normalizeMcChoice(body?.choice);
    if (!choice) {
      return { ok: false, error: 'Escolha uma alternativa (A–E).' };
    }
    return { ok: true, questionId, choice, textAnswer: null };
  }

  if (isDiscursiveQuestionId(questionId)) {
    const raw = body?.textAnswer ?? body?.text_answer ?? '';
    const textAnswer = String(raw);
    if (textAnswer.length > 12000) {
      return { ok: false, error: 'Resposta longa demais (máx. 12000 caracteres).' };
    }
    return { ok: true, questionId, choice: null, textAnswer };
  }

  return { ok: false, error: 'Tipo de questão inválido.' };
}

/**
 * Aplica correção MC nas linhas e retorna updates + mcScore.
 * @param {Array<{ question_id: string, choice?: string|null }>} answerRows
 * @param {{ turma?: string|null }} [opts]
 */
export function buildMcGradeUpdates(answerRows, { turma = null } = {}) {
  const map = {};
  for (const row of answerRows || []) {
    map[row.question_id] = row.choice;
  }
  const graded = gradeMultipleChoice(map, { answerKey: getMcAnswerKeyForTurma(turma) });
  const updates = graded.results.map((r) => ({
    questionId: r.questionId,
    isCorrect: r.isCorrect,
    pointsAwarded: r.pointsAwarded,
    choice: r.choice,
  }));
  return { mcScore: graded.mcScore, updates, graded };
}

export function studentAttemptPayload(attempt, answerRows, { nowMs = Date.now(), turma = null } = {}) {
  const questions = getQuestionsForTurma(turma);
  const payload = {
    serverNow: new Date(nowMs).toISOString(),
    exam: {
      id: attempt.exam_id,
      title: EXAM_TITLE,
      durationMinutes: null,
      totalPoints: TOTAL_POINTS,
      questionBank: resolveQuestionBankTurma(turma),
    },
    attempt: attemptStudentDto(attempt, { nowMs }),
    questions: sanitizeQuestionsForClient(questions),
    answers: answersToClientMap(answerRows),
  };
  if (attempt.status === 'graded') {
    payload.review = buildStudentReview(attempt, answerRows, { turma });
  }
  return payload;
}

/**
 * Garante que o JSON do aluno não vaza gabarito / rubricas.
 * Após graded, `review` pode trazer correctChoice/justificativas — é intencional.
 * @param {object} payload
 * @param {{ allowGradedReview?: boolean }} [opts]
 */
export function assertNoAnswerKeyLeak(payload, opts = {}) {
  const allowGradedReview = Boolean(opts.allowGradedReview);
  let check = payload;
  if (allowGradedReview && payload && typeof payload === 'object' && payload.review) {
    check = { ...payload };
    delete check.review;
  }
  const raw = JSON.stringify(check);
  if (/correctChoice|MC_ANSWER_KEY|MC_JUSTIFICATIONS|DISCURSIVE_RUBRICS|justification|rubricHints|\brubric\b/i.test(raw)) {
    throw new Error('Leak de gabarito no payload do aluno.');
  }
  return true;
}
