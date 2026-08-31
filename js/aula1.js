/**
 * ============================================================
 * AULA 1 — A Regra do Jogo (Unplugged)
 * ============================================================
 * Este arquivo contém duas responsabilidades independentes:
 *
 * 1. TABS       → Alterna entre "Teoria e Manuais" e "Simulação".
 * 2. SIMULAÇÃO  → Um mini-jogo de perseguição (Robô vs Monstro)
 *                 escrito com a API NATIVA do HTML5 Canvas.
 *
 * IMPORTANTE: Nenhuma biblioteca externa é utilizada aqui.
 * A versão anterior dependia de uma engine de jogos via CDN, que
 * podia falhar ao carregar (erro de rede, CORS, versão incompatível).
 * Usando apenas `CanvasRenderingContext2D` + `requestAnimationFrame`,
 * garantimos que a simulação funcione em qualquer navegador moderno,
 * sem depender de nada além do próprio HTML5.
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

      // Atualiza o estado visual (dourado ativo vs escurecido inativo)
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      // Mostra apenas o painel correspondente
      panels.forEach((panel) => panel.classList.remove('is-active'));
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('is-active');
      }
    });
  });
}

/* ============================================================
   2. SIMULAÇÃO — CANVAS API NATIVO (JavaScript puro)
   ============================================================ */
function initSimulation() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.warn('[AULA-1] #game-canvas não encontrado no DOM.');
    return;
  }

  // Contexto 2D: nossa "caneta" para desenhar no canvas.
  const ctx = canvas.getContext('2d');
  const WORLD_WIDTH = canvas.width;   // 600 — definido no HTML
  const WORLD_HEIGHT = canvas.height; // 400 — definido no HTML

  // ------------------------------------------------------------
  // 2.1 MECÂNICA — As regras fixas do sistema.
  // ------------------------------------------------------------
  // Estas constantes SÃO a mecânica: números que qualquer jogador
  // pode aprender e prever. Alterá-las muda toda a sensação do jogo.
  const PLAYER_SPEED = 4;               // pixels por frame (Robô)
  const ENEMY_SPEED = PLAYER_SPEED * 0.9; // MECÂNICA: 10% mais lento que o jogador

  const PLAYER_RADIUS = 14;   // Robô: círculo azul/ciano
  const ENEMY_SIZE = 30;      // Monstro: quadrado vermelho

  // ------------------------------------------------------------
  // 2.2 ESTADO DOS ATUANTES (posições iniciais)
  // ------------------------------------------------------------
  const player = {
    x: 80,
    y: WORLD_HEIGHT / 2,
    radius: PLAYER_RADIUS,
  };

  const enemy = {
    x: WORLD_WIDTH - 80,
    y: WORLD_HEIGHT / 2,
    size: ENEMY_SIZE,
  };

  // ------------------------------------------------------------
  // 2.3 INPUT — Estado das setas do teclado
  // ------------------------------------------------------------
  // Guardamos "true/false" para cada tecla em vez de mover o jogador
  // direto no evento. Isso garante movimento fluido e contínuo,
  // em vez de um "passo" único por tecla pressionada.
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

  /**
   * Restringe um valor entre um mínimo e um máximo.
   * MECÂNICA: representa as "paredes invisíveis" do mapa —
   * uma restrição de espaço, exatamente como descrito na Aba 1.
   */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Atualiza a posição do Robô com base nas teclas pressionadas.
   * MECÂNICA: cada tecla aplica um deslocamento fixo (PLAYER_SPEED).
   */
  function updatePlayer() {
    if (keysPressed.ArrowUp) player.y -= PLAYER_SPEED;
    if (keysPressed.ArrowDown) player.y += PLAYER_SPEED;
    if (keysPressed.ArrowLeft) player.x -= PLAYER_SPEED;
    if (keysPressed.ArrowRight) player.x += PLAYER_SPEED;

    // Restrição de espaço: o Robô não pode saltar fora do canvas.
    player.x = clamp(player.x, player.radius, WORLD_WIDTH - player.radius);
    player.y = clamp(player.y, player.radius, WORLD_HEIGHT - player.radius);
  }

  /**
   * Move o Monstro em direção ao Robô, a cada frame.
   * DINÂMICA: este é o comportamento EMERGENTE. Ninguém programou
   * "medo" ou "fuga" diretamente — eles surgem da combinação entre
   * a regra do jogador (livre, rápido) e a regra do monstro
   * (restrito a perseguir, 10% mais lento). O resultado — tensão,
   * quase-escapes, decisões de rota — é a Dinâmica em ação.
   */
  function updateEnemy() {
    const deltaX = player.x - enemy.x;
    const deltaY = player.y - enemy.y;
    const distance = Math.hypot(deltaX, deltaY);

    // Evita divisão por zero quando o monstro já está sobre o jogador.
    if (distance > 0.5) {
      // Vetor normalizado (direção pura, sem magnitude) * velocidade.
      enemy.x += (deltaX / distance) * ENEMY_SPEED;
      enemy.y += (deltaY / distance) * ENEMY_SPEED;
    }

    // O Monstro também respeita os limites do mapa.
    const half = enemy.size / 2;
    enemy.x = clamp(enemy.x, half, WORLD_WIDTH - half);
    enemy.y = clamp(enemy.y, half, WORLD_HEIGHT - half);
  }

  /**
   * Desenha o fundo do "tabuleiro" com uma grade sutil,
   * remetendo ao mapa unplugged (papel quadriculado) da Aba 1.
   */
  function drawBackground() {
    ctx.fillStyle = '#0d0a10';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

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

  /** Desenha o Robô (jogador) como um círculo ciano com brilho neon. */
  function drawPlayer() {
    ctx.save();
    ctx.shadowColor = '#3fd0ff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#3fd0ff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Desenha o Monstro (inimigo) como um quadrado vermelho-sangue. */
  function drawEnemy() {
    const half = enemy.size / 2;
    ctx.save();
    ctx.shadowColor = '#c23548';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#c23548';
    ctx.fillRect(enemy.x - half, enemy.y - half, enemy.size, enemy.size);
    ctx.restore();
  }

  /**
   * Loop principal do jogo.
   * `requestAnimationFrame` chama esta função ~60x por segundo,
   * sincronizada com a taxa de atualização do monitor.
   */
  function gameLoop() {
    updatePlayer();
    updateEnemy();

    drawBackground();
    drawPlayer();
    drawEnemy();

    requestAnimationFrame(gameLoop);
  }

  // Inicia o loop de jogo.
  requestAnimationFrame(gameLoop);

  console.info(
    '%c[SIMULAÇÃO]%c Canvas API nativo iniciado — Robô: %dpx/frame | Monstro: %dpx/frame (10%% mais lento)',
    'color: #cfa759; font-weight: bold;',
    'color: #ab9c8a;',
    PLAYER_SPEED,
    ENEMY_SPEED
  );
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSimulation();
});
