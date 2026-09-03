'use strict';

import {
  ACHIEVEMENTS,
  ApiError,
  requireSession,
  getSession,
  getLessonParagraph,
  saveLessonParagraph,
  trackLessonView,
} from './api.js';

const LESSON_ID = 'aula1';
const PPTX_FILE = 'aula01_godot_slides.pptx';
const PDF_FILE = 'aula01_godot_slides.pdf';
const CONFIG_NOTES_START = '=== ANOTACOES_DE_CONFIGURACAO ===';
const CONFIG_NOTES_END = '=== FIM_ANOTACOES_DE_CONFIGURACAO ===';
const CONFIG_NOTES_TEMPLATE = [
  'Teste 1',
  'Forca De Movimento: valor -> efeito observado',
  'Impulso De Pulo: valor -> efeito observado',
  'Massa: valor -> efeito observado',
  'Gravidade Da Cena: valor -> efeito observado',
  'Friccao: valor -> efeito observado',
  'Elasticidade: valor -> efeito observado',
].join('\n');
const VFX_MODULE_CANDIDATES = [
  'https://esm.sh/@vfx-js/core@1.1.0',
  'https://cdn.jsdelivr.net/npm/@vfx-js/core@1.1.0/lib/esm/index.js',
  '/node_modules/@vfx-js/core/lib/esm/index.js',
  '../node_modules/@vfx-js/core/lib/esm/index.js',
];
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let currentUser = null;
let currentToken = null;
let discoveryTimerId = null;
let discoveryExitTimerId = null;
let secretBurstTimerId = null;
let discoveryQueueStartTimerId = null;
const discoveryQueue = [];
let isDiscoveryQueueRunning = false;
let discoveryVfx = null;
let discoveryVfxReady = false;
let discoveryVfxPulseTimerId = null;
const discoveryVfxBoundElements = new WeakSet();
let prefersReducedMotion = reducedMotionQuery.matches;
let lastFocusedElement = null;

const DISCOVERY_TOAST_DURATION_MS = 1500;
let DISCOVERY_TOAST_EXIT_MS = prefersReducedMotion ? 0 : 240;
let DISCOVERY_TOAST_GAP_MS = prefersReducedMotion ? 80 : 120;
const SECRET_BURST_DURATION_MS = 5000;

function rememberFocusedElement() {
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    lastFocusedElement = active;
  }
}

function restoreFocusIfCaptured(container) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  if (!container || !container.contains(active)) return;
  if (lastFocusedElement && lastFocusedElement.isConnected) {
    lastFocusedElement.focus({ preventScroll: true });
  }
}

function applyMotionPreference() {
  prefersReducedMotion = reducedMotionQuery.matches;
  DISCOVERY_TOAST_EXIT_MS = prefersReducedMotion ? 0 : 240;
  DISCOVERY_TOAST_GAP_MS = prefersReducedMotion ? 80 : 120;
  document.body.classList.toggle('is-reduced-motion', prefersReducedMotion);
}

function initMotionPreference() {
  applyMotionPreference();

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', applyMotionPreference);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(applyMotionPreference);
  }
}

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
    // O Office Online não renderiza PPTX com URL local.
    localFallbackPanel.hidden = false;
    pptxViewer.hidden = true;
    pdfFallback.hidden = true;
    status.textContent = 'Visualização do PPTX em localhost pode falhar; usando PDF online como fallback.';
    return;
  } else {
    localFallbackPanel.hidden = true;
    pptxViewer.hidden = false;
    pdfFallback.hidden = false;
    pptxViewer.src = officeViewerUrl;
    status.textContent = 'Visualização PPTX carregada para ambiente publicado.';
  }

  // Fallback secundário em produção caso o PPTX não carregue no navegador do aluno.
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
  const canSubmit = hasSummary && hasNotes;

  button.disabled = !canSubmit;
}

function setSaveStatus(message, kind = 'info') {
  const status = document.getElementById('gdd-save-status');
  if (!status) return;
  status.className = `gdd-save-status is-${kind}`;
  status.textContent = message;
}

function flashDiscovery() {
  const flash = document.getElementById('discovery-flash');
  if (!flash) return;
  flash.classList.remove('is-active');
  void flash.offsetHeight;
  flash.classList.add('is-active');
}

function markDiscoveryFallbackMode() {
  document.body.classList.remove('is-discovery-vfx-ready');
  document.body.classList.add('is-discovery-vfx-fallback');
  discoveryVfxReady = false;
  discoveryVfx = null;
}

async function loadDiscoveryVfxModule() {
  for (const modulePath of VFX_MODULE_CANDIDATES) {
    try {
      return await import(modulePath);
    } catch {
      // Tenta o próximo caminho de módulo.
    }
  }
  return null;
}

async function initDiscoveryVfx() {
  if (prefersReducedMotion) {
    markDiscoveryFallbackMode();
    return;
  }

  try {
    const vfxModule = await loadDiscoveryVfxModule();
    const VFX = vfxModule?.VFX;
    if (!VFX) {
      markDiscoveryFallbackMode();
      return;
    }

    const instance = (typeof VFX.init === 'function' ? VFX.init() : null) ?? new VFX();
    if (!instance) {
      markDiscoveryFallbackMode();
      return;
    }

    discoveryVfx = instance;
    discoveryVfxReady = true;
    document.body.classList.add('is-discovery-vfx-ready');
    document.body.classList.remove('is-discovery-vfx-fallback');
  } catch {
    markDiscoveryFallbackMode();
  }
}

async function ensureDiscoveryVfxBinding(target) {
  if (!discoveryVfxReady || !discoveryVfx || !target || discoveryVfxBoundElements.has(target)) {
    return;
  }

  const targetId = target.id;
  let opts = null;

  if (targetId === 'discovery-secret-burst') {
    opts = { shader: 'shine', overflow: 44, overlay: true };
  } else if (targetId === 'discovery-card') {
    opts = { shader: 'chromatic', overflow: 20, overlay: true };
  } else if (targetId === 'discovery-flash') {
    opts = { shader: 'rgbShift', overflow: true, overlay: true };
  }

  if (!opts) return;

  await discoveryVfx.add(target, opts);
  discoveryVfxBoundElements.add(target);
}

function triggerDiscoveryVfxPulse() {
  if (prefersReducedMotion) {
    document.body.classList.remove('is-discovery-vfx-pulse', 'is-discovery-css-pulse');
    return;
  }

  document.body.classList.remove('is-discovery-vfx-pulse', 'is-discovery-css-pulse');
  void document.body.offsetHeight;

  if (discoveryVfxReady && discoveryVfx) {
    const burst = document.getElementById('discovery-secret-burst');
    const card = document.getElementById('discovery-card');
    const flash = document.getElementById('discovery-flash');
    const vfxTargets = [burst, card, flash].filter(Boolean);

    if (vfxTargets.length === 0) {
      markDiscoveryFallbackMode();
      document.body.classList.add('is-discovery-css-pulse');
      return;
    }

    document.body.classList.add('is-discovery-vfx-pulse');
    Promise.all(vfxTargets.map((target) => ensureDiscoveryVfxBinding(target)))
      .then(() => Promise.all(vfxTargets.map((target) => discoveryVfx.update(target))))
      .catch(() => {
        markDiscoveryFallbackMode();
        document.body.classList.remove('is-discovery-vfx-pulse');
        document.body.classList.add('is-discovery-css-pulse');
      });
  } else {
    document.body.classList.add('is-discovery-css-pulse');
  }

  if (discoveryVfxPulseTimerId) {
    window.clearTimeout(discoveryVfxPulseTimerId);
  }
  discoveryVfxPulseTimerId = window.setTimeout(() => {
    document.body.classList.remove('is-discovery-vfx-pulse', 'is-discovery-css-pulse');
    discoveryVfxPulseTimerId = null;
  }, 950);
}

function hideDiscoveryOverlay({ animated = false } = {}) {
  const overlay = document.getElementById('discovery-overlay');
  if (!overlay) return;

  if (discoveryExitTimerId) {
    window.clearTimeout(discoveryExitTimerId);
    discoveryExitTimerId = null;
  }

  if (animated && !overlay.hidden) {
    overlay.classList.add('is-leaving');
    discoveryExitTimerId = window.setTimeout(() => {
      overlay.classList.remove('is-active', 'is-leaving');
      overlay.hidden = true;
      restoreFocusIfCaptured(overlay);
      discoveryExitTimerId = null;
    }, DISCOVERY_TOAST_EXIT_MS);
    return;
  }

  overlay.classList.remove('is-active', 'is-leaving');
  overlay.hidden = true;
  restoreFocusIfCaptured(overlay);
}

function showSecretBurst() {
  const burst = document.getElementById('discovery-secret-burst');
  if (!burst) return;

  rememberFocusedElement();
  burst.hidden = false;
  burst.classList.remove('is-active');
  void burst.offsetHeight;
  burst.classList.add('is-active');
  triggerDiscoveryVfxPulse();

  if (secretBurstTimerId) {
    window.clearTimeout(secretBurstTimerId);
    secretBurstTimerId = null;
  }

  secretBurstTimerId = window.setTimeout(() => {
    burst.classList.remove('is-active');
    burst.hidden = true;
    restoreFocusIfCaptured(burst);
    secretBurstTimerId = null;
  }, SECRET_BURST_DURATION_MS);
}

function showDiscoveryOverlay(achievement, queueOrder = 0) {
  if (!achievement) return;

  const overlay = document.getElementById('discovery-overlay');
  const title = document.getElementById('discovery-title');
  const list = document.getElementById('discovery-list');
  if (!overlay || !title || !list) return;

  title.textContent = 'Conquista Descoberta';
  list.innerHTML = '';

  const item = document.createElement('li');
  item.className = 'discovery-card__item';
  item.style.setProperty('--item-index', '0');

  const icon = document.createElement('span');
  icon.className = 'discovery-card__item-icon';
  icon.textContent = achievement.icon;

  const body = document.createElement('span');
  body.className = 'discovery-card__item-body';

  const kicker = document.createElement('span');
  kicker.className = 'discovery-card__item-kicker';
  kicker.textContent = 'Conquista liberada';

  const name = document.createElement('span');
  name.className = 'discovery-card__item-name';
  name.textContent = achievement.name;

  const desc = document.createElement('span');
  desc.className = 'discovery-card__item-desc';
  desc.textContent = achievement.desc;

  body.append(kicker, name, desc);
  item.append(icon, body);
  list.appendChild(item);

  if (discoveryTimerId) {
    window.clearTimeout(discoveryTimerId);
    discoveryTimerId = null;
  }

  if (discoveryExitTimerId) {
    window.clearTimeout(discoveryExitTimerId);
    discoveryExitTimerId = null;
  }

  rememberFocusedElement();
  overlay.style.setProperty('--toast-order', String(Math.max(0, Math.min(queueOrder, 4))));
  overlay.hidden = false;
  overlay.classList.remove('is-active', 'is-leaving');
  void overlay.offsetHeight;
  overlay.classList.add('is-active');
  flashDiscovery();
  triggerDiscoveryVfxPulse();

  discoveryTimerId = window.setTimeout(() => {
    hideDiscoveryOverlay({ animated: true });
    discoveryTimerId = null;
  }, DISCOVERY_TOAST_DURATION_MS);
}

async function runDiscoveryQueue() {
  if (isDiscoveryQueueRunning) return;
  isDiscoveryQueueRunning = true;
  let queueOrder = 0;

  while (discoveryQueue.length > 0) {
    const next = discoveryQueue.shift();
    if (!next) continue;
    showDiscoveryOverlay(next, queueOrder);
    queueOrder += 1;
    await new Promise((resolve) => window.setTimeout(resolve, DISCOVERY_TOAST_DURATION_MS + DISCOVERY_TOAST_EXIT_MS + DISCOVERY_TOAST_GAP_MS));
  }

  isDiscoveryQueueRunning = false;
}

function enqueueDiscovery(achievementIds = []) {
  if (!Array.isArray(achievementIds) || achievementIds.length === 0) return;

  const achievements = achievementIds
    .map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id))
    .filter(Boolean);

  if (achievements.length === 0) return;

  const hasSecretAchievement = achievements.some((achievement) => achievement.hidden);
  if (hasSecretAchievement) {
    showSecretBurst();
  }

  achievements.forEach((achievement) => discoveryQueue.push(achievement));
  if (isDiscoveryQueueRunning) return;

  if (discoveryQueueStartTimerId) {
    window.clearTimeout(discoveryQueueStartTimerId);
    discoveryQueueStartTimerId = null;
  }

  const queueStartDelay = hasSecretAchievement ? SECRET_BURST_DURATION_MS : 0;
  discoveryQueueStartTimerId = window.setTimeout(() => {
    discoveryQueueStartTimerId = null;
    runDiscoveryQueue();
  }, queueStartDelay);
}

function clearDiscoveryTimersAndEffects() {
  if (discoveryTimerId) {
    window.clearTimeout(discoveryTimerId);
    discoveryTimerId = null;
  }
  if (discoveryExitTimerId) {
    window.clearTimeout(discoveryExitTimerId);
    discoveryExitTimerId = null;
  }
  if (secretBurstTimerId) {
    window.clearTimeout(secretBurstTimerId);
    secretBurstTimerId = null;
  }
  if (discoveryQueueStartTimerId) {
    window.clearTimeout(discoveryQueueStartTimerId);
    discoveryQueueStartTimerId = null;
  }
  if (discoveryVfxPulseTimerId) {
    window.clearTimeout(discoveryVfxPulseTimerId);
    discoveryVfxPulseTimerId = null;
  }

  discoveryQueue.length = 0;
  isDiscoveryQueueRunning = false;

  const burst = document.getElementById('discovery-secret-burst');
  const overlay = document.getElementById('discovery-overlay');
  if (burst) {
    burst.classList.remove('is-active');
    burst.hidden = true;
  }
  if (overlay) {
    overlay.classList.remove('is-active', 'is-leaving');
    overlay.hidden = true;
  }
  document.body.classList.remove('is-discovery-vfx-pulse', 'is-discovery-css-pulse');
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
      setNotesStatus(parsed.notes ? 'Anotações carregadas.' : 'Escreva as anotações dos testes.', 'info');
    } else {
      setSaveStatus('Escreva a síntese e finalize para enviar ao professor.', 'info');
      setNotesStatus('Preencha as anotações dos testes no Inspector.', 'info');
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
      setNotesStatus('Preencha as anotações de configuração antes de enviar.', 'error');
      setSaveStatus('As anotações dos testes são obrigatórias para envio nesta aula.', 'error');
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
        setSaveStatus(`Aula finalizada. Anotações enviadas. +${xp} XP.${conquestText}`, 'success');
        enqueueDiscovery(achievements);
      } else {
        setSaveStatus('Aula finalizada e anotações enviadas com sucesso.', 'success');
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

function initFeelLab() {
  const canvas = document.getElementById('feel-canvas');
  if (!canvas) return;
  const legend = document.querySelector('.simulation-legend');
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    || window.innerWidth <= 860
    || navigator.maxTouchPoints > 0
    || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = H - 42;

  const controls = {
    accel: document.getElementById('param-accel'),
    friction: document.getElementById('param-friction'),
    gravity: document.getElementById('param-gravity'),
    maxSpeed: document.getElementById('param-maxspeed'),
    sprint: document.getElementById('param-sprint'),
  };

  const outputs = {
    accel: document.getElementById('param-accel-value'),
    friction: document.getElementById('param-friction-value'),
    gravity: document.getElementById('param-gravity-value'),
    maxSpeed: document.getElementById('param-maxspeed-value'),
    sprint: document.getElementById('param-sprint-value'),
  };

  const base = { accel: 900, friction: 1250, gravity: 1200, maxSpeed: 220, sprint: 1.5 };

  function syncLabels() {
    outputs.accel.textContent = controls.accel.value;
    outputs.friction.textContent = controls.friction.value;
    outputs.gravity.textContent = controls.gravity.value;
    outputs.maxSpeed.textContent = controls.maxSpeed.value;
    outputs.sprint.textContent = `${controls.sprint.value}x`;
  }

  Object.values(controls).forEach((input) => {
    input.addEventListener('input', syncLabels);
  });

  document.getElementById('btn-baseline')?.addEventListener('click', () => {
    controls.accel.value = String(base.accel);
    controls.friction.value = String(base.friction);
    controls.gravity.value = String(base.gravity);
    controls.maxSpeed.value = String(base.maxSpeed);
    controls.sprint.value = String(base.sprint);
    syncLabels();
  });

  document.getElementById('btn-reflect')?.addEventListener('click', () => {
    const reading = document.getElementById('feel-reading');
    if (!reading) return;
    reading.textContent = describeFeel({
      accel: Number(controls.accel.value),
      friction: Number(controls.friction.value),
      gravity: Number(controls.gravity.value),
      maxSpeed: Number(controls.maxSpeed.value),
      sprint: Number(controls.sprint.value),
    });
  });

  const keys = { left: false, right: false, jump: false, sprint: false };
  let autoDir = 1;
  let autoJumpCooldown = 0;
  let autoSprintTimer = 0;

  if (isTouchDevice && legend) {
    legend.textContent = 'Modo celular: demonstração automática ativa (andar e pular). Ajuste os parâmetros e observe o efeito.';
  }

  const map = {
    ArrowLeft: 'left',
    a: 'left',
    A: 'left',
    ArrowRight: 'right',
    d: 'right',
    D: 'right',
    ArrowUp: 'jump',
    w: 'jump',
    W: 'jump',
    ' ': 'jump',
    Shift: 'sprint',
  };

  if (!isTouchDevice) {
    window.addEventListener('keydown', (event) => {
      const key = map[event.key];
      if (!key) return;
      keys[key] = true;
      if (event.key === ' ' || event.key.startsWith('Arrow')) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
      const key = map[event.key];
      if (!key) return;
      keys[key] = false;
    });
  }

  const actor = { x: 80, y: GROUND_Y - 32, w: 26, h: 32, vx: 0, vy: 0, onGround: true };
  let prev = performance.now();

  function tick(now) {
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;

    if (isTouchDevice) {
      if (actor.x <= 28) autoDir = 1;
      if (actor.x + actor.w >= W - 28) autoDir = -1;

      keys.left = autoDir < 0;
      keys.right = autoDir > 0;

      autoSprintTimer += dt;
      keys.sprint = Math.sin(autoSprintTimer * 2.4) > -0.1;

      autoJumpCooldown -= dt;
      if (actor.onGround && autoJumpCooldown <= 0) {
        keys.jump = true;
        autoJumpCooldown = 1.15;
      } else {
        keys.jump = false;
      }
    }

    const accel = Number(controls.accel.value);
    const friction = Number(controls.friction.value);
    const gravity = Number(controls.gravity.value);
    const maxSpeed = Number(controls.maxSpeed.value) * (keys.sprint ? Number(controls.sprint.value) : 1);

    if (keys.left) actor.vx -= accel * dt;
    if (keys.right) actor.vx += accel * dt;

    if (!keys.left && !keys.right) {
      const signal = Math.sign(actor.vx);
      const next = Math.abs(actor.vx) - friction * dt;
      actor.vx = next <= 0 ? 0 : next * signal;
    }

    actor.vx = Math.max(-maxSpeed, Math.min(maxSpeed, actor.vx));

    if (keys.jump && actor.onGround) {
      actor.vy = -420;
      actor.onGround = false;
    }

    actor.vy += gravity * dt;

    actor.x += actor.vx * dt;
    actor.y += actor.vy * dt;

    if (actor.y + actor.h >= GROUND_Y) {
      actor.y = GROUND_Y - actor.h;
      actor.vy = 0;
      actor.onGround = true;
    }

    if (actor.x < 24) {
      actor.x = 24;
      actor.vx = 0;
    }
    if (actor.x + actor.w > W - 24) {
      actor.x = W - 24 - actor.w;
      actor.vx = 0;
    }

    drawScene(ctx, W, H, actor);
    requestAnimationFrame(tick);
  }

  syncLabels();
  requestAnimationFrame(tick);
}

function drawScene(ctx, w, h, actor) {
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#111521');
  bg.addColorStop(1, '#0d0a10');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#2a2430';
  ctx.fillRect(0, h - 42, w, 42);

  for (let i = 0; i < 7; i += 1) {
    const x = 90 + i * 80;
    const columnH = 16 + (i % 3) * 10;
    ctx.fillStyle = '#6c5363';
    ctx.fillRect(x, h - 42 - columnH, 24, columnH);
  }

  ctx.fillStyle = '#54d6ff';
  ctx.fillRect(actor.x, actor.y, actor.w, actor.h);
}

function describeFeel(values) {
  const labels = [];

  labels.push(values.accel >= 1200 ? 'arranque agressivo' : values.accel <= 650 ? 'arranque com antecipação' : 'arranque equilibrado');
  labels.push(values.friction >= 1700 ? 'paradas precisas' : values.friction <= 850 ? 'deslizamento perceptível' : 'freio moderado');
  labels.push(values.gravity >= 1600 ? 'queda urgente' : values.gravity <= 850 ? 'suspensão tolerante' : 'queda legível');
  labels.push(values.maxSpeed >= 300 ? 'agência alta' : values.maxSpeed <= 150 ? 'agência contida' : 'ritmo controlado');
  labels.push(values.sprint >= 1.9 ? 'sprint explosivo' : values.sprint <= 1.2 ? 'sprint discreto' : 'sprint estratégico');

  return `Leitura atual: ${labels.join(' · ')}.`;
}

function initAdminExample() {
  const example = document.getElementById('gdd-example');
  if (!example) return;
  example.hidden = currentUser?.role !== 'admin';
}

async function init() {
  initTabs();
  initSlidesViewer();
  initFeelLab();
  initMotionPreference();
  initDiscoveryVfx();

  window.addEventListener('pagehide', clearDiscoveryTimersAndEffects);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearDiscoveryTimersAndEffects();
  });

  const result = await requireSession();
  if (!result) return;

  currentUser = result.user;
  currentToken = getSession()?.token ?? null;

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
