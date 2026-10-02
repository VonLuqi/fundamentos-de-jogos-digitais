/**
 * Página do Mestre — Códigos de Acesso.
 * Gerar, copiar, countdown e histórico filtrado.
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ApiError,
  CODE_TTL_DEFAULT,
  CODE_TTL_OPTIONS,
  LESSONS,
  ROUTES,
  generateCode,
  getSession,
  listCodes,
  logout,
  requireAdmin,
} from './api.js';

let currentToken = null;
/** @type {Array<object>} */
let allCodes = [];
let statusFilter = 'all';
/** @type {string|null} */
let activeDisplay = null;
let countdownTimer = null;

function showApiWarning(message) {
  const box = document.getElementById('api-warning');
  const text = document.getElementById('api-warning-text');
  if (!box || !text) return;
  text.textContent = message;
  box.hidden = false;
}

function clearApiWarning() {
  const box = document.getElementById('api-warning');
  if (box) box.hidden = true;
}

function revealCodesApp() {
  const app = document.getElementById('codes-app');
  if (app) app.hidden = false;
  document.body.classList.add('is-admin-ready');
}

async function handleLogout() {
  try {
    await logout();
  } catch {
    // ignore
  }
  window.location.replace(ROUTES.auth());
}

function lessonOptionsHtml(includeBlankLabel) {
  const blank = includeBlankLabel
    ? `<option value="">${includeBlankLabel}</option>`
    : '';
  const options = LESSONS.map((lesson) => (
    `<option value="${lesson.id}">${lesson.number} — ${lesson.title}</option>`
  )).join('');
  return blank + options;
}

function populateLessonSelects() {
  const mint = document.getElementById('codes-lesson');
  const history = document.getElementById('codes-history-lesson');
  if (mint) {
    mint.innerHTML = lessonOptionsHtml('Selecione…');
  }
  if (history) {
    history.innerHTML = lessonOptionsHtml('Todas');
  }
}

function populateTtlSelect() {
  const select = document.getElementById('codes-ttl');
  if (!select) return;
  select.innerHTML = CODE_TTL_OPTIONS.map((minutes) => {
    const selected = minutes === CODE_TTL_DEFAULT ? ' selected' : '';
    const label = minutes < 60
      ? `${minutes} min`
      : (minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`);
    return `<option value="${minutes}"${selected}>${label}</option>`;
  }).join('');
}

function modeLabel(entry) {
  return entry?.singleUse ? 'uso único' : 'turma';
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function remainingMs(expiresAt) {
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - Date.now());
}

function formatCountdown(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function isEntryExpired(entry) {
  if (entry?.expired) return true;
  if (!entry?.expiresAt) return false;
  return remainingMs(entry.expiresAt) <= 0;
}

function isEntryRedeemable(entry) {
  if (entry?.redeemable === false) return false;
  if (isEntryExpired(entry)) return false;
  if (entry?.singleUse && entry?.used) return false;
  return true;
}

function findActiveForLesson(lessonId) {
  if (!lessonId) return null;
  return allCodes.find((entry) => (
    String(entry.lessonId) === String(lessonId) && isEntryRedeemable(entry)
  )) || null;
}

async function copyText(text) {
  const value = String(text || '').trim();
  if (!value) throw new Error('Nada para copiar.');
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('Não foi possível copiar.');
}

function setCopyStatus(message, kind = 'ok') {
  const el = document.getElementById('codes-copy-status');
  if (!el) return;
  el.textContent = message;
  el.className = `codes-active__status${kind ? ` is-${kind}` : ''}`;
}

function stopCountdown() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function updateCountdownDisplay(entry) {
  const el = document.getElementById('codes-active-countdown');
  if (!el || !entry) return;
  const left = remainingMs(entry.expiresAt);
  if (left <= 0) {
    el.textContent = 'Expirado — gere outro para a turma.';
    el.classList.add('is-expired');
    stopCountdown();
    // Refresh list badges
    renderHistory();
    return;
  }
  el.classList.remove('is-expired');
  el.textContent = `Expira em ${formatCountdown(left)} · até ${formatDateTime(entry.expiresAt)}`;
}

function showActiveCode(entry, { eyebrow = 'Código ativo' } = {}) {
  const panel = document.getElementById('codes-active');
  const codeEl = document.getElementById('codes-active-code');
  const metaEl = document.getElementById('codes-active-meta');
  const eyebrowEl = document.getElementById('codes-active-eyebrow');
  if (!panel || !codeEl || !metaEl) return;

  activeDisplay = entry;
  panel.hidden = false;
  if (eyebrowEl) eyebrowEl.textContent = eyebrow;
  codeEl.textContent = entry.code;
  let usedNote = '';
  if (entry.singleUse && entry.used) {
    usedNote = ' · esgotado (uso único)';
  } else if (entry.used && !entry.singleUse) {
    usedNote = ' · já usado por aluno(s) — ainda válido para quem não resgatou';
  }
  metaEl.textContent = `${entry.lessonTitle || entry.lessonId} — +${entry.xp || 0} XP · ${modeLabel(entry)}${usedNote}`;
  setCopyStatus('');
  stopCountdown();
  updateCountdownDisplay(entry);
  countdownTimer = window.setInterval(() => updateCountdownDisplay(entry), 1000);
}

function hideActiveCode() {
  const panel = document.getElementById('codes-active');
  if (panel) panel.hidden = true;
  activeDisplay = null;
  stopCountdown();
}

function syncActiveFromLessonSelection() {
  const select = document.getElementById('codes-lesson');
  const lessonId = select?.value || '';
  if (!lessonId) {
    hideActiveCode();
    return;
  }
  const active = findActiveForLesson(lessonId);
  if (active) {
    showActiveCode(active, { eyebrow: 'Código ativo desta aula' });
  } else {
    hideActiveCode();
  }
}

function filteredCodes() {
  const lessonSelect = document.getElementById('codes-history-lesson');
  const lessonId = lessonSelect?.value || '';
  return allCodes.filter((entry) => {
    if (lessonId && String(entry.lessonId) !== String(lessonId)) return false;
    const redeemable = isEntryRedeemable(entry);
    if (statusFilter === 'active') return redeemable;
    if (statusFilter === 'expired') return !redeemable;
    return true;
  });
}

function statusBadge(entry) {
  if (isEntryExpired(entry)) return { text: 'Expirado', kind: 'expired' };
  if (entry.singleUse && entry.used) return { text: 'Esgotado', kind: 'expired' };
  return { text: 'Ativo', kind: 'active' };
}

function renderHistory() {
  const list = document.getElementById('codes-list');
  if (!list) return;
  list.innerHTML = '';

  const rows = filteredCodes();
  if (rows.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'codes-list__empty';
    empty.textContent = allCodes.length === 0
      ? 'Nenhum código gerado ainda.'
      : 'Nenhum código neste filtro.';
    list.appendChild(empty);
    return;
  }

  rows.forEach((entry) => {
    const redeemable = isEntryRedeemable(entry);
    const li = document.createElement('li');
    li.className = `codes-row ${redeemable ? 'is-active' : 'is-expired'}`;

    const code = document.createElement('span');
    code.className = 'codes-row__code';
    code.textContent = entry.code;

    const actions = document.createElement('div');
    actions.className = 'codes-row__actions';

    if (redeemable) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'codes-list__copy';
      copyBtn.textContent = 'Copiar';
      copyBtn.addEventListener('click', async () => {
        try {
          await copyText(entry.code);
          copyBtn.textContent = 'Copiado';
          window.setTimeout(() => {
            copyBtn.textContent = 'Copiar';
          }, 1600);
        } catch {
          copyBtn.textContent = 'Falhou';
        }
      });
      actions.appendChild(copyBtn);
    }

    const meta = document.createElement('p');
    meta.className = 'codes-row__meta';
    const badgeInfo = statusBadge(entry);
    const badge = document.createElement('span');
    badge.className = `codes-row__badge is-${badgeInfo.kind}`;
    badge.textContent = badgeInfo.text;
    meta.appendChild(badge);

    let detail = `${entry.lessonTitle || entry.lessonId} — +${entry.xp || 0} XP · ${modeLabel(entry)}`;
    detail += isEntryExpired(entry)
      ? ` · expirou ${formatDateTime(entry.expiresAt)}`
      : ` · expira ${formatDateTime(entry.expiresAt)}`;
    if (entry.used && !entry.singleUse && redeemable) {
      detail += ' · já usado por aluno(s)';
    } else if (entry.used && entry.singleUse) {
      detail += ' · resgatado';
    } else if (entry.used && isEntryExpired(entry)) {
      detail += ' · houve resgate';
    }
    meta.appendChild(document.createTextNode(` ${detail}`));

    li.append(code, actions, meta);
    list.appendChild(li);
  });
}

async function refreshCodes({ keepSelection = true } = {}) {
  if (!currentToken) return;
  const { codes } = await listCodes(currentToken);
  allCodes = Array.isArray(codes) ? codes : [];
  renderHistory();
  if (keepSelection) syncActiveFromLessonSelection();
}

function setStatusFilter(next) {
  statusFilter = next;
  document.querySelectorAll('.codes-filter').forEach((btn) => {
    const active = btn.dataset.filter === next;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  renderHistory();
}

function bindFilters() {
  document.querySelectorAll('.codes-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      setStatusFilter(btn.dataset.filter || 'all');
    });
  });
  document.getElementById('codes-history-lesson')?.addEventListener('change', () => {
    renderHistory();
  });
}

function bindMint() {
  const form = document.getElementById('codes-generate-form');
  const lessonSelect = document.getElementById('codes-lesson');
  const submitBtn = document.getElementById('btn-generate-code');

  lessonSelect?.addEventListener('change', () => {
    syncActiveFromLessonSelection();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const lessonId = lessonSelect?.value || '';
    if (!lessonId) {
      showApiWarning('Escolha a aula antes de gerar o código.');
      return;
    }
    if (!currentToken || !submitBtn) return;

    const ttlSelect = document.getElementById('codes-ttl');
    const singleUseEl = document.getElementById('codes-single-use');
    const ttlMinutes = Number(ttlSelect?.value) || CODE_TTL_DEFAULT;
    const singleUse = Boolean(singleUseEl?.checked);

    clearApiWarning();
    const original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Gerando…';
    try {
      const result = await generateCode(currentToken, lessonId, { ttlMinutes, singleUse });
      const code = result?.code;
      if (!code?.code) throw new Error('Resposta sem código.');
      await refreshCodes({ keepSelection: false });
      showActiveCode(code, {
        eyebrow: singleUse ? 'Código de uso único gerado' : 'Código gerado agora',
      });
      setCopyStatus(
        singleUse
          ? 'Uso único — só o primeiro resgate vale.'
          : 'Pronto para copiar e mostrar na sala.',
        'ok',
      );
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Falha ao gerar código.';
      showApiWarning(message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });

  document.getElementById('btn-copy-active')?.addEventListener('click', async () => {
    if (!activeDisplay?.code) return;
    try {
      await copyText(activeDisplay.code);
      setCopyStatus('Código copiado.', 'ok');
    } catch {
      setCopyStatus('Não foi possível copiar. Selecione o código manualmente.', 'error');
    }
  });

  document.getElementById('btn-generate-another')?.addEventListener('click', () => {
    document.getElementById('codes-generate-form')?.requestSubmit();
  });
}

async function init() {
  let result;
  try {
    result = await requireAdmin();
  } catch (error) {
    showApiWarning(error instanceof ApiError ? error.message : 'A API não respondeu.');
    return;
  }
  if (!result) return;

  revealCodesApp();
  currentToken = getSession()?.token ?? null;

  initAppShell({
    route: 'codigos',
    role: 'admin',
    onLogout: handleLogout,
    token: currentToken,
  });

  populateLessonSelects();
  populateTtlSelect();
  bindFilters();
  bindMint();

  document.getElementById('btn-codes-refresh')?.addEventListener('click', async () => {
    try {
      clearApiWarning();
      await refreshCodes();
    } catch (error) {
      showApiWarning(error instanceof ApiError ? error.message : 'Falha ao atualizar o histórico.');
    }
  });

  try {
    await refreshCodes();
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      window.location.replace(ROUTES.dashboard());
      return;
    }
    showApiWarning(error instanceof ApiError ? error.message : 'Falha ao carregar códigos.');
  }
}

init();
