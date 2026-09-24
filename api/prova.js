/**
 * ============================================================
 * /api/prova — Prova Online Módulo 1 (núcleo aluno — Task A3)
 * ============================================================
 * Actions: getExamStatus, startAttempt, getAttempt,
 *          saveAnswer, setCurrentQuestion, submitAttempt,
 *          reportIntegrityEvent (Task C2),
 *          adminGetProvaOverview, adminSetExamOpen (Task D1),
 *          adminListAttempts (Task D2),
 *          adminGetAttempt, adminScoreDiscursive, adminFinalizeGrade (Task D3),
 *          contestGrade, adminRespondContest (contestação de nota),
 *          adminResetAttempt, adminResetAllAttempts (apagar tentativa(s))
 *
 * Gabarito nunca vai no JSON do aluno.
 * Cronômetro: ends_at server-side (não pausa ao sair).
 * Admin: bloqueado de fazer a prova salvo asStudent: true.
 * Gate v1: fechada por padrão; libera exatamente 1 turma.
 * Segurança (E1): gabarito só no server; rate limit save/integrity;
 *   tabelas RLS sem policy (só service role); audit open/finalize.
 * ============================================================
 */

import supabase from './supabaseClient.js';
import { loadValidSession } from './_lib/sessions.js';
import { recordAdminAudit, ADMIN_AUDIT_ACTIONS } from './_lib/admin-audit.js';
import {
  EXAM_ID,
  EXAM_TITLE,
  TOTAL_POINTS,
  sanitizeQuestionsForClient,
} from './_lib/prova/index.js';
import {
  attemptStudentDto,
  assertNoAnswerKeyLeak,
  buildMcGradeUpdates,
  clampQuestionIndex,
  examPublicDto,
  isExamOpenForUser,
  isPastEndsAt,
  parseSaveAnswerPayload,
  remainingMs,
  serverNowIso,
  studentAttemptPayload,
} from './_lib/prova/attempt-dto.js';
import {
  bumpIntegritySummary,
  normalizeIntegrityEventType,
  sanitizeIntegrityMeta,
} from './_lib/prova/integrity-events.js';
import {
  countAttemptsByStatus,
  examGateFromRow,
  parseAdminSetExamOpenBody,
} from './_lib/prova/exam-gate.js';
import {
  attemptAdminListItem,
  filterAdminAttemptItems,
  normalizeAttemptStatusFilter,
  normalizeTurmaFilter,
  sortAdminAttemptItems,
} from './_lib/prova/admin-list.js';
import {
  buildAdminAttemptDetail,
  normalizeAttemptId,
  normalizeDiscursiveQuestionId,
  parseAttemptAdminNotes,
  serializeAttemptAdminNotes,
  validateSerializedAdminNotes,
  sumDiscursivePoints,
} from './_lib/prova/admin-grade.js';
import { normalizeDiscursivePoints } from './_lib/prova/answer-key-modulo1.js';
import { listDiscursiveQuestionIds } from './_lib/prova/questions-modulo1.js';
import {
  applyRetryAfterHeader,
  consumeProvaRateLimit,
} from './_lib/prova/rate-limit.js';
import {
  normalizeContestAdminAction,
  normalizeContestMessage,
} from './_lib/prova/contest.js';

const USERS_TABLE = 'users';
const EXAMS = 'prova_exams';
const ATTEMPTS = 'prova_attempts';
const ANSWERS = 'prova_answers';
const INTEGRITY_EVENTS = 'prova_integrity_events';

const TABLE_MISSING =
  'Tabelas da prova ausentes. Aplique db/migrate-2026-09-24-prova-modulo1.sql.';

const STUDENT_WRITE_ACTIONS = new Set([
  'startAttempt',
  'saveAnswer',
  'setCurrentQuestion',
  'submitAttempt',
  'reportIntegrityEvent',
  'contestGrade',
]);

function isMissingTable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '42P01'
    || code === 'PGRST205'
    || (/prova_/i.test(message) && /does not exist|schema cache|Could not find the table/i.test(message));
}

function jsonError(res, status, error, extra = null) {
  const body = { ok: false, error };
  if (extra && typeof extra === 'object') Object.assign(body, extra);
  return res.status(status).json(body);
}

/**
 * Task E1: rate limit por userId (saveAnswer / reportIntegrityEvent).
 * @returns {Promise<true|undefined>} true se já respondeu 429
 */
async function rejectIfProvaRateLimited(res, kind, userId) {
  const result = await consumeProvaRateLimit(kind, userId);
  if (!result.limited) return undefined;
  applyRetryAfterHeader(res, result);
  jsonError(res, 429, 'Muitas requisições. Espere um instante e tente de novo.', {
    code: 'prova_rate_limited',
    retryAfterSec: result.retryAfterSec,
  });
  return true;
}

function maybeTableError(res, error) {
  if (isMissingTable(error)) return jsonError(res, 503, TABLE_MISSING);
  return null;
}

async function loadSessionUser(token) {
  if (!token || typeof token !== 'string') {
    return { errorStatus: 401, error: 'Sessão inválida.' };
  }
  const session = await loadValidSession(supabase, token);
  if (!session?.user_id) return { errorStatus: 401, error: 'Sessão inválida.' };

  const { data: user, error: userError } = await supabase
    .from(USERS_TABLE)
    .select('id, role, username, full_name, turma, email_verified_at')
    .eq('id', session.user_id)
    .limit(1)
    .maybeSingle();

  if (userError) return { errorStatus: 500, error: 'Falha ao carregar usuário.' };
  if (!user) return { errorStatus: 404, error: 'Usuário não encontrado.' };
  return { user };
}

function rejectAdminTakingExam(user, body, res) {
  if (user?.role !== 'admin') return false;
  if (body?.asStudent === true) return false;
  jsonError(
    res,
    403,
    'O Mestre não faz a prova como aluno. Para testar, envie asStudent: true.',
  );
  return true;
}

async function loadExam(examId = EXAM_ID) {
  const { data, error } = await supabase
    .from(EXAMS)
    .select('*')
    .eq('id', examId)
    .maybeSingle();
  if (error) return { error };
  return { exam: data };
}

async function loadAttemptForUser(examId, userId) {
  const { data, error } = await supabase
    .from(ATTEMPTS)
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return { error };
  return { attempt: data };
}

async function loadAnswers(attemptId) {
  const { data, error } = await supabase
    .from(ANSWERS)
    .select('question_id, choice, text_answer, is_correct, points_awarded, updated_at')
    .eq('attempt_id', attemptId);
  if (error) return { error };
  return { answers: data || [] };
}

async function loadAttemptById(attemptId) {
  const { data, error } = await supabase
    .from(ATTEMPTS)
    .select('*, users:user_id ( id, full_name, username, turma, role )')
    .eq('id', attemptId)
    .maybeSingle();
  if (error) return { error };
  return { attempt: data };
}

async function loadIntegrityEvents(attemptId) {
  const { data, error } = await supabase
    .from(INTEGRITY_EVENTS)
    .select('id, event_type, created_at, meta')
    .eq('attempt_id', attemptId)
    .order('created_at', { ascending: true });
  if (error) return { error };
  return { events: data || [] };
}

async function loadAttemptStatusRows(examId) {
  const { data, error } = await supabase
    .from(ATTEMPTS)
    .select('status')
    .eq('exam_id', examId);
  if (error) return { error };
  return { rows: data || [] };
}

async function buildProvaOverview(exam, { nowMs = Date.now() } = {}) {
  const gate = examGateFromRow(exam);
  const { rows, error } = await loadAttemptStatusRows(exam.id);
  if (error) return { error };
  return {
    overview: {
      exam: examPublicDto(exam),
      gate,
      counts: countAttemptsByStatus(rows),
      serverNow: new Date(nowMs).toISOString(),
    },
  };
}

async function touchAttempt(attemptId, patch) {
  const { data, error } = await supabase
    .from(ATTEMPTS)
    .update({ ...patch, updated_at: serverNowIso() })
    .eq('id', attemptId)
    .select('*')
    .maybeSingle();
  if (error) return { error };
  return { attempt: data };
}

/**
 * Se in_progress e passou ends_at → timed_out + grade MC.
 */
async function finalizeIfExpired(attempt) {
  if (!attempt || attempt.status !== 'in_progress') {
    return { attempt, timedOut: false };
  }
  if (!isPastEndsAt(attempt.ends_at)) {
    return { attempt, timedOut: false };
  }

  const { answers, error: ansError } = await loadAnswers(attempt.id);
  if (ansError) return { error: ansError };

  const { mcScore, updates } = buildMcGradeUpdates(answers);
  const submittedAt = serverNowIso();

  for (const u of updates) {
    const existing = answers.find((a) => a.question_id === u.questionId);
    if (!existing) continue;
    const { error: upErr } = await supabase
      .from(ANSWERS)
      .update({
        is_correct: u.isCorrect,
        points_awarded: u.pointsAwarded,
        updated_at: submittedAt,
      })
      .eq('attempt_id', attempt.id)
      .eq('question_id', u.questionId);
    if (upErr) return { error: upErr };
  }

  const { attempt: updated, error } = await touchAttempt(attempt.id, {
    status: 'timed_out',
    submitted_at: submittedAt,
    mc_score: mcScore,
  });
  if (error) return { error };
  return { attempt: updated || { ...attempt, status: 'timed_out', submitted_at: submittedAt, mc_score: mcScore }, timedOut: true };
}

async function gradeAndCloseAttempt(attempt, { status }) {
  const { answers, error: ansError } = await loadAnswers(attempt.id);
  if (ansError) return { error: ansError };

  const { mcScore, updates } = buildMcGradeUpdates(answers);
  const submittedAt = serverNowIso();
  const byId = new Map((answers || []).map((a) => [a.question_id, a]));

  for (const u of updates) {
    if (byId.has(u.questionId)) {
      const { error: upErr } = await supabase
        .from(ANSWERS)
        .update({
          is_correct: u.isCorrect,
          points_awarded: u.pointsAwarded,
          updated_at: submittedAt,
        })
        .eq('attempt_id', attempt.id)
        .eq('question_id', u.questionId);
      if (upErr) return { error: upErr };
      continue;
    }
    // MC sem resposta: linha em branco (text_answer '' satisfaz CHECK)
    const { error: insErr } = await supabase.from(ANSWERS).upsert({
      attempt_id: attempt.id,
      question_id: u.questionId,
      choice: null,
      text_answer: '',
      is_correct: false,
      points_awarded: 0,
      updated_at: submittedAt,
    }, { onConflict: 'attempt_id,question_id' });
    if (insErr) return { error: insErr };
  }

  const { attempt: updated, error } = await touchAttempt(attempt.id, {
    status,
    submitted_at: submittedAt,
    mc_score: mcScore,
  });
  if (error) return { error };
  return { attempt: updated, mcScore };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return jsonError(res, 405, 'Método não permitido.');
    }

    if (!supabase) {
      return jsonError(res, 503, 'Prova offline: Supabase não configurado.');
    }

    const body = req.body || {};
    const { action, token } = body;
    const session = await loadSessionUser(token);
    if (session.error) {
      return jsonError(res, session.errorStatus || 401, session.error);
    }
    const { user } = session;
    const examId = String(body.examId || body.exam_id || EXAM_ID).trim() || EXAM_ID;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    if (STUDENT_WRITE_ACTIONS.has(action) && rejectAdminTakingExam(user, body, res)) {
      return undefined;
    }

    // -------------------------------------------------------------------------
    // getExamStatus
    // -------------------------------------------------------------------------
    if (action === 'getExamStatus') {
      const { exam, error } = await loadExam(examId);
      if (error) {
        return maybeTableError(res, error) || jsonError(res, 500, 'Falha ao ler o exame.');
      }
      if (!exam) return jsonError(res, 404, 'Exame não encontrado.');

      const { attempt: rawAttempt, error: attError } = await loadAttemptForUser(examId, user.id);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }

      let attempt = rawAttempt;
      if (attempt?.status === 'in_progress') {
        const fin = await finalizeIfExpired(attempt);
        if (fin.error) {
          return maybeTableError(res, fin.error) || jsonError(res, 500, 'Falha ao encerrar por tempo.');
        }
        attempt = fin.attempt;
      }

      const openForUser = isExamOpenForUser(exam, user);
      const isAdmin = user.role === 'admin';
      const canStart = !attempt
        && openForUser
        && (!isAdmin || body.asStudent === true);
      const mustResume = Boolean(attempt && attempt.status === 'in_progress');

      const payload = {
        ok: true,
        serverNow: nowIso,
        exam: examPublicDto(exam),
        attempt: attemptStudentDto(attempt, { nowMs }),
        canStart,
        mustResume,
      };

      // Task D1: admin (sem asStudent) recebe overview do gate + contadores
      if (isAdmin && body.asStudent !== true) {
        const built = await buildProvaOverview(exam, { nowMs });
        if (built.error) {
          return maybeTableError(res, built.error)
            || jsonError(res, 500, 'Falha ao montar o resumo da prova.');
        }
        payload.overview = built.overview;
      }

      assertNoAnswerKeyLeak(payload);
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // startAttempt
    // -------------------------------------------------------------------------
    if (action === 'startAttempt') {
      const { exam, error } = await loadExam(examId);
      if (error) {
        return maybeTableError(res, error) || jsonError(res, 500, 'Falha ao ler o exame.');
      }
      if (!exam) return jsonError(res, 404, 'Exame não encontrado.');

      if (!isExamOpenForUser(exam, user)) {
        return jsonError(res, 403, 'A prova não está aberta para você no momento.');
      }

      const { attempt: existing, error: exError } = await loadAttemptForUser(examId, user.id);
      if (exError) {
        return maybeTableError(res, exError) || jsonError(res, 500, 'Falha ao verificar tentativa.');
      }
      if (existing) {
        if (existing.status === 'in_progress') {
          const fin = await finalizeIfExpired(existing);
          if (fin.error) {
            return maybeTableError(res, fin.error) || jsonError(res, 500, 'Falha ao encerrar por tempo.');
          }
          if (fin.attempt?.status === 'in_progress') {
            const { answers } = await loadAnswers(fin.attempt.id);
            const payload = {
              ok: true,
              resumed: true,
              ...studentAttemptPayload(fin.attempt, answers || [], { nowMs }),
            };
            payload.exam = {
              ...payload.exam,
              ...examPublicDto(exam),
              title: exam.title || EXAM_TITLE,
            };
            assertNoAnswerKeyLeak(payload);
            return res.status(200).json(payload);
          }
        }
        return jsonError(res, 409, 'Você já possui uma tentativa neste exame.', {
          attempt: attemptStudentDto(existing, { nowMs }),
        });
      }

      const durationMin = Number(exam.duration_minutes) || 90;
      const startedAt = new Date(nowMs);
      const endsAt = new Date(nowMs + durationMin * 60 * 1000);

      const { data: created, error: createError } = await supabase
        .from(ATTEMPTS)
        .insert({
          exam_id: examId,
          user_id: user.id,
          status: 'in_progress',
          started_at: startedAt.toISOString(),
          ends_at: endsAt.toISOString(),
          current_question_index: 0,
          integrity_summary: { blurCount: 0, leaveCount: 0 },
        })
        .select('*')
        .maybeSingle();

      if (createError) {
        if (createError.code === '23505') {
          return jsonError(res, 409, 'Você já possui uma tentativa neste exame.');
        }
        return maybeTableError(res, createError) || jsonError(res, 500, 'Falha ao iniciar a prova.');
      }

      const payload = {
        ok: true,
        resumed: false,
        ...studentAttemptPayload(created, [], { nowMs }),
      };
      payload.exam = {
        ...payload.exam,
        ...examPublicDto(exam),
        title: exam.title || EXAM_TITLE,
      };
      assertNoAnswerKeyLeak(payload);
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // getAttempt
    // -------------------------------------------------------------------------
    if (action === 'getAttempt') {
      const { exam, error } = await loadExam(examId);
      if (error) {
        return maybeTableError(res, error) || jsonError(res, 500, 'Falha ao ler o exame.');
      }
      if (!exam) return jsonError(res, 404, 'Exame não encontrado.');

      const { attempt: raw, error: attError } = await loadAttemptForUser(examId, user.id);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Nenhuma tentativa encontrada.');

      let attempt = raw;
      if (attempt.status === 'in_progress') {
        const fin = await finalizeIfExpired(attempt);
        if (fin.error) {
          return maybeTableError(res, fin.error) || jsonError(res, 500, 'Falha ao encerrar por tempo.');
        }
        attempt = fin.attempt;
      }

      const { answers, error: ansError } = await loadAnswers(attempt.id);
      if (ansError) {
        return maybeTableError(res, ansError) || jsonError(res, 500, 'Falha ao ler respostas.');
      }

      const payload = {
        ok: true,
        ...studentAttemptPayload(attempt, answers, { nowMs }),
      };
      payload.exam = {
        ...payload.exam,
        ...examPublicDto(exam),
        title: exam.title || EXAM_TITLE,
      };
      // Não vazar is_correct / points ao aluno até graded
      if (attempt.status !== 'graded') {
        for (const key of Object.keys(payload.answers || {})) {
          const a = payload.answers[key];
          payload.answers[key] = {
            choice: a.choice,
            textAnswer: a.textAnswer,
          };
        }
      }
      assertNoAnswerKeyLeak(payload, { allowGradedReview: attempt.status === 'graded' });
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // saveAnswer
    // -------------------------------------------------------------------------
    if (action === 'saveAnswer') {
      if (await rejectIfProvaRateLimited(res, 'saveAnswer', user.id)) return undefined;

      const { attempt: raw, error: attError } = await loadAttemptForUser(examId, user.id);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Nenhuma tentativa encontrada.');

      const fin = await finalizeIfExpired(raw);
      if (fin.error) {
        return maybeTableError(res, fin.error) || jsonError(res, 500, 'Falha ao encerrar por tempo.');
      }
      if (fin.timedOut || fin.attempt?.status !== 'in_progress') {
        return jsonError(res, 409, 'A prova já foi encerrada. Não é possível salvar.', {
          attempt: attemptStudentDto(fin.attempt, { nowMs }),
        });
      }

      const parsed = parseSaveAnswerPayload(body);
      if (!parsed.ok) return jsonError(res, 400, parsed.error);

      const row = {
        attempt_id: fin.attempt.id,
        question_id: parsed.questionId,
        choice: parsed.choice,
        text_answer: parsed.textAnswer,
        updated_at: nowIso,
      };

      const { error: upError } = await supabase
        .from(ANSWERS)
        .upsert(row, { onConflict: 'attempt_id,question_id' });
      if (upError) {
        return maybeTableError(res, upError) || jsonError(res, 500, 'Falha ao salvar resposta.');
      }

      let attempt = fin.attempt;
      const nextIndex = clampQuestionIndex(body.currentQuestionIndex ?? body.current_question_index);
      if (nextIndex != null && nextIndex !== Number(attempt.current_question_index)) {
        const touched = await touchAttempt(attempt.id, { current_question_index: nextIndex });
        if (touched.error) {
          return maybeTableError(res, touched.error) || jsonError(res, 500, 'Falha ao atualizar questão atual.');
        }
        attempt = touched.attempt || attempt;
      }

      const payload = {
        ok: true,
        serverNow: nowIso,
        attempt: attemptStudentDto(attempt, { nowMs }),
        saved: {
          questionId: parsed.questionId,
          choice: parsed.choice,
          textAnswer: parsed.textAnswer,
        },
        remainingMs: remainingMs(attempt.ends_at, nowMs),
      };
      assertNoAnswerKeyLeak(payload);
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // setCurrentQuestion
    // -------------------------------------------------------------------------
    if (action === 'setCurrentQuestion') {
      const index = clampQuestionIndex(body.currentQuestionIndex ?? body.index ?? body.current_question_index);
      if (index == null) {
        return jsonError(res, 400, 'Índice de questão inválido (0–19).');
      }

      const { attempt: raw, error: attError } = await loadAttemptForUser(examId, user.id);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Nenhuma tentativa encontrada.');

      const fin = await finalizeIfExpired(raw);
      if (fin.error) {
        return maybeTableError(res, fin.error) || jsonError(res, 500, 'Falha ao encerrar por tempo.');
      }
      if (fin.timedOut || fin.attempt?.status !== 'in_progress') {
        return jsonError(res, 409, 'A prova já foi encerrada.', {
          attempt: attemptStudentDto(fin.attempt, { nowMs }),
        });
      }

      const touched = await touchAttempt(fin.attempt.id, { current_question_index: index });
      if (touched.error) {
        return maybeTableError(res, touched.error) || jsonError(res, 500, 'Falha ao mudar de questão.');
      }

      const payload = {
        ok: true,
        serverNow: nowIso,
        attempt: attemptStudentDto(touched.attempt, { nowMs }),
        remainingMs: remainingMs(touched.attempt.ends_at, nowMs),
      };
      assertNoAnswerKeyLeak(payload);
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // reportIntegrityEvent (Task C2)
    // -------------------------------------------------------------------------
    if (action === 'reportIntegrityEvent') {
      if (await rejectIfProvaRateLimited(res, 'reportIntegrityEvent', user.id)) return undefined;

      const eventType = normalizeIntegrityEventType(
        body.eventType ?? body.event_type ?? body.type,
      );
      if (!eventType) {
        return jsonError(res, 400, 'Tipo de evento de integridade inválido.');
      }
      const meta = sanitizeIntegrityMeta(body.meta);

      const { attempt: raw, error: attError } = await loadAttemptForUser(examId, user.id);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Nenhuma tentativa encontrada.');

      // Aceita só enquanto a prova está em andamento (ou já estourou sem submit — finaliza)
      const fin = await finalizeIfExpired(raw);
      if (fin.error) {
        return maybeTableError(res, fin.error) || jsonError(res, 500, 'Falha ao encerrar por tempo.');
      }
      if (fin.timedOut || fin.attempt?.status !== 'in_progress') {
        return jsonError(res, 409, 'A prova já foi encerrada.', {
          attempt: attemptStudentDto(fin.attempt, { nowMs }),
        });
      }

      const attempt = fin.attempt;
      const { error: insertError } = await supabase
        .from(INTEGRITY_EVENTS)
        .insert({
          attempt_id: attempt.id,
          event_type: eventType,
          created_at: nowIso,
          meta,
        });
      if (insertError) {
        return maybeTableError(res, insertError)
          || jsonError(res, 500, 'Falha ao registrar evento de integridade.');
      }

      const nextSummary = bumpIntegritySummary(attempt.integrity_summary, eventType, nowIso);
      const touched = await touchAttempt(attempt.id, {
        integrity_summary: nextSummary,
      });
      if (touched.error) {
        return maybeTableError(res, touched.error)
          || jsonError(res, 500, 'Falha ao atualizar resumo de integridade.');
      }

      const payload = {
        ok: true,
        serverNow: nowIso,
        eventType,
        integritySummary: nextSummary,
        remainingMs: remainingMs(attempt.ends_at, nowMs),
      };
      assertNoAnswerKeyLeak(payload);
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // submitAttempt
    // -------------------------------------------------------------------------
    if (action === 'submitAttempt') {
      const { attempt: raw, error: attError } = await loadAttemptForUser(examId, user.id);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Nenhuma tentativa encontrada.');

      if (raw.status !== 'in_progress') {
        return jsonError(res, 409, 'Esta tentativa já foi enviada.', {
          attempt: attemptStudentDto(raw, { nowMs }),
        });
      }

      // Se já expirou, marca timed_out; senão submitted
      const expired = isPastEndsAt(raw.ends_at, nowMs);
      const status = expired ? 'timed_out' : 'submitted';

      // Flush opcional do body.answers (última leva)
      const batch = Array.isArray(body.answers) ? body.answers : null;
      if (batch) {
        for (const item of batch) {
          const parsed = parseSaveAnswerPayload(item);
          if (!parsed.ok) continue;
          await supabase.from(ANSWERS).upsert({
            attempt_id: raw.id,
            question_id: parsed.questionId,
            choice: parsed.choice,
            text_answer: parsed.textAnswer,
            updated_at: nowIso,
          }, { onConflict: 'attempt_id,question_id' });
        }
      }

      const closed = await gradeAndCloseAttempt(raw, { status });
      if (closed.error) {
        return maybeTableError(res, closed.error) || jsonError(res, 500, 'Falha ao enviar a prova.');
      }

      // Aluno NÃO recebe mcScore até o admin fechar a nota
      const payload = {
        ok: true,
        serverNow: nowIso,
        attempt: attemptStudentDto(closed.attempt, { nowMs }),
        message: expired
          ? 'Tempo esgotado. Sua prova foi encerrada automaticamente e aguarda correção do Mestre.'
          : 'Prova enviada. Aguarde a correção do Mestre.',
      };
      assertNoAnswerKeyLeak(payload);
      // Garantia extra: nunca incluir mcScore no submit ao aluno
      if (payload.attempt && 'mcScore' in payload.attempt && closed.attempt.status !== 'graded') {
        delete payload.attempt.mcScore;
      }
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // adminListAttempts (Task D2)
    // -------------------------------------------------------------------------
    if (action === 'adminListAttempts') {
      if (user.role !== 'admin') {
        return jsonError(res, 403, 'Apenas o Mestre pode listar tentativas.');
      }

      const statusFilter = normalizeAttemptStatusFilter(
        body.status ?? body.statusFilter ?? body.filterStatus,
      );
      if (body.status != null && body.status !== '' && body.status !== 'all' && statusFilter == null) {
        return jsonError(res, 400, 'Filtro de status inválido.');
      }
      const turmaFilter = normalizeTurmaFilter(body.turma ?? body.turmaFilter);
      if (body.turma != null && body.turma !== '' && body.turma !== 'all' && turmaFilter == null) {
        return jsonError(res, 400, 'Filtro de turma inválido.');
      }
      const alertsOnly = body.alertsOnly === true
        || body.withAlerts === true
        || body.alerts === true
        || String(body.alertsOnly || '').toLowerCase() === 'true';

      const { exam, error } = await loadExam(examId);
      if (error) {
        return maybeTableError(res, error) || jsonError(res, 500, 'Falha ao ler o exame.');
      }
      if (!exam) return jsonError(res, 404, 'Exame não encontrado.');

      const { data: rows, error: listError } = await supabase
        .from(ATTEMPTS)
        .select('*, users:user_id ( id, full_name, username, turma, role )')
        .eq('exam_id', examId)
        .order('updated_at', { ascending: false });

      if (listError) {
        return maybeTableError(res, listError) || jsonError(res, 500, 'Falha ao listar tentativas.');
      }

      const items = [];
      for (const row of rows || []) {
        let attempt = row;
        if (attempt.status === 'in_progress') {
          const fin = await finalizeIfExpired(attempt);
          if (!fin.error && fin.attempt) attempt = { ...fin.attempt, users: row.users };
        }
        const userRow = attempt.users || row.users || null;
        if (userRow?.role === 'admin') continue;
        items.push(attemptAdminListItem(attempt, userRow, { nowMs }));
      }

      const filtered = sortAdminAttemptItems(
        filterAdminAttemptItems(items, {
          status: statusFilter,
          turma: turmaFilter,
          alertsOnly,
        }),
      );

      const built = await buildProvaOverview(exam, { nowMs });
      if (built.error) {
        return maybeTableError(res, built.error)
          || jsonError(res, 500, 'Falha ao montar o resumo da prova.');
      }

      const payload = {
        ok: true,
        serverNow: nowIso,
        filters: {
          status: statusFilter,
          turma: turmaFilter,
          alertsOnly,
        },
        attempts: filtered,
        total: filtered.length,
        ...built.overview,
      };
      assertNoAnswerKeyLeak(payload);
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // adminGetProvaOverview (Task D1)
    // -------------------------------------------------------------------------
    if (action === 'adminGetProvaOverview') {
      if (user.role !== 'admin') {
        return jsonError(res, 403, 'Apenas o Mestre pode ver o resumo da prova.');
      }
      const { exam, error } = await loadExam(examId);
      if (error) {
        return maybeTableError(res, error) || jsonError(res, 500, 'Falha ao ler o exame.');
      }
      if (!exam) return jsonError(res, 404, 'Exame não encontrado.');

      const built = await buildProvaOverview(exam, { nowMs });
      if (built.error) {
        return maybeTableError(res, built.error)
          || jsonError(res, 500, 'Falha ao montar o resumo da prova.');
      }
      const payload = { ok: true, serverNow: nowIso, ...built.overview };
      assertNoAnswerKeyLeak(payload);
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // adminSetExamOpen (Task D1) — fechada | só TCG01 | só TCG02
    // -------------------------------------------------------------------------
    if (action === 'adminSetExamOpen') {
      if (user.role !== 'admin') {
        return jsonError(res, 403, 'Apenas o Mestre pode abrir ou fechar a prova.');
      }

      const parsed = parseAdminSetExamOpenBody(body);
      if (!parsed.ok) return jsonError(res, 400, parsed.error);

      const { exam, error } = await loadExam(examId);
      if (error) {
        return maybeTableError(res, error) || jsonError(res, 500, 'Falha ao ler o exame.');
      }
      if (!exam) return jsonError(res, 404, 'Exame não encontrado.');

      const { data: updated, error: upError } = await supabase
        .from(EXAMS)
        .update({
          is_open: parsed.is_open,
          open_turmas: parsed.open_turmas,
          updated_at: nowIso,
        })
        .eq('id', examId)
        .select('*')
        .maybeSingle();

      if (upError) {
        return maybeTableError(res, upError) || jsonError(res, 500, 'Falha ao atualizar o gate da prova.');
      }
      if (!updated) return jsonError(res, 404, 'Exame não encontrado.');

      void recordAdminAudit(supabase, {
        actorId: user.id,
        action: ADMIN_AUDIT_ACTIONS.setProvaExamOpen,
        payload: {
          examId,
          is_open: parsed.is_open,
          open_turmas: parsed.open_turmas,
          mode: examGateFromRow(updated).state,
        },
      });

      const built = await buildProvaOverview(updated, { nowMs });
      if (built.error) {
        return maybeTableError(res, built.error)
          || jsonError(res, 500, 'Gate salvo, mas falhou o resumo.');
      }

      const payload = {
        ok: true,
        serverNow: nowIso,
        message: parsed.is_open
          ? `Prova liberada só para ${parsed.open_turmas[0]}.`
          : 'Prova fechada. Nenhuma turma pode iniciar agora.',
        ...built.overview,
      };
      assertNoAnswerKeyLeak(payload);
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // adminGetAttempt (Task D3) — detalhe com gabarito MC + rubricas (só admin)
    // -------------------------------------------------------------------------
    if (action === 'adminGetAttempt') {
      if (user.role !== 'admin') {
        return jsonError(res, 403, 'Apenas o Mestre pode ver o detalhe da prova.');
      }
      const attemptId = normalizeAttemptId(body.attemptId ?? body.attempt_id ?? body.id);
      if (!attemptId) return jsonError(res, 400, 'Informe attemptId válido.');

      const { attempt: raw, error: attError } = await loadAttemptById(attemptId);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Tentativa não encontrada.');
      if (raw.exam_id !== examId && body.examId) {
        /* allow any exam if attempt id is enough; prefer row exam */
      }

      let attempt = raw;
      if (attempt.status === 'in_progress') {
        const fin = await finalizeIfExpired(attempt);
        if (fin.error) {
          return maybeTableError(res, fin.error) || jsonError(res, 500, 'Falha ao encerrar por tempo.');
        }
        if (fin.attempt) {
          attempt = { ...fin.attempt, users: raw.users };
        }
      }

      const { answers, error: ansError } = await loadAnswers(attempt.id);
      if (ansError) {
        return maybeTableError(res, ansError) || jsonError(res, 500, 'Falha ao ler respostas.');
      }
      const { events, error: evError } = await loadIntegrityEvents(attempt.id);
      if (evError) {
        return maybeTableError(res, evError) || jsonError(res, 500, 'Falha ao ler eventos de integridade.');
      }

      const detail = buildAdminAttemptDetail(
        attempt,
        attempt.users || raw.users || null,
        answers,
        events,
        { nowMs },
      );

      return res.status(200).json({
        ok: true,
        serverNow: nowIso,
        attempt: detail,
      });
    }

    // -------------------------------------------------------------------------
    // adminScoreDiscursive (Task D3)
    // -------------------------------------------------------------------------
    if (action === 'adminScoreDiscursive') {
      if (user.role !== 'admin') {
        return jsonError(res, 403, 'Apenas o Mestre pode notar discursivas.');
      }
      const attemptId = normalizeAttemptId(body.attemptId ?? body.attempt_id);
      if (!attemptId) return jsonError(res, 400, 'Informe attemptId válido.');

      // Aceita um item ou lote scores: [{ questionId, points, comment }]
      const batch = Array.isArray(body.scores) ? body.scores : null;
      const single = !batch
        ? {
          questionId: body.questionId ?? body.question_id,
          points: body.points ?? body.pointsAwarded ?? body.score,
          comment: body.comment ?? body.graderComment,
        }
        : null;

      const items = batch || (single ? [single] : []);
      if (!items.length) {
        return jsonError(res, 400, 'Envie questionId + points ou scores[].');
      }

      const { attempt: raw, error: attError } = await loadAttemptById(attemptId);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Tentativa não encontrada.');

      if (raw.status === 'graded') {
        return jsonError(res, 409, 'Nota já fechada. Não é possível alterar (v1).', {
          attempt: attemptStudentDto(raw, { nowMs }),
        });
      }
      if (raw.status === 'in_progress') {
        return jsonError(res, 409, 'Aguarde o aluno enviar (ou o tempo esgotar) antes de notar.');
      }
      if (raw.status !== 'submitted' && raw.status !== 'timed_out') {
        return jsonError(res, 409, 'Status inválido para correção.');
      }

      const notes = parseAttemptAdminNotes(raw.admin_notes);

      for (const item of items) {
        const questionId = normalizeDiscursiveQuestionId(item.questionId ?? item.question_id);
        if (!questionId) {
          return jsonError(res, 400, `Questão discursiva inválida: ${item.questionId || item.question_id || '?'}.`);
        }
        const points = normalizeDiscursivePoints(item.points ?? item.pointsAwarded ?? item.score);
        if (points == null) {
          return jsonError(res, 400, `Nota inválida para ${questionId} (use 0 a 1).`);
        }

        const { data: existing } = await supabase
          .from(ANSWERS)
          .select('question_id, text_answer, choice')
          .eq('attempt_id', attemptId)
          .eq('question_id', questionId)
          .maybeSingle();

        const { error: upErr } = await supabase.from(ANSWERS).upsert({
          attempt_id: attemptId,
          question_id: questionId,
          choice: existing?.choice ?? null,
          text_answer: existing?.text_answer != null ? existing.text_answer : '',
          points_awarded: points,
          is_correct: null,
          updated_at: nowIso,
        }, { onConflict: 'attempt_id,question_id' });
        if (upErr) {
          return maybeTableError(res, upErr) || jsonError(res, 500, `Falha ao salvar nota de ${questionId}.`);
        }

        if (item.comment !== undefined) {
          const c = String(item.comment ?? '').trim().slice(0, 2000);
          if (c) notes.discursiveComments[questionId] = c;
          else delete notes.discursiveComments[questionId];
        }
      }

      if (body.generalNote != null || body.adminNotes != null) {
        notes.general = String(body.generalNote ?? body.adminNotes ?? '').slice(0, 4000);
      }

      const { answers, error: ansError } = await loadAnswers(attemptId);
      if (ansError) {
        return maybeTableError(res, ansError) || jsonError(res, 500, 'Falha ao reler respostas.');
      }
      const discursiveScore = sumDiscursivePoints(answers);

      const adminNotesSerialized = serializeAttemptAdminNotes(notes);
      const notesTooLong = validateSerializedAdminNotes(adminNotesSerialized);
      if (notesTooLong) {
        return jsonError(res, 400, notesTooLong);
      }

      const touched = await touchAttempt(attemptId, {
        discursive_score: discursiveScore,
        admin_notes: adminNotesSerialized,
      });
      if (touched.error) {
        return maybeTableError(res, touched.error) || jsonError(res, 500, 'Falha ao atualizar a tentativa.');
      }

      void recordAdminAudit(supabase, {
        actorId: user.id,
        targetUserId: raw.user_id,
        action: ADMIN_AUDIT_ACTIONS.scoreProvaDiscursive,
        payload: {
          attemptId,
          scored: items.map((i) => i.questionId || i.question_id),
          discursiveScore,
        },
      });

      const { events } = await loadIntegrityEvents(attemptId);
      const detail = buildAdminAttemptDetail(
        touched.attempt || raw,
        raw.users || null,
        answers,
        events || [],
        { nowMs },
      );

      return res.status(200).json({
        ok: true,
        serverNow: nowIso,
        attempt: detail,
        message: 'Notas discursivas salvas.',
      });
    }

    // -------------------------------------------------------------------------
    // adminFinalizeGrade (Task D3)
    // -------------------------------------------------------------------------
    if (action === 'adminFinalizeGrade') {
      if (user.role !== 'admin') {
        return jsonError(res, 403, 'Apenas o Mestre pode fechar a nota.');
      }
      const attemptId = normalizeAttemptId(body.attemptId ?? body.attempt_id);
      if (!attemptId) return jsonError(res, 400, 'Informe attemptId válido.');

      const { attempt: raw, error: attError } = await loadAttemptById(attemptId);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Tentativa não encontrada.');

      if (raw.status === 'graded') {
        return jsonError(res, 409, 'Esta nota já está fechada.', {
          attempt: attemptStudentDto(raw, { nowMs }),
        });
      }
      if (raw.status !== 'submitted' && raw.status !== 'timed_out') {
        return jsonError(res, 409, 'Só é possível fechar nota de prova enviada ou esgotada.');
      }

      const { answers, error: ansError } = await loadAnswers(attemptId);
      if (ansError) {
        return maybeTableError(res, ansError) || jsonError(res, 500, 'Falha ao ler respostas.');
      }

      let mcScore = raw.mc_score != null ? Number(raw.mc_score) : null;
      if (mcScore == null) {
        const graded = buildMcGradeUpdates(answers);
        mcScore = graded.mcScore;
        for (const u of graded.updates) {
          const existing = answers.find((a) => a.question_id === u.questionId);
          if (!existing) continue;
          await supabase.from(ANSWERS).update({
            is_correct: u.isCorrect,
            points_awarded: u.pointsAwarded,
            updated_at: nowIso,
          }).eq('attempt_id', attemptId).eq('question_id', u.questionId);
        }
      }

      const discursiveScore = sumDiscursivePoints(answers);
      const missing = listDiscursiveQuestionIds().filter((id) => {
        const row = answers.find((a) => a.question_id === id);
        return normalizeDiscursivePoints(row?.points_awarded) == null;
      });
      if (missing.length && body.allowPartial !== true) {
        return jsonError(
          res,
          400,
          `Ainda faltam notas em: ${missing.join(', ')}. Envie allowPartial: true para fechar com zero nas faltantes.`,
          { missing },
        );
      }

      // Zera discursivas sem nota se allowPartial
      if (missing.length) {
        for (const questionId of missing) {
          const existing = answers.find((a) => a.question_id === questionId);
          await supabase.from(ANSWERS).upsert({
            attempt_id: attemptId,
            question_id: questionId,
            choice: null,
            text_answer: existing?.text_answer != null ? existing.text_answer : '',
            points_awarded: 0,
            is_correct: null,
            updated_at: nowIso,
          }, { onConflict: 'attempt_id,question_id' });
        }
      }

      const { answers: fresh } = await loadAnswers(attemptId);
      const discFinal = sumDiscursivePoints(fresh || answers);
      const finalScore = Math.round((mcScore + discFinal) * 100) / 100;

      const gradePatch = {
        status: 'graded',
        mc_score: mcScore,
        discursive_score: discFinal,
        final_score: finalScore,
        graded_at: nowIso,
        graded_by: user.id,
      };
      // Re-fechamento após reabrir por contestação → marca como revisada + mensagem ao aluno
      const revisingContest = raw.contest_status === 'open';
      let revisionMessage = null;
      if (revisingContest) {
        revisionMessage = normalizeContestMessage(
          body.contestMessage ?? body.adminMessage ?? body.message ?? body.text,
        );
        if (!revisionMessage) {
          return jsonError(
            res,
            400,
            'Ao fechar a nota revisada, escreva uma mensagem explicando a revisão para o aluno.',
          );
        }
        gradePatch.contest_status = 'revised';
        gradePatch.contest_admin_message = revisionMessage;
        gradePatch.contest_resolved_at = nowIso;
      }

      const touched = await touchAttempt(attemptId, gradePatch);
      if (touched.error) {
        return maybeTableError(res, touched.error) || jsonError(res, 500, 'Falha ao fechar a nota.');
      }

      void recordAdminAudit(supabase, {
        actorId: user.id,
        targetUserId: raw.user_id,
        action: ADMIN_AUDIT_ACTIONS.finalizeProvaGrade,
        payload: {
          attemptId,
          mcScore,
          discursiveScore: discFinal,
          finalScore,
          contestRevised: revisingContest,
          hadContestMessage: Boolean(revisionMessage),
        },
      });

      const { events } = await loadIntegrityEvents(attemptId);
      const detail = buildAdminAttemptDetail(
        touched.attempt || {
          ...raw,
          status: 'graded',
          final_score: finalScore,
          ...(revisingContest
            ? {
              contest_status: 'revised',
              contest_admin_message: revisionMessage,
              contest_resolved_at: nowIso,
            }
            : {}),
        },
        raw.users || null,
        fresh || answers,
        events || [],
        { nowMs },
      );

      const payload = {
        ok: true,
        serverNow: nowIso,
        attempt: detail,
        message: revisingContest
          ? `Nota revisada: ${finalScore}/20. Mensagem enviada ao aluno.`
          : `Nota fechada: ${finalScore}/20.`,
      };
      return res.status(200).json(payload);
    }

    // -------------------------------------------------------------------------
    // contestGrade — aluno contesta nota fechada
    // -------------------------------------------------------------------------
    if (action === 'contestGrade') {
      if (await rejectIfProvaRateLimited(res, 'contestGrade', user.id)) return undefined;

      const { attempt: raw, error: attError } = await loadAttemptForUser(examId, user.id);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Nenhuma tentativa encontrada.');
      if (raw.status !== 'graded') {
        return jsonError(res, 409, 'Só é possível contestar depois que o Mestre fechar a nota.');
      }
      if (raw.contest_status === 'open') {
        return jsonError(res, 409, 'Você já tem uma contestação aberta. Aguarde a resposta do Mestre.', {
          attempt: attemptStudentDto(raw, { nowMs }),
        });
      }

      const message = normalizeContestMessage(body.message ?? body.studentMessage ?? body.text);
      if (!message) {
        return jsonError(res, 400, 'Escreva o que você acha que está errado na correção (até 4000 caracteres).');
      }

      const touched = await touchAttempt(raw.id, {
        contest_status: 'open',
        contest_student_message: message,
        contest_admin_message: null,
        contested_at: nowIso,
        contest_resolved_at: null,
      });
      if (touched.error) {
        return maybeTableError(res, touched.error) || jsonError(res, 500, 'Falha ao abrir a contestação.');
      }

      const attempt = touched.attempt || {
        ...raw,
        contest_status: 'open',
        contest_student_message: message,
        contest_admin_message: null,
        contested_at: nowIso,
        contest_resolved_at: null,
      };

      return res.status(200).json({
        ok: true,
        serverNow: nowIso,
        attempt: attemptStudentDto(attempt, { nowMs }),
        message: 'Contestação enviada. O Mestre vai responder.',
      });
    }

    // -------------------------------------------------------------------------
    // adminRespondContest — responder ou reabrir correção
    // -------------------------------------------------------------------------
    if (action === 'adminRespondContest') {
      if (user.role !== 'admin') {
        return jsonError(res, 403, 'Apenas o Mestre pode responder contestação.');
      }
      const attemptId = normalizeAttemptId(body.attemptId ?? body.attempt_id);
      if (!attemptId) return jsonError(res, 400, 'Informe attemptId válido.');

      const contestAction = normalizeContestAdminAction(
        body.contestAction ?? body.respondAction ?? body.replyAction,
      );
      if (!contestAction) {
        return jsonError(res, 400, 'Informe contestAction: answer ou reopen.');
      }

      const { attempt: raw, error: attError } = await loadAttemptById(attemptId);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Tentativa não encontrada.');
      if (raw.contest_status !== 'open') {
        return jsonError(res, 409, 'Não há contestação aberta nesta tentativa.');
      }

      const adminMessage = normalizeContestMessage(
        body.message ?? body.adminMessage ?? body.text,
      );

      if (contestAction === 'answer') {
        if (!adminMessage) {
          return jsonError(res, 400, 'Escreva a resposta para o aluno (até 4000 caracteres).');
        }
        if (raw.status !== 'graded') {
          return jsonError(res, 409, 'Para só responder, a nota precisa estar fechada. Use reopen se quiser revisar.');
        }

        const touched = await touchAttempt(attemptId, {
          contest_status: 'answered',
          contest_admin_message: adminMessage,
          contest_resolved_at: nowIso,
        });
        if (touched.error) {
          return maybeTableError(res, touched.error) || jsonError(res, 500, 'Falha ao responder a contestação.');
        }

        void recordAdminAudit(supabase, {
          actorId: user.id,
          targetUserId: raw.user_id,
          action: ADMIN_AUDIT_ACTIONS.respondProvaContest,
          payload: { attemptId, contestAction: 'answer' },
        });

        const { answers } = await loadAnswers(attemptId);
        const { events } = await loadIntegrityEvents(attemptId);
        const detail = buildAdminAttemptDetail(
          touched.attempt || { ...raw, contest_status: 'answered', contest_admin_message: adminMessage },
          raw.users || null,
          answers || [],
          events || [],
          { nowMs },
        );

        return res.status(200).json({
          ok: true,
          serverNow: nowIso,
          attempt: detail,
          message: 'Resposta enviada ao aluno.',
        });
      }

      // reopen — volta para submitted para o Mestre re-notar e fechar de novo
      if (raw.status !== 'graded' && raw.status !== 'submitted' && raw.status !== 'timed_out') {
        return jsonError(res, 409, 'Só é possível reabrir tentativa já enviada ou com nota fechada.');
      }

      const reopenPatch = {
        status: 'submitted',
        graded_at: null,
        graded_by: null,
        contest_status: 'open',
        contest_resolved_at: null,
      };
      if (adminMessage) {
        reopenPatch.contest_admin_message = adminMessage;
      }

      const touched = await touchAttempt(attemptId, reopenPatch);
      if (touched.error) {
        return maybeTableError(res, touched.error) || jsonError(res, 500, 'Falha ao reabrir a correção.');
      }

      void recordAdminAudit(supabase, {
        actorId: user.id,
        targetUserId: raw.user_id,
        action: ADMIN_AUDIT_ACTIONS.reopenProvaGrade,
        payload: {
          attemptId,
          previousFinalScore: raw.final_score != null ? Number(raw.final_score) : null,
          hadAdminMessage: Boolean(adminMessage),
        },
      });

      const { answers } = await loadAnswers(attemptId);
      const { events } = await loadIntegrityEvents(attemptId);
      const detail = buildAdminAttemptDetail(
        touched.attempt || { ...raw, ...reopenPatch },
        raw.users || null,
        answers || [],
        events || [],
        { nowMs },
      );

      return res.status(200).json({
        ok: true,
        serverNow: nowIso,
        attempt: detail,
        message: 'Correção reaberta. Ajuste as notas e feche de novo.',
      });
    }

    // -------------------------------------------------------------------------
    // adminResetAttempt — apaga tentativa (aluno pode fazer de novo)
    // -------------------------------------------------------------------------
    if (action === 'adminResetAttempt') {
      if (user.role !== 'admin') {
        return jsonError(res, 403, 'Apenas o Mestre pode resetar a prova.');
      }
      const attemptId = normalizeAttemptId(body.attemptId ?? body.attempt_id);
      if (!attemptId) return jsonError(res, 400, 'Informe attemptId válido.');

      const { attempt: raw, error: attError } = await loadAttemptById(attemptId);
      if (attError) {
        return maybeTableError(res, attError) || jsonError(res, 500, 'Falha ao ler a tentativa.');
      }
      if (!raw) return jsonError(res, 404, 'Tentativa não encontrada.');

      const snapshot = {
        attemptId,
        examId: raw.exam_id,
        status: raw.status,
        finalScore: raw.final_score != null ? Number(raw.final_score) : null,
        mcScore: raw.mc_score != null ? Number(raw.mc_score) : null,
        discursiveScore: raw.discursive_score != null ? Number(raw.discursive_score) : null,
        contestStatus: raw.contest_status || null,
        startedAt: raw.started_at || null,
        submittedAt: raw.submitted_at || null,
        gradedAt: raw.graded_at || null,
      };

      // CASCADE nas FKs, mas apaga filhos primeiro por clareza / caches PostgREST
      const { error: intErr } = await supabase
        .from(INTEGRITY_EVENTS)
        .delete()
        .eq('attempt_id', attemptId);
      if (intErr) {
        return maybeTableError(res, intErr) || jsonError(res, 500, 'Falha ao limpar eventos de integridade.');
      }

      const { error: ansErr } = await supabase
        .from(ANSWERS)
        .delete()
        .eq('attempt_id', attemptId);
      if (ansErr) {
        return maybeTableError(res, ansErr) || jsonError(res, 500, 'Falha ao limpar respostas.');
      }

      const { error: delErr } = await supabase
        .from(ATTEMPTS)
        .delete()
        .eq('id', attemptId);
      if (delErr) {
        return maybeTableError(res, delErr) || jsonError(res, 500, 'Falha ao apagar a tentativa.');
      }

      void recordAdminAudit(supabase, {
        actorId: user.id,
        targetUserId: raw.user_id,
        action: ADMIN_AUDIT_ACTIONS.resetProvaAttempt,
        payload: snapshot,
      });

      return res.status(200).json({
        ok: true,
        serverNow: nowIso,
        reset: true,
        attemptId,
        userId: raw.user_id,
        message: 'Tentativa apagada. O aluno pode iniciar a prova de novo (se o gate estiver aberto para a turma).',
      });
    }

    // -------------------------------------------------------------------------
    // adminResetAllAttempts — apaga todas (ou por turma) para refazer
    // -------------------------------------------------------------------------
    if (action === 'adminResetAllAttempts') {
      if (user.role !== 'admin') {
        return jsonError(res, 403, 'Apenas o Mestre pode resetar a prova.');
      }
      const confirm = String(body.confirm || '').trim().toUpperCase();
      if (confirm !== 'RESETAR') {
        return jsonError(res, 400, 'Confirme enviando confirm: "RESETAR".');
      }

      const turmaFilter = normalizeTurmaFilter(body.turma);
      let query = supabase
        .from(ATTEMPTS)
        .select('id, user_id, status, final_score, users:user_id ( turma )')
        .eq('exam_id', examId);

      const { data: rows, error: listErr } = await query;
      if (listErr) {
        return maybeTableError(res, listErr) || jsonError(res, 500, 'Falha ao listar tentativas.');
      }

      const targets = (rows || []).filter((row) => {
        if (!turmaFilter) return true;
        const turma = row.users?.turma || null;
        return turma === turmaFilter;
      });

      if (!targets.length) {
        return res.status(200).json({
          ok: true,
          serverNow: nowIso,
          reset: true,
          deleted: 0,
          message: turmaFilter
            ? `Nenhuma tentativa da turma ${turmaFilter} para apagar.`
            : 'Nenhuma tentativa para apagar.',
        });
      }

      const ids = targets.map((r) => r.id);
      const { error: intErr } = await supabase
        .from(INTEGRITY_EVENTS)
        .delete()
        .in('attempt_id', ids);
      if (intErr) {
        return maybeTableError(res, intErr) || jsonError(res, 500, 'Falha ao limpar eventos de integridade.');
      }
      const { error: ansErr } = await supabase
        .from(ANSWERS)
        .delete()
        .in('attempt_id', ids);
      if (ansErr) {
        return maybeTableError(res, ansErr) || jsonError(res, 500, 'Falha ao limpar respostas.');
      }
      const { error: delErr } = await supabase
        .from(ATTEMPTS)
        .delete()
        .in('id', ids);
      if (delErr) {
        return maybeTableError(res, delErr) || jsonError(res, 500, 'Falha ao apagar tentativas.');
      }

      void recordAdminAudit(supabase, {
        actorId: user.id,
        targetUserId: null,
        action: ADMIN_AUDIT_ACTIONS.resetAllProvaAttempts,
        payload: {
          examId,
          turma: turmaFilter || null,
          deleted: ids.length,
          attemptIds: ids,
        },
      });

      return res.status(200).json({
        ok: true,
        serverNow: nowIso,
        reset: true,
        deleted: ids.length,
        message: turmaFilter
          ? `Apagadas ${ids.length} tentativa(s) da turma ${turmaFilter}. Esses alunos podem fazer de novo.`
          : `Apagadas ${ids.length} tentativa(s). Esses alunos podem fazer de novo.`,
      });
    }

    return jsonError(res, 400, 'Ação desconhecida.');
  } catch (error) {
    console.error('[api/prova]', error);
    if (isMissingTable(error)) {
      return jsonError(res, 503, TABLE_MISSING);
    }
    return jsonError(res, 500, 'Erro interno da prova.');
  }
}

/** Exportado para smokes. */
export {
  isMissingTable,
  sanitizeQuestionsForClient,
  TOTAL_POINTS,
  EXAM_ID,
};
