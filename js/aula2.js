/**
 * Aula 02 — Glossário do Desenvolvedor e o Player na Tela
 * Tabs, slides, envio de anotações/síntese e discovery compartilhado.
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ACHIEVEMENTS,
  ApiError,
  requireSession,
  getSession,
  getLessonParagraph,
  logout,
  ROUTES,
  saveLessonParagraph,
  trackLessonView,
} from './api.js';
import {
  bindLessonDiscoveryLifecycle,
  enqueueDiscovery,
} from './lesson-discovery.js';

const LESSON_ID = 'aula2';
const PPTX_FILE = 'aula02_glossario_player_slides.pptx';
const PDF_FILE = 'aula02_glossario_player_slides.pdf';
const CONFIG_NOTES_START = '=== ANOTACOES_DE_CONFIGURACAO ===';
const CONFIG_NOTES_END = '=== FIM_ANOTACOES_DE_CONFIGURACAO ===';
const CONFIG_NOTES_TEMPLATE = [
  'Glossário (com suas palavras)',
  'Core Loop (com suas palavras): ...',
  'Grokking (com suas palavras): ...',
  'Assets (com suas palavras): ...',
  '',
  'Hierarquia da cena',
  'Raiz: CharacterBody2D',
  'Filhos: Sprite2D, CollisionShape2D',
  '',
  'Input Map',
  'ir_cima / ir_baixo / ir_esquerda / ir_direita → teclas ...',
  '',
  'Script / movimento',
  'Observações ao apertar Play: ...',
].join('\n');

let currentUser = null;
let currentToken = null;

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
  const pptxRelativePath = `../assets/docs/aulas/${encodedPptx}`;
  const pdfRelativePath = `../assets/docs/aulas/${encodedPdf}`;

  downloadPptx.href = pptxRelativePath;
  downloadPdf.href = pdfRelativePath;
  openPptx.href = pptxRelativePath;
  openPdf.href = pdfRelativePath;

  const pptxPublicUrl = `${window.location.origin}/assets/docs/aulas/${encodedPptx}`;
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
  pptxViewer.src = officeViewerUrl;
  status.textContent = 'Visualização PPTX carregada para ambiente publicado.';
  pdfFallback.src = pdfRelativePath;
}

function normalizeParagraph(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function normalizeNotes(text) {
  return String(text || '').replace(/\r\n/g, '\n').trim();
}

function setNotesStatus(message, kind = 'info') {
  const status = document.getElementById('config-notes-status');
  if (!status) return;
  status.className = `gdd-save-status is-${kind}`;
  status.textContent = message;
}

function composeLessonRecord(summary, notes) {
  const normalizedSummary = normalizeParagraph(summary);
  const normalizedNotes = normalizeNotes(notes);

  if (!normalizedSummary && !normalizedNotes) return '';
  if (!normalizedNotes) return normalizedSummary;
  if (!normalizedSummary) {
    return `${CONFIG_NOTES_START}\n${normalizedNotes}\n${CONFIG_NOTES_END}`;
  }

  return `${normalizedSummary}\n\n${CONFIG_NOTES_START}\n${normalizedNotes}\n${CONFIG_NOTES_END}`;
}

function splitLessonRecord(record) {
  const text = String(record || '');
  const start = text.indexOf(CONFIG_NOTES_START);
  const end = text.indexOf(CONFIG_NOTES_END);

  if (start < 0 || end < 0 || end < start) {
    return {
      summary: text,
      notes: '',
    };
  }

  const summary = text.slice(0, start).trim();
  const notes = text.slice(start + CONFIG_NOTES_START.length, end).trim();
  return { summary, notes };
}

function setCompletionAvailability() {
  const textarea = document.getElementById('gdd-text');
  const notesArea = document.getElementById('config-notes');
  const button = document.getElementById('btn-save-gdd');
  if (!textarea || !notesArea || !button) return;

  const hasSummary = normalizeParagraph(textarea.value).length > 0;
  const hasNotes = normalizeNotes(notesArea.value).length > 0;
  button.disabled = !(hasSummary && hasNotes);
}

function setSaveStatus(message, kind = 'info') {
  const status = document.getElementById('gdd-save-status');
  if (!status) return;
  status.className = `gdd-save-status is-${kind}`;
  status.textContent = message;
}

async function initParagraphPersistence() {
  const textarea = document.getElementById('gdd-text');
  const notesArea = document.getElementById('config-notes');
  const saveButton = document.getElementById('btn-save-gdd');
  const templateButton = document.getElementById('btn-template-notes');
  const copyButton = document.getElementById('btn-copy-notes');
  if (!textarea || !notesArea || !saveButton || !currentToken) return;

  textarea.addEventListener('input', () => {
    setSaveStatus('Síntese alterada. Finalize e envie novamente.', 'info');
    setCompletionAvailability();
  });

  notesArea.addEventListener('input', () => {
    setSaveStatus('Anotações alteradas. Finalize e envie novamente.', 'info');
    setNotesStatus('Anotações pendentes de envio.', 'info');
    setCompletionAvailability();
  });

  templateButton?.addEventListener('click', () => {
    if (!normalizeNotes(notesArea.value)) {
      notesArea.value = CONFIG_NOTES_TEMPLATE;
    } else {
      notesArea.value = `${notesArea.value.trim()}\n\n${CONFIG_NOTES_TEMPLATE}`;
    }
    setNotesStatus('Modelo inserido. Revise os campos e salve para enviar.', 'success');
    setSaveStatus('Anotações atualizadas. Finalize e envie para registrar na aula.', 'info');
    setCompletionAvailability();
  });

  copyButton?.addEventListener('click', async () => {
    const notes = normalizeNotes(notesArea.value);
    if (!notes) {
      setNotesStatus('Preencha as anotações antes de copiar.', 'error');
      return;
    }

    if (!navigator.clipboard?.writeText) {
      setNotesStatus('Seu navegador não permite copiar automaticamente neste ambiente.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(notes);
      setNotesStatus('Anotações copiadas.', 'success');
    } catch {
      setNotesStatus('Não foi possível copiar agora.', 'error');
    }
  });

  try {
    const { paragraph } = await getLessonParagraph(currentToken, LESSON_ID);
    if (paragraph) {
      const parsed = splitLessonRecord(paragraph);
      textarea.value = parsed.summary;
      notesArea.value = parsed.notes;
      setSaveStatus('Registro e anotações carregados do banco.', 'success');
      setNotesStatus(parsed.notes ? 'Anotações carregadas.' : 'Explique Core Loop, Grokking e Assets nas anotações.', 'info');
    } else {
      setSaveStatus('Escreva a síntese e finalize para enviar ao professor.', 'info');
      setNotesStatus('Explique Core Loop, Grokking e Assets; depois hierarquia, Input Map e Play.', 'info');
    }
  } catch {
    setSaveStatus('Não foi possível carregar o registro do banco agora.', 'error');
    setNotesStatus('Se necessário, escreva e salve novamente ao final da aula.', 'error');
  }
  setCompletionAvailability();

  saveButton.addEventListener('click', async () => {
    const summary = normalizeParagraph(textarea.value);
    const notes = normalizeNotes(notesArea.value);
    if (!summary) {
      setSaveStatus('Escreva a síntese final antes de enviar.', 'error');
      setCompletionAvailability();
      return;
    }

    if (!notes) {
      setNotesStatus('Preencha as anotações da oficina antes de enviar.', 'error');
      setSaveStatus('As anotações são obrigatórias para envio nesta aula.', 'error');
      setCompletionAvailability();
      return;
    }

    saveButton.disabled = true;
    const previous = saveButton.textContent;
    saveButton.textContent = 'Enviando...';
    try {
      const payload = composeLessonRecord(summary, notes);
      const result = await saveLessonParagraph(currentToken, LESSON_ID, payload);
      setNotesStatus('Anotações enviadas com sucesso.', 'success');
      if (result.awarded) {
        const { xp, achievements = [] } = result.awarded;
        const achievementNames = achievements
          .map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id)?.name)
          .filter(Boolean);
        const conquestText = achievementNames.length > 0
          ? ` Conquistas: ${achievementNames.join(', ')}.`
          : '';
        setSaveStatus(
          `Aula finalizada. Anotações enviadas. +${xp} XP.${conquestText} A atividade aparece no seu Grimório (privada).`,
          'success'
        );
        enqueueDiscovery(achievements);
      } else {
        setSaveStatus(
          'Aula finalizada e anotações enviadas. A atividade aparece no seu Grimório (privada).',
          'success'
        );
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao salvar o registro.';
      setSaveStatus(message, 'error');
      setNotesStatus('Falha ao enviar anotações. Tente novamente.', 'error');
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = previous;
      setCompletionAvailability();
    }
  });
}

function initAdminExample() {
  const example = document.getElementById('gdd-example');
  if (!example) return;
  example.hidden = currentUser?.role !== 'admin';
}

async function init() {
  initTabs();
  initSlidesViewer();
  bindLessonDiscoveryLifecycle();

  const result = await requireSession();
  if (!result) return;

  currentUser = result.user;
  currentToken = getSession()?.token ?? null;

  initAppShell({
    route: 'aula2',
    role: currentUser.role === 'admin' ? 'admin' : 'student',
    onLogout: async () => {
      await logout();
      window.location.href = ROUTES.auth();
    },
  });

  const { initFromNoteBanner } = await import('./grimorio-from-note.js');
  initFromNoteBanner({ token: currentToken });

  trackLessonView(currentToken, LESSON_ID).catch(() => {
    // Não bloqueia a aula se telemetria de visualização falhar.
  });

  initAdminExample();
  await initParagraphPersistence();
}

init().catch((error) => {
  const message = error instanceof ApiError
    ? error.message
    : 'Falha ao inicializar a aula. Verifique se a API está ativa.';
  window.alert(message);
});
