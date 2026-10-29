/**
 * Prova (M1, M2) e Trabalho Final — UI do aluno. `?exam=<id>` escolhe o exame (padrão: modulo1-provacao).
 * Tasks B1–B3 + C2–C3 (M1) · multi-exame (M2 + entrega .zip).
 */

'use strict';

import { createProvaTimer } from './prova/timer.js';
import { createProvaIntegrityMonitor } from './prova/integrity.js';
import {
  PROJECT_COPY,
  PROVA_COPY,
  buildExamCopy,
  formatSubmitUnansweredSummary,
} from './prova/copy.js';
import {
  ApiError,
  ROUTES,
  getSession,
  provaContestGrade,
  provaGetAttempt,
  provaGetExamStatus,
  provaReportIntegrityEvent,
  provaSaveAnswer,
  provaSetCurrentQuestion,
  provaStartAttempt,
  provaSubmitAttempt,
  provaSubmitProject,
  requireSession,
} from './api.js';
import {
  isAnswerFilled,
  readAnswerFromDom,
  renderPrompt,
  renderQuestion,
  syncProgressDots,
} from './prova/questions-ui.js';

const QUESTION_COUNT = 20;
const AUTOSAVE_MS = 800;
const EXPIRE_RETRY_MS = 2500;
const EXPIRE_MAX_RETRIES = 8;
const PANEL_IDS = ['loading', 'intro', 'exam', 'project', 'done', 'blocked'];
const DEFAULT_EXAM_ID = 'modulo1-provacao';
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

/** Exame da URL (`prova/?exam=modulo2-prova`); sem parâmetro = Módulo 1 (compatibilidade). */
function resolveExamId() {
  try {
    const raw = new URLSearchParams(window.location.search).get('exam');
    const id = String(raw || '').trim();
    return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(id) ? id : DEFAULT_EXAM_ID;
  } catch {
    return DEFAULT_EXAM_ID;
  }
}

const EXAM_ID = resolveExamId();

/**
 * Identidade local por exame (a URL é a fonte da verdade): rótulos do topo, tipo e nº de questões.
 * Nunca depender do backend para decidir "isto é o Módulo 1" — um backend antigo devolve o M1 para qualquer examId.
 */
const LOCAL_EXAMS = Object.freeze({
  'modulo1-provacao': { kind: 'quiz', eyebrow: 'Módulo 1 · Avaliação', title: 'Provação do Círculo Mágico', questions: 20 },
  'modulo2-prova': { kind: 'quiz', eyebrow: 'Módulo 2 · Avaliação', title: 'Provação do Módulo 2', questions: 10 },
  'trabalho-final': { kind: 'project', eyebrow: 'Trabalho Final · Entrega', title: 'Trabalho Final', questions: 0 },
});
const LOCAL_EXAM = LOCAL_EXAMS[EXAM_ID] || { kind: 'quiz', eyebrow: 'Avaliação', title: 'Avaliação', questions: 0 };
const IS_PROJECT_LOCAL = LOCAL_EXAM.kind === 'project';

function localQuestionCount() {
  return LOCAL_EXAM.questions || QUESTION_COUNT;
}

/** O exame que o servidor devolveu é o da URL (e do mesmo tipo)? */
function examMatchesUrl(exam) {
  if (!exam || exam.id !== EXAM_ID) return false;
  // Backend antigo ecoa o id pedido sem `kind` e serve questões do M1: só o M1 aceita resposta sem `kind`.
  if (EXAM_ID !== DEFAULT_EXAM_ID && typeof exam.kind !== 'string') return false;
  return (exam.kind || 'quiz') === LOCAL_EXAM.kind;
}

function showExamUnavailable() {
  showPanel('blocked');
  if (els.blockedMessage) {
    els.blockedMessage.textContent = 'Este exame ainda não está disponível no servidor. Avise o Mestre.';
  }
}

function paintTopbarForExam() {
  const eyebrow = $('prova-topbar-eyebrow');
  if (eyebrow) eyebrow.textContent = LOCAL_EXAM.eyebrow;
  if (els.examTitle) els.examTitle.textContent = LOCAL_EXAM.title;
  if (els.counter) els.counter.textContent = `Questão 1 de ${localQuestionCount()}`;
  if (IS_PROJECT_LOCAL) {
    // Trabalho Final: nunca contador, tempo nem integridade.
    if (els.topbarMeta) els.topbarMeta.remove();
    if (els.warn) els.warn.remove();
    els.topbarMeta = null;
    els.warn = null;
    els.timer = null;
    els.timerValue = null;
    els.counter = null;
  }
}
/** Copy do exame atual (M1 = PROVA_COPY idêntico; M2 deriva de `exam`). */
let copy = PROVA_COPY;

const els = {};

let currentUser = null;
let currentToken = null;
/** @type {'loading'|'intro'|'exam'|'done'|'blocked'} */
let view = 'loading';

/** @type {object|null} */
let examMeta = null;
/** @type {object|null} */
let attempt = null;
/** @type {import('./prova/questions-ui.js').ProvaQuestion[]} */
let questions = [];
/** @type {Record<string, { choice?: string|null, textAnswer?: string|null }>} */
let answersById = {};

let displayIndex = 0;
let busy = false;
let saveTimer = null;
let dirty = false;
let examLocked = false;
/** @type {ReturnType<typeof createProvaTimer>|null} */
let provaTimer = null;
/** @type {ReturnType<typeof createProvaIntegrityMonitor>|null} */
let integrityMonitor = null;
let expireRetries = 0;
let expireRetryTimer = null;

function $(id) {
  return document.getElementById(id);
}

function asStudentOpts() {
  return currentUser?.role === 'admin'
    ? { examId: EXAM_ID, asStudent: true }
    : { examId: EXAM_ID };
}

function cacheEls() {
  els.warn = $('prova-warn');
  els.topbarMeta = $('prova-topbar-meta');
  els.examTitle = $('prova-exam-title');
  els.counter = $('prova-counter');
  els.timer = $('prova-timer');
  els.timerValue = $('prova-timer-value');
  els.loading = $('prova-loading');
  els.intro = $('prova-intro');
  els.introStatus = $('prova-intro-status');
  els.btnStart = $('prova-btn-start');
  els.btnLeaveIntro = $('prova-btn-leave-intro');
  els.exam = $('prova-exam');
  els.progress = $('prova-progress');
  els.questionEyebrow = $('prova-question-eyebrow');
  els.prompt = $('prova-prompt');
  els.choices = $('prova-choices');
  els.discursive = $('prova-discursive');
  els.textarea = $('prova-textarea');
  els.charCount = $('prova-char-count');
  els.saveStatus = $('prova-save-status');
  els.btnPrev = $('prova-btn-prev');
  els.btnNext = $('prova-btn-next');
  els.btnSubmit = $('prova-btn-submit');
  els.done = $('prova-done');
  els.doneEyebrow = $('prova-done-eyebrow');
  els.doneHeading = $('prova-done-heading');
  els.doneMessage = $('prova-done-message');
  els.doneSubmitted = $('prova-done-submitted');
  els.doneResult = $('prova-done-result');
  els.doneScore = $('prova-done-score');
  els.doneMcLabel = $('prova-done-mc-label');
  els.doneMcValue = $('prova-done-mc-value');
  els.doneDiscLabel = $('prova-done-disc-label');
  els.doneDiscValue = $('prova-done-disc-value');
  els.doneTotalLabel = $('prova-done-total-label');
  els.doneTotalValue = $('prova-done-total-value');
  els.doneFootnote = $('prova-done-footnote');
  els.doneReview = $('prova-done-review');
  els.doneReviewTitle = $('prova-done-review-title');
  els.doneReviewGeneral = $('prova-done-review-general');
  els.doneReviewList = $('prova-done-review-list');
  els.introHeading = $('prova-intro-heading');
  els.introLead = $('prova-intro-lead');
  els.introRules = $('prova-intro-rules');
  els.doneBreakdown = $('prova-done-breakdown');
  els.project = $('prova-project');
  els.projectHeading = $('prova-project-heading');
  els.projectStatement = $('prova-project-statement');
  els.projectDeadline = $('prova-project-deadline');
  els.projectGuide = $('prova-project-guide');
  els.projectMax = $('prova-project-max');
  els.projectCurrent = $('prova-project-current');
  els.projectCurrentName = $('prova-project-current-name');
  els.projectCurrentSize = $('prova-project-current-size');
  els.projectCurrentWhen = $('prova-project-current-when');
  els.projectCurrentCount = $('prova-project-current-count');
  els.projectForm = $('prova-project-form');
  els.projectFile = $('prova-project-file');
  els.projectProgress = $('prova-project-progress');
  els.projectStatus = $('prova-project-status');
  els.projectSubmit = $('prova-project-submit');
  els.projectRefresh = $('prova-project-refresh');
  els.doneContest = $('prova-done-contest');
  els.doneContestTitle = $('prova-done-contest-title');
  els.doneContestLead = $('prova-done-contest-lead');
  els.doneContestThread = $('prova-done-contest-thread');
  els.doneContestForm = $('prova-done-contest-form');
  els.doneContestMessage = $('prova-done-contest-message');
  els.doneContestStatus = $('prova-done-contest-status');
  els.doneContestSubmit = $('prova-done-contest-submit');
  els.btnRefreshStatus = $('prova-btn-refresh-status');
  els.btnDashboard = $('prova-btn-dashboard');
  els.blocked = $('prova-blocked');
  els.blockedMessage = $('prova-blocked-message');
  els.dialogSubmit = $('prova-dialog-submit');
  els.dialogSubmitBody = $('prova-dialog-submit-body');
  els.dialogSubmitSummary = $('prova-dialog-submit-summary');
  els.dialogExpired = $('prova-dialog-expired');
  els.dialogExpiredBody = $('prova-dialog-expired-body');
  els.dialogExpiredOk = $('prova-dialog-expired-ok');
  els.dialogIntegrity = $('prova-dialog-integrity');
}

function showPanel(name) {
  view = name;
  for (const id of PANEL_IDS) {
    const node = els[id];
    if (!node) continue;
    node.hidden = id !== name;
  }
  const inExam = name === 'exam';
  if (els.warn) els.warn.hidden = !inExam;
  if (els.topbarMeta) els.topbarMeta.hidden = !inExam;
  if (!inExam) {
    stopExamTimer();
    stopIntegrityMonitor();
  }
}

function setSaveStatus(text, isError = false) {
  if (!els.saveStatus) return;
  els.saveStatus.textContent = text || '';
  els.saveStatus.classList.toggle('is-error', Boolean(isError));
}

function stopExamTimer() {
  if (expireRetryTimer) {
    window.clearTimeout(expireRetryTimer);
    expireRetryTimer = null;
  }
  provaTimer?.stop();
}

function stopIntegrityMonitor() {
  integrityMonitor?.stop();
}

function showIntegrityFirstExitModal() {
  if (els.warn) els.warn.classList.add('is-alert');
  if (els.dialogIntegrity && typeof els.dialogIntegrity.showModal === 'function') {
    if (!els.dialogIntegrity.open) els.dialogIntegrity.showModal();
  }
}

async function sendIntegrityEvent(eventType, meta = {}) {
  if (!currentToken || examLocked || attempt?.status !== 'in_progress') return;
  try {
    await provaReportIntegrityEvent(currentToken, {
      ...asStudentOpts(),
      eventType,
      meta,
    });
  } catch (err) {
    // Best-effort: não interrompe a prova
    console.warn('[prova] integrity', err);
  }
}

function ensureIntegrityMonitor() {
  if (integrityMonitor) return integrityMonitor;
  integrityMonitor = createProvaIntegrityMonitor({
    onFirstExit: showIntegrityFirstExitModal,
    onEvent: (type, meta) => sendIntegrityEvent(type, meta),
    shouldWarnUnload: () => (
      view === 'exam'
      && attempt?.status === 'in_progress'
      && !examLocked
    ),
  });
  return integrityMonitor;
}

function startIntegrityMonitor() {
  if (examLocked || attempt?.status !== 'in_progress') return;
  if (els.warn) els.warn.classList.remove('is-alert');
  ensureIntegrityMonitor().start();
}

function syncTimerFromPayload(payload) {
  if (!provaTimer) return;
  const endsAt = payload?.attempt?.endsAt || payload?.endsAt;
  const serverNow = payload?.serverNow;
  const remainingMs = payload?.remainingMs ?? payload?.attempt?.remainingMs;
  if (endsAt) {
    provaTimer.sync(endsAt, serverNow);
    return;
  }
  if (remainingMs != null) {
    const state = provaTimer.getState();
    const alignedNow = Date.now() + (state.offsetMs || 0);
    provaTimer.sync(alignedNow + Number(remainingMs), serverNow);
  }
}

function startExamTimer(payload) {
  if (!provaTimer) return;
  const endsAt = payload?.attempt?.endsAt || payload?.endsAt;
  const serverNow = payload?.serverNow;
  if (!endsAt) {
    provaTimer.stop();
    return;
  }
  provaTimer.start(endsAt, serverNow);
}

async function timerResync() {
  if (!currentToken || attempt?.status !== 'in_progress' || examLocked) return null;
  try {
    const status = await provaGetExamStatus(currentToken, asStudentOpts());
    if (status.attempt?.status && status.attempt.status !== 'in_progress') {
      attempt = status.attempt;
      stopExamTimer();
      void openDonePanel(attempt);
      return null;
    }
    if (status.attempt) attempt = { ...attempt, ...status.attempt };
    return {
      endsAt: status.attempt?.endsAt,
      serverNow: status.serverNow,
      remainingMs: status.attempt?.remainingMs,
    };
  } catch (error) {
    console.warn('[prova] timer resync', error);
    return null;
  }
}

function showExpiredDialog(message, { allowClose = false } = {}) {
  if (els.dialogExpiredBody) {
    els.dialogExpiredBody.textContent = message;
  }
  if (els.dialogExpiredOk) {
    els.dialogExpiredOk.disabled = !allowClose;
    els.dialogExpiredOk.textContent = allowClose ? copy.expiredOk : copy.expiredWait;
  }
  if (els.dialogExpired && typeof els.dialogExpired.showModal === 'function') {
    if (!els.dialogExpired.open) els.dialogExpired.showModal();
  }
}

function lockExamUi() {
  examLocked = true;
  if (els.btnPrev) els.btnPrev.disabled = true;
  if (els.btnNext) els.btnNext.disabled = true;
  if (els.btnSubmit) els.btnSubmit.disabled = true;
  if (els.textarea) els.textarea.disabled = true;
  els.choices?.querySelectorAll('input').forEach((input) => {
    input.disabled = true;
  });
  els.progress?.querySelectorAll('.prova-progress__dot').forEach((dot) => {
    dot.disabled = true;
  });
}

async function autoSubmitOnExpire() {
  if (examLocked && expireRetries === 0) return;
  captureLocalAnswer();
  lockExamUi();
  showExpiredDialog(copy.expiredSending);
  setSaveStatus('Tempo esgotado — enviando…', true);

  const ok = await submitExam({ auto: true });
  if (ok) {
    showExpiredDialog(copy.expiredSent, {
      allowClose: true,
    });
    return;
  }

  expireRetries += 1;
  if (expireRetries >= EXPIRE_MAX_RETRIES) {
    showExpiredDialog(copy.expiredRetryFail, { allowClose: true });
    setSaveStatus('Envio automático falhou após várias tentativas.', true);
    return;
  }

  showExpiredDialog(
    `Falha de rede ao enviar. Tentando de novo (${expireRetries}/${EXPIRE_MAX_RETRIES})…`,
  );
  expireRetryTimer = window.setTimeout(() => {
    examLocked = false;
    void autoSubmitOnExpire();
  }, EXPIRE_RETRY_MS);
}

function ensureTimer() {
  if (provaTimer) return provaTimer;
  provaTimer = createProvaTimer({
    valueEl: els.timerValue,
    rootEl: els.timer,
    onExpire: () => {
      void autoSubmitOnExpire();
    },
    onResync: timerResync,
  });
  return provaTimer;
}

function currentQuestion() {
  return questions[displayIndex] || null;
}

function buildProgressDots() {
  if (!els.progress) return;
  els.progress.replaceChildren();
  const count = questions.length || localQuestionCount();
  for (let i = 0; i < count; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prova-progress__dot';
    btn.textContent = String(i + 1);
    btn.dataset.index = String(i);
    btn.setAttribute('aria-label', `Ir para questão ${i + 1}`);
    btn.addEventListener('click', () => {
      void goToQuestion(i);
    });
    els.progress.appendChild(btn);
  }
}

function updateChromeForIndex(index) {
  const count = questions.length || localQuestionCount();
  const n = Math.min(count, Math.max(1, index + 1));
  if (els.counter) els.counter.textContent = `Questão ${n} de ${count}`;
  const q = questions[index];
  if (els.questionEyebrow) {
    els.questionEyebrow.textContent = q?.title || `Questão ${n}`;
  }
  const locked = busy || examLocked || attempt?.status !== 'in_progress';
  const isFirst = index <= 0;
  const isLast = index >= count - 1;
  if (els.btnPrev) els.btnPrev.disabled = locked || isFirst;
  if (els.btnNext) {
    els.btnNext.hidden = isLast;
    els.btnNext.disabled = locked || isLast;
  }
  if (els.btnSubmit) {
    els.btnSubmit.hidden = !isLast;
    els.btnSubmit.disabled = locked || !isLast;
  }
  syncProgressDots(els.progress, index, questions, answersById);
  if (examLocked) {
    els.progress?.querySelectorAll('.prova-progress__dot').forEach((dot) => {
      dot.disabled = true;
    });
  }
}

function applyAttemptPayload(payload) {
  examMeta = payload.exam || examMeta;
  attempt = payload.attempt || attempt;
  questions = Array.isArray(payload.questions) ? payload.questions.slice() : questions;
  answersById = { ...(payload.answers || {}) };

  if (examMeta?.title && els.examTitle) {
    els.examTitle.textContent = examMeta.title;
  }

  const idx = Number(attempt?.currentQuestionIndex);
  displayIndex = Number.isInteger(idx) && idx >= 0 ? idx : 0;

  buildProgressDots();
  ensureTimer();
  startExamTimer(payload);
  startIntegrityMonitor();
}

function paintCurrentQuestion() {
  const q = currentQuestion();
  if (!q) return;
  renderPrompt(q, els.prompt);
  renderQuestion({
    question: q,
    choicesEl: els.choices,
    discursiveEl: els.discursive,
    textareaEl: els.textarea,
    charCountEl: els.charCount,
    answer: answersById[q.id] || null,
    disabled: busy || examLocked || attempt?.status !== 'in_progress',
    onChange: (payload) => {
      if (examLocked) return;
      answersById[payload.questionId] = {
        choice: payload.choice ?? null,
        textAnswer: payload.textAnswer ?? null,
      };
      dirty = true;
      syncProgressDots(els.progress, displayIndex, questions, answersById);
      scheduleAutosave();
    },
  });
  updateChromeForIndex(displayIndex);
}

function scheduleAutosave() {
  if (examLocked) return;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void flushSave({ quiet: true });
  }, AUTOSAVE_MS);
}

function captureLocalAnswer() {
  const q = currentQuestion();
  if (!q || attempt?.status !== 'in_progress') return null;
  const local = readAnswerFromDom(q, {
    choicesEl: els.choices,
    textareaEl: els.textarea,
  });
  answersById[q.id] = local;
  return { question: q, local };
}

/**
 * @param {{ quiet?: boolean, currentQuestionIndex?: number }} [opts]
 */
async function flushSave(opts = {}) {
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!currentToken || attempt?.status !== 'in_progress' || examLocked) return true;

  const captured = captureLocalAnswer();
  if (!captured) return true;
  const { question, local } = captured;

  if (question.type === 'mc' && !local.choice) {
    dirty = false;
    if (opts.currentQuestionIndex != null) {
      try {
        const res = await provaSetCurrentQuestion(
          currentToken,
          opts.currentQuestionIndex,
          asStudentOpts(),
        );
        if (res.attempt) attempt = res.attempt;
        syncTimerFromPayload(res);
      } catch (error) {
        console.warn('[prova] setCurrentQuestion', error);
      }
    }
    return true;
  }

  try {
    if (!opts.quiet) setSaveStatus(copy.saveSaving);
    const payload = {
      ...asStudentOpts(),
      questionId: question.id,
      choice: local.choice,
      textAnswer: local.textAnswer,
    };
    if (opts.currentQuestionIndex != null) {
      payload.currentQuestionIndex = opts.currentQuestionIndex;
    }
    const res = await provaSaveAnswer(currentToken, payload);
    dirty = false;
    if (res.attempt) attempt = res.attempt;
    syncTimerFromPayload(res);
    if (!opts.quiet) setSaveStatus(copy.saveSaved);
    syncProgressDots(els.progress, displayIndex, questions, answersById);
    return true;
  } catch (error) {
    console.error('[prova] save', error);
    const msg = error instanceof ApiError ? error.message : 'Falha ao salvar.';
    setSaveStatus(msg, true);
    if (error instanceof ApiError && error.status === 409) {
      await handleLockedAttempt(error);
    }
    return false;
  }
}

async function handleLockedAttempt(error) {
  const att = error?.payload?.attempt;
  if (att) attempt = att;
  stopExamTimer();
  examLocked = true;
  void openDonePanel(attempt);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clearContestUi() {
  if (els.doneContest) els.doneContest.hidden = true;
  if (els.doneContestThread) {
    els.doneContestThread.hidden = true;
    els.doneContestThread.replaceChildren();
  }
  if (els.doneContestForm) els.doneContestForm.hidden = true;
  if (els.doneContestMessage) els.doneContestMessage.value = '';
  if (els.doneContestStatus) els.doneContestStatus.textContent = '';
  if (els.doneContestSubmit) {
    els.doneContestSubmit.disabled = false;
    els.doneContestSubmit.textContent = copy.contestSubmit;
  }
}

/**
 * @param {object|null|undefined} contest
 */
function renderContest(contest) {
  if (!els.doneContest) return;
  if (!contest) {
    clearContestUi();
    return;
  }

  const status = contest.status || null;
  const canContest = Boolean(contest.canContest);
  const hasThread = Boolean(contest.studentMessage || contest.adminMessage);

  if (!canContest && !hasThread && !status) {
    clearContestUi();
    return;
  }

  els.doneContest.hidden = false;

  if (status === 'open') {
    if (els.doneContestTitle) els.doneContestTitle.textContent = copy.contestOpenTitle;
    if (els.doneContestLead) els.doneContestLead.textContent = copy.contestOpenBody;
  } else if (status === 'answered') {
    if (els.doneContestTitle) els.doneContestTitle.textContent = copy.contestAnsweredTitle;
    if (els.doneContestLead) els.doneContestLead.textContent = '';
  } else if (status === 'revised') {
    if (els.doneContestTitle) els.doneContestTitle.textContent = copy.contestRevisedTitle;
    if (els.doneContestLead) els.doneContestLead.textContent = copy.contestRevisedBody;
  } else {
    if (els.doneContestTitle) els.doneContestTitle.textContent = copy.contestTitle;
    if (els.doneContestLead) els.doneContestLead.textContent = copy.contestLead;
  }

  if (els.doneContestThread) {
    if (hasThread) {
      els.doneContestThread.hidden = false;
      let html = '';
      if (contest.studentMessage) {
        html += `<div class="prova-contest__bubble prova-contest__bubble--student">
          <span class="prova-contest__bubble-label">${escapeHtml(copy.contestYourMessage)}</span>
          <p>${escapeHtml(contest.studentMessage)}</p>
        </div>`;
      }
      if (contest.adminMessage) {
        html += `<div class="prova-contest__bubble prova-contest__bubble--admin">
          <span class="prova-contest__bubble-label">${escapeHtml(copy.contestAdminReply)}</span>
          <p>${escapeHtml(contest.adminMessage)}</p>
        </div>`;
      }
      els.doneContestThread.innerHTML = html;
    } else {
      els.doneContestThread.hidden = true;
      els.doneContestThread.replaceChildren();
    }
  }

  if (els.doneContestForm) {
    const showForm = canContest;
    els.doneContestForm.hidden = !showForm;
    if (showForm && els.doneContestMessage) {
      els.doneContestMessage.placeholder = copy.contestPlaceholder;
    }
    if (showForm && els.doneContestSubmit) {
      els.doneContestSubmit.textContent = status
        ? copy.contestAgain
        : copy.contestSubmit;
    }
  }
  if (els.doneContestStatus) els.doneContestStatus.textContent = '';
}

function clearReviewUi() {
  if (els.doneReview) els.doneReview.hidden = true;
  if (els.doneReviewGeneral) {
    els.doneReviewGeneral.hidden = true;
    els.doneReviewGeneral.textContent = '';
  }
  if (els.doneReviewList) els.doneReviewList.replaceChildren();
  clearContestUi();
}

/**
 * @param {object|null|undefined} review
 */
function renderReview(review) {
  if (!els.doneReview || !els.doneReviewList) return;
  const items = Array.isArray(review?.items) ? review.items : [];
  if (!items.length) {
    clearReviewUi();
    return;
  }

  els.doneReview.hidden = false;
  if (els.doneReviewTitle) {
    els.doneReviewTitle.textContent = copy.doneReviewTitle;
  }

  if (els.doneReviewGeneral) {
    const note = String(review?.generalNote || '').trim();
    if (note) {
      els.doneReviewGeneral.hidden = false;
      els.doneReviewGeneral.innerHTML = `<span class="prova-review__comment-label">${escapeHtml(copy.doneReviewGeneral)}</span>${escapeHtml(note)}`;
    } else {
      els.doneReviewGeneral.hidden = true;
      els.doneReviewGeneral.textContent = '';
    }
  }

  els.doneReviewList.replaceChildren();
  for (const item of items) {
    const li = document.createElement('li');
    const isMc = item.type === 'mc';
    const ok = isMc ? Boolean(item.isCorrect) : null;
    li.className = [
      'prova-review__item',
      ok === true ? 'is-correct' : '',
      ok === false ? 'is-wrong' : '',
    ].filter(Boolean).join(' ');

    const pts = item.pointsAwarded != null ? Number(item.pointsAwarded) : 0;
    const max = item.maxPoints != null ? Number(item.maxPoints) : (isMc ? 1 : 1);
    const qLabel = item.number != null
      ? `Questão ${String(item.number).padStart(2, '0')}`
      : item.questionId;

    let body = `
      <div class="prova-review__head">
        <p class="prova-review__qnum">${escapeHtml(qLabel)}${isMc && ok === true ? ` · ${escapeHtml(copy.doneReviewOk)}` : ''}${isMc && ok === false ? ` · ${escapeHtml(copy.doneReviewMiss)}` : ''}</p>
        <p class="prova-review__points">${escapeHtml(copy.doneReviewPoints)}: ${pts} / ${max}</p>
      </div>
      <p class="prova-review__prompt">${escapeHtml(item.prompt || '')}</p>
    `;

    if (isMc) {
      const yours = item.studentChoice
        ? `${item.studentChoice}) ${item.choices?.[item.studentChoice] || ''}`.trim()
        : copy.doneReviewBlank;
      const correct = item.correctChoice
        ? `${item.correctChoice}) ${item.choices?.[item.correctChoice] || ''}`.trim()
        : '—';
      body += `
        <p class="prova-review__meta"><strong>${escapeHtml(copy.doneReviewYourChoice)}:</strong> ${escapeHtml(yours)}</p>
        <p class="prova-review__meta"><strong>${escapeHtml(copy.doneReviewCorrect)}:</strong> ${escapeHtml(correct)}</p>
      `;
    } else {
      const text = String(item.studentText || '').trim() || copy.doneReviewBlank;
      body += `<div class="prova-review__answer">${escapeHtml(text)}</div>`;
    }

    const comment = String(item.comment || '').trim();
    if (comment) {
      body += `
        <div class="prova-review__comment">
          <span class="prova-review__comment-label">${escapeHtml(copy.doneReviewComment)}</span>
          ${escapeHtml(comment)}
        </div>
      `;
    }

    li.innerHTML = body;
    els.doneReviewList.appendChild(li);
  }
}

function showDonePanel(att, review = null) {
  showPanel('done');
  if (!att) return;

  const isGraded = att.status === 'graded';
  const isTimedOut = att.status === 'timed_out';

  if (els.doneEyebrow) {
    els.doneEyebrow.textContent = isGraded ? 'Resultado' : 'Enviada';
  }

  if (els.doneSubmitted) {
    if (att.submittedAt) {
      els.doneSubmitted.hidden = false;
      try {
        const when = new Date(att.submittedAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        els.doneSubmitted.textContent = `${copy.doneSubmittedAt} ${when}.`;
      } catch {
        els.doneSubmitted.textContent = '';
        els.doneSubmitted.hidden = true;
      }
    } else {
      els.doneSubmitted.hidden = true;
    }
  }

  if (els.btnRefreshStatus) {
    els.btnRefreshStatus.hidden = isGraded;
    els.btnRefreshStatus.disabled = false;
    els.btnRefreshStatus.textContent = copy.doneRefresh;
  }

  if (isGraded) {
    if (els.doneHeading) {
      els.doneHeading.textContent = examMeta?.kind === 'project' ? PROJECT_COPY.gradedHeading : copy.doneGradedHeading;
    }
    if (els.doneMessage) {
      els.doneMessage.textContent = examMeta?.kind === 'project' ? PROJECT_COPY.gradedMessage : copy.doneGradedMessage;
    }
    if (els.doneResult) els.doneResult.hidden = false;

    const finalScore = att.finalScore != null ? Number(att.finalScore) : null;
    const mcScore = att.mcScore != null ? Number(att.mcScore) : null;
    const discScore = att.discursiveScore != null ? Number(att.discursiveScore) : null;
    // Máximos vêm da API (M1 = 12/8/20; M2 = 20/0/20; Trabalho = 30).
    const totalMax = att.totalMax != null ? Number(att.totalMax) : 20;
    const mcMax = att.mcMax != null ? Number(att.mcMax) : 12;
    const discMax = att.discursiveMax != null ? Number(att.discursiveMax) : 8;
    const isProjectExam = examMeta?.kind === 'project';

    if (els.doneScore) {
      els.doneScore.textContent = finalScore != null ? `${finalScore} / ${totalMax}` : `— / ${totalMax}`;
    }
    if (els.doneMcLabel) els.doneMcLabel.textContent = copy.doneBreakdownMc;
    if (els.doneDiscLabel) els.doneDiscLabel.textContent = copy.doneBreakdownDisc;
    if (els.doneTotalLabel) els.doneTotalLabel.textContent = copy.doneBreakdownTotal;
    if (els.doneMcValue) {
      els.doneMcValue.textContent = mcScore != null ? `${mcScore} / ${mcMax}` : `— / ${mcMax}`;
      if (els.doneMcValue.parentElement) els.doneMcValue.parentElement.hidden = isProjectExam || mcMax <= 0;
    }
    if (els.doneDiscValue) {
      els.doneDiscValue.textContent = discScore != null ? `${discScore} / ${discMax}` : `— / ${discMax}`;
      if (els.doneDiscValue.parentElement) els.doneDiscValue.parentElement.hidden = isProjectExam || discMax <= 0;
    }
    if (els.doneTotalValue) {
      els.doneTotalValue.textContent = finalScore != null ? `${finalScore} / ${totalMax}` : `— / ${totalMax}`;
    }
    if (els.doneBreakdown) els.doneBreakdown.hidden = isProjectExam;
    renderReview(review);
    if (isProjectExam) renderProjectFeedback(review);
    renderContest(att.contest);
    return;
  }

  clearReviewUi();
  if (els.doneHeading) els.doneHeading.textContent = copy.doneHeading;
  if (els.doneMessage) {
    els.doneMessage.textContent = isTimedOut
      ? copy.doneTimedOut
      : copy.doneWaiting;
  }
  if (els.doneResult) els.doneResult.hidden = true;
}

async function openDonePanel(att, review = null) {
  if (!att) return;
  if (att.status === 'graded' && review == null) {
    await loadDoneWithReview(att);
    return;
  }
  showDonePanel(att, review);
}

async function loadDoneWithReview(fallbackAttempt = null) {
  if (!currentToken) {
    if (fallbackAttempt) showDonePanel(fallbackAttempt);
    return;
  }
  try {
    const payload = examMeta?.kind === 'project'
      ? await provaGetExamStatus(currentToken, asStudentOpts())
      : await provaGetAttempt(currentToken, asStudentOpts());
    attempt = payload.attempt || fallbackAttempt || attempt;
    showDonePanel(attempt, payload.review || null);
  } catch (error) {
    console.warn('[prova] load review', error);
    if (fallbackAttempt) showDonePanel(fallbackAttempt);
  }
}

async function refreshDoneStatus() {
  if (!currentToken || busy) return;
  busy = true;
  if (els.btnRefreshStatus) {
    els.btnRefreshStatus.disabled = true;
    els.btnRefreshStatus.textContent = 'Verificando…';
  }
  try {
    const status = await provaGetExamStatus(currentToken, asStudentOpts());
    const att = status.attempt;
    if (!att) return;
    attempt = att;
    if (att.status === 'graded') {
      await loadDoneWithReview(att);
    } else {
      void openDonePanel(att);
    }
  } catch (error) {
    console.warn('[prova] refresh status', error);
    if (els.doneMessage) {
      els.doneMessage.textContent = error instanceof ApiError
        ? error.message
        : 'Não foi possível atualizar agora.';
    }
  } finally {
    busy = false;
    if (els.btnRefreshStatus && attempt?.status !== 'graded') {
      els.btnRefreshStatus.disabled = false;
      els.btnRefreshStatus.textContent = copy.doneRefresh;
    }
  }
}

async function goToQuestion(nextIndex) {
  if (busy || examLocked) return;
  const count = questions.length || localQuestionCount();
  if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= count) return;
  if (nextIndex === displayIndex) return;

  busy = true;
  updateChromeForIndex(displayIndex);
  const ok = await flushSave({ quiet: true, currentQuestionIndex: nextIndex });
  busy = false;
  if (!ok) {
    updateChromeForIndex(displayIndex);
    return;
  }

  displayIndex = nextIndex;
  if (attempt) attempt = { ...attempt, currentQuestionIndex: nextIndex };
  paintCurrentQuestion();
  setSaveStatus('');
}

async function enterExamFromPayload(payload) {
  if (IS_PROJECT_LOCAL || !examMatchesUrl(payload?.exam)) {
    showExamUnavailable();
    return;
  }
  examLocked = false;
  expireRetries = 0;
  applyAttemptPayload(payload);
  showPanel('exam');
  paintCurrentQuestion();
  setSaveStatus(payload.resumed ? copy.examResumed : copy.examStarted);
}

async function startExam() {
  if (busy || !currentToken) return;
  busy = true;
  if (els.btnStart) els.btnStart.disabled = true;
  if (els.introStatus) {
    els.introStatus.textContent = copy.introStarting;
    els.introStatus.classList.remove('is-error');
  }
  try {
    const payload = await provaStartAttempt(currentToken, asStudentOpts());
    // Liberar busy antes de pintar — senão as alternativas nascem disabled
    busy = false;
    await enterExamFromPayload(payload);
  } catch (error) {
    console.error('[prova] start', error);
    const msg = error instanceof ApiError ? error.message : copy.startFail;
    if (els.introStatus) {
      els.introStatus.textContent = msg;
      els.introStatus.classList.add('is-error');
    }
    if (els.btnStart) els.btnStart.disabled = false;
  } finally {
    busy = false;
  }
}

async function resumeExam() {
  if (!currentToken) return;
  try {
    const payload = await provaGetAttempt(currentToken, asStudentOpts());
    if (payload.attempt?.status === 'in_progress') {
      await enterExamFromPayload(payload);
      return;
    }
    void openDonePanel(payload.attempt, payload.review || null);
  } catch (error) {
    console.error('[prova] resume', error);
    showPanel('blocked');
    if (els.blockedMessage) {
      els.blockedMessage.textContent = error instanceof ApiError
        ? error.message
        : copy.blockedResume;
    }
  }
}

/**
 * @param {{ auto?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
async function submitExam(opts = {}) {
  const auto = Boolean(opts.auto);
  if (!currentToken) return false;
  if (!auto && (busy || examLocked || attempt?.status !== 'in_progress')) return false;
  if (auto && attempt?.status && attempt.status !== 'in_progress') {
    void openDonePanel(attempt);
    return true;
  }

  busy = true;
  if (!auto) setSaveStatus(copy.saveSending);
  updateChromeForIndex(displayIndex);
  try {
    if (!examLocked) await flushSave({ quiet: true });
    const batch = questions.map((q) => {
      const a = answersById[q.id] || {};
      return {
        questionId: q.id,
        choice: a.choice ?? null,
        textAnswer: a.textAnswer ?? (q.type === 'discursive' ? '' : null),
      };
    }).filter((row) => {
      const q = questions.find((x) => x.id === row.questionId);
      if (!q) return false;
      if (q.type === 'mc') return Boolean(row.choice);
      return true;
    });

    const res = await provaSubmitAttempt(currentToken, {
      ...asStudentOpts(),
      answers: batch,
    });
    attempt = res.attempt || attempt;
    stopExamTimer();
    dirty = false;
    examLocked = true;
    void openDonePanel(attempt);
    if (!auto) setSaveStatus('');
    return true;
  } catch (error) {
    console.error('[prova] submit', error);
    const msg = error instanceof ApiError ? error.message : copy.submitFail;
    if (!auto) setSaveStatus(msg, true);
    if (error instanceof ApiError && error.status === 409) {
      await handleLockedAttempt(error);
      return true;
    }
    return false;
  } finally {
    busy = false;
    updateChromeForIndex(displayIndex);
  }
}

function countUnansweredQuestions() {
  let n = 0;
  for (const q of questions) {
    if (!isAnswerFilled(answersById[q.id], q.type)) n += 1;
  }
  return n;
}

function openSubmitDialog() {
  if (examLocked) return;
  const unanswered = countUnansweredQuestions();
  if (els.dialogSubmitSummary) {
    els.dialogSubmitSummary.hidden = false;
    els.dialogSubmitSummary.textContent = formatSubmitUnansweredSummary(unanswered, copy);
    els.dialogSubmitSummary.classList.toggle('is-ok', unanswered === 0);
  }
  if (els.dialogSubmit && typeof els.dialogSubmit.showModal === 'function') {
    els.dialogSubmit.showModal();
    return;
  }
  const fallback = unanswered > 0
    ? `${formatSubmitUnansweredSummary(unanswered, copy)}\n\n${copy.submitConfirmFallback}`
    : copy.submitConfirmFallback;
  if (window.confirm(fallback)) {
    void submitExam();
  }
}

/**
 * Trabalho Final graded: o feedback do Mestre vem em `review.generalNote` (sem itens de questão).
 * @param {object|null|undefined} review
 */
function renderProjectFeedback(review) {
  const note = String(review?.generalNote || '').trim();
  if (!els.doneReview || !els.doneReviewGeneral) return;
  if (!note) return;
  els.doneReview.hidden = false;
  if (els.doneReviewTitle) els.doneReviewTitle.textContent = PROJECT_COPY.feedbackTitle;
  els.doneReviewGeneral.hidden = false;
  els.doneReviewGeneral.textContent = note;
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1048576) return `${(n / 1048576).toFixed(1).replace('.', ',')} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function formatWhenFull(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function setProjectStatus(text, isError = false) {
  if (!els.projectStatus) return;
  els.projectStatus.textContent = text || '';
  els.projectStatus.classList.toggle('is-error', Boolean(isError));
}

/**
 * Lê os 4 primeiros bytes do arquivo (assinatura PK\x03\x04).
 * @param {File} file
 */
async function hasZipSignature(file) {
  try {
    const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    return ZIP_SIGNATURE.every((b, i) => head[i] === b);
  } catch {
    return false;
  }
}

/** Valida no cliente (o servidor valida de novo). Retorna mensagem de erro ou null. */
async function validateProjectFile(file) {
  const maxBytes = Number(examMeta?.project?.maxBytes) || 50 * 1024 * 1024;
  if (!file) return PROJECT_COPY.noFile;
  if (!/\.zip$/i.test(file.name)) return PROJECT_COPY.notZip;
  if (file.size <= 0) return PROJECT_COPY.empty;
  if (file.size > maxBytes) return PROJECT_COPY.tooBig(Math.round(maxBytes / 1048576));
  if (!(await hasZipSignature(file))) return PROJECT_COPY.badSignature;
  return null;
}

/**
 * @param {object} status — payload do getExamStatus do exame `project`
 */
function paintProjectPanel(status) {
  const exam = status.exam || examMeta || {};
  const proj = exam.project || {};
  const sub = status.submission || null;
  const canSubmit = Boolean(status.canSubmit);

  if (els.projectHeading) els.projectHeading.textContent = exam.title || 'Trabalho Final';
  if (els.projectStatement) els.projectStatement.textContent = proj.statement || '';
  if (els.projectMax) els.projectMax.textContent = String(proj.maxMb || 50);
  if (els.projectGuide) els.projectGuide.href = ROUTES.guiaTrabalhoFinal();
  if (els.projectDeadline) {
    if (exam.closesAt) {
      els.projectDeadline.hidden = false;
      els.projectDeadline.textContent = `Prazo para envio: ${formatWhenFull(exam.closesAt)}.`;
    } else {
      els.projectDeadline.hidden = true;
    }
  }

  if (els.projectCurrent) {
    els.projectCurrent.hidden = !sub;
    if (sub) {
      if (els.projectCurrentName) els.projectCurrentName.textContent = sub.originalName || '—';
      if (els.projectCurrentSize) els.projectCurrentSize.textContent = formatBytes(sub.sizeBytes);
      if (els.projectCurrentWhen) els.projectCurrentWhen.textContent = formatWhenFull(sub.uploadedAt);
      if (els.projectCurrentCount) {
        els.projectCurrentCount.textContent = sub.uploadCount > 1 ? `${sub.uploadCount} (vale o último)` : '1';
      }
    }
  }

  if (els.projectFile) els.projectFile.disabled = !canSubmit || busy;
  if (els.projectSubmit) els.projectSubmit.disabled = !canSubmit || busy || !els.projectFile?.files?.length;
  if (els.projectProgress) els.projectProgress.hidden = true;

  if (!canSubmit) {
    const closed = Boolean(exam.closesAt) && Date.parse(exam.closesAt) < Date.now();
    setProjectStatus(sub ? PROJECT_COPY.waiting : (closed ? PROJECT_COPY.closedAfter : PROJECT_COPY.closed), !sub);
  } else if (sub) {
    setProjectStatus(PROJECT_COPY.waiting);
  } else {
    setProjectStatus(PROJECT_COPY.noFile);
  }
}

async function bootProject(status) {
  attempt = status.attempt || null;
  if (attempt?.status === 'graded') {
    void openDonePanel(attempt, status.review || null);
    return;
  }
  showPanel('project');
  paintProjectPanel(status);
}

async function refreshProject() {
  if (!currentToken || busy) return;
  try {
    const status = await provaGetExamStatus(currentToken, asStudentOpts());
    examMeta = status.exam || examMeta;
    await bootProject(status);
  } catch (error) {
    console.warn('[prova] refresh project', error);
    setProjectStatus(error instanceof ApiError ? error.message : PROJECT_COPY.sendFail, true);
  }
}

async function submitProject() {
  if (!currentToken || busy) return;
  const file = els.projectFile?.files?.[0] || null;
  const problem = await validateProjectFile(file);
  if (problem) {
    setProjectStatus(problem, true);
    return;
  }
  busy = true;
  if (els.projectSubmit) els.projectSubmit.disabled = true;
  if (els.projectFile) els.projectFile.disabled = true;
  if (els.projectProgress) {
    els.projectProgress.hidden = false;
    els.projectProgress.value = 0;
  }
  setProjectStatus(PROJECT_COPY.sending);
  try {
    await provaSubmitProject(currentToken, file, {
      examId: EXAM_ID,
      onProgress: (fraction) => {
        if (els.projectProgress) els.projectProgress.value = Math.round(fraction * 100);
      },
    });
    busy = false;
    if (els.projectFile) els.projectFile.value = '';
    const status = await provaGetExamStatus(currentToken, asStudentOpts());
    examMeta = status.exam || examMeta;
    await bootProject(status);
    setProjectStatus(PROJECT_COPY.sent);
  } catch (error) {
    console.error('[prova] submit project', error);
    busy = false;
    setProjectStatus(error instanceof ApiError ? error.message : PROJECT_COPY.sendFail, true);
    if (els.projectFile) els.projectFile.disabled = false;
    if (els.projectSubmit) els.projectSubmit.disabled = !els.projectFile?.files?.length;
    if (els.projectProgress) els.projectProgress.hidden = true;
  } finally {
    busy = false;
  }
}

/** Intro dos exames de múltipla escolha que não são o M1 (título, resumo e regras vêm da API). */
function paintIntroForExam(meta) {
  if (!meta || meta.id === DEFAULT_EXAM_ID) return;
  if (els.introHeading) els.introHeading.textContent = meta.title || els.introHeading.textContent;
  if (els.introLead) els.introLead.textContent = copy.introLead;
  if (els.introRules && Array.isArray(copy.introRules)) {
    els.introRules.replaceChildren();
    for (const rule of copy.introRules) {
      const li = document.createElement('li');
      li.textContent = rule;
      els.introRules.appendChild(li);
    }
  }
}

function bindChrome() {
  els.projectForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitProject();
  });
  els.projectFile?.addEventListener('change', () => {
    if (els.projectSubmit) els.projectSubmit.disabled = busy || !els.projectFile?.files?.length;
    setProjectStatus('');
  });
  els.projectRefresh?.addEventListener('click', () => {
    void refreshProject();
  });

  els.btnLeaveIntro?.addEventListener('click', () => {
    window.location.href = ROUTES.dashboard();
  });

  els.dialogSubmit?.addEventListener('close', () => {
    if (els.dialogSubmit.returnValue === 'confirm') {
      void submitExam();
    }
  });

  els.dialogExpired?.addEventListener('close', () => {
    if (attempt && attempt.status !== 'in_progress') {
      void openDonePanel(attempt);
    }
  });

  els.btnSubmit?.addEventListener('click', () => {
    openSubmitDialog();
  });

  els.btnPrev?.addEventListener('click', () => {
    void goToQuestion(displayIndex - 1);
  });
  els.btnNext?.addEventListener('click', () => {
    void goToQuestion(displayIndex + 1);
  });

  els.btnStart?.addEventListener('click', () => {
    void startExam();
  });

  els.btnRefreshStatus?.addEventListener('click', () => {
    void refreshDoneStatus();
  });

  els.doneContestForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitContest();
  });
}

async function submitContest() {
  if (!currentToken || !els.doneContestMessage) return;
  const message = String(els.doneContestMessage.value || '').trim();
  if (!message) {
    if (els.doneContestStatus) els.doneContestStatus.textContent = copy.contestEmpty;
    return;
  }
  if (els.doneContestSubmit) {
    els.doneContestSubmit.disabled = true;
    els.doneContestSubmit.textContent = copy.contestSending;
  }
  if (els.doneContestStatus) els.doneContestStatus.textContent = '';
  try {
    const res = await provaContestGrade(currentToken, message, asStudentOpts());
    attempt = res.attempt || attempt;
    if (els.doneContestMessage) els.doneContestMessage.value = '';
    await loadDoneWithReview(attempt);
    if (els.doneContestStatus) {
      els.doneContestStatus.textContent = res.message || 'Contestação enviada.';
    }
  } catch (error) {
    if (els.doneContestStatus) {
      els.doneContestStatus.textContent = error instanceof ApiError
        ? error.message
        : copy.contestFail;
    }
    if (els.doneContestSubmit) {
      els.doneContestSubmit.disabled = false;
      els.doneContestSubmit.textContent = copy.contestSubmit;
    }
  }
}

async function bootStatus() {
  try {
    const status = await provaGetExamStatus(currentToken, asStudentOpts());
    if (!examMatchesUrl(status.exam)) {
      // Backend antigo/sem o exame: ausente, ou M1 devolvido no lugar. Nunca cair na M1 em silêncio.
      console.warn('[prova] exame da URL não confere com o servidor', EXAM_ID, status.exam?.id);
      showExamUnavailable();
      return;
    }
    examMeta = status.exam;
    copy = EXAM_ID === DEFAULT_EXAM_ID ? PROVA_COPY : buildExamCopy(examMeta);
    if (examMeta?.title && els.examTitle) {
      els.examTitle.textContent = examMeta.title;
    }

    if (examMeta?.kind === 'project') {
      await bootProject(status);
      return;
    }
    paintIntroForExam(examMeta);

    const att = status.attempt;
    if (att?.status === 'in_progress' || status.mustResume) {
      await resumeExam();
      return;
    }

    if (att && (att.status === 'submitted' || att.status === 'timed_out' || att.status === 'graded')) {
      void openDonePanel(att);
      return;
    }

    showPanel('intro');
    const canStart = Boolean(status.canStart);
    if (els.btnStart) {
      els.btnStart.disabled = !canStart;
      els.btnStart.removeAttribute('title');
    }
    if (els.introStatus) {
      if (canStart) {
        els.introStatus.textContent = copy.introReady;
        els.introStatus.classList.remove('is-error');
      } else if (!status.exam?.isOpen) {
        els.introStatus.textContent = copy.introClosed;
        els.introStatus.classList.add('is-error');
      } else {
        els.introStatus.textContent = copy.introCantStart;
        els.introStatus.classList.add('is-error');
      }
    }
  } catch (error) {
    console.error('[prova] status', error);
    showPanel('blocked');
    if (els.blockedMessage) {
      els.blockedMessage.textContent = error instanceof ApiError
        ? error.message
        : copy.blockedLoad;
    }
  }
}

async function main() {
  cacheEls();
  paintTopbarForExam();
  if (!IS_PROJECT_LOCAL) {
    ensureTimer();
    buildProgressDots();
  }
  bindChrome();
  showPanel('loading');

  try {
    currentUser = await requireSession({ redirectTo: ROUTES.auth() });
  } catch {
    return;
  }
  const session = getSession();
  currentToken = session?.token || null;
  if (!currentToken) {
    window.location.replace(ROUTES.auth());
    return;
  }

  await bootStatus();
}

main();

export const __provaB3 = {
  isAnswerFilled,
  QUESTION_COUNT,
  AUTOSAVE_MS,
  EXPIRE_MAX_RETRIES,
};
