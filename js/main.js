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
  detectAvatarCount,
  loadAvatarImage,
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
  // Mesma varredura dinâmica de assets/avatars/ usada no Salão dos
  // Heróis, disparada em paralelo com o guard de sessão.
  const avatarCountReady = detectAvatarCount();

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
  await avatarCountReady;
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
  const isAdmin = user.role === 'admin';
  setText('player-name', user.name.toUpperCase());
  setText('player-rank', isAdmin ? 'Mestre do Infinito' : rankForXp(user.xp));
  setText('player-level', isAdmin ? '∞' : String(levelForXp(user.xp)));
  setText('player-lessons', String(isAdmin ? LESSONS.length : user.completedLessons.length));
  setText('player-achievements', `${isAdmin ? ACHIEVEMENTS.length : user.achievements.length} / ${ACHIEVEMENTS.length}`);

  // Avatar escolhido no Salão dos Heróis
  const playerGlyph = document.getElementById('player-glyph');
  if (playerGlyph) loadAvatarImage(playerGlyph, user.avatarIndex);

  // Pele de Mestre: coroa + aura vermelha (CSS reage à classe)
  document.getElementById('player-panel')?.classList.toggle('is-admin', user.role === 'admin');

  // Barra de XP — JUICE: enche de 0 até o valor real, com transição CSS
  const fill = document.getElementById('player-xp-fill');
  const text = document.getElementById('player-xp-text');
  const bar = fill?.closest('.xp-bar');
  if (fill && text && bar) {
    if (isAdmin) {
      text.textContent = '∞ / ∞ XP';
      bar.setAttribute('aria-valuenow', String(LEVEL_XP_BASE));
      fill.style.width = '100%';
      return;
    }

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
  const list = document.querySelector('.stage-select__list');
  if (!list) return;

  list.innerHTML = '';
  if (LESSONS.length === 0) {
    const li = document.createElement('li');
    li.className = 'stage-empty';
    li.textContent = 'Nenhuma aula cadastrada ainda. Novos módulos serão adicionados em breve.';
    list.appendChild(li);
    return;
  }

  LESSONS.forEach((lesson, index) => {
    const completed = user.completedLessons.includes(lesson.id);

    const li = document.createElement('li');
    const card = document.createElement('button');
    card.type = 'button';
    card.className = ['stage-card', index === 0 ? 'stage-card--featured' : '', completed ? 'is-completed' : '']
      .filter(Boolean)
      .join(' ');
    card.dataset.stage = lesson.id;
    card.dataset.unlocked = 'true';

    const number = document.createElement('span');
    number.className = 'stage-card__number';
    number.textContent = lesson.number;

    const content = document.createElement('span');
    content.className = 'stage-card__content';

    const title = document.createElement('span');
    title.className = 'stage-card__title';
    title.textContent = lesson.title;

    const subtitle = document.createElement('span');
    subtitle.className = 'stage-card__subtitle';
    subtitle.textContent = lesson.subtitle;
    content.append(title, subtitle);

    const rewardWrap = document.createElement('span');
    rewardWrap.className = 'stage-card__reward';
    const reward = document.createElement('span');
    reward.className = 'stage-card__xp';
    reward.textContent = completed ? 'CONCLUÍDA' : `+${lesson.rewardXp} XP`;
    rewardWrap.appendChild(reward);

    card.append(number, content, rewardWrap);
    card.addEventListener('mouseenter', () => selectCard(card));
    card.addEventListener('mouseleave', () => deselectCard(card));
    card.addEventListener('click', () => enterStage(lesson.id));

    li.appendChild(card);
    list.appendChild(li);
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
    window.location.href = ROUTES.lesson(stageId);
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
