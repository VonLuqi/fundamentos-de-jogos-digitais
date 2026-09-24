/**
 * Contestação de nota — aluno abre, Mestre responde ou reabre correção.
 */

export const PROVA_CONTEST_STATUSES = Object.freeze([
  'open',
  'answered',
  'revised',
  'closed',
]);

export const PROVA_CONTEST_MESSAGE_MAX = 4000;

/**
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizeContestMessage(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (text.length > PROVA_CONTEST_MESSAGE_MAX) return null;
  return text;
}

/**
 * @param {object|null|undefined} attempt
 */
export function contestDtoFromAttempt(attempt) {
  if (!attempt) return null;
  const status = attempt.contest_status || null;
  const graded = attempt.status === 'graded';
  const canContest = graded && status !== 'open';

  return {
    status,
    studentMessage: attempt.contest_student_message || null,
    adminMessage: attempt.contest_admin_message || null,
    contestedAt: attempt.contested_at || null,
    resolvedAt: attempt.contest_resolved_at || null,
    canContest,
    isOpen: status === 'open',
  };
}

/**
 * @param {unknown} action
 * @returns {'answer'|'reopen'|null}
 */
export function normalizeContestAdminAction(action) {
  const a = String(action || '').trim().toLowerCase();
  if (a === 'answer' || a === 'responder' || a === 'reply') return 'answer';
  if (a === 'reopen' || a === 'reabrir' || a === 'revise' || a === 'revisar') return 'reopen';
  return null;
}
