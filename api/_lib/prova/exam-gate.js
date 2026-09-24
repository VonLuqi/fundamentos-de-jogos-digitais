/**
 * Gate da prova — 1 turma por vez (Task D1).
 * Seed: fechada. Abrir = is_open + exatamente uma turma em open_turmas.
 */

export const PROVA_GATE_TURMAS = Object.freeze(['TCG01', 'TCG02']);

const TURMA_SET = new Set(PROVA_GATE_TURMAS);

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeOpenTurmas(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const t = String(item || '').trim().toUpperCase();
    if (TURMA_SET.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

/**
 * Estado canônico do gate para UI/API.
 * @param {{ is_open?: boolean, open_turmas?: unknown }|null|undefined} exam
 * @returns {{ state: 'closed'|'TCG01'|'TCG02', openTurma: string|null, isOpen: boolean, openTurmas: string[] }}
 */
export function examGateFromRow(exam) {
  const openTurmas = normalizeOpenTurmas(exam?.open_turmas);
  const isOpenFlag = Boolean(exam?.is_open);
  // v1: is_open sem turma (ou >1) = fechado efetivo
  if (!isOpenFlag || openTurmas.length !== 1) {
    return {
      state: 'closed',
      openTurma: null,
      isOpen: false,
      openTurmas: [],
    };
  }
  return {
    state: /** @type {'TCG01'|'TCG02'} */ (openTurmas[0]),
    openTurma: openTurmas[0],
    isOpen: true,
    openTurmas: [openTurmas[0]],
  };
}

/**
 * Interpreta payload adminSetExamOpen.
 * Aceita `mode` ('closed'|'TCG01'|'TCG02') ou isOpen + openTurmas.
 * @param {Record<string, unknown>} body
 * @returns {{ ok: true, is_open: boolean, open_turmas: string[] }|{ ok: false, error: string }}
 */
export function parseAdminSetExamOpenBody(body) {
  const modeRaw = body?.mode ?? body?.gate ?? body?.state;
  if (modeRaw != null && String(modeRaw).trim() !== '') {
    const mode = String(modeRaw).trim();
    if (mode === 'closed' || mode === 'fechada' || mode === 'off' || mode === 'false') {
      return { ok: true, is_open: false, open_turmas: [] };
    }
    const turma = mode.toUpperCase();
    if (TURMA_SET.has(turma)) {
      return { ok: true, is_open: true, open_turmas: [turma] };
    }
    return { ok: false, error: 'Modo inválido. Use closed, TCG01 ou TCG02.' };
  }

  const openTurmas = normalizeOpenTurmas(body?.openTurmas ?? body?.open_turmas);
  const isOpen = body?.isOpen === true || body?.is_open === true
    || body?.open === true;

  if (!isOpen || openTurmas.length === 0) {
    return { ok: true, is_open: false, open_turmas: [] };
  }
  if (openTurmas.length > 1) {
    return { ok: false, error: 'Na v1 liberar apenas uma turma por vez (TCG01 ou TCG02).' };
  }
  return { ok: true, is_open: true, open_turmas: openTurmas };
}

/**
 * Contagens simples a partir de linhas de status.
 * @param {Array<{ status?: string }>|null|undefined} rows
 */
export function countAttemptsByStatus(rows) {
  const counts = {
    inProgress: 0,
    submitted: 0,
    timedOut: 0,
    graded: 0,
    total: 0,
    awaitingGrade: 0,
  };
  for (const row of rows || []) {
    const status = String(row?.status || '');
    counts.total += 1;
    if (status === 'in_progress') counts.inProgress += 1;
    else if (status === 'submitted') counts.submitted += 1;
    else if (status === 'timed_out') counts.timedOut += 1;
    else if (status === 'graded') counts.graded += 1;
  }
  counts.awaitingGrade = counts.submitted + counts.timedOut;
  return counts;
}
