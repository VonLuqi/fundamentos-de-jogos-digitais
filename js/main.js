/**
 * ============================================================
 * FUNDAMENTOS DE JOGOS DIGITAIS — Menu Principal (Game UI)
 * ============================================================
 * Lógica de interação da tela de seleção de módulos:
 *  - Gerenciamento de foco/seleção dos cards de aulas.
 *  - Simulação de "entrada na fase" (fade de tela + log).
 *  - Futuro: navegação por teclado (↑ ↓ Enter ESC) e persistência.
 * ============================================================
 */

'use strict';

/* ---------- Configurações ---------- */
const APP_VERSION = '0.2.0';
const APP_NAME = 'FUNDAMENTOS.DE.JOGOS.DIGITAIS';
const FADE_DURATION = 400; // ms — casar com o CSS .screen-fade transition

/* ---------- Estado em memória (stub para futura persistência) ---------- */
const gameState = {
  currentLevel: 1,
  totalXp: 0,
  completedLessons: 0,
  unlockedStages: ['aula-1'],
};

/**
 * Inicialização da UI.
 */
function init() {
  logBoot();
  setupStageCards();
  setupScreenFade();
  renderPlayerStats(); // stub — futura leitura de localStorage/API
}

/**
 * Log estilizado no console.
 */
function logBoot() {
  const ts = new Date().toISOString();
  console.info(
    `%c[${APP_NAME}]%c v${APP_VERSION} — Menu inicializado em ${ts}`,
    'color: #a855f7; font-weight: bold;',
    'color: #22d3ee;'
  );
}

/**
 * Adiciona listeners de foco/hover e clique nos cards de fase.
 */
function setupStageCards() {
  const cards = document.querySelectorAll('.stage-card');

  cards.forEach((card) => {
    const isUnlocked = card.dataset.unlocked === 'true';

    // Previne qualquer interação em cards bloqueados (defesa extra,
    // embora o atributo `disabled` já impeça o clique nativo).
    if (!isUnlocked) {
      card.addEventListener('click', (event) => event.preventDefault());
      return;
    }

    // Foco visual ao passar o mouse
    card.addEventListener('mouseenter', () => {
      selectCard(card);
    });

    // Remove foco quando o mouse sai
    card.addEventListener('mouseleave', () => {
      deselectCard(card);
    });

    // Ação de clique: "entrar na fase"
    card.addEventListener('click', () => {
      const stageId = card.dataset.stage;
      enterStage(stageId);
    });
  });
}

/**
 * Aplica estado visual de seleção a um card.
 * @param {HTMLElement} card
 */
function selectCard(card) {
  card.classList.add('is-selected');
  card.setAttribute('aria-pressed', 'true');
}

/**
 * Remove estado visual de seleção de um card.
 * @param {HTMLElement} card
 */
function deselectCard(card) {
  card.classList.remove('is-selected');
  card.setAttribute('aria-pressed', 'false');
}

/**
 * Simula a transição de entrada na fase.
 * @param {string} stageId
 */
function enterStage(stageId) {
  console.log(`Carregando ${stageId}...`);

  // Feedback visual: ativa fade de tela
  const fade = document.querySelector('.screen-fade');
  fade.classList.add('is-active');

  // Em produção, aqui faríamos:
  //   await router.push(`./pages/${stageId}.html`);
  // Por enquanto, apenas simulamos e revertemos o fade.
  window.setTimeout(() => {
    fade.classList.remove('is-active');
    console.log(`${stageId} — transição concluída (stub).`);
  }, FADE_DURATION);
}

/**
 * Referencia o elemento de fade para garantir que ele exista.
 * (Método separado para facilitar testes unitários futuros.)
 */
function setupScreenFade() {
  const fade = document.querySelector('.screen-fade');
  if (!fade) {
    console.warn('Elemento .screen-fade não encontrado no DOM.');
  }
}

/**
 * Renderiza os dados do jogador no painel esquerdo.
 * Stub visual — futuramente conectado a storage/API.
 */
function renderPlayerStats() {
  // Atualiza barra de XP (0/20 por enquanto)
  const xpBarFill = document.querySelector('.xp-bar__fill');
  const xpBarText = document.querySelector('.xp-bar__text');
  const xpBar = document.querySelector('.xp-bar');

  if (xpBarFill && xpBarText && xpBar) {
    const xpMax = 20;
    const percentage = Math.min((gameState.totalXp / xpMax) * 100, 100);

    xpBarFill.style.width = `${percentage}%`;
    xpBarText.textContent = `${gameState.totalXp} / ${xpMax} XP`;
    xpBar.setAttribute('aria-valuenow', String(gameState.totalXp));
  }

  // Futuro: atualizar nível, aulas concluídas, conquistas, etc.
  // document.querySelector('.player-stats__level-value').textContent = gameState.currentLevel;
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', init);
