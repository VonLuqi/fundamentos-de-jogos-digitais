/**
 * Tentativa ativa da prova — leitura barata para session-bootstrap (Task C1).
 */

import { EXAM_ID } from './questions-modulo1.js';

const ATTEMPTS = 'prova_attempts';

function isMissingTable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === '42P01'
    || code === 'PGRST205'
    || (/prova_/i.test(message) && /does not exist|schema cache|Could not find the table/i.test(message));
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number} userId
 * @param {string} [examId]
 * @returns {Promise<{ inProgress: boolean, attemptId?: string, examId?: string, endsAt?: string, remainingMs?: number, currentQuestionIndex?: number }>}
 */
export async function loadProvaGateForUser(supabase, userId, examId = EXAM_ID) {
  const empty = { inProgress: false };
  if (!supabase || !userId) return empty;

  try {
    const { data, error } = await supabase
      .from(ATTEMPTS)
      .select('id, exam_id, status, ends_at, current_question_index')
      .eq('user_id', userId)
      .eq('exam_id', examId)
      .eq('status', 'in_progress')
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return empty;
      console.warn('[prova/active-attempt]', error.message);
      return empty;
    }
    if (!data) return empty;

    const endsAt = data.ends_at || null;
    const endsMs = endsAt ? new Date(endsAt).getTime() : NaN;
    const remainingMs = Number.isFinite(endsMs)
      ? Math.max(0, endsMs - Date.now())
      : null;

    return {
      inProgress: true,
      attemptId: data.id,
      examId: data.exam_id || examId,
      endsAt,
      remainingMs,
      currentQuestionIndex: Number(data.current_question_index) || 0,
    };
  } catch (error) {
    console.warn('[prova/active-attempt]', error);
    return empty;
  }
}
