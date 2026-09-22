/**
 * Aula 05 — ClassInd, IARC e Design Saudável
 * Tabs, slides, wizard IARC (finalize) e discovery compartilhado.
 */

'use strict';

import { initAppShell } from './app-shell.js';
import {
  ACHIEVEMENTS,
  ApiError,
  requireSession,
  getSession,
  logout,
  ROUTES,
  saveLessonParagraph,
  trackLessonView,
} from './api.js';
import {
  bindLessonDiscoveryLifecycle,
  enqueueDiscovery,
} from './lesson-discovery.js';
import { composeLessonRecord, splitLessonRecord } from './lesson-paragraph.js';
import { initIarcWizard } from './aula5/iarc-wizard.js';

const LESSON_ID = 'aula5';
const PPTX_FILE = 'aula05_classind_iarc_slides.pptx';
const PDF_FILE = 'aula05_classind_iarc_slides.pdf';

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

function initClassindCta() {
  const cta = document.getElementById('cta-classind-dle');
  if (!cta) return;
  cta.href = ROUTES.classindDle();
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

function initAdminExample() {
  const example = document.getElementById('gdd-example');
  if (!example) return;
  example.hidden = currentUser?.role !== 'admin';
}

function initIarc() {
  const mount = document.getElementById('iarc-wizard-root');
  if (!mount) return;

  initIarcWizard(mount, {
    onFinalize: async ({ notes, summary }) => {
      if (!currentToken) {
        throw new Error('Sessão ausente. Recarregue a página.');
      }
      const payload = composeLessonRecord(summary, notes);
      const result = await saveLessonParagraph(currentToken, LESSON_ID, payload);
      if (result?.awarded) {
        const { achievements = [] } = result.awarded;
        enqueueDiscovery(achievements);
        const names = achievements
          .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name)
          .filter(Boolean);
        if (names.length) {
          window.setTimeout(() => {
            /* discovery overlay already handles toast UX */
          }, 0);
        }
      }
      return result;
    },
  });
}

async function init() {
  initTabs();
  initClassindCta();
  initSlidesViewer();
  bindLessonDiscoveryLifecycle();

  const result = await requireSession();
  if (!result) return;

  currentUser = result.user;
  currentToken = getSession()?.token ?? null;

  initAppShell({
    route: 'aula5',
    role: currentUser.role === 'admin' ? 'admin' : 'student',
    onLogout: async () => {
      await logout();
      window.location.href = ROUTES.auth();
    },
    token: currentToken,
  });

  const { initFromNoteBanner } = await import('./grimorio-from-note.js');
  initFromNoteBanner({ token: currentToken });

  trackLessonView(currentToken, LESSON_ID).catch(() => {});

  initAdminExample();
  initIarc();
}

init().catch((error) => {
  const message = error instanceof ApiError
    ? error.message
    : 'Falha ao inicializar a aula. Verifique se a API está ativa.';
  window.alert(message);
});
