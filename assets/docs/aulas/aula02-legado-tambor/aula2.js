/**
 * ============================================================
 * AULA 2 ÔÇö Loops e Ritmo (Tambor do Estige)
 * ============================================================
 * Este arquivo cont├®m duas responsabilidades independentes:
 *
 * 1. TABS      ÔåÆ Alterna entre "Teoria e Manuais" e "Simula├º├úo".
 * 2. MINIGAME  ÔåÆ Um marcador percorre uma trilha CIRCULAR em loop
 *                constante. O jogador deve confirmar o ritmo
 *                (clique ou tecla Espa├ºo) exatamente quando o
 *                marcador cruza a zona-alvo. Cada acerto reduz a
 *                janela de toler├óncia da rodada seguinte ÔÇö 100%
 *                em Canvas API nativo, sem depend├¬ncias externas.
 *
 * Ao completar o desafio (5 acertos seguidos), os c├│digos de
 * resgate LOOP2026 e RITMO2026 s├úo revelados na tela. O jogador
 * ainda precisa deposit├í-los manualmente no Altar do Sal├úo dos
 * Her├│is ÔÇö o XP e a conquista continuam sendo concedidos apenas
 * pelo servidor (server-authoritative), nunca pelo cliente.
 * ============================================================ */

'use strict';

import { initAppShell } from './app-shell.js';
import { requireSession, getLessonCode, ROUTES, logout } from './api.js';

let currentToken = null;

/* ============================================================
   1. SISTEMA DE ABAS (TABS)
   ============================================================ */
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;

      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      panels.forEach((panel) => panel.classList.remove('is-active'));
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('is-active');
      }
    });
  });
}

/* ============================================================
   2. MINIGAME ÔÇö TAMBOR DO ESTIGE (Canvas nativo)
   ============================================================ */
function initSimulation() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.warn('[AULA-2] #game-canvas n├úo encontrado no DOM.');
    return;
  }

  const ctx = canvas.getContext('2d');
  const WORLD_WIDTH = canvas.width;   // 600
  const WORLD_HEIGHT = canvas.height; // 400
  const CENTER_X = WORLD_WIDTH / 2;
  const CENTER_Y = WORLD_HEIGHT / 2;
  const TRACK_RADIUS = 140;
  const MARKER_RADIUS = 10;

  /* ==========================================================
     2.1 CONFIGURA├ç├âO DO LOOP R├ìTMICO
  ========================================================== */
  const REQUIRED_HITS = 5;
  const BASE_TOLERANCE_RAD = 0.42; // janela inicial (larga, acess├¡vel)
  const MIN_TOLERANCE_RAD = 0.14;  // janela m├¡nima (estreita, exige maestria)
  const TOLERANCE_STEP = (BASE_TOLERANCE_RAD - MIN_TOLERANCE_RAD) / REQUIRED_HITS;
  const ANGULAR_SPEED = 1.6; // radianos por segundo

  // A zona-alvo fica fixa no topo da trilha (├óngulo -PI/2).
  const TARGET_ANGLE = -Math.PI / 2;

  let markerAngle = 0;
  let toleranceRad = BASE_TOLERANCE_RAD;
  let hitsInRow = 0;
  let challengeComplete = false;
  let feedbackMessage = '';
  let feedbackKind = 'info'; // 'info' | 'success' | 'error'
  let feedbackUntil = 0;
  let lastTimestamp = null;

  /* ==========================================================
     2.2 UTILIT├üRIOS ANGULARES
  ========================================================== */
  function normalizeAngle(angle) {
    const twoPi = Math.PI * 2;
    let a = angle % twoPi;
    if (a < 0) a += twoPi;
    return a;
  }

  function angularDistance(a, b) {
    const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
    return Math.min(diff, Math.PI * 2 - diff);
  }

  /* ==========================================================
     2.3 CONFIRMA├ç├âO DE RITMO (clique ou tecla Espa├ºo)
  ========================================================== */
  function attemptBeat() {
    if (challengeComplete) return;

    const distance = angularDistance(markerAngle, TARGET_ANGLE);

    if (distance <= toleranceRad) {
      hitsInRow += 1;
      toleranceRad = Math.max(MIN_TOLERANCE_RAD, toleranceRad - TOLERANCE_STEP);
      setFeedback(`Acerto! (${hitsInRow}/${REQUIRED_HITS})`, 'success');

      if (hitsInRow >= REQUIRED_HITS) {
        challengeComplete = true;
        setFeedback('Loop dominado! C├│digos revelados abaixo.', 'success');
        revealRewardCodes();
      }
    } else {
      hitsInRow = 0;
      toleranceRad = BASE_TOLERANCE_RAD;
      setFeedback('Fora do ritmo. Sequ├¬ncia reiniciada.', 'error');
    }
  }

  function setFeedback(message, kind) {
    feedbackMessage = message;
    feedbackKind = kind;
    feedbackUntil = performance.now() + 1400;
  }

  async function revealRewardCodes() {
    const rewardEl = document.getElementById('reward-codes');
    const codeValue = document.getElementById('reward-code-value');
    const codeMeta = document.getElementById('reward-code-meta');
    if (!rewardEl || !codeValue || !codeMeta) return;

    rewardEl.hidden = false;
    codeValue.textContent = 'Carregando...';
    codeMeta.textContent = '';

    if (!currentToken) {
      codeValue.textContent = 'Sess├úo n├úo encontrada.';
      return;
    }

    try {
      const { code } = await getLessonCode(currentToken, 'aula2');
      codeValue.textContent = code.code;
      codeMeta.textContent = `${code.lessonTitle} ÔÇó +${code.xp} XP ÔÇó v├ílido por 20 min`;
    } catch (error) {
      codeValue.textContent = 'Nenhum c├│digo ativo para esta aula.';
      codeMeta.textContent = 'Pe├ºa para um admin gerar no Sal├úo dos Her├│is.';
    }
  }

  /* ==========================================================
     2.4 LOOP DE ATUALIZA├ç├âO E RENDERIZA├ç├âO
  ========================================================== */
  function update(deltaSeconds) {
    if (challengeComplete) return;
    markerAngle = normalizeAngle(markerAngle + ANGULAR_SPEED * deltaSeconds);
  }

  function render() {
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Fundo
    ctx.fillStyle = '#0d0a10';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Trilha circular
    ctx.strokeStyle = '#3a2e22';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, TRACK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Zona-alvo (arco dourado ao redor do TARGET_ANGLE, largura = toler├óncia atual)
    ctx.strokeStyle = challengeComplete ? '#f2d59a' : '#cfa759';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, TRACK_RADIUS, TARGET_ANGLE - toleranceRad, TARGET_ANGLE + toleranceRad);
    ctx.stroke();

    // Marcador (posi├º├úo atual no loop)
    const markerX = CENTER_X + Math.cos(markerAngle) * TRACK_RADIUS;
    const markerY = CENTER_Y + Math.sin(markerAngle) * TRACK_RADIUS;
    ctx.fillStyle = '#c23548';
    ctx.beginPath();
    ctx.arc(markerX, markerY, MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Centro: contador de acertos
    ctx.fillStyle = '#ece1d1';
    ctx.font = '600 20px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${hitsInRow} / ${REQUIRED_HITS}`, CENTER_X, CENTER_Y);

    // Feedback textual tempor├írio
    if (feedbackMessage && performance.now() < feedbackUntil) {
      ctx.font = '600 16px "Crimson Text", serif';
      ctx.fillStyle =
        feedbackKind === 'success' ? '#8fd694' : feedbackKind === 'error' ? '#c23548' : '#ece1d1';
      ctx.fillText(feedbackMessage, CENTER_X, WORLD_HEIGHT - 24);
    }

    // Instru├º├úo inicial
    if (!challengeComplete && hitsInRow === 0 && performance.now() >= feedbackUntil) {
      ctx.font = '16px "Crimson Text", serif';
      ctx.fillStyle = '#ab9c8a';
      ctx.fillText('Clique ou pressione Espa├ºo no ritmo certo', CENTER_X, WORLD_HEIGHT - 24);
    }
  }

  function loop(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    update(deltaSeconds);
    render();

    requestAnimationFrame(loop);
  }

  /* ==========================================================
     2.5 ENTRADA DO JOGADOR
  ========================================================== */
  canvas.addEventListener('click', attemptBeat);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      attemptBeat();
    }
  });

  requestAnimationFrame(loop);
}

/* ============================================================
   3. BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  (async function boot() {
    initTabs();

    let result;
    try {
      result = await requireSession();
    } catch {
      window.location.replace(ROUTES.dashboard());
      return;
    }

    if (!result) return;
    initAppShell({
      route: 'aula2',
      role: result.user?.role === 'admin' ? 'admin' : 'student',
      onLogout: async () => {
        await logout();
        window.location.href = ROUTES.auth();
      },
    });
    currentToken = result.session?.token ?? null;
    const { initFromNoteBanner } = await import('./grimorio-from-note.js');
    initFromNoteBanner({ token: currentToken || result.token });
    initSimulation();
  })();
});
