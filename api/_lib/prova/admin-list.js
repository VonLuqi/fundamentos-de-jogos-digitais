/**
 * Lista admin de tentativas da prova (Task D2).
 */

import { normalizeIntegritySummary } from './integrity-events.js';
import { PROVA_GATE_TURMAS } from './exam-gate.js';

export const PROVA_ALERT_BLUR_MIN = 3;

const STATUS_SET = new Set(['in_progress', 'submitted', 'timed_out', 'graded']);

function remainingMs(endsAt, nowMs = Date.now()) {
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - nowMs);
}

/**
 * @param {unknown} raw
 * @returns {string|null} status ou null (todos)
 */
export function normalizeAttemptStatusFilter(raw) {
  if (raw == null || raw === '' || raw === 'all') return null;
  const status = String(raw).trim();
  if (status === 'awaiting') return 'awaiting'; // submitted + timed_out
  return STATUS_SET.has(status) ? status : null;
}

/**
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizeTurmaFilter(raw) {
  if (raw == null || raw === '' || raw === 'all') return null;
  const turma = String(raw).trim().toUpperCase();
  return PROVA_GATE_TURMAS.includes(turma) ? turma : null;
}

/**
 * @param {unknown} summary
 * @param {number} [blurMin]
 */
export function attemptHasAlerts(summary, blurMin = PROVA_ALERT_BLUR_MIN) {
  const s = normalizeIntegritySummary(summary);
  return s.blurCount >= blurMin || s.leaveCount >= 1;
}

/**
 * DTO de linha para o hub admin (inclui MC parcial — só admin).
 * @param {object} attempt
 * @param {object|null} userRow
 * @param {{ nowMs?: number }} [opts]
 */
export function attemptAdminListItem(attempt, userRow, { nowMs = Date.now() } = {}) {
  if (!attempt) return null;
  const summary = normalizeIntegritySummary(attempt.integrity_summary);
  const status = attempt.status;
  const item = {
    id: attempt.id,
    examId: attempt.exam_id,
    userId: attempt.user_id,
    status,
    startedAt: attempt.started_at,
    endsAt: attempt.ends_at,
    submittedAt: attempt.submitted_at || null,
    gradedAt: attempt.graded_at || null,
    currentQuestionIndex: Number(attempt.current_question_index) || 0,
    remainingMs: status === 'in_progress' ? remainingMs(attempt.ends_at, nowMs) : 0,
    mcScore: attempt.mc_score != null ? Number(attempt.mc_score) : null,
    discursiveScore: attempt.discursive_score != null ? Number(attempt.discursive_score) : null,
    finalScore: attempt.final_score != null ? Number(attempt.final_score) : null,
    integritySummary: summary,
    blurCount: summary.blurCount,
    leaveCount: summary.leaveCount,
    hasAlerts: attemptHasAlerts(summary),
    contestStatus: attempt.contest_status || null,
    hasOpenContest: attempt.contest_status === 'open',
    student: userRow
      ? {
        id: userRow.id,
        fullName: userRow.full_name || userRow.username || '—',
        username: userRow.username || null,
        turma: userRow.turma || null,
      }
      : {
        id: attempt.user_id,
        fullName: '—',
        username: null,
        turma: null,
      },
  };
  return item;
}

/**
 * Aplica filtros de lista em memória (após join).
 * @param {object[]} items
 * @param {{ status?: string|null, turma?: string|null, alertsOnly?: boolean }} filters
 */
export function filterAdminAttemptItems(items, filters = {}) {
  const status = filters.status || null;
  const turma = filters.turma || null;
  const alertsOnly = Boolean(filters.alertsOnly);

  return (items || []).filter((item) => {
    if (turma && item.student?.turma !== turma) return false;
    if (alertsOnly && !item.hasAlerts) return false;
    if (!status) return true;
    if (status === 'awaiting') {
      return item.status === 'submitted' || item.status === 'timed_out';
    }
    return item.status === status;
  });
}

/**
 * Ordenação padrão: alertas primeiro, depois status prioridade, depois nome.
 * @param {object[]} items
 */
export function sortAdminAttemptItems(items) {
  const statusRank = {
    in_progress: 0,
    submitted: 1,
    timed_out: 2,
    graded: 3,
  };
  return (items || []).slice().sort((a, b) => {
    if (Boolean(b.hasOpenContest) !== Boolean(a.hasOpenContest)) {
      return Number(b.hasOpenContest) - Number(a.hasOpenContest);
    }
    if (Boolean(b.hasAlerts) !== Boolean(a.hasAlerts)) {
      return Number(b.hasAlerts) - Number(a.hasAlerts);
    }
    const ra = statusRank[a.status] ?? 9;
    const rb = statusRank[b.status] ?? 9;
    if (ra !== rb) return ra - rb;
    const na = String(a.student?.fullName || '').localeCompare(String(b.student?.fullName || ''), 'pt-BR');
    return na;
  });
}
