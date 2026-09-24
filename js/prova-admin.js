/**
 * Hub admin — Prova Módulo 1 (Tasks D2–D3).
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  ROUTES,
  getSession,
  logout,
  provaAdminFinalizeGrade,
  provaAdminGetAttempt,
  provaAdminListAttempts,
  provaAdminRespondContest,
  provaAdminResetAttempt,
  provaAdminResetAllAttempts,
  provaAdminScoreDiscursive,
  requireAdmin,
} from './api.js';

const STATUS_LABELS = {
  in_progress: 'Em andamento',
  submitted: 'Enviada',
  timed_out: 'Tempo esgotado',
  graded: 'Nota fechada',
};

const CONTEST_LABELS = {
  open: 'Contestação aberta',
  answered: 'Contestação respondida',
  revised: 'Nota revisada',
  closed: 'Contestação fechada',
};

const EVENT_LABELS = {
  tab_blur: 'Saiu da aba',
  tab_focus: 'Voltou à aba',
  window_blur: 'Perdeu foco da janela',
  page_leave: 'Saiu da página',
  navigated_away: 'Navegou para outra página do site',
  beforeunload: 'Tentou fechar / recarregar',
};

let currentToken = null;
/** @type {object|null} */
let currentDetail = null;

function $(id) {
  return document.getElementById(id);
}

function showWarning(message) {
  const box = $('api-warning');
  const text = $('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function formatRemaining(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readFilters() {
  return {
    turma: $('prova-admin-filter-turma')?.value || 'all',
    status: $('prova-admin-filter-status')?.value || 'all',
    alertsOnly: Boolean($('prova-admin-filter-alerts')?.checked),
  };
}

function detailUrl(attemptId) {
  const base = ROUTES.provaAdmin();
  return `${base}?attempt=${encodeURIComponent(attemptId)}`;
}

function setListVisible(visible) {
  const nodes = [
    $('prova-admin-gate-label')?.closest('.prova-admin-gate'),
    document.querySelector('.prova-admin-filters'),
    $('prova-admin-meta'),
    $('prova-admin-list-actions'),
    document.querySelector('.prova-admin-table-wrap'),
    $('prova-admin-empty'),
  ];
  for (const node of nodes) {
    if (!node) continue;
    node.hidden = !visible;
  }
  const detail = $('prova-admin-detail');
  if (detail) detail.hidden = visible;
}

function paintGate(overview) {
  const label = $('prova-admin-gate-label');
  const countsEl = $('prova-admin-gate-counts');
  const gate = overview?.gate || {};
  const counts = overview?.counts || {};
  if (label) {
    label.textContent = gate.openTurma
      ? `Gate: liberada só para ${gate.openTurma}`
      : 'Gate: fechada';
  }
  if (countsEl) {
    countsEl.textContent = [
      `Em andamento: ${counts.inProgress ?? 0}`,
      `Aguardando nota: ${counts.awaitingGrade ?? 0}`,
      `Fechadas: ${counts.graded ?? 0}`,
      `Total: ${counts.total ?? 0}`,
    ].join(' · ');
  }
}

function paintTable(attempts) {
  const tbody = $('prova-admin-tbody');
  const empty = $('prova-admin-empty');
  const meta = $('prova-admin-meta');
  if (!tbody) return;

  tbody.replaceChildren();
  const list = Array.isArray(attempts) ? attempts : [];

  if (meta) {
    meta.textContent = list.length === 1
      ? '1 tentativa'
      : `${list.length} tentativas`;
  }
  if (empty) empty.hidden = list.length > 0;

  for (const row of list) {
    const tr = document.createElement('tr');
    if (row.hasAlerts) tr.classList.add('has-alert');

    const student = row.student || {};
    const name = student.fullName || '—';
    const user = student.username ? `@${student.username}` : '';

    const timeCell = row.status === 'in_progress'
      ? `resta ${formatRemaining(row.remainingMs)}`
      : formatWhen(row.submittedAt);

    const mc = row.mcScore != null ? `${row.mcScore}/12` : '—';
    const final = row.finalScore != null ? `${row.finalScore}/20` : '—';
    const blurN = Number(row.blurCount) || 0;
    const leaveN = Number(row.leaveCount) || 0;
    const exitsTitle = `Saiu da aba: ${blurN} · Saiu da página: ${leaveN}`;
    const exitsLabel = leaveN > 0 ? `${blurN} (${leaveN} pág.)` : String(blurN);

    tr.innerHTML = `
      <td>
        <span class="prova-admin-name">${escapeHtml(name)}</span>
        ${user ? `<span class="prova-admin-user">${escapeHtml(user)}</span>` : ''}
        ${row.hasAlerts ? '<span class="prova-admin-badge">alerta</span>' : ''}
        ${row.hasOpenContest ? '<span class="prova-admin-badge prova-admin-badge--contest">contesta</span>' : ''}
      </td>
      <td>${escapeHtml(student.turma || '—')}</td>
      <td>${escapeHtml(STATUS_LABELS[row.status] || row.status || '—')}</td>
      <td>${escapeHtml(timeCell)}</td>
      <td title="${escapeHtml(exitsTitle)}">${escapeHtml(exitsLabel)}</td>
      <td>${escapeHtml(mc)}</td>
      <td>${escapeHtml(final)}</td>
      <td class="prova-admin-row-actions">
        <a class="prova-admin-row-link" href="${escapeHtml(detailUrl(row.id))}">Abrir</a>
        <button type="button" class="prova-admin-row-reset" data-reset-attempt="${escapeHtml(row.id)}" data-reset-name="${escapeHtml(name)}">
          Resetar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function paintIntegrity(events) {
  const list = $('prova-admin-integrity-list');
  const empty = $('prova-admin-integrity-empty');
  if (!list) return;
  list.replaceChildren();
  const rows = Array.isArray(events) ? events : [];
  if (empty) empty.hidden = rows.length > 0;
  for (const ev of rows) {
    const li = document.createElement('li');
    const label = EVENT_LABELS[ev.eventType] || ev.eventType;
    li.innerHTML = `<time datetime="${escapeHtml(ev.createdAt || '')}">${escapeHtml(formatWhen(ev.createdAt))}</time>
      <span>${escapeHtml(label)}</span>`;
    list.appendChild(li);
  }
}

function paintDetail(attempt) {
  currentDetail = attempt;
  setListVisible(false);

  const title = $('prova-admin-detail-title');
  const meta = $('prova-admin-detail-meta');
  const summary = $('prova-admin-detail-summary');
  const actions = $('prova-admin-detail-actions');
  const hint = $('prova-admin-detail-hint');
  const host = $('prova-admin-answers');
  const student = attempt.student || {};
  const grading = attempt.grading || {};

  if (title) {
    title.textContent = `${student.fullName || 'Aluno'} · ${STATUS_LABELS[attempt.status] || attempt.status}`;
  }
  if (meta) {
    meta.textContent = [
      student.turma || '—',
      student.username ? `@${student.username}` : null,
      attempt.hasAlerts ? 'com alertas' : null,
    ].filter(Boolean).join(' · ');
  }
  if (summary) {
    const mc = grading.mcScore != null ? `${grading.mcScore}/12` : '—';
    const disc = grading.discursiveScore != null ? `${grading.discursiveScore}/8` : '—';
    const fin = grading.finalScore != null ? `${grading.finalScore}/20` : '—';
    summary.innerHTML = `
      <p><strong>MC:</strong> ${escapeHtml(mc)} · <strong>Discursivas:</strong> ${escapeHtml(disc)}
      (${grading.discursiveScored ?? 0}/${grading.discursiveTotal ?? 8}) · <strong>Final:</strong> ${escapeHtml(fin)}</p>
      <p>Enviada: ${escapeHtml(formatWhen(attempt.submittedAt))} · Saídas de aba: ${attempt.blurCount ?? 0} · Saídas de página: ${attempt.leaveCount ?? 0}</p>
    `;
  }

  if (actions) {
    actions.hidden = false;
    const saveBtn = $('prova-admin-save-scores');
    const finBtn = $('prova-admin-finalize');
    const resetBtn = $('prova-admin-reset');
    if (saveBtn) {
      saveBtn.hidden = Boolean(grading.locked) || !grading.canScore;
      saveBtn.disabled = saveBtn.hidden;
    }
    if (finBtn) {
      finBtn.hidden = Boolean(grading.locked) || !grading.canFinalize;
      finBtn.disabled = finBtn.hidden;
    }
    if (resetBtn) {
      resetBtn.hidden = false;
      resetBtn.disabled = false;
    }
  }
  if (hint) {
    if (grading.locked && attempt.contest?.isOpen) {
      hint.textContent = 'Contestação aberta — responda abaixo ou reabra a correção.';
    } else if (grading.locked) {
      hint.textContent = 'Nota fechada. Se o aluno contestar, você poderá responder ou reabrir.';
    } else if (!grading.canScore) {
      hint.textContent = 'Ainda em andamento — só dá para notar depois do envio (ou tempo esgotado).';
    } else if (attempt.contest?.isOpen) {
      hint.textContent = 'Correção reaberta. Ajuste as notas e use Fechar nota — aí você escreve a mensagem da revisão para o aluno.';
    } else {
      hint.textContent = 'Notas 0–1 por discursiva (pode 0,25 / 0,5 / 0,75). Depois use Fechar nota.';
    }
  }

  paintContestPanel(attempt);

  if (host) {
    host.replaceChildren();
    for (const q of attempt.answers || []) {
      const article = document.createElement('article');
      article.className = `prova-admin-q prova-admin-q--${q.type}`;
      article.dataset.questionId = q.questionId;

      const head = document.createElement('header');
      head.innerHTML = `<h3>Q${escapeHtml(String(q.number || q.questionId))} · ${escapeHtml(q.type === 'mc' ? 'Múltipla escolha' : 'Discursiva')}</h3>
        <p class="prova-admin-q__prompt">${escapeHtml(q.prompt || '')}</p>`;
      article.appendChild(head);

      if (q.type === 'mc') {
        const body = document.createElement('div');
        body.className = 'prova-admin-q__mc';
        const ok = q.isCorrect === true;
        const bad = q.isCorrect === false;
        body.innerHTML = `
          <p>Resposta do aluno: <strong>${escapeHtml(q.studentChoice || '—')}</strong>
            ${ok ? '<span class="is-ok">acertou</span>' : ''}
            ${bad ? '<span class="is-bad">errou</span>' : ''}</p>
          <p>Gabarito: <strong>${escapeHtml(q.correctChoice || '—')}</strong>
            ${q.pointsAwarded != null ? `· ${escapeHtml(String(q.pointsAwarded))} pt` : ''}</p>
          ${q.justification ? `<p class="prova-admin-q__just">${escapeHtml(q.justification)}</p>` : ''}
        `;
        article.appendChild(body);
      } else {
        const body = document.createElement('div');
        body.className = 'prova-admin-q__disc';
        const locked = Boolean(grading.locked) || !grading.canScore;
        const text = q.studentText || '(sem resposta)';
        body.innerHTML = `
          ${q.rubric ? `<p class="prova-admin-q__rubric"><em>Rubrica:</em> ${escapeHtml(q.rubric)}</p>` : ''}
          <pre class="prova-admin-q__answer">${escapeHtml(text)}</pre>
          <label class="prova-admin-q__score">
            <span>Nota (0–1)</span>
            <input type="number" min="0" max="1" step="0.25" inputmode="decimal"
              data-score-input="${escapeHtml(q.questionId)}"
              value="${q.pointsAwarded != null ? escapeHtml(String(q.pointsAwarded)) : ''}"
              ${locked ? 'disabled' : ''} />
          </label>
          <label class="prova-admin-q__comment">
            <span>Comentário (opcional, até 2000)</span>
            <textarea rows="2" maxlength="2000" data-comment-input="${escapeHtml(q.questionId)}"
              ${locked ? 'disabled' : ''}>${escapeHtml(q.comment || '')}</textarea>
          </label>
        `;
        article.appendChild(body);
      }

      host.appendChild(article);
    }
  }

  paintIntegrity(attempt.integrityEvents || []);
}

function collectScoresFromDom() {
  /** @type {Array<{questionId:string,points:number,comment:string}>} */
  const scores = [];
  document.querySelectorAll('[data-score-input]').forEach((input) => {
    const questionId = input.getAttribute('data-score-input');
    if (!questionId) return;
    const raw = /** @type {HTMLInputElement} */ (input).value;
    if (raw === '' || raw == null) return;
    const points = Number(raw);
    const commentEl = document.querySelector(`[data-comment-input="${questionId}"]`);
    const comment = commentEl ? /** @type {HTMLTextAreaElement} */ (commentEl).value : '';
    scores.push({ questionId, points, comment });
  });
  return scores;
}

/**
 * @param {object} attempt
 */
function paintContestPanel(attempt) {
  const panel = $('prova-admin-contest');
  const thread = $('prova-admin-contest-thread');
  const form = $('prova-admin-contest-form');
  const statusEl = $('prova-admin-contest-status');
  const contest = attempt?.contest || null;

  if (!panel || !thread) return;

  if (!contest?.status && !contest?.studentMessage) {
    panel.hidden = true;
    if (form) form.hidden = true;
    return;
  }

  panel.hidden = false;
  const label = CONTEST_LABELS[contest.status] || contest.status || 'Contestação';
  let html = `<p class="prova-admin-contest__status-label"><strong>${escapeHtml(label)}</strong></p>`;
  if (contest.studentMessage) {
    html += `<div class="prova-admin-contest__bubble">
      <span>Mensagem do aluno</span>
      <p>${escapeHtml(contest.studentMessage)}</p>
    </div>`;
  }
  if (contest.adminMessage) {
    html += `<div class="prova-admin-contest__bubble prova-admin-contest__bubble--admin">
      <span>Sua resposta</span>
      <p>${escapeHtml(contest.adminMessage)}</p>
    </div>`;
  }
  thread.innerHTML = html;

  if (form) {
    form.hidden = !contest.isOpen;
  }
  if (statusEl) statusEl.textContent = '';
}

async function loadList() {
  if (!currentToken) return;
  const filters = readFilters();
  const meta = $('prova-admin-meta');
  if (meta) meta.textContent = 'Carregando…';

  try {
    const payload = await provaAdminListAttempts(currentToken, {
      turma: filters.turma === 'all' ? undefined : filters.turma,
      status: filters.status === 'all' ? undefined : filters.status,
      alertsOnly: filters.alertsOnly || undefined,
    });
    paintGate(payload);
    paintTable(payload.attempts || []);
  } catch (error) {
    console.error('[prova-admin]', error);
    showWarning(error instanceof ApiError ? error.message : 'Falha ao listar tentativas.');
    if (meta) meta.textContent = 'Erro ao carregar.';
  }
}

async function loadDetail(attemptId) {
  if (!currentToken || !attemptId) return;
  try {
    const payload = await provaAdminGetAttempt(currentToken, attemptId);
    paintDetail(payload.attempt);
  } catch (error) {
    console.error('[prova-admin] detail', error);
    showWarning(error instanceof ApiError ? error.message : 'Falha ao carregar o detalhe.');
    clearAttemptQuery();
    setListVisible(true);
    await loadList();
  }
}

function clearAttemptQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete('attempt');
  window.history.replaceState({}, '', url.pathname + url.search);
}

function setAttemptQuery(attemptId) {
  const url = new URL(window.location.href);
  url.searchParams.set('attempt', attemptId);
  window.history.replaceState({}, '', url.pathname + url.search);
}

async function saveScores() {
  if (!currentToken || !currentDetail?.id) return;
  const scores = collectScoresFromDom();
  if (!scores.length) {
    showWarning('Preencha ao menos uma nota discursiva (0 a 1).');
    return;
  }
  const btn = $('prova-admin-save-scores');
  if (btn) btn.disabled = true;
  try {
    const res = await provaAdminScoreDiscursive(currentToken, {
      attemptId: currentDetail.id,
      scores,
    });
    paintDetail(res.attempt);
    const hint = $('prova-admin-detail-hint');
    if (hint) hint.textContent = res.message || 'Notas salvas.';
  } catch (error) {
    showWarning(error instanceof ApiError ? error.message : 'Falha ao salvar notas.');
  } finally {
    if (btn && currentDetail?.grading?.canScore && !currentDetail?.grading?.locked) {
      btn.disabled = false;
    }
  }
}

async function finalizeGrade() {
  if (!currentToken || !currentDetail?.id) return;
  const missing = (currentDetail.grading?.discursiveTotal || 8)
    - (currentDetail.grading?.discursiveScored || 0);
  const allowPartial = missing > 0;
  const revisingContest = Boolean(currentDetail.contest?.isOpen);

  const dialog = $('prova-admin-dialog-finalize');
  const bodyEl = $('prova-admin-dialog-finalize-body');
  const warnEl = $('prova-admin-dialog-finalize-warn');
  const confirmBtn = $('prova-admin-dialog-finalize-confirm');
  const messageWrap = $('prova-admin-dialog-finalize-message-wrap');
  const messageEl = /** @type {HTMLTextAreaElement|null} */ ($('prova-admin-dialog-finalize-message'));

  if (bodyEl) {
    if (revisingContest) {
      bodyEl.textContent = allowPartial
        ? 'Isso fecha a nota revisada. Discursivas sem nota ficam 0. Explique a revisão na mensagem — o aluno vai ver junto com a nota.'
        : 'Isso fecha a nota revisada. Explique a revisão na mensagem — o aluno vai ver junto com a nota.';
    } else {
      bodyEl.textContent = allowPartial
        ? 'O aluno verá a nota final. Discursivas sem nota ficam com 0. Se contestar, você poderá responder ou reabrir.'
        : 'O aluno verá a nota final. Se contestar, você poderá responder ou reabrir a correção.';
    }
  }
  if (warnEl) {
    if (allowPartial) {
      warnEl.hidden = false;
      warnEl.textContent = missing === 1
        ? 'Ainda falta 1 discursiva sem nota. Fechar mesmo assim?'
        : `Ainda faltam ${missing} discursivas sem nota. Fechar mesmo assim?`;
    } else {
      warnEl.hidden = true;
      warnEl.textContent = '';
    }
  }
  if (messageWrap && messageEl) {
    messageWrap.hidden = !revisingContest;
    if (revisingContest) {
      const fromPanel = String($('prova-admin-contest-message')?.value || '').trim();
      const existing = String(currentDetail.contest?.adminMessage || '').trim();
      messageEl.value = fromPanel || existing || messageEl.value || '';
    } else {
      messageEl.value = '';
    }
  }
  if (confirmBtn) {
    confirmBtn.textContent = revisingContest
      ? (allowPartial ? 'Fechar revisão com zeros' : 'Fechar nota revisada')
      : (allowPartial ? 'Fechar com zeros' : 'Fechar nota');
  }

  const confirmed = await new Promise((resolve) => {
    if (dialog && typeof dialog.showModal === 'function') {
      const onClick = (event) => {
        if (!(event.target instanceof HTMLButtonElement)) return;
        if (event.target.value !== 'confirm') return;
        if (!revisingContest) return;
        const text = String(messageEl?.value || '').trim();
        if (!text) {
          event.preventDefault();
          showWarning('Escreva a mensagem ao aluno explicando a revisão.');
        }
      };
      const onClose = () => {
        confirmBtn?.removeEventListener('click', onClick);
        dialog.removeEventListener('close', onClose);
        resolve(dialog.returnValue === 'confirm');
      };
      confirmBtn?.addEventListener('click', onClick);
      dialog.addEventListener('close', onClose);
      dialog.showModal();
      if (revisingContest) messageEl?.focus();
      return;
    }
    const msg = revisingContest
      ? 'Fechar a nota revisada? Você precisará de uma mensagem ao aluno.'
      : (allowPartial
        ? `Ainda faltam ${missing} discursiva(s) sem nota.\n\nFechar mesmo assim? As faltantes ficam com 0.`
        : 'Fechar a nota? O aluno verá a nota final.');
    resolve(window.confirm(msg));
  });
  if (!confirmed) return;

  let contestMessage;
  if (revisingContest) {
    contestMessage = String(messageEl?.value || '').trim();
    if (!contestMessage) {
      showWarning('Escreva a mensagem ao aluno explicando a revisão.');
      return;
    }
  }

  const btn = $('prova-admin-finalize');
  if (btn) btn.disabled = true;
  try {
    // Garante notas do DOM salvas antes de fechar
    const scores = collectScoresFromDom();
    if (scores.length && currentDetail.grading?.canScore) {
      await provaAdminScoreDiscursive(currentToken, {
        attemptId: currentDetail.id,
        scores,
      });
    }
    const res = await provaAdminFinalizeGrade(currentToken, {
      attemptId: currentDetail.id,
      allowPartial,
      ...(contestMessage ? { contestMessage } : {}),
    });
    paintDetail(res.attempt);
    const hint = $('prova-admin-detail-hint');
    if (hint) hint.textContent = res.message || 'Nota fechada.';
    const contestMsg = $('prova-admin-contest-message');
    if (contestMsg) contestMsg.value = '';
  } catch (error) {
    showWarning(error instanceof ApiError ? error.message : 'Falha ao fechar a nota.');
  } finally {
    if (btn && currentDetail?.grading?.canFinalize) btn.disabled = false;
  }
}

function bindFilters() {
  ['prova-admin-filter-turma', 'prova-admin-filter-status', 'prova-admin-filter-alerts']
    .forEach((id) => {
      $(id)?.addEventListener('change', () => {
        void loadList();
      });
    });
  $('prova-admin-refresh')?.addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    const attemptId = params.get('attempt');
    if (attemptId) void loadDetail(attemptId);
    else void loadList();
  });
  $('prova-admin-back')?.addEventListener('click', () => {
    clearAttemptQuery();
    currentDetail = null;
    setListVisible(true);
    void loadList();
  });
  $('prova-admin-save-scores')?.addEventListener('click', () => {
    void saveScores();
  });
  $('prova-admin-finalize')?.addEventListener('click', () => {
    void finalizeGrade();
  });
  $('prova-admin-contest-answer')?.addEventListener('click', () => {
    void respondContest('answer');
  });
  $('prova-admin-contest-reopen')?.addEventListener('click', () => {
    void respondContest('reopen');
  });
  $('prova-admin-reset')?.addEventListener('click', () => {
    void resetAttempt();
  });
  $('prova-admin-reset-all')?.addEventListener('click', () => {
    void resetAllAttempts();
  });
  $('prova-admin-tbody')?.addEventListener('click', (event) => {
    const btn = event.target instanceof Element
      ? event.target.closest('[data-reset-attempt]')
      : null;
    if (!btn) return;
    event.preventDefault();
    const attemptId = btn.getAttribute('data-reset-attempt');
    const name = btn.getAttribute('data-reset-name') || 'este aluno';
    if (attemptId) void resetAttempt({ attemptId, studentName: name });
  });
}

/**
 * @param {{ attemptId?: string, studentName?: string }} [opts]
 */
async function resetAttempt(opts = {}) {
  if (!currentToken) return;
  const attemptId = opts.attemptId || currentDetail?.id;
  if (!attemptId) {
    showWarning('Abra a tentativa do aluno (Abrir) ou use Resetar na linha da lista.');
    return;
  }
  const student = currentDetail?.student || {};
  const name = opts.studentName
    || student.fullName
    || student.username
    || 'este aluno';
  const dialog = $('prova-admin-dialog-reset');
  const bodyEl = $('prova-admin-dialog-reset-body');
  if (bodyEl) {
    bodyEl.textContent = `Apaga a prova de ${name} (respostas, nota e alertas). É como se nunca tivesse feito — poderá iniciar de novo se o gate estiver aberto para a turma.`;
  }

  const confirmed = await new Promise((resolve) => {
    if (dialog && typeof dialog.showModal === 'function') {
      const onClose = () => {
        dialog.removeEventListener('close', onClose);
        resolve(dialog.returnValue === 'confirm');
      };
      dialog.addEventListener('close', onClose);
      dialog.showModal();
      return;
    }
    resolve(window.confirm(
      `Resetar a prova de ${name}?\n\nApaga respostas e nota. Não tem volta.`,
    ));
  });
  if (!confirmed) return;

  const btn = $('prova-admin-reset');
  if (btn) btn.disabled = true;
  try {
    const res = await provaAdminResetAttempt(currentToken, { attemptId });
    currentDetail = null;
    clearAttemptQuery();
    setListVisible(true);
    await loadList();
    const meta = $('prova-admin-meta');
    if (meta) meta.textContent = res.message || 'Tentativa apagada.';
  } catch (error) {
    showWarning(error instanceof ApiError ? error.message : 'Falha ao resetar a prova.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function resetAllAttempts() {
  if (!currentToken) return;
  const filters = readFilters();
  const turma = filters.turma !== 'all' ? filters.turma : null;
  const dialog = $('prova-admin-dialog-reset-all');
  const bodyEl = $('prova-admin-dialog-reset-all-body');
  const input = /** @type {HTMLInputElement|null} */ ($('prova-admin-dialog-reset-all-input'));
  const confirmBtn = $('prova-admin-dialog-reset-all-confirm');
  if (bodyEl) {
    bodyEl.textContent = turma
      ? `Apaga todas as tentativas da turma ${turma} (respeitando o filtro atual). Os alunos poderão fazer de novo.`
      : 'Apaga TODAS as tentativas deste exame. Todos os alunos listados poderão fazer de novo.';
  }
  if (input) input.value = '';

  const confirmed = await new Promise((resolve) => {
    if (dialog && typeof dialog.showModal === 'function') {
      const onClick = (event) => {
        if (!(event.target instanceof HTMLButtonElement)) return;
        if (event.target.value !== 'confirm') return;
        const typed = String(input?.value || '').trim().toUpperCase();
        if (typed !== 'RESETAR') {
          event.preventDefault();
          showWarning('Digite RESETAR no campo para confirmar.');
        }
      };
      const onClose = () => {
        confirmBtn?.removeEventListener('click', onClick);
        dialog.removeEventListener('close', onClose);
        const typed = String(input?.value || '').trim().toUpperCase();
        resolve(dialog.returnValue === 'confirm' && typed === 'RESETAR');
      };
      confirmBtn?.addEventListener('click', onClick);
      dialog.addEventListener('close', onClose);
      dialog.showModal();
      input?.focus();
      return;
    }
    const typed = window.prompt(
      turma
        ? `Digite RESETAR para apagar as tentativas da turma ${turma}:`
        : 'Digite RESETAR para apagar TODAS as tentativas:',
    );
    resolve(String(typed || '').trim().toUpperCase() === 'RESETAR');
  });
  if (!confirmed) return;

  const btn = $('prova-admin-reset-all');
  if (btn) btn.disabled = true;
  try {
    const res = await provaAdminResetAllAttempts(currentToken, {
      confirm: 'RESETAR',
      turma: turma || undefined,
    });
    currentDetail = null;
    clearAttemptQuery();
    setListVisible(true);
    await loadList();
    const meta = $('prova-admin-meta');
    if (meta) meta.textContent = res.message || 'Tentativas apagadas.';
  } catch (error) {
    showWarning(error instanceof ApiError ? error.message : 'Falha ao resetar as tentativas.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function respondContest(contestAction) {
  if (!currentToken || !currentDetail?.id) return;
  const messageEl = $('prova-admin-contest-message');
  const statusEl = $('prova-admin-contest-status');
  const message = messageEl ? String(messageEl.value || '').trim() : '';
  if (contestAction === 'answer' && !message) {
    if (statusEl) statusEl.textContent = 'Escreva a resposta ao aluno.';
    return;
  }
  if (statusEl) statusEl.textContent = contestAction === 'reopen' ? 'Reabrindo…' : 'Enviando…';
  try {
    const res = await provaAdminRespondContest(currentToken, {
      attemptId: currentDetail.id,
      contestAction,
      message: message || undefined,
    });
    if (messageEl) messageEl.value = '';
    paintDetail(res.attempt);
    if (statusEl) statusEl.textContent = res.message || 'Ok.';
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = error instanceof ApiError
        ? error.message
        : 'Falha ao processar a contestação.';
    }
  }
}

async function init() {
  let result;
  try {
    result = await requireAdmin({ redirectTo: ROUTES.dashboard() });
  } catch (error) {
    showWarning(
      error instanceof ApiError
        ? error.message
        : 'A API não respondeu.',
    );
    return;
  }
  if (!result) return;

  currentToken = getSession()?.token ?? null;
  const app = $('prova-admin-app');
  if (app) app.hidden = false;

  initAppShell({
    route: 'prova-admin',
    role: 'admin',
    onLogout: async () => {
      await logout();
      window.location.href = ROUTES.auth();
    },
    token: currentToken,
  });

  bindFilters();

  const params = new URLSearchParams(window.location.search);
  const attemptId = params.get('attempt');
  if (attemptId) {
    await loadDetail(attemptId);
  } else {
    setListVisible(true);
    await loadList();
  }
}

document.addEventListener('DOMContentLoaded', init);
