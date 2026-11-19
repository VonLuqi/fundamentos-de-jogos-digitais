/**
 * Hub admin — Notas da Turma (100 pts): prévia, fechar, reabrir, CSV.
 * API: POST /api/turma-grades (turmaGrades*).
 */

'use strict';

import { initAppShell } from './app-shell.js?v=juizo-guard-1';
import {
  ApiError,
  ROUTES,
  getSession,
  logout,
  requireAdmin,
  turmaGradesAdminClose,
  turmaGradesAdminCsv,
  turmaGradesAdminGradebook,
  turmaGradesAdminRecoveryClose,
  turmaGradesAdminRecoveryReopen,
  turmaGradesAdminReopen,
} from './api.js';

const TURMAS = ['TCG01', 'TCG02'];
const LESSON_IDS = ['aula1', 'aula2', 'aula3', 'aula4', 'aula5', 'aula6', 'aula7', 'aula8'];
const EXAM_LABELS = { m1: 'Prova M1', m2: 'Prova M2', tf: 'Trabalho Final' };

const $ = (id) => document.getElementById(id);
let token = null;
let gradebook = null;

function lessonLabel(id) {
  return `Aula ${id.replace('aula', '')}`;
}

function fmt(n) {
  return Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function errMsg(error, fallback) {
  return error instanceof ApiError ? error.message : fallback;
}

function showFeedback(text, kind = 'error') {
  const el = $('notas-feedback');
  el.textContent = text || '';
  el.dataset.kind = kind;
  el.hidden = !text;
}

function currentTurma() {
  return $('notas-turma').value;
}

function pendingLabels(keys = []) {
  return keys.map((k) => EXAM_LABELS[k] || k).join(', ');
}

function missingList(flags = {}) {
  const miss = LESSON_IDS.filter((id) => !flags[id]).map(lessonLabel);
  return miss.length ? miss.join(', ') : 'nenhuma';
}

function renderStatus() {
  const closure = gradebook?.closure;
  const closed = closure?.status === 'closed';
  const pendingCount = gradebook?.pending?.length ?? 0;
  const status = $('notas-status');
  status.dataset.state = closed ? 'closed' : 'open';
  let text = closed
    ? `Fechada${closure.closedAt ? ` em ${fmtDate(closure.closedAt)}` : ''} — visível aos alunos`
    : 'Aberta — alunos ainda não veem a nota final';
  if (pendingCount) text += ` · ${pendingCount} aluno(s) com pendências`;
  const outCount = gradebook?.missingFromSnapshot?.length ?? 0;
  if (closed && outCount) text += ` · ${outCount} aluno(s) fora do fechamento — reabra e feche de novo para incluí-los`;
  status.textContent = text;
  $('notas-close').hidden = closed;
  $('notas-reopen').hidden = !closed;
  renderRecoveryStatus(closed);
}

const REC_STATUS_LABELS = {
  aprovado: 'Aprovado',
  recuperacao: 'Em recuperação',
  aprovado_recuperacao: 'Aprovado na recuperação',
  reprovado: 'Reprovado',
};

/** Fechamento da recuperação: só depois de fechar as notas da turma e só se houver alunos elegíveis. */
function renderRecoveryStatus(mainClosed) {
  const rec = gradebook?.recoveryClosure;
  const recClosed = rec?.status === 'closed';
  const eligible = (gradebook?.rows ?? []).filter((r) => r.recovery?.eligible).length;
  const show = mainClosed && eligible > 0;
  const status = $('notas-rec-status');
  status.hidden = !show;
  status.dataset.state = recClosed ? 'closed' : 'open';
  status.textContent = recClosed
    ? `Recuperação fechada${rec.closedAt ? ` em ${fmtDate(rec.closedAt)}` : ''} — situação visível aos alunos`
    : `Recuperação aberta — ${eligible} aluno(s) elegível(is); a situação ainda não aparece para eles`;
  $('notas-rec-close').hidden = !show || recClosed;
  $('notas-rec-reopen').hidden = !show || !recClosed;
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function renderRows() {
  const body = $('notas-body');
  body.replaceChildren();
  const rows = gradebook?.rows ?? [];
  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = cell('Nenhum aluno nesta turma.');
    td.colSpan = 9;
    tr.append(td);
    body.append(tr);
    return;
  }
  for (const r of rows) {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('th');
    nameTd.scope = 'row';
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = r.name || `Aluno ${r.userId}`;
    if (r.pending?.length) {
      const badge = document.createElement('span');
      badge.className = 'notas-badge';
      badge.textContent = `Pendente: ${pendingLabels(r.pending)}`;
      sum.append(' ', badge);
    }
    const info = document.createElement('p');
    info.className = 'notas-detail';
    if (r.inSnapshot === false) {
      const out = document.createElement('span');
      out.className = 'notas-badge';
      out.textContent = 'fora do fechamento';
      out.title = 'Entrou na turma depois do fechamento. Reabra e feche as notas de novo para incluir.';
      sum.append(' ', out);
    }
    info.textContent = `Códigos faltando: ${missingList(r.details?.codes)}. Entregas faltando: ${missingList(r.details?.entregas)}.`;
    det.append(sum, info);
    nameTd.append(det);
    tr.append(
      nameTd,
      cell(fmt(r.codes)),
      cell(fmt(r.entregas)),
      cell(fmt(r.m1)),
      cell(fmt(r.m2)),
      cell(fmt(r.tf)),
      cell(fmt(r.total)),
    );
    tr.lastChild.className = 'notas-total';
    const rec = r.recovery;
    const recTd = cell(rec?.eligible ? (rec.score != null ? fmt(rec.score) : 'pendente') : '—');
    if (rec?.closed) recTd.className = 'notas-rec--closed';
    tr.append(recTd, cell(REC_STATUS_LABELS[rec?.status ?? r.status] || '—'));
    body.append(tr);
  }
}

async function load() {
  showFeedback('');
  $('notas-status').textContent = 'Carregando…';
  try {
    gradebook = await turmaGradesAdminGradebook(token, currentTurma());
    renderStatus();
    renderRows();
  } catch (error) {
    gradebook = null;
    $('notas-body').replaceChildren();
    $('notas-status').textContent = 'Falha ao carregar.';
    showFeedback(errMsg(error, 'Não foi possível carregar as notas.'));
  }
}

/** Abre o <dialog> e resolve true se confirmado. */
function confirmDialog({ title, body, items = [], confirmLabel = 'Confirmar' }) {
  const dialog = $('notas-dialog');
  $('notas-dialog-title').textContent = title;
  $('notas-dialog-body').textContent = body;
  const list = $('notas-dialog-list');
  list.replaceChildren(...items.map((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    return li;
  }));
  list.hidden = !items.length;
  $('notas-dialog-confirm').textContent = confirmLabel;
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.returnValue = 'cancel';
    dialog.showModal();
  });
}

function pendingItems(pending = []) {
  return pending.map((p) => `${p.name}: ${pendingLabels(p.items)}`);
}

async function closeGrades(force = false) {
  const turma = currentTurma();
  if (!force) {
    const ok = await confirmDialog({
      title: `Fechar notas da ${turma}?`,
      body: 'A nota final será publicada no painel de cada aluno. Você poderá reabrir depois.',
      confirmLabel: 'Fechar notas',
    });
    if (!ok) return;
  }
  setBusy(true);
  try {
    await turmaGradesAdminClose(token, turma, { force });
    showFeedback(`Notas da ${turma} fechadas e publicadas.`, 'ok');
    await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && Array.isArray(error.payload?.pending) && !force) {
      setBusy(false);
      const ok = await confirmDialog({
        title: 'Há notas pendentes',
        body: 'Estes alunos ainda não têm todas as provas corrigidas (valem 0 até lá). Fechar mesmo assim?',
        items: pendingItems(error.payload.pending),
        confirmLabel: 'Fechar mesmo assim',
      });
      if (ok) await closeGrades(true);
      return;
    }
    showFeedback(errMsg(error, 'Não foi possível fechar as notas.'));
  } finally {
    setBusy(false);
  }
}

async function reopenGrades() {
  const turma = currentTurma();
  const ok = await confirmDialog({
    title: `Reabrir notas da ${turma}?`,
    body: 'A nota final some do painel dos alunos até você fechar de novo. A ação fica registrada.',
    confirmLabel: 'Reabrir notas',
  });
  if (!ok) return;
  setBusy(true);
  try {
    await turmaGradesAdminReopen(token, turma);
    showFeedback(`Notas da ${turma} reabertas.`, 'ok');
    await load();
  } catch (error) {
    showFeedback(errMsg(error, 'Não foi possível reabrir as notas.'));
  } finally {
    setBusy(false);
  }
}

async function exportCsv() {
  setBusy(true);
  try {
    const res = await turmaGradesAdminCsv(token, currentTurma());
    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = res.filename || `notas-${currentTurma()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showFeedback(`CSV exportado (${res.source === 'snapshot' ? 'notas fechadas' : 'prévia ao vivo'}).`, 'ok');
  } catch (error) {
    showFeedback(errMsg(error, 'Não foi possível exportar o CSV.'));
  } finally {
    setBusy(false);
  }
}

async function closeRecovery(force = false) {
  const turma = currentTurma();
  if (!force) {
    const ok = await confirmDialog({
      title: `Fechar notas da recuperação da ${turma}?`,
      body: 'A situação (aprovado ou reprovado) será publicada no perfil de cada aluno em recuperação. A nota final da recuperação vale no máximo 60. Você poderá reabrir depois.',
      confirmLabel: 'Fechar recuperação',
    });
    if (!ok) return;
  }
  setBusy(true);
  try {
    await turmaGradesAdminRecoveryClose(token, turma, { force });
    showFeedback(`Recuperação da ${turma} fechada e publicada.`, 'ok');
    await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && Array.isArray(error.payload?.pending) && !force) {
      setBusy(false);
      const ok = await confirmDialog({
        title: 'Há provas de recuperação pendentes',
        body: 'Estes alunos ainda não têm a prova corrigida (ou não fizeram). Fechar mesmo assim?',
        items: pendingItems(error.payload.pending),
        confirmLabel: 'Fechar mesmo assim',
      });
      if (ok) await closeRecovery(true);
      return;
    }
    showFeedback(errMsg(error, 'Não foi possível fechar a recuperação.'));
  } finally {
    setBusy(false);
  }
}

async function reopenRecovery() {
  const turma = currentTurma();
  const ok = await confirmDialog({
    title: `Reabrir recuperação da ${turma}?`,
    body: 'A situação some do perfil dos alunos em recuperação até você fechar de novo.',
    confirmLabel: 'Reabrir recuperação',
  });
  if (!ok) return;
  setBusy(true);
  try {
    await turmaGradesAdminRecoveryReopen(token, turma);
    showFeedback(`Recuperação da ${turma} reaberta.`, 'ok');
    await load();
  } catch (error) {
    showFeedback(errMsg(error, 'Não foi possível reabrir a recuperação.'));
  } finally {
    setBusy(false);
  }
}

function setBusy(busy) {
  for (const id of ['notas-refresh', 'notas-csv', 'notas-close', 'notas-reopen', 'notas-rec-close', 'notas-rec-reopen', 'notas-turma']) {
    $(id).disabled = busy;
  }
}

async function init() {
  let result;
  try {
    result = await requireAdmin({ redirectTo: ROUTES.dashboard() });
  } catch (error) {
    $('api-warning-text').textContent = errMsg(error, 'A API não respondeu.');
    $('api-warning').hidden = false;
    return;
  }
  if (!result) return;

  token = getSession()?.token ?? null;
  $('notas-turma-app').hidden = false;
  initAppShell({
    route: 'notas-turma',
    role: 'admin',
    onLogout: async () => {
      await logout();
      window.location.href = ROUTES.auth();
    },
    token,
  });

  $('notas-turma').replaceChildren(...TURMAS.map((t) => new Option(t, t)));
  $('notas-turma').addEventListener('change', load);
  $('notas-refresh').addEventListener('click', load);
  $('notas-csv').addEventListener('click', exportCsv);
  $('notas-close').addEventListener('click', () => closeGrades(false));
  $('notas-reopen').addEventListener('click', reopenGrades);
  $('notas-rec-close').addEventListener('click', () => closeRecovery(false));
  $('notas-rec-reopen').addEventListener('click', reopenRecovery);
  await load();
}

document.addEventListener('DOMContentLoaded', init);
