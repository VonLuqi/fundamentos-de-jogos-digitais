/**
 * Aula 08 — Perfis de Jogadores e o Modelo Quantic Foundry
 * Dupla/solo + diário compartilhado (polling) + slides + discovery.
 */

'use strict';

import { initAppShell } from './app-shell.js';
import { bindLazySlideLoad, enhanceCodeBlocks, initLessonUx } from './lesson-ux.js';
import {
  ACHIEVEMENTS,
  ApiError,
  requireSession,
  getSession,
  logout,
  ROUTES,
  trackLessonView,
  lessonDuoList,
  lessonDuoRequest,
  lessonDuoRespond,
  lessonDuoLeave,
  lessonDuoSetRole,
  lessonJournalSave,
  lessonJournalFinalize,
} from './api.js';
import {
  bindLessonDiscoveryLifecycle,
  enqueueDiscovery,
} from './lesson-discovery.js';

const LESSON_ID = 'aula8';
const PPTX_FILE = 'aula08_quantic_foundry_slides.pptx';
const PDF_FILE = 'aula08_quantic_foundry_slides.pdf';
const POLL_MS = 7000;
const AUTOSAVE_MS = 2000;

const JOURNAL_TEMPLATE = [
  '1) Ofícios: (solo: eu nos dois · ou Design do perfil = … / Programação das mecânicas = …)',
  '2) Perfil Quantic Foundry escolhido + motivações (ex.: Destruição, Desafio, Descoberta): …',
  '3) Mecânicas (trilha Conquista: área secreta + moeda brilhante · OU trilha Ação: plataforma móvel) + o que ficou de fora: …',
  '4) Playtest — o que um jogador desse perfil sente no Labirinto: …',
].join('\n');

let currentUser = null;
let currentToken = null;
let journalRevision = 1;
let journalDirty = false;
let autosaveTimer = null;
let pollTimer = null;
let applyingRemote = false;
let lastDuoMode = 'solo';

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      tabs.forEach((item) => {
        item.classList.remove('is-active');
        item.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      panels.forEach((panel) => panel.classList.remove('is-active'));
      document.getElementById(target)?.classList.add('is-active');

      if (target === 'oficina') startPolling();
      else stopPolling();
    });
  });
}

function initSlidesViewer() {
  const pptxViewer = document.getElementById('pptx-online-viewer');
  const pdfFallback = document.getElementById('pdf-fallback-viewer');
  const downloadPptx = document.getElementById('download-pptx');
  const downloadPdf = document.getElementById('download-pdf');
  const openPptx = document.getElementById('open-pptx');
  const openPdf = document.getElementById('open-pdf');
  const localFallbackPanel = document.getElementById('slides-fallback-panel');
  const status = document.getElementById('slides-viewer-status');
  if (
    !pptxViewer
    || !pdfFallback
    || !downloadPptx
    || !downloadPdf
    || !openPptx
    || !openPdf
    || !localFallbackPanel
    || !status
  ) return;

  const encodedPptx = encodeURIComponent(PPTX_FILE);
  const encodedPdf = encodeURIComponent(PDF_FILE);
  const pptxRelativePath = `../assets/docs/aulas/${encodedPptx}?v=20261022a`;
  const pdfRelativePath = `../assets/docs/aulas/${encodedPdf}?v=20261022a`;

  downloadPptx.href = pptxRelativePath;
  downloadPdf.href = pdfRelativePath;
  openPptx.href = pptxRelativePath;
  openPdf.href = pdfRelativePath;

  const pptxPublicUrl = new URL(pptxRelativePath, window.location.href).href;
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pptxPublicUrl)}`;
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (isLocalHost) {
    localFallbackPanel.hidden = false;
    pptxViewer.hidden = true;
    pdfFallback.hidden = true;
    status.textContent = 'Visualização do PPTX em localhost pode falhar; usando PDF online como fallback.';
    return;
  }

  localFallbackPanel.hidden = true;
  pptxViewer.hidden = false;
  pdfFallback.hidden = false;
  status.textContent = 'Abra a aba III. Slides para carregar a apresentação.';
  bindLazySlideLoad(() => {
    if (!pptxViewer.getAttribute('src')) pptxViewer.src = officeViewerUrl;
    if (!pdfFallback.getAttribute('src')) pdfFallback.src = pdfRelativePath;
    status.textContent = 'Visualização PPTX carregada para ambiente publicado.';
  });
}

function setJournalStatus(message, kind = 'info') {
  const status = document.getElementById('journal-status');
  if (!status) return;
  status.className = `gdd-save-status is-${kind}`;
  status.textContent = message;
}

function setSaveStatus(message, kind = 'info') {
  const status = document.getElementById('gdd-save-status');
  if (!status) return;
  status.className = `gdd-save-status is-${kind}`;
  status.textContent = message;
}

function setDuoStatus(message) {
  const el = document.getElementById('duo-status');
  if (el) el.textContent = message;
}

function setRoleStatus(message, kind = 'info') {
  const status = document.getElementById('duo-role-status');
  if (!status) return;
  status.className = `gdd-save-status is-${kind}`;
  status.textContent = message;
}

function partnerLabel(duo) {
  const u = duo?.partner;
  if (!u) return 'parceiro';
  return u.username || u.fullName || 'parceiro';
}

function roleLabel(role) {
  if (role === 'design') return 'Design do perfil';
  if (role === 'programacao') return 'Programação das mecânicas';
  return 'ofício indefinido';
}

function renderInviteList(listEl, entries, { incoming = false } = {}) {
  if (!listEl) return;
  listEl.replaceChildren();
  if (!entries?.length) {
    const li = document.createElement('li');
    li.className = 'lesson-duo-list__empty';
    li.textContent = incoming ? 'Nenhum convite recebido.' : 'Nenhum convite enviado.';
    listEl.append(li);
    return;
  }
  for (const entry of entries) {
    const li = document.createElement('li');
    li.className = 'lesson-duo-list__item';
    const name = document.createElement('span');
    name.textContent = partnerLabel(entry);
    li.append(name);
    if (incoming) {
      const accept = document.createElement('button');
      accept.type = 'button';
      accept.className = 'lesson-cta';
      accept.textContent = 'Aceitar';
      accept.addEventListener('click', () => respondInvite('accept', entry.duoId));
      const decline = document.createElement('button');
      decline.type = 'button';
      decline.className = 'lesson-cta lesson-cta--ghost';
      decline.textContent = 'Recusar';
      decline.addEventListener('click', () => respondInvite('decline', entry.duoId));
      li.append(accept, decline);
    } else {
      const pending = document.createElement('span');
      pending.className = 'lesson-duo-list__meta';
      pending.textContent = 'pendente';
      li.append(pending);
    }
    listEl.append(li);
  }
}

function applyJournalFromServer(journal, { force = false } = {}) {
  const area = document.getElementById('lesson-journal');
  if (!area || !journal) return;
  const remoteRev = Number(journal.revision) || 1;
  const remoteBody = String(journal.body || '');
  if (!force && journalDirty && remoteRev <= journalRevision) return;
  if (!force && journalDirty && remoteBody === area.value) {
    journalRevision = remoteRev;
    return;
  }
  if (!force && journalDirty && remoteRev > journalRevision && remoteBody !== area.value) {
    applyingRemote = true;
    area.value = remoteBody;
    journalRevision = remoteRev;
    journalDirty = false;
    applyingRemote = false;
    setJournalStatus('O parceiro atualizou — recarregamos o diário.', 'info');
    return;
  }
  applyingRemote = true;
  area.value = remoteBody;
  journalRevision = remoteRev;
  journalDirty = false;
  applyingRemote = false;
}

function paintDuoState(payload) {
  const roles = document.getElementById('duo-roles');
  const leaveBtn = document.getElementById('duo-leave');
  const inviteForm = document.getElementById('duo-invite-form');
  const incoming = document.getElementById('duo-incoming');
  const outgoing = document.getElementById('duo-outgoing');

  renderInviteList(incoming, payload.incoming || [], { incoming: true });
  renderInviteList(outgoing, payload.outgoing || [], { incoming: false });

  const duo = payload.duo;
  const hasPending = (payload.incoming?.length || 0) + (payload.outgoing?.length || 0) > 0;
  lastDuoMode = duo?.status === 'accepted' ? 'duo' : 'solo';

  if (leaveBtn) {
    leaveBtn.hidden = !(duo?.status === 'accepted' || hasPending);
  }

  if (duo?.status === 'accepted') {
    if (roles) roles.hidden = false;
    if (inviteForm) inviteForm.hidden = true;
    const mine = duo.myRole ? roleLabel(duo.myRole) : 'ainda sem ofício';
    const theirs = duo.partnerRole ? roleLabel(duo.partnerRole) : 'aguardando';
    setDuoStatus(
      `Dupla com @${partnerLabel(duo)} · você: ${mine} · parceiro: ${theirs}`,
    );
    document.getElementById('duo-role-design')?.classList.toggle('is-active', duo.myRole === 'design');
    document.getElementById('duo-role-prog')?.classList.toggle('is-active', duo.myRole === 'programacao');
  } else {
    if (roles) roles.hidden = true;
    if (inviteForm) inviteForm.hidden = false;
    if (hasPending) {
      setDuoStatus('Convite em andamento — você ainda pode trabalhar solo até aceitar.');
    } else {
      setDuoStatus('Modo solo — os dois ofícios são seus.');
    }
  }

  applyJournalFromServer(payload.journal);
}

async function refreshDuoState({ quiet = false } = {}) {
  if (!currentToken) return;
  try {
    const payload = await lessonDuoList(currentToken, LESSON_ID);
    paintDuoState(payload);
    if (!quiet && payload.journal?.body) {
      setJournalStatus('Diário sincronizado.', 'success');
    }
  } catch (error) {
    if (!quiet) {
      const message = error instanceof ApiError ? error.message : 'Falha ao sincronizar dupla/diário.';
      setDuoStatus(message);
    }
  }
}

async function respondInvite(decision, duoId) {
  if (!currentToken) return;
  try {
    await lessonDuoRespond(currentToken, LESSON_ID, { decision, duoId });
    await refreshDuoState();
    setRoleStatus(
      decision === 'accept' ? 'Dupla formada — escolha seu ofício.' : 'Convite recusado.',
      'success',
    );
  } catch (error) {
    setRoleStatus(error instanceof ApiError ? error.message : 'Falha ao responder.', 'error');
  }
}

function scheduleAutosave() {
  if (autosaveTimer) window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => {
    saveJournal({ silent: true });
  }, AUTOSAVE_MS);
}

async function saveJournal({ silent = false } = {}) {
  const area = document.getElementById('lesson-journal');
  if (!area || !currentToken || applyingRemote) return;
  const body = area.value;
  try {
    const result = await lessonJournalSave(currentToken, LESSON_ID, {
      body,
      revision: journalRevision,
    });
    journalRevision = Number(result.journal?.revision) || journalRevision;
    journalDirty = false;
    if (!silent) setJournalStatus('Diário salvo.', 'success');
    else setJournalStatus('Rascunho salvo.', 'success');
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && error.payload?.journal) {
      applyJournalFromServer(error.payload.journal, { force: true });
      setJournalStatus(error.message || 'Conflito — diário recarregado.', 'info');
      return;
    }
    if (!silent) {
      setJournalStatus(error instanceof ApiError ? error.message : 'Falha ao salvar.', 'error');
    }
  }
}

function startPolling() {
  stopPolling();
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    refreshDuoState({ quiet: true });
  }, POLL_MS);
}

function stopPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

function initDuoWidget() {
  const form = document.getElementById('duo-invite-form');
  const leaveBtn = document.getElementById('duo-leave');
  const roleDesign = document.getElementById('duo-role-design');
  const roleProg = document.getElementById('duo-role-prog');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('duo-invite-username');
    const username = String(input?.value || '').trim();
    if (!username) {
      setRoleStatus('Informe o username do colega.', 'error');
      return;
    }
    try {
      await lessonDuoRequest(currentToken, LESSON_ID, username);
      if (input) input.value = '';
      await refreshDuoState();
      setRoleStatus('Convite enviado.', 'success');
    } catch (error) {
      setRoleStatus(error instanceof ApiError ? error.message : 'Falha ao convidar.', 'error');
    }
  });

  leaveBtn?.addEventListener('click', async () => {
    try {
      await lessonDuoLeave(currentToken, LESSON_ID);
      await refreshDuoState();
      setRoleStatus('Você voltou ao modo solo.', 'success');
    } catch (error) {
      setRoleStatus(error instanceof ApiError ? error.message : 'Falha ao sair.', 'error');
    }
  });

  async function pickRole(role) {
    try {
      await lessonDuoSetRole(currentToken, LESSON_ID, role);
      await refreshDuoState();
      setRoleStatus(`Ofício definido: ${roleLabel(role)}.`, 'success');
    } catch (error) {
      setRoleStatus(error instanceof ApiError ? error.message : 'Falha ao definir ofício.', 'error');
    }
  }

  roleDesign?.addEventListener('click', () => pickRole('design'));
  roleProg?.addEventListener('click', () => pickRole('programacao'));
}

function initJournal() {
  const area = document.getElementById('lesson-journal');
  const templateBtn = document.getElementById('btn-template-journal');
  const finalizeBtn = document.getElementById('btn-finalize-journal');
  if (!area || !finalizeBtn || !currentToken) return;

  area.addEventListener('input', () => {
    if (applyingRemote) return;
    journalDirty = true;
    setJournalStatus('Alterações locais — salvando…', 'info');
    scheduleAutosave();
  });

  templateBtn?.addEventListener('click', () => {
    if (!area.value.trim()) area.value = JOURNAL_TEMPLATE;
    else area.value = `${area.value.trim()}\n\n${JOURNAL_TEMPLATE}`;
    journalDirty = true;
    setJournalStatus('Modelo inserido.', 'success');
    scheduleAutosave();
  });

  finalizeBtn.addEventListener('click', async () => {
    finalizeBtn.disabled = true;
    const previous = finalizeBtn.textContent;
    finalizeBtn.textContent = 'Enviando…';
    try {
      if (journalDirty) await saveJournal({ silent: true });
      const result = await lessonJournalFinalize(currentToken, LESSON_ID);
      if (result.awarded) {
        const { xp, achievements = [] } = result.awarded;
        const achievementNames = achievements
          .map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id)?.name)
          .filter(Boolean);
        const conquestText = achievementNames.length > 0
          ? ` Conquistas: ${achievementNames.join(', ')}.`
          : '';
        setSaveStatus(
          `Aula finalizada. Diário enviado. +${xp} XP.${conquestText} A atividade aparece no seu Grimório (privada).`,
          'success',
        );
        enqueueDiscovery(achievements);
      } else {
        setSaveStatus(
          'Aula finalizada e diário enviado. A atividade aparece no seu Grimório (privada). Resgate o Altar no Painel.',
          'success',
        );
      }
      setJournalStatus('Finalização registrada.', 'success');
    } catch (error) {
      setSaveStatus(error instanceof ApiError ? error.message : 'Falha ao finalizar.', 'error');
    } finally {
      finalizeBtn.disabled = false;
      finalizeBtn.textContent = previous;
    }
  });
}

function initAdminExample() {
  const example = document.getElementById('gdd-example');
  if (!example) return;
  example.hidden = currentUser?.role !== 'admin';
}

function initCopyCodeBlocks() {
  enhanceCodeBlocks();
}

async function init() {
  initTabs();
  initLessonUx();
  initSlidesViewer();
  initCopyCodeBlocks();
  bindLessonDiscoveryLifecycle();

  const result = await requireSession();
  if (!result) return;

  currentUser = result.user;
  currentToken = getSession()?.token ?? null;

  initAppShell({
    route: 'aula8',
    role: currentUser.role === 'admin' ? 'admin' : 'student',
    onLogout: async () => {
      stopPolling();
      await logout();
      window.location.href = ROUTES.auth();
    },
    token: currentToken,
  });

  const { initFromNoteBanner } = await import('./grimorio-from-note.js');
  initFromNoteBanner({ token: currentToken });

  trackLessonView(currentToken, LESSON_ID).catch(() => {});

  initAdminExample();
  initDuoWidget();
  initJournal();
  await refreshDuoState();

  if (document.getElementById('oficina')?.classList.contains('is-active')) {
    startPolling();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible'
      && document.getElementById('oficina')?.classList.contains('is-active')) {
      refreshDuoState({ quiet: true });
    }
  });

  void lastDuoMode;
}

init().catch((error) => {
  const message = error instanceof ApiError
    ? error.message
    : 'Falha ao inicializar a aula. Verifique se a API está ativa.';
  window.alert(message);
});
