'use strict';

import {
  ApiError,
  requireSession,
  getSession,
  getLessonCode,
  fetchLessonGates,
  setLessonGate,
  getLessonParagraph,
  saveLessonParagraph,
} from './api.js';

const LESSON_ID = 'aula1';
const GATE_KEYS = ['aula1_referencias', 'aula1_nota_instrutor'];
const PPTX_FILE = 'aula01-circulo-magico-roguelite.pptx';
const PDF_FILE = 'aula01-circulo-magico-roguelite.pdf';

let currentUser = null;
let currentToken = null;
let paragraphSaved = false;

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

function setCompletionAvailability() {
  const textarea = document.getElementById('gdd-text');
  const button = document.getElementById('btn-complete-aula');
  if (!textarea || !button) return;

  const hasText = normalizeParagraph(textarea.value).length > 0;
  const canReveal = hasText && paragraphSaved;

  button.disabled = !canReveal;
  button.textContent = canReveal
    ? 'Finalizar aula e revelar código'
    : 'Preencha e salve o parágrafo para revelar código';
}

function setSaveStatus(message, kind = 'info') {
  const status = document.getElementById('gdd-save-status');
  if (!status) return;
  status.className = `gdd-save-status is-${kind}`;
  status.textContent = message;
}

async function initParagraphPersistence() {
  const textarea = document.getElementById('gdd-text');
  const saveButton = document.getElementById('btn-save-gdd');
  if (!textarea || !saveButton || !currentToken) return;

  textarea.addEventListener('input', () => {
    paragraphSaved = false;
    setSaveStatus('Texto alterado. Salve novamente para liberar o código.', 'info');
    setCompletionAvailability();
  });

  try {
    const { paragraph } = await getLessonParagraph(currentToken, LESSON_ID);
    if (paragraph) {
      textarea.value = paragraph;
      paragraphSaved = true;
      setSaveStatus('Parágrafo carregado do banco.', 'success');
    } else {
      setSaveStatus('Escreva seu parágrafo e salve.', 'info');
    }
  } catch {
    setSaveStatus('Não foi possível carregar do banco agora.', 'error');
  }
  setCompletionAvailability();

  saveButton.addEventListener('click', async () => {
    const text = normalizeParagraph(textarea.value);
    if (!text) {
      paragraphSaved = false;
      setSaveStatus('Digite o parágrafo antes de salvar.', 'error');
      setCompletionAvailability();
      return;
    }

    saveButton.disabled = true;
    const previous = saveButton.textContent;
    saveButton.textContent = 'Salvando...';
    try {
      await saveLessonParagraph(currentToken, LESSON_ID, textarea.value);
      paragraphSaved = true;
      setSaveStatus('Parágrafo salvo com sucesso no banco.', 'success');
    } catch (error) {
      paragraphSaved = false;
      const message = error instanceof ApiError ? error.message : 'Falha ao salvar o parágrafo.';
      setSaveStatus(message, 'error');
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = previous;
      setCompletionAvailability();
    }
  });
}

function applyGateState(gates) {
  document.querySelectorAll('[data-gate]').forEach((card) => {
    const key = card.getAttribute('data-gate');
    const released = Boolean(gates?.[key]);
    card.classList.toggle('is-released', released);
  });

  document.querySelectorAll('[data-gate-toggle]').forEach((button) => {
    const key = button.getAttribute('data-gate-toggle');
    const released = Boolean(gates?.[key]);
    button.textContent = released
      ? `Reaplicar censura: ${prettyGateName(key)}`
      : `Liberar: ${prettyGateName(key)}`;
    button.dataset.released = String(released);
  });
}

function prettyGateName(key) {
  if (key === 'aula1_referencias') return 'Referências';
  if (key === 'aula1_nota_instrutor') return 'Nota do Instrutor';
  return key;
}

async function loadGates() {
  if (!currentToken) return;
  try {
    const { gates } = await fetchLessonGates(currentToken, LESSON_ID);
    applyGateState(gates || {});
  } catch {
    const fallback = {};
    GATE_KEYS.forEach((key) => {
      fallback[key] = false;
    });
    applyGateState(fallback);
  }
}

function initAdminGates() {
  const panel = document.getElementById('admin-gates');
  if (!panel) return;

  const isAdmin = currentUser?.role === 'admin';
  panel.hidden = !isAdmin;
  if (!isAdmin) return;

  panel.querySelectorAll('[data-gate-toggle]').forEach((button) => {
    button.addEventListener('click', async () => {
      const gateKey = button.getAttribute('data-gate-toggle');
      const currentlyReleased = button.dataset.released === 'true';

      button.disabled = true;
      const previous = button.textContent;
      button.textContent = 'Atualizando...';
      try {
        const { gates } = await setLessonGate(currentToken, LESSON_ID, gateKey, !currentlyReleased);
        applyGateState(gates || {});
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Falha ao atualizar censura.';
        window.alert(message);
        button.textContent = previous;
      } finally {
        button.disabled = false;
      }
    });
  });
}

function initFeelLab() {
  const canvas = document.getElementById('feel-canvas');
  if (!canvas) return;

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

  const actor = { x: 80, y: GROUND_Y - 32, w: 26, h: 32, vx: 0, vy: 0, onGround: true };
  let prev = performance.now();

  function tick(now) {
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;

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

function initCompletion() {
  const button = document.getElementById('btn-complete-aula');
  const textarea = document.getElementById('gdd-text');
  const rewardEl = document.getElementById('reward-codes');
  const codeValue = document.getElementById('reward-code-value');
  const codeMeta = document.getElementById('reward-code-meta');
  if (!button || !textarea || !rewardEl || !codeValue || !codeMeta) return;

  setCompletionAvailability();

  button.addEventListener('click', async () => {
    const text = normalizeParagraph(textarea.value);
    if (!text || !paragraphSaved) {
      codeValue.textContent = 'Preencha e salve o parágrafo para solicitar o código.';
      codeMeta.textContent = '';
      rewardEl.hidden = false;
      setCompletionAvailability();
      return;
    }

    button.disabled = true;
    const previous = button.textContent;
    button.textContent = 'Consultando código...';

    rewardEl.hidden = false;
    codeValue.textContent = 'Carregando...';
    codeMeta.textContent = '';

    try {
      const { code } = await getLessonCode(currentToken, LESSON_ID);
      codeValue.textContent = code.code;
      codeMeta.textContent = `${code.lessonTitle} • +${code.xp} XP • válido por 20 minutos`;
    } catch (error) {
      codeValue.textContent = error instanceof ApiError ? error.message : 'Não foi possível obter o código agora.';
      codeMeta.textContent = 'Peça para um ADM gerar um novo código no Salão dos Heróis.';
    } finally {
      button.textContent = previous;
      setCompletionAvailability();
    }
  });
}

async function init() {
  initTabs();
  initSlidesViewer();

  const result = await requireSession();
  if (!result) return;

  currentUser = result.user;
  currentToken = getSession()?.token ?? null;

  initAdminGates();
  await loadGates();

  await initParagraphPersistence();
  initFeelLab();
  initCompletion();
}

init().catch((error) => {
  const message = error instanceof ApiError
    ? error.message
    : 'Falha ao inicializar a aula. Verifique se a API está ativa.';
  window.alert(message);
});
