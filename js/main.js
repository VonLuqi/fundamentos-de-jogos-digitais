/**
 * ============================================================
 * FUNDAMENTOS DE JOGOS DIGITAIS — Menu Principal (Game UI)
 * ============================================================
 * Agora conectado ao backend serverless:
 *  - Exige sessão ativa (senão redireciona ao Pacto de Sangue).
 *  - Renderiza o Painel Esquerdo dinamicamente (nome, avatar,
 *    rank, XP, aulas concluídas e conquistas) com dados da API.
 *  - Destrava os cards de aula conforme o progresso REAL do aluno.
 *  - Aplica a "pele de Mestre" (coroa + aura) quando role=admin.
 * ============================================================
 */

'use strict';

import {
  AVATAR_GLYPHS,
  ACHIEVEMENTS,
  LESSONS,
  LEVEL_XP_BASE,
  ROUTES,
  ApiError,
  requireSession,
  logout,
  rankForXp,
  levelForXp,
  xpWithinLevel,
} from './api.js';

/* ---------- Configurações ---------- */
const APP_VERSION = '0.4.0';
const APP_NAME = 'FUNDAMENTOS.DE.JOGOS.DIGITAIS';
const FADE_DURATION = 400; // ms — casar com o CSS .screen-fade transition

/* ---------- Estado da sessão ---------- */
let currentUser = null;

/* ============================================================
   1. BOOT
   ============================================================ */
async function init() {
  logBoot();
  setupScreenFade();
  setupFooterNav();

  let result;
  try {
    // Guard de rota: sem sessão válida → Pacto de Sangue.
    result = await requireSession();
  } catch (error) {
    // API fora do ar: mostra aviso no painel em vez de travar a tela.
    renderPanelError(
      error instanceof ApiError
        ? error.message
        : 'A API não respondeu. Rode `vercel dev` localmente ou publique no Vercel.'
    );
    return;
  }

  if (!result) return; // requireSession já redirecionou

  currentUser = result.user;
  renderPlayerPanel(currentUser);
  renderStageCards(currentUser);
}

function logBoot() {
  console.info(
    `%c[${APP_NAME}]%c v${APP_VERSION} — Menu inicializado`,
    'color: #cfa759; font-weight: bold;',
    'color: #ab9c8a;'
  );
}

/* ============================================================
   2. PAINEL ESQUERDO DINÂMICO
   ============================================================ */
function renderPlayerPanel(user) {
  setText('player-name', user.name.toUpperCase());
  setText('player-rank', rankForXp(user.xp));
  setText('player-level', String(levelForXp(user.xp)));
  setText('player-lessons', String(user.completedLessons.length));
  setText('player-achievements', `${user.achievements.length} / ${ACHIEVEMENTS.length}`);

  // Avatar escolhido no Salão dos Heróis
  setText('player-glyph', AVATAR_GLYPHS[user.avatarIndex % AVATAR_GLYPHS.length]);

  // Pele de Mestre: coroa + aura vermelha (CSS reage à classe)
  document.getElementById('player-panel')?.classList.toggle('is-admin', user.role === 'admin');

  // Barra de XP — JUICE: enche de 0 até o valor real, com transição CSS
  const fill = document.getElementById('player-xp-fill');
  const text = document.getElementById('player-xp-text');
  const bar = fill?.closest('.xp-bar');
  if (fill && text && bar) {
    const xpInLevel = xpWithinLevel(user.xp);
    const percent = Math.min((xpInLevel / LEVEL_XP_BASE) * 100, 100);

    text.textContent = `${xpInLevel} / ${LEVEL_XP_BASE} XP`;
    bar.setAttribute('aria-valuenow', String(xpInLevel));

    window.setTimeout(() => {
      fill.style.width = `${percent}%`;
    }, 200);
  }
}

function renderPanelError(message) {
  setText('player-name', 'SEM CONEXÃO');
  setText('player-rank', message);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ============================================================
   3. CARDS DE AULA — destravados pelo progresso REAL
   ============================================================ */
function renderStageCards(user) {
  const cards = document.querySelectorAll('.stage-card');

  cards.forEach((card, index) => {
    const lesson = LESSONS[index];
    if (!lesson) return;

    const completed = user.completedLessons.includes(lesson.id);
    const previousDone = index === 0 || user.completedLessons.includes(LESSONS[index - 1].id);
    const unlocked = completed || previousDone;

    card.dataset.unlocked = String(unlocked);
    card.disabled = !unlocked;
    card.dataset.stage = lesson.id;

    // Marca visualmente a aula já concluída
    card.classList.toggle('is-completed', completed);

    const reward = card.querySelector('.stage-card__xp');
    if (reward) {
      reward.textContent = completed ? 'CONCLUÍDA' : `+${lesson.rewardXp} XP`;
    }

    if (unlocked) {
      card.addEventListener('mouseenter', () => selectCard(card));
      card.addEventListener('mouseleave', () => deselectCard(card));
      card.addEventListener('click', () => enterStage(lesson.id));
    }
  });
}

function selectCard(card) {
  card.classList.add('is-selected');
  card.setAttribute('aria-pressed', 'true');
}

function deselectCard(card) {
  card.classList.remove('is-selected');
  card.setAttribute('aria-pressed', 'false');
}

/** Transição de entrada na fase (fade de tela + navegação). */
function enterStage(stageId) {
  const fade = document.querySelector('.screen-fade');
  fade?.classList.add('is-active');

  window.setTimeout(() => {
    window.location.href = ROUTES.lesson(stageId === 'aula1' ? 'aula1' : 'aula1');
  }, FADE_DURATION);
}

function setupScreenFade() {
  if (!document.querySelector('.screen-fade')) {
    console.warn('Elemento .screen-fade não encontrado no DOM.');
  }
}

/* ============================================================
   4. RODAPÉ — navegação e atalhos
   ============================================================ */
function setupFooterNav() {
  document.querySelectorAll('.controls-bar__btn[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action));
  });

  window.addEventListener('keydown', (event) => {
    // Ignora atalhos enquanto o usuário digita em algum campo.
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const key = event.key.toLowerCase();
    if (key === 'p') handleAction('dashboard');
    else if (key === 'l') handleAction('logout');
  });
}

async function handleAction(action) {
  if (action === 'dashboard') {
    window.location.href = ROUTES.dashboard();
  } else if (action === 'logout') {
    await logout();
    window.location.href = ROUTES.auth();
  }
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', init);
