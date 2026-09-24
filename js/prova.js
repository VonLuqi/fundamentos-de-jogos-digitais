/**
 * Prova Módulo 1 — UI Forms (Tasks B1–B3 + C2–C3).
 */

'use strict';

import { createProvaTimer } from './prova/timer.js';
import { createProvaIntegrityMonitor } from './prova/integrity.js';
import { PROVA_COPY, formatSubmitUnansweredSummary } from './prova/copy.js';
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
const PANEL_IDS = ['loading', 'intro', 'exam', 'done', 'blocked'];

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
  return currentUser?.role === 'admin' ? { asStudent: true } : {};
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
    els.dialogExpiredOk.textContent = allowClose ? PROVA_COPY.expiredOk : PROVA_COPY.expiredWait;
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
  showExpiredDialog(PROVA_COPY.expiredSending);
  setSaveStatus('Tempo esgotado — enviando…', true);

  const ok = await submitExam({ auto: true });
  if (ok) {
    showExpiredDialog(PROVA_COPY.expiredSent, {
      allowClose: true,
    });
    return;
  }

  expireRetries += 1;
  if (expireRetries >= EXPIRE_MAX_RETRIES) {
    showExpiredDialog(PROVA_COPY.expiredRetryFail, { allowClose: true });
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
  const count = questions.length || QUESTION_COUNT;
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
  const count = questions.length || QUESTION_COUNT;
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
    if (!opts.quiet) setSaveStatus(PROVA_COPY.saveSaving);
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
    if (!opts.quiet) setSaveStatus(PROVA_COPY.saveSaved);
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
    els.doneContestSubmit.textContent = PROVA_COPY.contestSubmit;
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
    if (els.doneContestTitle) els.doneContestTitle.textContent = PROVA_COPY.contestOpenTitle;
    if (els.doneContestLead) els.doneContestLead.textContent = PROVA_COPY.contestOpenBody;
  } else if (status === 'answered') {
    if (els.doneContestTitle) els.doneContestTitle.textContent = PROVA_COPY.contestAnsweredTitle;
    if (els.doneContestLead) els.doneContestLead.textContent = '';
  } else if (status === 'revised') {
    if (els.doneContestTitle) els.doneContestTitle.textContent = PROVA_COPY.contestRevisedTitle;
    if (els.doneContestLead) els.doneContestLead.textContent = PROVA_COPY.contestRevisedBody;
  } else {
    if (els.doneContestTitle) els.doneContestTitle.textContent = PROVA_COPY.contestTitle;
    if (els.doneContestLead) els.doneContestLead.textContent = PROVA_COPY.contestLead;
  }

  if (els.doneContestThread) {
    if (hasThread) {
      els.doneContestThread.hidden = false;
      let html = '';
      if (contest.studentMessage) {
        html += `<div class="prova-contest__bubble prova-contest__bubble--student">
          <span class="prova-contest__bubble-label">${escapeHtml(PROVA_COPY.contestYourMessage)}</span>
          <p>${escapeHtml(contest.studentMessage)}</p>
        </div>`;
      }
      if (contest.adminMessage) {
        html += `<div class="prova-contest__bubble prova-contest__bubble--admin">
          <span class="prova-contest__bubble-label">${escapeHtml(PROVA_COPY.contestAdminReply)}</span>
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
      els.doneContestMessage.placeholder = PROVA_COPY.contestPlaceholder;
    }
    if (showForm && els.doneContestSubmit) {
      els.doneContestSubmit.textContent = status
        ? PROVA_COPY.contestAgain
        : PROVA_COPY.contestSubmit;
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
    els.doneReviewTitle.textContent = PROVA_COPY.doneReviewTitle;
  }

  if (els.doneReviewGeneral) {
    const note = String(review?.generalNote || '').trim();
    if (note) {
      els.doneReviewGeneral.hidden = false;
      els.doneReviewGeneral.innerHTML = `<span class="prova-review__comment-label">${escapeHtml(PROVA_COPY.doneReviewGeneral)}</span>${escapeHtml(note)}`;
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
        <p class="prova-review__qnum">${escapeHtml(qLabel)}${isMc && ok === true ? ` · ${escapeHtml(PROVA_COPY.doneReviewOk)}` : ''}${isMc && ok === false ? ` · ${escapeHtml(PROVA_COPY.doneReviewMiss)}` : ''}</p>
        <p class="prova-review__points">${escapeHtml(PROVA_COPY.doneReviewPoints)}: ${pts} / ${max}</p>
      </div>
      <p class="prova-review__prompt">${escapeHtml(item.prompt || '')}</p>
    `;

    if (isMc) {
      const yours = item.studentChoice
        ? `${item.studentChoice}) ${item.choices?.[item.studentChoice] || ''}`.trim()
        : PROVA_COPY.doneReviewBlank;
      const correct = item.correctChoice
        ? `${item.correctChoice}) ${item.choices?.[item.correctChoice] || ''}`.trim()
        : '—';
      body += `
        <p class="prova-review__meta"><strong>${escapeHtml(PROVA_COPY.doneReviewYourChoice)}:</strong> ${escapeHtml(yours)}</p>
        <p class="prova-review__meta"><strong>${escapeHtml(PROVA_COPY.doneReviewCorrect)}:</strong> ${escapeHtml(correct)}</p>
      `;
    } else {
      const text = String(item.studentText || '').trim() || PROVA_COPY.doneReviewBlank;
      body += `<div class="prova-review__answer">${escapeHtml(text)}</div>`;
    }

    const comment = String(item.comment || '').trim();
    if (comment) {
      body += `
        <div class="prova-review__comment">
          <span class="prova-review__comment-label">${escapeHtml(PROVA_COPY.doneReviewComment)}</span>
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
        els.doneSubmitted.textContent = `${PROVA_COPY.doneSubmittedAt} ${when}.`;
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
    els.btnRefreshStatus.textContent = PROVA_COPY.doneRefresh;
  }

  if (isGraded) {
    if (els.doneHeading) els.doneHeading.textContent = PROVA_COPY.doneGradedHeading;
    if (els.doneMessage) els.doneMessage.textContent = PROVA_COPY.doneGradedMessage;
    if (els.doneResult) els.doneResult.hidden = false;

    const finalScore = att.finalScore != null ? Number(att.finalScore) : null;
    const mcScore = att.mcScore != null ? Number(att.mcScore) : null;
    const discScore = att.discursiveScore != null ? Number(att.discursiveScore) : null;

    if (els.doneScore) {
      els.doneScore.textContent = finalScore != null ? `${finalScore} / 20` : '— / 20';
    }
    if (els.doneMcLabel) els.doneMcLabel.textContent = PROVA_COPY.doneBreakdownMc;
    if (els.doneDiscLabel) els.doneDiscLabel.textContent = PROVA_COPY.doneBreakdownDisc;
    if (els.doneTotalLabel) els.doneTotalLabel.textContent = PROVA_COPY.doneBreakdownTotal;
    if (els.doneMcValue) {
      els.doneMcValue.textContent = mcScore != null ? `${mcScore} / 12` : '— / 12';
    }
    if (els.doneDiscValue) {
      els.doneDiscValue.textContent = discScore != null ? `${discScore} / 8` : '— / 8';
    }
    if (els.doneTotalValue) {
      els.doneTotalValue.textContent = finalScore != null ? `${finalScore} / 20` : '— / 20';
    }
    renderReview(review);
    renderContest(att.contest);
    return;
  }

  clearReviewUi();
  if (els.doneHeading) els.doneHeading.textContent = PROVA_COPY.doneHeading;
  if (els.doneMessage) {
    els.doneMessage.textContent = isTimedOut
      ? PROVA_COPY.doneTimedOut
      : PROVA_COPY.doneWaiting;
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
    const payload = await provaGetAttempt(currentToken, asStudentOpts());
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
      els.btnRefreshStatus.textContent = PROVA_COPY.doneRefresh;
    }
  }
}

async function goToQuestion(nextIndex) {
  if (busy || examLocked) return;
  const count = questions.length || QUESTION_COUNT;
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
  examLocked = false;
  expireRetries = 0;
  applyAttemptPayload(payload);
  showPanel('exam');
  paintCurrentQuestion();
  setSaveStatus(payload.resumed ? PROVA_COPY.examResumed : PROVA_COPY.examStarted);
}

async function startExam() {
  if (busy || !currentToken) return;
  busy = true;
  if (els.btnStart) els.btnStart.disabled = true;
  if (els.introStatus) {
    els.introStatus.textContent = PROVA_COPY.introStarting;
    els.introStatus.classList.remove('is-error');
  }
  try {
    const payload = await provaStartAttempt(currentToken, asStudentOpts());
    await enterExamFromPayload(payload);
  } catch (error) {
    console.error('[prova] start', error);
    const msg = error instanceof ApiError ? error.message : PROVA_COPY.startFail;
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
        : PROVA_COPY.blockedResume;
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
  if (!auto) setSaveStatus(PROVA_COPY.saveSending);
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
    const msg = error instanceof ApiError ? error.message : PROVA_COPY.submitFail;
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
    els.dialogSubmitSummary.textContent = formatSubmitUnansweredSummary(unanswered);
    els.dialogSubmitSummary.classList.toggle('is-ok', unanswered === 0);
  }
  if (els.dialogSubmit && typeof els.dialogSubmit.showModal === 'function') {
    els.dialogSubmit.showModal();
    return;
  }
  const fallback = unanswered > 0
    ? `${formatSubmitUnansweredSummary(unanswered)}\n\n${PROVA_COPY.submitConfirmFallback}`
    : PROVA_COPY.submitConfirmFallback;
  if (window.confirm(fallback)) {
    void submitExam();
  }
}

function bindChrome() {
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
    if (els.doneContestStatus) els.doneContestStatus.textContent = PROVA_COPY.contestEmpty;
    return;
  }
  if (els.doneContestSubmit) {
    els.doneContestSubmit.disabled = true;
    els.doneContestSubmit.textContent = PROVA_COPY.contestSending;
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
        : PROVA_COPY.contestFail;
    }
    if (els.doneContestSubmit) {
      els.doneContestSubmit.disabled = false;
      els.doneContestSubmit.textContent = PROVA_COPY.contestSubmit;
    }
  }
}

async function bootStatus() {
  try {
    const status = await provaGetExamStatus(currentToken, asStudentOpts());
    examMeta = status.exam || null;
    if (examMeta?.title && els.examTitle) {
      els.examTitle.textContent = examMeta.title;
    }

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
        els.introStatus.textContent = PROVA_COPY.introReady;
        els.introStatus.classList.remove('is-error');
      } else if (!status.exam?.isOpen) {
        els.introStatus.textContent = PROVA_COPY.introClosed;
        els.introStatus.classList.add('is-error');
      } else {
        els.introStatus.textContent = PROVA_COPY.introCantStart;
        els.introStatus.classList.add('is-error');
      }
    }
  } catch (error) {
    console.error('[prova] status', error);
    showPanel('blocked');
    if (els.blockedMessage) {
      els.blockedMessage.textContent = error instanceof ApiError
        ? error.message
        : PROVA_COPY.blockedLoad;
    }
  }
}

async function main() {
  cacheEls();
  ensureTimer();
  buildProgressDots();
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
