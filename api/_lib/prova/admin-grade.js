/**
 * Correção admin — detalhe, nota discursiva, finalize (Task D3).
 */

import {
  DISCURSIVE_POINTS_EACH,
  getQuestionById,
  listDiscursiveQuestionIds,
} from './questions-modulo1.js';
import {
  normalizeDiscursivePoints,
  questionsForAdmin,
} from './answer-key-modulo1.js';
import { attemptAdminListItem } from './admin-list.js';

/** Teto do JSON em prova_attempts.admin_notes (alinha com CHECK no banco). */
export const ADMIN_NOTES_MAX = 24000;
/** Comentário por discursiva. */
export const ADMIN_COMMENT_MAX = 2000;
/** Nota geral do Mestre. */
export const ADMIN_GENERAL_NOTE_MAX = 4000;

function remainingMs(endsAt, nowMs = Date.now()) {
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - nowMs);
}

/**
 * @param {unknown} raw
 * @returns {{ discursiveComments: Record<string, string>, general: string }}
 */
export function parseAttemptAdminNotes(raw) {
  const empty = { discursiveComments: {}, general: '' };
  if (raw == null || raw === '') return empty;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const comments = raw.discursiveComments && typeof raw.discursiveComments === 'object'
      ? raw.discursiveComments
      : {};
    const out = {};
    for (const [k, v] of Object.entries(comments)) {
      out[String(k)] = String(v ?? '').slice(0, ADMIN_COMMENT_MAX);
    }
    return {
      discursiveComments: out,
      general: String(raw.general ?? raw.note ?? '').slice(0, ADMIN_GENERAL_NOTE_MAX),
    };
  }
  const text = String(raw);
  if (text.trim().startsWith('{')) {
    try {
      return parseAttemptAdminNotes(JSON.parse(text));
    } catch {
      /* fallthrough */
    }
  }
  return { discursiveComments: {}, general: text.slice(0, ADMIN_GENERAL_NOTE_MAX) };
}

/**
 * @param {{ discursiveComments?: Record<string, string>, general?: string }} notes
 * @returns {string}
 */
export function serializeAttemptAdminNotes(notes) {
  const discursiveComments = {};
  for (const [k, v] of Object.entries(notes?.discursiveComments || {})) {
    const t = String(v ?? '').trim();
    if (t) discursiveComments[k] = t.slice(0, ADMIN_COMMENT_MAX);
  }
  const general = String(notes?.general ?? '').trim().slice(0, ADMIN_GENERAL_NOTE_MAX);
  return JSON.stringify({ discursiveComments, general });
}

/**
 * @param {string} serialized
 * @returns {string|null} mensagem de erro amigável, ou null se ok
 */
export function validateSerializedAdminNotes(serialized) {
  const len = String(serialized || '').length;
  if (len <= ADMIN_NOTES_MAX) return null;
  return (
    `Anotações da correção muito longas (${len}/${ADMIN_NOTES_MAX} caracteres). `
    + `Encurte os comentários das discursivas (máx. ${ADMIN_COMMENT_MAX} cada).`
  );
}

/**
 * @param {Array<{ question_id?: string, points_awarded?: unknown }>|null|undefined} answerRows
 */
export function sumDiscursivePoints(answerRows) {
  let sum = 0;
  const ids = new Set(listDiscursiveQuestionIds());
  for (const row of answerRows || []) {
    const id = String(row?.question_id || '');
    if (!ids.has(id)) continue;
    const pts = normalizeDiscursivePoints(row.points_awarded);
    if (pts != null) sum += pts;
  }
  return Math.round(sum * 100) / 100;
}

/**
 * @param {Array<object>} answerRows
 * @param {{ discursiveComments?: Record<string, string> }} notes
 */
export function buildAdminAnswerDetails(answerRows, notes = {}) {
  const byId = new Map();
  for (const row of answerRows || []) {
    if (row?.question_id) byId.set(row.question_id, row);
  }
  const questions = questionsForAdmin();
  const comments = notes.discursiveComments || {};

  return questions.map((q) => {
    const row = byId.get(q.id) || null;
    const base = {
      questionId: q.id,
      number: q.number,
      type: q.type,
      title: q.title || null,
      prompt: q.prompt,
      choices: q.choices || null,
      studentChoice: row?.choice || null,
      studentText: row?.text_answer != null ? String(row.text_answer) : '',
      pointsAwarded: row?.points_awarded != null ? Number(row.points_awarded) : null,
      isCorrect: row?.is_correct == null ? null : Boolean(row.is_correct),
    };
    if (q.type === 'mc') {
      return {
        ...base,
        correctChoice: q.correctChoice || null,
        justification: q.justification || null,
      };
    }
    return {
      ...base,
      rubric: q.rubric || null,
      maxPoints: DISCURSIVE_POINTS_EACH,
      comment: comments[q.id] || '',
    };
  });
}

/**
 * @param {object} attempt
 * @param {object|null} userRow
 * @param {Array<object>} answerRows
 * @param {Array<object>} integrityEvents
 * @param {{ nowMs?: number }} [opts]
 */
export function buildAdminAttemptDetail(attempt, userRow, answerRows, integrityEvents, { nowMs = Date.now() } = {}) {
  const notes = parseAttemptAdminNotes(attempt.admin_notes);
  const listItem = attemptAdminListItem(attempt, userRow, { nowMs });
  const answers = buildAdminAnswerDetails(answerRows, notes);
  const discursiveIds = listDiscursiveQuestionIds();
  const scoredDiscursive = discursiveIds.filter((id) => {
    const row = (answerRows || []).find((a) => a.question_id === id);
    return normalizeDiscursivePoints(row?.points_awarded) != null;
  }).length;

  const canScore = attempt.status === 'submitted' || attempt.status === 'timed_out';
  const locked = attempt.status === 'graded';

  return {
    ...listItem,
    remainingMs: attempt.status === 'in_progress'
      ? remainingMs(attempt.ends_at, nowMs)
      : 0,
    adminNotesGeneral: notes.general,
    answers,
    contest: {
      status: attempt.contest_status || null,
      studentMessage: attempt.contest_student_message || null,
      adminMessage: attempt.contest_admin_message || null,
      contestedAt: attempt.contested_at || null,
      resolvedAt: attempt.contest_resolved_at || null,
      isOpen: attempt.contest_status === 'open',
    },
    integrityEvents: (integrityEvents || []).map((ev) => ({
      id: ev.id,
      eventType: ev.event_type,
      createdAt: ev.created_at,
      meta: ev.meta && typeof ev.meta === 'object' ? ev.meta : {},
    })),
    grading: {
      canScore,
      locked,
      discursiveScored: scoredDiscursive,
      discursiveTotal: discursiveIds.length,
      mcScore: attempt.mc_score != null ? Number(attempt.mc_score) : null,
      discursiveScore: attempt.discursive_score != null
        ? Number(attempt.discursive_score)
        : sumDiscursivePoints(answerRows),
      finalScore: attempt.final_score != null ? Number(attempt.final_score) : null,
      canFinalize: canScore && !locked,
      canReopen: locked && attempt.contest_status === 'open',
    },
  };
}

/**
 * @param {unknown} attemptId
 */
export function normalizeAttemptId(attemptId) {
  const id = String(attemptId || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  return id;
}

/**
 * @param {unknown} questionId
 */
export function normalizeDiscursiveQuestionId(questionId) {
  const id = String(questionId || '').trim();
  const q = getQuestionById(id);
  if (!q || q.type !== 'discursive') return null;
  return id;
}

export { listDiscursiveQuestionIds, normalizeDiscursivePoints };
