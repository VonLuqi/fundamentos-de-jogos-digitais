/**
 * ============================================================
 * FUNDAMENTOS DE JOGOS DIGITAIS — Entry Point
 * ============================================================
 * Este módulo inicializa a aplicação.
 *
 * ROADMAP (não implementar aqui — apenas referência):
 *  - js/modules/gamification/xp.js      → Sistema de XP e níveis
 *  - js/modules/gamification/badges.js  → Conquistas/badges
 *  - js/modules/auth/session.js         → Login/sessão do jogador
 *  - js/modules/ui/hud.js               → HUD de XP, barra de nível
 *  - js/modules/data/progress.js        → Persistência (localStorage → futura API)
 * ============================================================
 */

'use strict';

const APP_VERSION = '0.1.0';
const APP_NAME = 'FUNDAMENTOS.DE.JOGOS.DIGITAIS';

/**
 * Bootstrap da aplicação.
 */
function init() {
  const bootTimestamp = new Date().toISOString();
  console.info(
    `%c[${APP_NAME}]%c v${APP_VERSION} — Sistemas inicializados em ${bootTimestamp}`,
    'color: #a855f7; font-weight: bold;',
    'color: #22d3ee;'
  );

  // Futuros módulos serão importados e inicializados aqui:
  //
  // import { initGamification } from './modules/gamification/xp.js';
  // import { initSession } from './modules/auth/session.js';
  // await initSession();
  // initGamification();
}

document.addEventListener('DOMContentLoaded', init);
