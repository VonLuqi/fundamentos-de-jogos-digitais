/**
 * Hub admin — Provas (M1, M2) e Trabalho Final (Tasks D2–D3 + multi-exame).
 * `?exam=<id>` escolhe o exame; a UI de correção se adapta ao tipo (quiz com/sem discursivas · project).
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  ROUTES,
  getSession,
  logout,
  provaAdminDownloadSubmission,
  provaAdminFinalizeGrade,
  provaAdminGradeProject,
  provaAdminGetAttempt,
  provaAdminListAttempts,
  provaAdminRespondContest,
  provaAdminResetAttempt,
  provaAdminResetAllAttempts,
  provaAdminScoreDiscursive,
  provaAdminSetExamOpen,
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

const DEFAULT_EXAM_ID = 'modulo1-provacao';
const EXAM_TITLES = {
  'modulo1-provacao': ['PROVA', 'MÓDULO 1'],
  'modulo2-prova': ['PROVA', 'MÓDULO 2'],
  'trabalho-final': ['TRABALHO', 'FINAL'],
};

/** Exame da URL (`?exam=`); sem parâmetro = Módulo 1. */
function resolveExamId() {
  try {
    const id = String(new URLSearchParams(window.location.search).get('exam') || '').trim();
    return Object.prototype.hasOwnProperty.call(EXAM_TITLES, id) ? id : DEFAULT_EXAM_ID;
  } catch {
    return DEFAULT_EXAM_ID;
  }
}

let currentToken = null;
let examId = resolveExamId();
/** `exam` do último list/detail (kind, mcMax, hasDiscursive, totalPoints…). @type {object|null} */
let examInfo = null;
/** @type {object|null} */
let currentDetail = null;
/** Contagens do último list (repintar o gate após salvar). */
let lastCounts = {};

function isProjectExam() {
  return examInfo?.kind === 'project';
}

function withExam(payload = {}) {
  return { ...payload, examId };
}

/** Ações do detalhe usam o exame da própria tentativa aberta (nunca o seletor, que pode ter mudado). */
function withDetailExam(payload = {}) {
  return { ...payload, examId: currentDetail?.examId || examId };
}

/** Gerações: respostas de requests antigos (outro exame/filtro) são descartadas. */
let listGen = 0;
let detailGen = 0;

function examMax() {
  return {
    mc: Number(examInfo?.mcMax ?? 12),
    disc: Number(examInfo?.discursiveMax ?? 8),
    total: Number(examInfo?.totalPoints ?? 20),
  };
}

function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value) {
  const v = String(value || '').trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1048576) return `${(n / 1048576).toFixed(1).replace('.', ',')} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

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

/**
 * @param {unknown} rubric
 */
function formatRubricHtml(rubric) {
  if (!rubric) return '';
  if (typeof rubric === 'string') {
    return `<p class="prova-admin-q__rubric"><em>Rubrica:</em> ${escapeHtml(rubric)}</p>`;
  }
  if (typeof rubric !== 'object') return '';
  const focus = rubric.focus ? `<p><em>Foco:</em> ${escapeHtml(rubric.focus)}</p>` : '';
  const synthesis = rubric.synthesis ? `<p><em>Síntese:</em> ${escapeHtml(rubric.synthesis)}</p>` : '';
  const excellent = rubric.excellent ? `<p><em>Excelente:</em> ${escapeHtml(rubric.excellent)}</p>` : '';
  if (!focus && !synthesis && !excellent) return '';
  return `<div class="prova-admin-q__rubric">${focus}${synthesis}${excellent}</div>`;
}

function readFilters() {
  return {
    turma: $('prova-admin-filter-turma')?.value || 'all',
    status: $('prova-admin-filter-status')?.value || 'all',
    alertsOnly: Boolean($('prova-admin-filter-alerts')?.checked),
  };
}

function detailUrl(attemptId) {
  const url = new URL(ROUTES.provaAdminExam(examId), window.location.href);
  url.searchParams.set('attempt', attemptId);
  return url.pathname + url.search;
}

function setListVisible(visible) {
  const nodes = [
    $('prova-admin-exams'),
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

function paintExamChrome() {
  const [first, second] = EXAM_TITLES[examId] || EXAM_TITLES[DEFAULT_EXAM_ID];
  const title = $('prova-admin-page-title');
  if (title) title.innerHTML = `${escapeHtml(first)} <span class="accent">${escapeHtml(second)}</span>`;
  const select = /** @type {HTMLSelectElement|null} */ ($('prova-admin-exam'));
  if (select) select.value = examId;
  const asStudent = $('prova-admin-as-student');
  if (asStudent) asStudent.setAttribute('href', ROUTES.provaExam(examId));

  const project = isProjectExam();
  const hint = $('prova-admin-gate-hint');
  if (hint) {
    hint.innerHTML = project
      ? 'As entregas começam fechadas. Libere uma turma por vez; o aluno pode reenviar o .zip até o <strong>prazo</strong> ou até você selar. Vale o último envio.'
      : 'A prova começa bloqueada. Liberar uma turma por vez. Cada aluno só faz 1 vez.'
        + (examInfo?.hasDiscursive
          ? ' <strong>Saídas</strong> = vezes que o aluno tirou o foco da prova (mudou de aba / saiu da página).'
          : ' Correção de múltipla escolha é automática: a nota vai para o aluno no envio.');
  }
  const closesLabel = $('prova-admin-closes-label');
  if (closesLabel) closesLabel.textContent = project ? 'Prazo de entrega (opcional)' : 'Fecha em (opcional)';
  const resetHint = $('prova-admin-reset-all-hint');
  if (resetHint) {
    resetHint.textContent = project
      ? 'Apaga as entregas da lista (e os arquivos .zip; respeita o filtro de turma). Cada aluno poderá enviar de novo.'
      : 'Apaga as provas da lista (respeita o filtro de turma). Cada aluno poderá fazer de novo.';
  }
  document.title = `${first} ${second} | Hub do Mestre`;
}

function setGateStatus(text, isError = false) {
  const el = $('prova-admin-gate-status');
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('is-error', Boolean(isError));
}

function paintGate(overview) {
  const label = $('prova-admin-gate-label');
  const countsEl = $('prova-admin-gate-counts');
  const exam = overview?.exam || examInfo || {};
  const gate = overview?.gate || exam.gate || {};
  const counts = overview?.counts || {};
  if (label) {
    label.textContent = gate.openTurma
      ? `Gate: liberada só para ${gate.openTurma}`
      : 'Gate: fechada';
    if (exam.contentReady === false) label.textContent += ' · conteúdo pendente (não pode ser liberada)';
  }
  if (countsEl) {
    countsEl.textContent = isProjectExam()
      ? [
        `Entregas: ${counts.total ?? 0}`,
        `Aguardando nota: ${counts.awaitingGrade ?? 0}`,
        `Corrigidas: ${counts.graded ?? 0}`,
      ].join(' · ')
      : [
        `Em andamento: ${counts.inProgress ?? 0}`,
        `Aguardando nota: ${counts.awaitingGrade ?? 0}`,
        `Fechadas: ${counts.graded ?? 0}`,
        `Total: ${counts.total ?? 0}`,
      ].join(' · ');
  }
  document.querySelectorAll('[data-gate-mode]').forEach((btn) => {
    const mode = btn.getAttribute('data-gate-mode');
    const active = mode === 'closed' ? !gate.openTurma : gate.openTurma === mode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  const opens = /** @type {HTMLInputElement|null} */ ($('prova-admin-opens'));
  const closes = /** @type {HTMLInputElement|null} */ ($('prova-admin-closes'));
  if (opens && document.activeElement !== opens) opens.value = isoToLocalInput(exam.opensAt);
  if (closes && document.activeElement !== closes) closes.value = isoToLocalInput(exam.closesAt);
}

async function setGateMode(mode) {
  if (!currentToken) return;
  setGateStatus('Salvando…');
  const reqExam = examId;
  try {
    const res = await provaAdminSetExamOpen(currentToken, withExam({ mode }));
    if (reqExam !== examId) return;
    examInfo = res.exam || examInfo;
    paintGate({ exam: examInfo, gate: res.gate, counts: lastCounts });
    setGateStatus(res.message || 'Gate atualizado.');
  } catch (error) {
    setGateStatus(error instanceof ApiError ? error.message : 'Falha ao atualizar o gate.', true);
  }
}

async function saveGateDates() {
  if (!currentToken) return;
  const opensRaw = /** @type {HTMLInputElement|null} */ ($('prova-admin-opens'))?.value || '';
  const closesRaw = /** @type {HTMLInputElement|null} */ ($('prova-admin-closes'))?.value || '';
  const opensAt = localInputToIso(opensRaw);
  const closesAt = localInputToIso(closesRaw);
  if ((opensRaw && !opensAt) || (closesRaw && !closesAt)) {
    setGateStatus('Data inválida.', true);
    return;
  }
  if (opensAt && closesAt && Date.parse(closesAt) <= Date.parse(opensAt)) {
    setGateStatus('O prazo precisa ser depois da abertura.', true);
    return;
  }
  setGateStatus('Salvando…');
  const reqExam = examId;
  try {
    const res = await provaAdminSetExamOpen(currentToken, withExam({ opensAt, closesAt }));
    if (reqExam !== examId) return;
    examInfo = res.exam || examInfo;
    paintGate({ exam: examInfo, gate: res.gate, counts: lastCounts });
    setGateStatus('Datas salvas.');
  } catch (error) {
    setGateStatus(error instanceof ApiError ? error.message : 'Falha ao salvar as datas.', true);
  }
}

function paintTableHead() {
  const row = document.querySelector('#prova-admin-table thead tr');
  if (!row) return;
  const cols = isProjectExam()
    ? ['Aluno', 'Turma', 'Status', 'Envio', 'Arquivo', 'Nota']
    : [
      'Aluno', 'Turma', 'Status', 'Tempo / envio',
      { label: 'Saídas', title: 'Quantas vezes o aluno saiu da aba ou perdeu o foco da janela durante a prova' },
      examInfo?.hasDiscursive ? 'MC' : 'Acertos',
      'Nota',
    ];
  row.innerHTML = cols.map((c) => (typeof c === 'string'
    ? `<th scope="col">${escapeHtml(c)}</th>`
    : `<th scope="col" title="${escapeHtml(c.title)}">${escapeHtml(c.label)}</th>`)).join('')
    + '<th scope="col"><span class="visually-hidden">Ações</span></th>';
}

function paintTable(attempts) {
  const tbody = $('prova-admin-tbody');
  const empty = $('prova-admin-empty');
  const meta = $('prova-admin-meta');
  if (!tbody) return;
  paintTableHead();
  const max = examMax();

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
    const sub = row.submission || null;
    const name = student.fullName || '—';
    const user = student.username ? `@${student.username}` : '';

    const timeCell = row.status === 'in_progress'
      ? `resta ${formatRemaining(row.remainingMs)}`
      : formatWhen(isProjectExam() ? (sub?.uploadedAt || row.submittedAt) : row.submittedAt);

    const mc = row.mcScore != null ? `${row.mcScore}/${max.mc}` : '—';
    const showFinal = !isProjectExam() || row.status === 'graded' || row.finalScore != null;
    const final = row.finalScore != null && showFinal ? `${row.finalScore}/${max.total}` : '—';
    const fileCell = sub
      ? `${sub.originalName || 'arquivo.zip'} · ${formatBytes(sub.sizeBytes)}${sub.uploadCount > 1 ? ` · ${sub.uploadCount} envios` : ''}`
      : 'sem arquivo';
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
      ${isProjectExam()
    ? `<td>${escapeHtml(fileCell)}</td>`
    : `<td title="${escapeHtml(exitsTitle)}">${escapeHtml(exitsLabel)}</td>
      <td>${escapeHtml(mc)}</td>`}
      <td>${escapeHtml(final)}</td>
      <td class="prova-admin-row-actions">
        <span class="prova-admin-row-actions__inner">
          <a class="prova-admin-row-link" href="${escapeHtml(detailUrl(row.id))}">Abrir</a>
          <button type="button" class="prova-admin-row-reset" data-reset-attempt="${escapeHtml(row.id)}" data-reset-name="${escapeHtml(name)}">Resetar</button>
        </span>
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
  const project = attempt.kind === 'project' || isProjectExam();
  const max = examMax();
  const discTotal = grading.discursiveTotal ?? max.disc;
  const hasDisc = !project && discTotal > 0;
  if (summary) {
    const mc = grading.mcScore != null ? `${grading.mcScore}/${max.mc}` : '—';
    const disc = grading.discursiveScore != null ? `${grading.discursiveScore}/${max.disc}` : '—';
    const fin = grading.finalScore != null ? `${grading.finalScore}/${max.total}` : '—';
    if (project) {
      summary.innerHTML = `<p><strong>Nota:</strong> ${escapeHtml(fin)} · Enviado: ${escapeHtml(formatWhen(attempt.submittedAt))}</p>`;
    } else if (hasDisc) {
      summary.innerHTML = `
      <p><strong>MC:</strong> ${escapeHtml(mc)} · <strong>Discursivas:</strong> ${escapeHtml(disc)}
      (${grading.discursiveScored ?? 0}/${discTotal}) · <strong>Final:</strong> ${escapeHtml(fin)}</p>
      <p>Enviada: ${escapeHtml(formatWhen(attempt.submittedAt))} · Saídas de aba: ${attempt.blurCount ?? 0} · Saídas de página: ${attempt.leaveCount ?? 0}</p>
    `;
    } else {
      summary.innerHTML = `
      <p><strong>Acertos (automático):</strong> ${escapeHtml(mc)} · <strong>Final:</strong> ${escapeHtml(fin)}</p>
      <p>Enviada: ${escapeHtml(formatWhen(attempt.submittedAt))} · Saídas de aba: ${attempt.blurCount ?? 0} · Saídas de página: ${attempt.leaveCount ?? 0}</p>
    `;
    }
  }
  const integritySection = $('prova-admin-integrity');
  if (integritySection) integritySection.hidden = project;
  paintProjectDetail(attempt, project);

  if (actions) {
    actions.hidden = false;
    const saveBtn = $('prova-admin-save-scores');
    const finBtn = $('prova-admin-finalize');
    const resetBtn = $('prova-admin-reset');
    if (saveBtn) {
      saveBtn.hidden = project || !hasDisc || Boolean(grading.locked) || !grading.canScore;
      saveBtn.disabled = saveBtn.hidden;
    }
    if (finBtn) {
      finBtn.hidden = project || Boolean(grading.locked) || !grading.canFinalize;
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
    } else if (project) {
      hint.textContent = grading.canScore
        ? 'Baixe o .zip, avalie e publique a nota (0–30) com feedback.'
        : 'Sem arquivo enviado ainda.';
    } else if (!grading.canScore) {
      hint.textContent = 'Ainda em andamento — só dá para notar depois do envio (ou tempo esgotado).';
    } else if (!hasDisc) {
      hint.textContent = 'Múltipla escolha: a nota já foi enviada ao aluno no momento do envio.';
    } else if (attempt.contest?.isOpen) {
      hint.textContent = 'Correção reaberta. Ajuste as notas e use Fechar nota — aí você escreve a mensagem da revisão para o aluno.';
    } else {
      hint.textContent = 'Notas 0–1 por discursiva (pode 0,25 / 0,5 / 0,75). Depois use Fechar nota.';
    }
  }

  paintContestPanel(attempt);

  if (host) {
    host.replaceChildren();
    for (const q of (project ? [] : (attempt.answers || []))) {
      const article = document.createElement('article');
      article.className = `prova-admin-q prova-admin-q--${q.type}`;
      article.dataset.questionId = q.questionId;

      const qNum = q.number != null ? q.number : String(q.questionId || '').replace(/^q0?/, '') || '?';
      const head = document.createElement('header');
      head.innerHTML = `<h3>Q${escapeHtml(String(qNum))} · ${escapeHtml(q.type === 'mc' ? 'Múltipla escolha' : 'Discursiva')}${q.title ? ` · ${escapeHtml(q.title)}` : ''}</h3>
        <p class="prova-admin-q__prompt">${escapeHtml(q.prompt || '')}</p>`;
      article.appendChild(head);

      if (q.type === 'mc') {
        const body = document.createElement('div');
        body.className = 'prova-admin-q__mc';
        const ok = q.isCorrect === true;
        const bad = q.isCorrect === false;
        const choiceLetters = ['A', 'B', 'C', 'D', 'E'];
        const choices = q.choices && typeof q.choices === 'object' ? q.choices : {};
        const choicesHtml = choiceLetters
          .filter((letter) => choices[letter] != null && choices[letter] !== '')
          .map((letter) => {
            const isStudent = q.studentChoice === letter;
            const isCorrect = q.correctChoice === letter;
            const marks = [
              isCorrect ? '<span class="prova-admin-choice__tag is-ok">gabarito</span>' : '',
              isStudent ? `<span class="prova-admin-choice__tag ${ok ? 'is-ok' : 'is-bad'}">aluno</span>` : '',
            ].filter(Boolean).join(' ');
            const cls = [
              'prova-admin-choice',
              isCorrect ? 'prova-admin-choice--correct' : '',
              isStudent ? 'prova-admin-choice--student' : '',
            ].filter(Boolean).join(' ');
            return `<li class="${cls}"><span class="prova-admin-choice__letter">${letter})</span><span class="prova-admin-choice__text">${escapeHtml(String(choices[letter]))}</span><span class="prova-admin-choice__marks">${marks}</span></li>`;
          })
          .join('');
        body.innerHTML = `
          <ul class="prova-admin-choices">${choicesHtml || '<li class="prova-admin-choice">(alternativas indisponíveis)</li>'}</ul>
          <p>Resposta do aluno: <strong>${escapeHtml(q.studentChoice || '—')}</strong>
            ${ok ? '<span class="is-ok">acertou</span>' : ''}
            ${bad ? '<span class="is-bad">errou</span>' : ''}
            ${q.studentChoice == null ? '<span class="is-bad">em branco</span>' : ''}</p>
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
        const rubricHtml = formatRubricHtml(q.rubric);
        body.innerHTML = `
          ${rubricHtml}
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

/** Carrega `exam` (kind/máximos) quando o hub abre direto no detalhe (?attempt=). */
async function loadExamInfo() {
  try {
    const payload = await provaAdminListAttempts(currentToken, withExam({}));
    examInfo = payload.exam || examInfo;
    lastCounts = payload.counts || {};
  } catch {
    // o detalhe ainda abre; só perde os máximos por exame
  }
  paintExamChrome();
}

function setProjectStatus(text, isError = false) {
  const el = $('prova-admin-project-status');
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('is-error', Boolean(isError));
}

/**
 * Bloco do Trabalho Final no detalhe: arquivo, download, nota 0–30 e feedback.
 * @param {object} attempt
 * @param {boolean} project
 */
function paintProjectDetail(attempt, project) {
  const box = $('prova-admin-project');
  if (!box) return;
  box.hidden = !project;
  if (!project) return;

  const sub = attempt.submission || null;
  const grading = attempt.grading || {};
  const meta = $('prova-admin-project-meta');
  if (meta) {
    meta.innerHTML = sub
      ? `<div><dt>Arquivo</dt><dd>${escapeHtml(sub.originalName || '—')}</dd></div>
         <div><dt>Tamanho</dt><dd>${escapeHtml(formatBytes(sub.sizeBytes))}</dd></div>
         <div><dt>Último envio</dt><dd>${escapeHtml(formatWhen(sub.uploadedAt))}</dd></div>
         <div><dt>Envios</dt><dd>${escapeHtml(String(sub.uploadCount ?? 1))}</dd></div>
         <div><dt>SHA-256</dt><dd>${escapeHtml(String(sub.sha256 || '—').slice(0, 16))}…</dd></div>`
      : '<div><dt>Arquivo</dt><dd>Nenhum envio.</dd></div>';
  }
  const dl = /** @type {HTMLButtonElement|null} */ ($('prova-admin-project-download'));
  if (dl) dl.disabled = !sub;

  const locked = Boolean(grading.locked);
  const scoreInput = /** @type {HTMLInputElement|null} */ ($('prova-admin-project-score'));
  const feedback = /** @type {HTMLTextAreaElement|null} */ ($('prova-admin-project-feedback'));
  const scoreMax = grading.scoreMax ?? examInfo?.totalPoints ?? 30;
  const label = $('prova-admin-project-score-label');
  if (label) label.textContent = `Nota (0–${scoreMax})`;
  if (scoreInput) {
    scoreInput.max = String(scoreMax);
    scoreInput.value = grading.finalScore != null ? String(grading.finalScore) : '';
    scoreInput.disabled = locked || !sub;
  }
  if (feedback) {
    feedback.value = attempt.feedback || attempt.adminNotesGeneral || '';
    feedback.disabled = locked || !sub;
  }
  const saveBtn = /** @type {HTMLButtonElement|null} */ ($('prova-admin-project-save'));
  const pubBtn = /** @type {HTMLButtonElement|null} */ ($('prova-admin-project-publish'));
  if (saveBtn) saveBtn.disabled = locked || !sub;
  if (pubBtn) pubBtn.disabled = locked || !sub;
  setProjectStatus(locked ? 'Nota publicada. Para editar, reabra pela contestação ou zere a entrega.' : '');
}

async function downloadSubmission() {
  if (!currentToken || !currentDetail?.id) return;
  const btn = /** @type {HTMLButtonElement|null} */ ($('prova-admin-project-download'));
  if (btn) btn.disabled = true;
  setProjectStatus('Preparando o download…');
  try {
    const { blob, fileName } = await provaAdminDownloadSubmission(currentToken, currentDetail.id, { examId: currentDetail.examId || examId });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    setProjectStatus(`Download iniciado: ${fileName}`);
  } catch (error) {
    setProjectStatus(error instanceof ApiError ? error.message : 'Falha ao baixar o arquivo.', true);
  } finally {
    if (btn) btn.disabled = !currentDetail?.submission;
  }
}

/**
 * @param {boolean} finalize — true publica a nota (aluno passa a ver); false salva rascunho.
 */
async function gradeProject(finalize) {
  if (!currentToken || !currentDetail?.id) return;
  const scoreRaw = /** @type {HTMLInputElement|null} */ ($('prova-admin-project-score'))?.value ?? '';
  const feedback = /** @type {HTMLTextAreaElement|null} */ ($('prova-admin-project-feedback'))?.value ?? '';
  if (scoreRaw === '' || Number.isNaN(Number(scoreRaw))) {
    setProjectStatus('Informe a nota.', true);
    return;
  }
  if (finalize && !window.confirm('Publicar a nota? O aluno passa a ver a nota e o feedback.')) return;
  setProjectStatus(finalize ? 'Publicando…' : 'Salvando…');
  try {
    const revising = Boolean(currentDetail.contest?.isOpen);
    const contestMessage = revising ? String($('prova-admin-contest-message')?.value || '').trim() : '';
    if (finalize && revising && !contestMessage) {
      setProjectStatus('Escreva a mensagem da revisão no painel de contestação antes de publicar.', true);
      return;
    }
    const res = await provaAdminGradeProject(currentToken, withDetailExam({
      attemptId: currentDetail.id,
      score: Number(scoreRaw),
      feedback,
      finalize,
      sha256: currentDetail.submission?.sha256 || '',
      revision: currentDetail.submission?.uploadCount,
      ...(contestMessage ? { contestAdminMessage: contestMessage } : {}),
    }));
    paintDetail(res.attempt);
    setProjectStatus(finalize ? 'Nota publicada.' : 'Rascunho salvo.');
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && currentDetail?.id) {
      // reenvio/nota concorrente: recarrega a entrega atual antes de qualquer nova ação
      const id = currentDetail.id;
      await loadDetail(id);
      setProjectStatus(`${error.message} (tela atualizada)`, true);
      return;
    }
    setProjectStatus(error instanceof ApiError ? error.message : 'Falha ao salvar a nota.', true);
  }
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
  const gen = ++listGen;
  const reqExam = examId;

  try {
    const payload = await provaAdminListAttempts(currentToken, {
      turma: filters.turma === 'all' ? undefined : filters.turma,
      status: filters.status === 'all' ? undefined : filters.status,
      alertsOnly: filters.alertsOnly || undefined,
      examId: reqExam,
    });
    if (gen !== listGen || reqExam !== examId) return;
    examInfo = payload.exam || examInfo;
    lastCounts = payload.counts || {};
    paintExamChrome();
    paintGate(payload);
    paintTable(payload.attempts || []);
  } catch (error) {
    if (gen !== listGen || reqExam !== examId) return;
    console.error('[prova-admin]', error);
    showWarning(error instanceof ApiError ? error.message : 'Falha ao listar tentativas.');
    if (meta) meta.textContent = 'Erro ao carregar.';
  }
}

async function loadDetail(attemptId) {
  if (!currentToken || !attemptId) return;
  const gen = ++detailGen;
  const reqExam = examId;
  try {
    if (!examInfo) await loadExamInfo();
    if (gen !== detailGen || reqExam !== examId) return;
    const payload = await provaAdminGetAttempt(currentToken, attemptId, { examId: reqExam });
    if (gen !== detailGen || reqExam !== examId) return;
    paintDetail(payload.attempt);
  } catch (error) {
    if (gen !== detailGen || reqExam !== examId) return;
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
    const res = await provaAdminScoreDiscursive(currentToken, withDetailExam({
      attemptId: currentDetail.id,
      scores,
    }));
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
  const missing = (currentDetail.grading?.discursiveTotal ?? 8)
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
      await provaAdminScoreDiscursive(currentToken, withDetailExam({
        attemptId: currentDetail.id,
        scores,
      }));
    }
    const res = await provaAdminFinalizeGrade(currentToken, withDetailExam({
      attemptId: currentDetail.id,
      allowPartial,
      ...(contestMessage ? { contestMessage } : {}),
    }));
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
  $('prova-admin-exam')?.addEventListener('change', (event) => {
    const next = /** @type {HTMLSelectElement} */ (event.target).value;
    if (!Object.prototype.hasOwnProperty.call(EXAM_TITLES, next) || next === examId) return;
    examId = next;
    examInfo = null;
    currentDetail = null;
    listGen += 1;
    detailGen += 1;
    const url = new URL(window.location.href);
    url.searchParams.delete('attempt');
    if (examId === DEFAULT_EXAM_ID) url.searchParams.delete('exam');
    else url.searchParams.set('exam', examId);
    window.history.replaceState({}, '', url.pathname + url.search);
    setGateStatus('');
    setListVisible(true);
    void loadList();
  });
  document.querySelectorAll('[data-gate-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void setGateMode(btn.getAttribute('data-gate-mode') || 'closed');
    });
  });
  $('prova-admin-save-dates')?.addEventListener('click', () => {
    void saveGateDates();
  });
  $('prova-admin-project-download')?.addEventListener('click', () => {
    void downloadSubmission();
  });
  $('prova-admin-project-save')?.addEventListener('click', () => {
    void gradeProject(false);
  });
  $('prova-admin-project-publish')?.addEventListener('click', () => {
    void gradeProject(true);
  });
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
    bodyEl.textContent = isProjectExam()
      ? `Apaga a entrega de ${name} (arquivo .zip e nota). Ele poderá enviar de novo se o gate estiver aberto para a turma.`
      : `Apaga a prova de ${name} (respostas, nota e alertas). É como se nunca tivesse feito — poderá iniciar de novo se o gate estiver aberto para a turma.`;
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
    const res = await provaAdminResetAttempt(currentToken, withExam({ attemptId, examId: currentDetail?.examId || examId }));
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
    const res = await provaAdminResetAllAttempts(currentToken, withExam({
      confirm: 'RESETAR',
      turma: turma || undefined,
    }));
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
    const res = await provaAdminRespondContest(currentToken, withDetailExam({
      attemptId: currentDetail.id,
      contestAction,
      message: message || undefined,
    }));
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
  paintExamChrome();

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
