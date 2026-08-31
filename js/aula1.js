/**
 * ============================================================
 * AULA 1 — A Regra do Jogo (Unplugged)
 * ============================================================
 * Arquitetura deste script:
 * 1. INICIALIZAÇÃO + LOG DE BOOT
 * 2. SISTEMA DE ABAS (Tabs) — alternância entre Teoria e Simulação
 * 3. SIMULAÇÃO INTERATIVA (Kaboom.js) — boilerplate didático
 *    demonstrando MECÂNICA, DINÂMICA e ESTÉTICA em código.
 * ============================================================
 */

'use strict';

const APP_VERSION = '1.0.0';
const LESSON_ID = 'AULA-1';

/* ---------- 1. INICIALIZAÇÃO ---------- */
function init() {
  logBoot();
  setupTabs();
  // Não inicializamos a simulação imediatamente: Kaboom só roda quando
  // o usuário abre a aba de simulação pela primeira vez (lazy start).
}

function logBoot() {
  const ts = new Date().toISOString();
  console.info(
    `%c[${LESSON_ID}]%c v${APP_VERSION} — Sistemas de leitura e simulação prontos em ${ts}`,
    'color: #a855f7; font-weight: bold;',
    'color: #22d3ee;'
  );
}

/* ---------- 2. SISTEMA DE ABAS ---------- */
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;

      // Atualiza o estado visual das abas
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      // Mostra o painel correspondente
      panels.forEach((panel) => {
        panel.classList.remove('is-active');
      });
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('is-active');
      }

      // Se for a aba de simulação e o jogo ainda não iniciou, inicializa.
      if (targetId === 'simulation') {
        startSimulationOnce();
      }
    });
  });
}

/* ---------- 3. SIMULAÇÃO INTERATIVA (Kaboom.js) ---------- */
// Variável de controle para evitar reinicialização do motor.
let simulationStarted = false;

function startSimulationOnce() {
  if (simulationStarted) {
    return;
  }
  simulationStarted = true;

  // -----------------------------------------------------------
  // 3.1 INICIALIZAÇÃO DO MOTOR KABOOM
  // -----------------------------------------------------------
  // MECÂNICA: Resolução, fundo e escala definem o "espaço" do jogo.
  // -----------------------------------------------------------
  kaboom({
    width: 800,
    height: 480,
    scale: 1,
    background: [10, 10, 15],           // preto profundo (Cyber-Gothic)
    canvas: document.querySelector('#game-canvas-container'),
  });

  // -----------------------------------------------------------
  // 3.2 CONSTANTES DE JOGABILIDADE
  // -----------------------------------------------------------
  // MECÂNICA: Estes números são as "regras do sistema". Alterá-los
  // muda a dificuldade, o ritmo e a sensação do jogo.
  const PLAYER_SPEED = 300;   // pixels/segundo — velocidade do Robô (rápido)
  const MONSTER_SPEED = 120;  // pixels/segundo — perseguição do Monstro (mais lento, persistente)
  const PLAYER_SIZE = 28;
  const MONSTER_SIZE = 34;

  // -----------------------------------------------------------
  // 3.3 DEFINIÇÃO DOS ATUANTES (Objetos do Game World)
  // -----------------------------------------------------------

  // MECÂNICA: O jogador (Robô) é representado por um retângulo ciano
  // com um marcador de posição inicial e componentes de movimentação.
  const player = add([
    rect(PLAYER_SIZE, PLAYER_SIZE),
    pos(80, height() / 2),            // posição inicial: lado esquerdo
    area(),                            // habilita colisões (futuro uso)
    color(0, 200, 255),               // ciano neon
    outline(4, rgb(176, 141, 74)),    // borda dourada ornamentada
    'player',                          // tag para identificação
  ]);

  // MECÂNICA: O Monstro é um retângulo vermelho mais pesado. Seu papel
  // é gerar tensão por meio da perseguição constante.
  const monster = add([
    rect(MONSTER_SIZE, MONSTER_SIZE),
    pos(width() - 120, height() / 2), // posição inicial: lado direito
    area(),
    color(200, 40, 60),               // vermelho sangue
    outline(2, rgb(40, 40, 40)),      // borda escura
    'monster',
  ]);

  // -----------------------------------------------------------
  // 3.4 SISTEMA DE CONTROLE (Input → Mecânica aplicada)
  // -----------------------------------------------------------
  // MECÂNICA: As setas do teclado geram vetores de direção.
  // Cada tecla aplica velocidade ao jogador — isso é a regra
  // explícita do sistema.
  onKeyDown('left', () => player.move(-PLAYER_SPEED, 0));
  onKeyDown('right', () => player.move(PLAYER_SPEED, 0));
  onKeyDown('up', () => player.move(0, -PLAYER_SPEED));
  onKeyDown('down', () => player.move(0, PLAYER_SPEED));

  // Mantém o jogador dentro dos limites da tela.
  // MECÂNICA: Restrição de espaço (paredes invisíveis).
  player.onUpdate(() => {
    player.pos.x = Math.max(0, Math.min(width() - PLAYER_SIZE, player.pos.x));
    player.pos.y = Math.max(0, Math.min(height() - PLAYER_SIZE, player.pos.y));
  });

  // -----------------------------------------------------------
  // 3.5 PERSEGUIÇÃO: O MONSTRO REAGE AO JOGADOR
  // -----------------------------------------------------------
  // DINÂMICA: O comportamento emergente. Nenhum código diz "como"
  // o jogador deve se sentir; ele emerge do atrito entre as regras.
  monster.onUpdate(() => {
    // Vetor direção do monstro para o jogador
    const direction = player.pos.sub(monster.pos);

    // Normaliza e aplica velocidade menor: perseguição persistente mas lenta
    if (direction.len() > 0) {
      monster.move(direction.unit().scale(MONSTER_SPEED));
    }
  });

  // -----------------------------------------------------------
  // 3.6 DIAGNÓSTICO VISUAL (HUD de depuração da simulação)
  // -----------------------------------------------------------
  // ESTÉTICA: Transformamos o resultado em tensão visual. A fuga
  // gera medo de ser alcançado; o sucesso (desviar) gera alívio.
  onDraw(() => {
    // Linha sutil mostrando a distância/jornada do monstro ao jogador
    drawLine({
      p1: monster.pos.add(vec2(MONSTER_SIZE / 2, MONSTER_SIZE / 2)),
      p2: player.pos.add(vec2(PLAYER_SIZE / 2, PLAYER_SIZE / 2)),
      width: 1,
      color: rgb(100, 100, 120),
      opacity: 0.25,
    });
  });

  // Log de boot da simulação
  console.info(
    `%c[SIMULAÇÃO]%c Caboom.js rodando — Mecânica configurada (Robô: ${PLAYER_SPEED}px/s | Monstro: ${MONSTER_SPEED}px/s)`,
    'color: #4ade80; font-weight: bold;',
    'color: #a09a90;'
  );
}

/* ---------- BOOT ---------- */
document.addEventListener('DOMContentLoaded', init);
