/**
 * ============================================================
 * AULA 1 — A Regra do Jogo (Unplugged)
 * ============================================================
 * Este arquivo contém duas responsabilidades independentes:
 *
 * 1. TABS       → Alterna entre "Teoria e Manuais" e "Simulação".
 * 2. SIMULAÇÃO  → Um labirinto com Máquina de Estados, colisão
 *                 AABB e perseguição (Robô vs Monstro), escrito
 *                 100% com a API NATIVA do HTML5 Canvas.
 *
 * IMPORTANTE: Nenhuma biblioteca externa é utilizada aqui.
 * Usamos apenas `CanvasRenderingContext2D` + `requestAnimationFrame`,
 * garantindo que a simulação funcione em qualquer navegador moderno.
 * ============================================================
 */

'use strict';

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
   2. SIMULAÇÃO — LABIRINTO, ESTADOS E COLISÃO (Canvas API nativo)
   ============================================================ */
function initSimulation() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.warn('[AULA-1] #game-canvas não encontrado no DOM.');
    return;
  }

  const ctx = canvas.getContext('2d');
  const WORLD_WIDTH = canvas.width;   // 600 — definido no HTML
  const WORLD_HEIGHT = canvas.height; // 400 — definido no HTML

  /* ==========================================================
     2.1 MÁQUINA DE ESTADOS
     ==========================================================
     Todo jogo é, no fundo, uma máquina de estados: a cada
     instante, o sistema só pode estar em UM estado, e cada
     estado tem suas próprias regras de desenho e atualização.
     Isso evita, por exemplo, que o jogador se mova durante a
     contagem regressiva ou antes de clicar para iniciar.
  ========================================================== */
  const GameState = {
    START_SCREEN: 'START_SCREEN', // Aguardando o clique inicial
    COUNTDOWN: 'COUNTDOWN',       // Contagem 3, 2, 1...
    PLAYING: 'PLAYING',           // Loop de jogo ativo
    CAUGHT: 'CAUGHT',             // Monstro alcançou o Robô
  };

  let currentState = GameState.START_SCREEN;

  // Guarda o instante (timestamp) em que a contagem regressiva
  // começou, para calcularmos quanto tempo já passou a cada frame.
  const COUNTDOWN_DURATION_MS = 3000; // 3 segundos, conforme pedido
  let countdownStartedAt = 0;

  /* ==========================================================
     2.2 MECÂNICA — O LABIRINTO (paredes/obstáculos)
     ==========================================================
     Cada parede é um retângulo {x, y, width, height}. Juntas,
     elas formam corredores com GARGALOS (passagens estreitas)
     e ROTAS DE FUGA alternativas — exatamente o conceito
     apresentado na Aba "Teoria" desta aula.
  ========================================================== */
  const WALL_COLOR = '#3a2a2c';        // grafite/vermelho-escuro (combina com a estética Hades)
  const WALL_BORDER_COLOR = '#7a5c2e'; // fio dourado sutil, para leitura visual das bordas

  const maze = [
    // Parede A (segmento superior) — força o jogador a descer.
    { x: 250, y: 0, width: 24, height: 150 },
    // Parede B (segmento inferior) — entre A e B existe um
    // GARGALO de 80px (de y=150 a y=230): a única passagem
    // central entre a metade esquerda e a direita do mapa.
    { x: 250, y: 230, width: 24, height: 170 },
    // Parede C — cria uma ROTA DE FUGA alternativa: sua abertura
    // fica no topo (y=0 a y=100), mais longa, porém mais segura.
    { x: 400, y: 100, width: 24, height: 300 },
    // Parede D — obstáculo curto próximo ao início, obriga um
    // pequeno desvio logo na largada.
    { x: 90, y: 300, width: 160, height: 24 },
  ];

  /* ==========================================================
     2.3 MECÂNICA — Velocidades (drasticamente reduzidas)
     ==========================================================
     Em um labirinto, velocidade alta = colisões imprevisíveis.
     Por isso, usamos poucos pixels por frame: o jogador ganha
     precisão para "usar as paredes a seu favor".
  ========================================================== */
  const PLAYER_SPEED = 2.5;                 // 2 a 3 px/frame, conforme solicitado
  const ENEMY_SPEED = PLAYER_SPEED * 0.85;  // MECÂNICA: 15% mais lento que o jogador

  const PLAYER_SIZE = 22; // usamos caixas quadradas para simplificar a colisão AABB
  const ENEMY_SIZE = 26;

  /* ==========================================================
     2.4 ESTADO DOS ATUANTES
     ========================================================== */
  // getInitialPlayerState/getInitialEnemyState permitem "reiniciar"
  // a simulação após o jogador ser capturado (estado CAUGHT).
  function getInitialPlayerState() {
    return { x: 40, y: 40, size: PLAYER_SIZE };
  }
  function getInitialEnemyState() {
    return { x: WORLD_WIDTH - 60, y: WORLD_HEIGHT - 60, size: ENEMY_SIZE };
  }

  let player = getInitialPlayerState();
  let enemy = getInitialEnemyState();

  /* ==========================================================
     2.5 INPUT — Estado das setas do teclado
     ========================================================== */
  const keysPressed = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  };

  window.addEventListener('keydown', (event) => {
    if (event.key in keysPressed) {
      keysPressed[event.key] = true;
      event.preventDefault(); // evita rolar a página com as setas
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.key in keysPressed) {
      keysPressed[event.key] = false;
    }
  });

  // Clique no canvas: avança a máquina de estados.
  canvas.addEventListener('click', () => {
    if (currentState === GameState.START_SCREEN) {
      countdownStartedAt = performance.now();
      currentState = GameState.COUNTDOWN;
    } else if (currentState === GameState.CAUGHT) {
      // Reinicia posições e volta para a tela inicial.
      player = getInitialPlayerState();
      enemy = getInitialEnemyState();
      currentState = GameState.START_SCREEN;
    }
  });

  /* ==========================================================
     2.6 COLISÃO — AABB (Axis-Aligned Bounding Box)
     ==========================================================
     Duas caixas (retângulos sem rotação) colidem quando NÃO
     existe espaço entre elas em nenhum dos dois eixos (X e Y).
     Esta é a verificação matemática mais simples e eficiente
     para jogos 2D com grades/labirintos.
  ========================================================== */
  function isCollidingAABB(boxA, boxB) {
    return (
      boxA.x < boxB.x + boxB.width &&
      boxA.x + boxA.width > boxB.x &&
      boxA.y < boxB.y + boxB.height &&
      boxA.y + boxA.height > boxB.y
    );
  }

  /** Converte um atuante {x, y, size} em uma caixa AABB {x, y, width, height}. */
  function toBoundingBox(actor) {
    return { x: actor.x, y: actor.y, width: actor.size, height: actor.size };
  }

  /** Verifica se uma caixa colide com QUALQUER parede do labirinto. */
  function collidesWithMaze(box) {
    return maze.some((wall) => isCollidingAABB(box, wall));
  }

  /**
   * Move um atuante respeitando as paredes do labirinto.
   * MECÂNICA: a movimentação é resolvida EIXO POR EIXO (X, depois Y).
   * Isso permite que o atuante "deslize" ao longo de uma parede em
   * vez de travar por completo — mas quando o caminho direto está
   * bloqueado nos dois eixos, ele efetivamente FICA PRESO na parede.
   * É exatamente esse comportamento que força o Monstro a contornar
   * obstáculos de forma imperfeita, abrindo brechas para o jogador.
   */
  function moveWithCollision(actor, deltaX, deltaY) {
    // Tenta mover no eixo X.
    const boxAfterX = { x: actor.x + deltaX, y: actor.y, width: actor.size, height: actor.size };
    if (!collidesWithMaze(boxAfterX)) {
      actor.x += deltaX;
    }

    // Tenta mover no eixo Y (a partir da posição X já resolvida).
    const boxAfterY = { x: actor.x, y: actor.y + deltaY, width: actor.size, height: actor.size };
    if (!collidesWithMaze(boxAfterY)) {
      actor.y += deltaY;
    }
  }

  /** Restringe um valor entre um mínimo e um máximo (limites do canvas). */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /* ==========================================================
     2.7 ATUALIZAÇÃO — JOGADOR
     ==========================================================
     MECÂNICA: cada tecla pressionada aplica um deslocamento fixo
     (PLAYER_SPEED) por frame. A colisão com o labirinto é resolvida
     por moveWithCollision().
  ========================================================== */
  function updatePlayer() {
    let deltaX = 0;
    let deltaY = 0;

    if (keysPressed.ArrowUp) deltaY -= PLAYER_SPEED;
    if (keysPressed.ArrowDown) deltaY += PLAYER_SPEED;
    if (keysPressed.ArrowLeft) deltaX -= PLAYER_SPEED;
    if (keysPressed.ArrowRight) deltaX += PLAYER_SPEED;

    moveWithCollision(player, deltaX, deltaY);

    // Restrição de espaço: paredes invisíveis nas bordas do canvas.
    player.x = clamp(player.x, 0, WORLD_WIDTH - player.size);
    player.y = clamp(player.y, 0, WORLD_HEIGHT - player.size);
  }

  /* ==========================================================
     2.8 ATUALIZAÇÃO — MONSTRO (perseguição linear)
     ==========================================================
     DINÂMICA: o Monstro persegue o jogador na linha reta mais
     curta possível. Sem um algoritmo de pathfinding (fora do
     escopo de JS puro sem bibliotecas), ele simplesmente tenta
     seguir o vetor direção → e, ao colidir com uma parede nesse
     eixo, moveWithCollision() bloqueia aquele movimento.
     Resultado emergente: o Monstro "trava" contra obstáculos,
     dando ao jogador a janela de tempo necessária para escapar
     pelos gargalos ou pela rota de fuga alternativa.
  ========================================================== */
  function updateEnemy() {
    const centerPlayerX = player.x + player.size / 2;
    const centerPlayerY = player.y + player.size / 2;
    const centerEnemyX = enemy.x + enemy.size / 2;
    const centerEnemyY = enemy.y + enemy.size / 2;

    const directionX = centerPlayerX - centerEnemyX;
    const directionY = centerPlayerY - centerEnemyY;
    const distance = Math.hypot(directionX, directionY);

    let deltaX = 0;
    let deltaY = 0;
    if (distance > 0.5) {
      deltaX = (directionX / distance) * ENEMY_SPEED;
      deltaY = (directionY / distance) * ENEMY_SPEED;
    }

    moveWithCollision(enemy, deltaX, deltaY);

    enemy.x = clamp(enemy.x, 0, WORLD_WIDTH - enemy.size);
    enemy.y = clamp(enemy.y, 0, WORLD_HEIGHT - enemy.size);
  }

  /** Verifica se o Monstro alcançou o Robô (fim de jogo). */
  function checkCapture() {
    if (isCollidingAABB(toBoundingBox(player), toBoundingBox(enemy))) {
      currentState = GameState.CAUGHT;
    }
  }

  /* ==========================================================
     2.9 DESENHO — Elementos reutilizáveis
     ========================================================== */
  function drawMazeBackground() {
    ctx.fillStyle = '#0d0a10';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Grade sutil, remetendo ao "papel quadriculado" do exercício unplugged.
    ctx.strokeStyle = 'rgba(207, 167, 89, 0.06)';
    ctx.lineWidth = 1;
    const GRID_SIZE = 40;
    for (let x = 0; x <= WORLD_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
      ctx.stroke();
    }
  }

  function drawMazeWalls() {
    maze.forEach((wall) => {
      ctx.fillStyle = WALL_COLOR;
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeStyle = WALL_BORDER_COLOR;
      ctx.lineWidth = 1;
      ctx.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.width - 1, wall.height - 1);
    });
  }

  function drawPlayer() {
    ctx.save();
    ctx.shadowColor = '#3fd0ff';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#3fd0ff';
    ctx.fillRect(player.x, player.y, player.size, player.size);
    ctx.restore();
  }

  function drawEnemy() {
    ctx.save();
    ctx.shadowColor = '#c23548';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#c23548';
    ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
    ctx.restore();
  }

  /** Texto centralizado, com fonte temática e brilho dourado. */
  function drawCenteredText(text, sizePx, color, glowColor, yOffset = 0) {
    ctx.save();
    ctx.font = `${sizePx}px "Cinzel", serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.fillText(text, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + yOffset);
    ctx.restore();
  }

  /* ==========================================================
     2.10 DESENHO — Uma função de render por ESTADO
     ========================================================== */
  function renderStartScreen() {
    drawMazeBackground();
    drawMazeWalls();
    drawPlayer();
    drawEnemy();

    // Camada escura semitransparente para destacar o texto do menu.
    ctx.fillStyle = 'rgba(10, 8, 7, 0.55)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawCenteredText('Clique na tela para iniciar', 22, '#f2d59a', 'rgba(207, 167, 89, 0.7)');
  }

  function renderCountdown(now) {
    drawMazeBackground();
    drawMazeWalls();
    drawPlayer();
    drawEnemy();

    ctx.fillStyle = 'rgba(10, 8, 7, 0.5)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const elapsedMs = now - countdownStartedAt;
    const remainingSeconds = Math.ceil((COUNTDOWN_DURATION_MS - elapsedMs) / 1000);

    if (remainingSeconds <= 0) {
      // 3 segundos se esgotaram: inicia o jogo.
      currentState = GameState.PLAYING;
      return;
    }

    drawCenteredText(String(remainingSeconds), 64, '#f2d59a', 'rgba(194, 53, 72, 0.75)');
  }

  function renderPlaying() {
    updatePlayer();
    updateEnemy();
    checkCapture();

    drawMazeBackground();
    drawMazeWalls();
    drawPlayer();
    drawEnemy();
  }

  function renderCaught() {
    drawMazeBackground();
    drawMazeWalls();
    drawPlayer();
    drawEnemy();

    ctx.fillStyle = 'rgba(92, 20, 29, 0.55)'; // véu vermelho-sangue translúcido
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawCenteredText('Você foi capturado!', 26, '#f2d59a', 'rgba(194, 53, 72, 0.85)', -14);
    drawCenteredText('Clique para reiniciar', 18, '#ece1d1', 'rgba(207, 167, 89, 0.6)', 20);
  }

  /* ==========================================================
     2.11 LOOP PRINCIPAL
     ==========================================================
     Um único `requestAnimationFrame` roda para sempre; a cada
     frame, delegamos o desenho/atualização para a função
     correspondente ao estado atual da Máquina de Estados.
  ========================================================== */
  function gameLoop(now) {
    switch (currentState) {
      case GameState.START_SCREEN:
        renderStartScreen();
        break;
      case GameState.COUNTDOWN:
        renderCountdown(now);
        break;
      case GameState.PLAYING:
        renderPlaying();
        break;
      case GameState.CAUGHT:
        renderCaught();
        break;
      default:
        break;
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  console.info(
    '%c[SIMULAÇÃO]%c Labirinto iniciado — Robô: %spx/frame | Monstro: %spx/frame (15%% mais lento)',
    'color: #cfa759; font-weight: bold;',
    'color: #ab9c8a;',
    PLAYER_SPEED,
    ENEMY_SPEED.toFixed(2)
  );
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSimulation();
});
