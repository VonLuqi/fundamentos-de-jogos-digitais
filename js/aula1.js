/**
 * ============================================================
 * AULA 1 — A Regra do Jogo (Unplugged)
 * ============================================================
 * Este arquivo contém duas responsabilidades independentes:
 *
 * 1. TABS       → Alterna entre "Teoria e Manuais" e "Simulação".
 * 2. SIMULAÇÃO  → Um labirinto PROCEDURAL (gerado a cada partida),
 *                 com Máquina de Estados, colisão AABB e um
 *                 Monstro que persegue o Robô usando PATHFINDING
 *                 real (busca em largura / BFS) sobre a grade do
 *                 labirinto — 100% em Canvas API nativo.
 *
 * IMPORTANTE: Nenhuma biblioteca externa é utilizada aqui.
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
   2. SIMULAÇÃO — LABIRINTO PROCEDURAL + PATHFINDING (Canvas nativo)
   ============================================================ */
function initSimulation() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.warn('[AULA-1] #game-canvas não encontrado no DOM.');
    return;
  }

  const ctx = canvas.getContext('2d');
  const WORLD_WIDTH = canvas.width;   // 600
  const WORLD_HEIGHT = canvas.height; // 400

  /* ==========================================================
     2.1 MÁQUINA DE ESTADOS
  ========================================================== */
  const GameState = {
    START_SCREEN: 'START_SCREEN',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    CAUGHT: 'CAUGHT',
    WON: 'WON',
  };

  let currentState = GameState.START_SCREEN;

  const COUNTDOWN_DURATION_MS = 3000;   // 3 segundos, contagem 3-2-1
  const ENEMY_WAKE_DELAY_MS = 1000;     // MECÂNICA: o Monstro "dorme" 1s
  let countdownStartedAt = 0;
  let playingStartedAt = null;

  /* ==========================================================
     2.2 GRADE DO LABIRINTO (Design Tokens do mapa)
     ==========================================================
     O labirinto é dividido em uma grade de células. Cada célula
     guarda quais dos seus 4 lados possuem parede. O tamanho da
     célula é escolhido para que COLS × CELL_SIZE = 600 e
     ROWS × CELL_SIZE = 400, preenchendo o canvas exatamente.
  ========================================================== */
  const CELL_SIZE = 50;
  const COLS = WORLD_WIDTH / CELL_SIZE;   // 12 colunas
  const ROWS = WORLD_HEIGHT / CELL_SIZE;  // 8 linhas
  const WALL_THICKNESS = 8;

  const WALL_COLOR = '#3a2a2c';        // grafite/vermelho-escuro (estética Hades)
  const WALL_BORDER_COLOR = '#7a5c2e'; // fio dourado sutil

  /**
   * Cria a grade vazia: toda célula nasce com os 4 lados fechados.
   */
  function createGrid() {
    const grid = [];
    for (let row = 0; row < ROWS; row += 1) {
      const rowCells = [];
      for (let col = 0; col < COLS; col += 1) {
        rowCells.push({ row, col, top: true, right: true, bottom: true, left: true, visited: false });
      }
      grid.push(rowCells);
    }
    return grid;
  }

  /** Embaralha um array no local (Fisher-Yates). */
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * MECÂNICA — Geração procedural do labirinto ("recursive backtracker").
   * Começamos em uma célula, e a cada passo vamos a um vizinho ainda não
   * visitado (derrubando a parede entre as duas), empilhando o caminho.
   * Quando não há mais vizinhos livres, voltamos (backtrack) na pilha.
   * O resultado é um labirinto onde QUALQUER célula pode alcançar
   * qualquer outra — não existem áreas isoladas.
   */
  function carveMaze(grid, startRow, startCol) {
    const DIRECTIONS = [
      { dr: -1, dc: 0, wallHere: 'top', wallThere: 'bottom' },
      { dr: 1, dc: 0, wallHere: 'bottom', wallThere: 'top' },
      { dr: 0, dc: -1, wallHere: 'left', wallThere: 'right' },
      { dr: 0, dc: 1, wallHere: 'right', wallThere: 'left' },
    ];

    const stack = [grid[startRow][startCol]];
    grid[startRow][startCol].visited = true;

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const shuffledDirs = shuffle(DIRECTIONS.slice());

      let advanced = false;
      for (const dir of shuffledDirs) {
        const nextRow = current.row + dir.dr;
        const nextCol = current.col + dir.dc;
        const inBounds = nextRow >= 0 && nextRow < ROWS && nextCol >= 0 && nextCol < COLS;

        if (inBounds && !grid[nextRow][nextCol].visited) {
          const neighbor = grid[nextRow][nextCol];
          current[dir.wallHere] = false;   // derruba a parede do lado de "current"
          neighbor[dir.wallThere] = false; // e o lado correspondente do vizinho
          neighbor.visited = true;
          stack.push(neighbor);
          advanced = true;
          break;
        }
      }

      if (!advanced) {
        stack.pop(); // sem vizinhos livres: backtrack
      }
    }
  }

  /**
   * DINÂMICA — Adiciona "rotas de fuga" extras (loops).
   * Um labirinto 100% "árvore" (gerado só pelo backtracker) tem
   * exatamente UM caminho entre dois pontos. Ao remover ~12% das
   * paredes restantes, criamos atalhos e rotas alternativas —
   * o mesmo conceito de "gargalos e rotas de fuga" da Aba 1.
   */
  function addExtraRoutes(grid, chance = 0.12) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const cell = grid[row][col];

        if (col < COLS - 1 && cell.right && Math.random() < chance) {
          cell.right = false;
          grid[row][col + 1].left = false;
        }
        if (row < ROWS - 1 && cell.bottom && Math.random() < chance) {
          cell.bottom = false;
          grid[row + 1][col].top = false;
        }
      }
    }
  }

  /**
   * Converte a grade lógica em retângulos físicos {x, y, width, height}
   * para desenho e para a colisão AABB. Cada parede é desenhada apenas
   * uma vez (lados "top"/"left" de cada célula, mais o "right"/"bottom"
   * das bordas externas), evitando retas duplicadas.
   */
  function buildWallRects(grid) {
    const rects = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const cell = grid[row][col];
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;

        if (cell.top) {
          rects.push({ x, y: y - WALL_THICKNESS / 2, width: CELL_SIZE + WALL_THICKNESS, height: WALL_THICKNESS });
        }
        if (cell.left) {
          rects.push({ x: x - WALL_THICKNESS / 2, y, width: WALL_THICKNESS, height: CELL_SIZE + WALL_THICKNESS });
        }
        if (col === COLS - 1 && cell.right) {
          rects.push({ x: x + CELL_SIZE - WALL_THICKNESS / 2, y, width: WALL_THICKNESS, height: CELL_SIZE + WALL_THICKNESS });
        }
        if (row === ROWS - 1 && cell.bottom) {
          rects.push({ x, y: y + CELL_SIZE - WALL_THICKNESS / 2, width: CELL_SIZE + WALL_THICKNESS, height: WALL_THICKNESS });
        }
      }
    }
    return rects;
  }

  /** Canto superior-esquerdo (em pixels) para centralizar um ator de `size` px dentro de uma célula. */
  function cellTopLeft(row, col, size) {
    return {
      x: col * CELL_SIZE + (CELL_SIZE - size) / 2,
      y: row * CELL_SIZE + (CELL_SIZE - size) / 2,
    };
  }

  /* ==========================================================
     2.3 MECÂNICA — Velocidades (independentes da taxa de quadros)
     ==========================================================
     As velocidades são expressas em PIXELS POR SEGUNDO, e não por
     quadro. Isso é essencial: monitores com taxas de atualização
     diferentes (60Hz, 120Hz, 144Hz...) disparam requestAnimationFrame
     em ritmos diferentes. Se movêssemos um valor fixo "por quadro",
     a simulação rodaria proporcionalmente mais rápido em telas de
     alta taxa de atualização — exatamente o bug de "velocidade
     extremamente alta" percebido. Multiplicando pelo tempo real
     decorrido (deltaSeconds) a cada quadro, o movimento fica sempre
     consistente, independentemente do hardware do jogador.
  ========================================================== */
  const PLAYER_SPEED = 90;                 // pixels por segundo
  const ENEMY_SPEED = PLAYER_SPEED * 0.85; // 15% mais lento que o jogador
  const MAX_DELTA_SECONDS = 0.1;           // evita "saltos" após aba minimizada/trocada

  // Tamanhos reduzidos: além de deixar mais espaço de manobra dentro
  // dos corredores, evitam que Robô e Monstro nasçam colados/sobrepostos.
  const PLAYER_SIZE = 14;
  const ENEMY_SIZE = 16;
  const GOAL_SIZE = 18; // OBJETIVO: núcleo dourado no extremo oposto do labirinto

  /* ==========================================================
     2.4 ESTADO DO MUNDO (grade, paredes e atuantes)
     ==========================================================
     resetSimulation() gera um labirinto NOVO a cada partida —
     como as salas proceduralmente geradas de um rogue-like — e
     posiciona o Monstro na célula IMEDIATAMENTE ATRÁS do Robô
     (uma célula inteira de distância, nunca sobreposto a ele).
     Para garantir isso, forçamos a abertura de duas paredes a
     partir da célula inicial: uma para o "corredor do Monstro" e
     outra como rota de fuga independente — assim o jogador nunca
     fica bloqueado, independente de como o resto do labirinto foi
     sorteado. O OBJETIVO (núcleo dourado) nasce sempre no canto
     diagonalmente oposto ao início, e a vitória exige atravessar
     o labirinto inteiro para alcançá-lo.
  ========================================================== */
  let grid = null;
  let wallRects = [];
  let player = null;
  let enemy = null;
  let goal = null;

  function resetSimulation() {
    grid = createGrid();
    carveMaze(grid, 0, 0);
    addExtraRoutes(grid, 0.12);

    // Garante uma passagem entre a célula de partida (0,0) e a célula
    // logo abaixo (1,0) — é onde o Monstro vai nascer. Isso evita que
    // ele apareça isolado ou colado ao Robô: sempre há 1 célula cheia
    // (50px) de distância real entre os dois no início da partida.
    grid[0][0].bottom = false;
    grid[1][0].top = false;

    // BUGFIX: a célula (0,0) é um canto do labirinto, então o gerador
    // procedural pode ter aberto UMA ÚNICA saída natural — e essa saída
    // pode coincidir justamente com a passagem acima, onde o Monstro
    // nasce. Nesse caso o Robô ficaria "preso": a única rota de saída
    // estaria bloqueada pelo próprio Monstro. Para evitar isso, forçamos
    // também uma segunda saída independente, para o lado (0,1) — assim
    // a célula inicial sempre tem no mínimo 2 rotas livres (baixo e
    // direita), garantindo que o jogador tenha por onde escapar mesmo
    // que o Monstro esteja bloqueando o corredor de baixo.
    grid[0][0].right = false;
    grid[0][1].left = false;

    wallRects = buildWallRects(grid);

    const playerStart = cellTopLeft(0, 0, PLAYER_SIZE);
    player = { x: playerStart.x, y: playerStart.y, size: PLAYER_SIZE };

    const enemyStart = cellTopLeft(1, 0, ENEMY_SIZE);
    enemy = { x: enemyStart.x, y: enemyStart.y, size: ENEMY_SIZE };

    // OBJETIVO: o núcleo dourado nasce sempre no extremo OPOSTO do
    // labirinto (canto inferior-direito), obrigando o Robô a atravessar
    // o mapa inteiro — e não apenas fugir do Monstro no lugar — para
    // vencer a simulação.
    const goalStart = cellTopLeft(ROWS - 1, COLS - 1, GOAL_SIZE);
    goal = { x: goalStart.x, y: goalStart.y, size: GOAL_SIZE };

    playingStartedAt = null;
  }

  resetSimulation();

  /* ==========================================================
     2.5 INPUT — Estado do teclado (Setas e WASD)
     ==========================================================
     O estado é guardado por DIREÇÃO LÓGICA (up/down/left/right),
     não pela tecla crua — assim tanto as Setas quanto WASD (comum
     em jogos) alimentam exatamente o mesmo estado de movimento.
  ========================================================== */
  const keysPressed = { up: false, down: false, left: false, right: false };

  const KEY_TO_DIRECTION = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    W: 'up',
    s: 'down',
    S: 'down',
    a: 'left',
    A: 'left',
    d: 'right',
    D: 'right',
  };

  window.addEventListener('keydown', (event) => {
    const direction = KEY_TO_DIRECTION[event.key];
    if (direction) {
      keysPressed[direction] = true;
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    const direction = KEY_TO_DIRECTION[event.key];
    if (direction) {
      keysPressed[direction] = false;
    }
  });

  // Clique no canvas: avança a máquina de estados.
  canvas.addEventListener('click', () => {
    if (currentState === GameState.START_SCREEN) {
      countdownStartedAt = performance.now();
      currentState = GameState.COUNTDOWN;
    } else if (currentState === GameState.CAUGHT || currentState === GameState.WON) {
      // Gera um NOVO labirinto e reinicia do zero.
      resetSimulation();
      currentState = GameState.START_SCREEN;
    }
  });

  /* ==========================================================
     2.6 COLISÃO — AABB (Axis-Aligned Bounding Box)
  ========================================================== */
  function isCollidingAABB(boxA, boxB) {
    return (
      boxA.x < boxB.x + boxB.width &&
      boxA.x + boxA.width > boxB.x &&
      boxA.y < boxB.y + boxB.height &&
      boxA.y + boxA.height > boxB.y
    );
  }

  function toBoundingBox(actor) {
    return { x: actor.x, y: actor.y, width: actor.size, height: actor.size };
  }

  function collidesWithMaze(box) {
    return wallRects.some((wall) => isCollidingAABB(box, wall));
  }

  /**
   * Move um atuante respeitando as paredes, eixo por eixo (X, depois Y).
   * Usado apenas pelo JOGADOR: ele tem movimento livre em pixels e
   * precisa "esbarrar" fisicamente nas paredes do labirinto.
   */
  function moveWithCollision(actor, deltaX, deltaY) {
    const boxAfterX = { x: actor.x + deltaX, y: actor.y, width: actor.size, height: actor.size };
    if (!collidesWithMaze(boxAfterX)) {
      actor.x += deltaX;
    }

    const boxAfterY = { x: actor.x, y: actor.y + deltaY, width: actor.size, height: actor.size };
    if (!collidesWithMaze(boxAfterY)) {
      actor.y += deltaY;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /* ==========================================================
     2.7 ATUALIZAÇÃO — JOGADOR
  ========================================================== */
  function updatePlayer(deltaSeconds) {
    const step = PLAYER_SPEED * deltaSeconds;
    let deltaX = 0;
    let deltaY = 0;

    if (keysPressed.up) deltaY -= step;
    if (keysPressed.down) deltaY += step;
    if (keysPressed.left) deltaX -= step;
    if (keysPressed.right) deltaX += step;

    moveWithCollision(player, deltaX, deltaY);

    player.x = clamp(player.x, 0, WORLD_WIDTH - player.size);
    player.y = clamp(player.y, 0, WORLD_HEIGHT - player.size);
  }

  /* ==========================================================
     2.8 PATHFINDING — Busca em Largura (BFS) sobre a grade
     ==========================================================
     Diferente de uma perseguição "em linha reta" (que trava em
     qualquer parede), o BFS explora a grade camada por camada a
     partir da célula do Monstro até encontrar a célula do Robô,
     retornando o CAMINHO MAIS CURTO entre as duas. O Monstro
     então persegue apenas o PRIMEIRO passo desse caminho — e o
     caminho é recalculado a cada frame, reagindo ao jogador em
     tempo real, como um verdadeiro algoritmo de IA de perseguição.
  ========================================================== */
  function pixelToCell(x, y, size) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const col = clamp(Math.floor(centerX / CELL_SIZE), 0, COLS - 1);
    const row = clamp(Math.floor(centerY / CELL_SIZE), 0, ROWS - 1);
    return { row, col };
  }

  /** Retorna as células vizinhas alcançáveis (sem parede) a partir de (row, col). */
  function getOpenNeighbors(row, col) {
    const cell = grid[row][col];
    const neighbors = [];
    if (!cell.top && row > 0) neighbors.push({ row: row - 1, col });
    if (!cell.bottom && row < ROWS - 1) neighbors.push({ row: row + 1, col });
    if (!cell.left && col > 0) neighbors.push({ row, col: col - 1 });
    if (!cell.right && col < COLS - 1) neighbors.push({ row, col: col + 1 });
    return neighbors;
  }

  /** BFS clássico: devolve o caminho (lista de células) de `start` até `goal`, ou null. */
  function findShortestPath(start, goal) {
    if (start.row === goal.row && start.col === goal.col) {
      return [start];
    }

    const cellKey = (r, c) => `${r}:${c}`;
    const visited = new Set([cellKey(start.row, start.col)]);
    const cameFrom = new Map();
    const queue = [start];

    while (queue.length > 0) {
      const current = queue.shift();

      if (current.row === goal.row && current.col === goal.col) {
        // Reconstrói o caminho percorrendo os "pais" até a origem.
        const path = [current];
        let key = cellKey(current.row, current.col);
        while (cameFrom.has(key)) {
          const previous = cameFrom.get(key);
          path.unshift(previous);
          key = cellKey(previous.row, previous.col);
        }
        return path;
      }

      for (const neighbor of getOpenNeighbors(current.row, current.col)) {
        const neighborKey = cellKey(neighbor.row, neighbor.col);
        if (!visited.has(neighborKey)) {
          visited.add(neighborKey);
          cameFrom.set(neighborKey, current);
          queue.push(neighbor);
        }
      }
    }

    return null; // Não deveria ocorrer: o labirinto é sempre totalmente conectado.
  }

  /* ==========================================================
     2.9 ATUALIZAÇÃO — MONSTRO (dorme 1s, depois persegue com IA)
  ========================================================== */
  function updateEnemy(now, deltaSeconds) {
    if (playingStartedAt === null) return;

    // MECÂNICA: o Monstro permanece imóvel pelo primeiro 1 segundo
    // de jogo — o tempo de reação/fuga garantido ao jogador.
    const timeSincePlayStarted = now - playingStartedAt;
    if (timeSincePlayStarted < ENEMY_WAKE_DELAY_MS) {
      return;
    }

    const enemyStep = ENEMY_SPEED * deltaSeconds;

    const enemyCell = pixelToCell(enemy.x, enemy.y, enemy.size);
    const playerCell = pixelToCell(player.x, player.y, player.size);

    let targetX;
    let targetY;

    if (enemyCell.row === playerCell.row && enemyCell.col === playerCell.col) {
      // DINÂMICA: dentro da mesma célula, ataca o pixel exato do jogador.
      targetX = player.x;
      targetY = player.y;
    } else {
      const path = findShortestPath(enemyCell, playerCell);
      const nextCell = path && path.length > 1 ? path[1] : enemyCell;
      const nextTopLeft = cellTopLeft(nextCell.row, nextCell.col, enemy.size);
      targetX = nextTopLeft.x;
      targetY = nextTopLeft.y;
    }

    const deltaX = targetX - enemy.x;
    const deltaY = targetY - enemy.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance <= enemyStep) {
      // Já está praticamente sobre o alvo: encaixa exatamente, sem "tremer".
      enemy.x = targetX;
      enemy.y = targetY;
    } else {
      enemy.x += (deltaX / distance) * enemyStep;
      enemy.y += (deltaY / distance) * enemyStep;
    }
  }

  /** Verifica se o Monstro alcançou o Robô (fim de jogo). */
  function checkCapture() {
    if (isCollidingAABB(toBoundingBox(player), toBoundingBox(enemy))) {
      currentState = GameState.CAUGHT;
    }
  }

  /** Verifica se o Robô alcançou o núcleo dourado no extremo oposto (vitória). */
  function checkWin() {
    if (isCollidingAABB(toBoundingBox(player), toBoundingBox(goal))) {
      currentState = GameState.WON;
    }
  }

  /* ==========================================================
     2.10 DESENHO
  ========================================================== */
  function drawMazeBackground() {
    ctx.fillStyle = '#0d0a10';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  function drawMazeWalls() {
    wallRects.forEach((wall) => {
      ctx.fillStyle = WALL_COLOR;
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeStyle = WALL_BORDER_COLOR;
      ctx.lineWidth = 1;
      ctx.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.width - 1, wall.height - 1);
    });
  }

  /** OBJETIVO: núcleo dourado desenhado como um losango pulsante — a "engrenagem final". */
  function drawGoal() {
    const centerX = goal.x + goal.size / 2;
    const centerY = goal.y + goal.size / 2;
    const half = goal.size / 2;
    const pulse = 1 + Math.sin(performance.now() / 250) * 0.12; // brilho pulsante

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = '#f2d59a';
    ctx.shadowBlur = 16 * pulse;
    ctx.fillStyle = '#cfa759';
    ctx.strokeStyle = '#f2d59a';
    ctx.lineWidth = 2;
    ctx.fillRect(-half * pulse, -half * pulse, half * 2 * pulse, half * 2 * pulse);
    ctx.strokeRect(-half * pulse, -half * pulse, half * 2 * pulse, half * 2 * pulse);
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();
    ctx.shadowColor = '#3fd0ff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#3fd0ff';
    ctx.fillRect(player.x, player.y, player.size, player.size);
    ctx.restore();
  }

  function drawEnemy() {
    ctx.save();
    ctx.shadowColor = '#c23548';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#c23548';
    ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
    ctx.restore();
  }

  /** Enquanto o Monstro "dorme", mostra a contagem regressiva sobre ele. */
  function drawEnemySleepIndicator(now) {
    if (playingStartedAt === null) return;

    const remainingMs = ENEMY_WAKE_DELAY_MS - (now - playingStartedAt);
    if (remainingMs <= 0) return;

    const remainingSeconds = Math.ceil(remainingMs / 1000);
    ctx.save();
    ctx.font = '11px "Cinzel", serif';
    ctx.fillStyle = '#f2d59a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(194, 53, 72, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(`zzz ${remainingSeconds}`, enemy.x + enemy.size / 2, enemy.y - 4);
    ctx.restore();
  }

  /** Texto centralizado, com fonte temática e brilho dourado/sangue. */
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
     2.11 RENDERIZAÇÃO — Uma função por ESTADO
  ========================================================== */
  function renderStartScreen() {
    drawMazeBackground();
    drawMazeWalls();
    drawGoal();
    drawPlayer();
    drawEnemy();

    ctx.fillStyle = 'rgba(10, 8, 7, 0.55)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawCenteredText('Clique na tela para iniciar', 20, '#f2d59a', 'rgba(207, 167, 89, 0.7)');
  }

  function renderCountdown(now) {
    drawMazeBackground();
    drawMazeWalls();
    drawGoal();
    drawPlayer();
    drawEnemy();

    ctx.fillStyle = 'rgba(10, 8, 7, 0.5)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const elapsedMs = now - countdownStartedAt;
    const remainingSeconds = Math.ceil((COUNTDOWN_DURATION_MS - elapsedMs) / 1000);

    if (remainingSeconds <= 0) {
      // 3 segundos se esgotaram: o cronômetro do Monstro começa agora.
      currentState = GameState.PLAYING;
      playingStartedAt = now;
      return;
    }

    drawCenteredText(String(remainingSeconds), 60, '#f2d59a', 'rgba(194, 53, 72, 0.75)');
  }

  function renderPlaying(now, deltaSeconds) {
    updatePlayer(deltaSeconds);
    updateEnemy(now, deltaSeconds);
    checkWin();
    if (currentState !== GameState.WON) {
      checkCapture();
    }

    drawMazeBackground();
    drawMazeWalls();
    drawGoal();
    drawPlayer();
    drawEnemy();
    drawEnemySleepIndicator(now);
  }

  function renderCaught() {
    drawMazeBackground();
    drawMazeWalls();
    drawGoal();
    drawPlayer();
    drawEnemy();

    ctx.fillStyle = 'rgba(92, 20, 29, 0.55)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawCenteredText('Você foi capturado!', 24, '#f2d59a', 'rgba(194, 53, 72, 0.85)', -14);
    drawCenteredText('Clique para gerar outro labirinto', 15, '#ece1d1', 'rgba(207, 167, 89, 0.6)', 18);
  }

  function renderWon() {
    drawMazeBackground();
    drawMazeWalls();
    drawGoal();
    drawPlayer();
    drawEnemy();

    ctx.fillStyle = 'rgba(45, 30, 12, 0.55)';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawCenteredText('Núcleo alcançado! Vitória!', 24, '#f2d59a', 'rgba(207, 167, 89, 0.9)', -14);
    drawCenteredText('Clique para gerar outro labirinto', 15, '#ece1d1', 'rgba(207, 167, 89, 0.6)', 18);
  }

  /* ==========================================================
     2.12 LOOP PRINCIPAL
  ========================================================== */
  let lastFrameTimestamp = null;

  function gameLoop(now) {
    // Tempo real decorrido desde o quadro anterior, em segundos — a base
    // de toda a movimentação (ver comentário na seção 2.3). No primeiro
    // quadro não há referência anterior, então deltaSeconds é 0.
    const deltaSeconds =
      lastFrameTimestamp === null ? 0 : Math.min((now - lastFrameTimestamp) / 1000, MAX_DELTA_SECONDS);
    lastFrameTimestamp = now;

    switch (currentState) {
      case GameState.START_SCREEN:
        renderStartScreen();
        break;
      case GameState.COUNTDOWN:
        renderCountdown(now);
        break;
      case GameState.PLAYING:
        renderPlaying(now, deltaSeconds);
        break;
      case GameState.CAUGHT:
        renderCaught();
        break;
      case GameState.WON:
        renderWon();
        break;
      default:
        break;
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  console.info(
    '%c[SIMULAÇÃO]%c Labirinto procedural (%d\u00d7%d células) — Robô: %spx/s | Monstro: %spx/s, dorme %ds e usa BFS para perseguir',
    'color: #cfa759; font-weight: bold;',
    'color: #ab9c8a;',
    COLS,
    ROWS,
    PLAYER_SPEED,
    ENEMY_SPEED.toFixed(2),
    ENEMY_WAKE_DELAY_MS / 1000
  );
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSimulation();
});
