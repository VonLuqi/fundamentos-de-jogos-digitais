/**
 * Smoke — Placar do Loop (3 leaderboards: Juízo / Catábases / Almas).
 * Uso: node tests/despertar-loop-board-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  describeLoopBoardSelf,
  formatLoopBoardScore,
  LOOP_BOARD_LIMIT,
  LOOP_BOARD_SORTS,
} from '../js/hades-despertar/ui/LoopLeaderboard.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

[
  'pages/despertar.html',
  'pages/ranking.html',
  'css/despertar.css',
  'js/hades-despertar/ui/LoopLeaderboard.js',
  'js/hades-despertar/ui/UIRenderer.js',
  'db/migrate-2026-10-02-leaderboard-lifetime-souls.sql',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const html = read('pages/despertar.html');
const rankingHtml = read('pages/ranking.html');
const css = read('css/despertar.css');
const ui = read('js/hades-despertar/ui/UIRenderer.js');
const moduleSrc = read('js/hades-despertar/ui/LoopLeaderboard.js');
const rankingJs = read('js/ranking.js');
const indexSrc = read('js/hades-despertar/index.js');
const migrate = read('db/migrate-2026-10-02-leaderboard-lifetime-souls.sql');
const setup = read('db/setup.sql');
const pkg = read('package.json');

staticAssert(html.includes('id="despertar-loop-board"'), 'FAB do Placar do Loop');
staticAssert(html.includes('data-loop-board-sort="juizoBest"'), 'aba Juízo');
staticAssert(html.includes('data-loop-board-sort="prestigeCount"'), 'aba Catábases');
staticAssert(html.includes('data-loop-board-sort="lifetimeSouls"'), 'aba Almas');
staticAssert(html.includes('id="loop-board-list"'), 'lista do placar');

staticAssert(rankingHtml.includes('data-ranking-sort="prestigeCount"'), 'ranking chip Catábases');
staticAssert(rankingHtml.includes('data-ranking-sort="lifetimeSouls"'), 'ranking chip Almas');
staticAssert(rankingHtml.includes('Catábases'), 'coluna Catábases');
staticAssert(rankingJs.includes('lifetimeSouls'), 'ranking.js usa lifetimeSouls');

staticAssert(css.includes('.despertar-loop-board-tab'), 'CSS tabs');
staticAssert(moduleSrc.includes("sort: 'prestigeCount'") || moduleSrc.includes('this.sort = \'prestigeCount\''), 'default Catábases');
staticAssert(moduleSrc.includes('lifetimeSouls'), 'módulo cobre almas');
staticAssert(LOOP_BOARD_SORTS.length === 3, '3 sorts no Loop');
staticAssert(ui.includes('LoopLeaderboard'), 'UIRenderer monta LoopLeaderboard');
staticAssert(indexSrc.includes('getToken:'), 'boot passa getToken');

staticAssert(migrate.includes('lifetimeSouls'), 'migration aceita lifetimeSouls');
staticAssert(migrate.includes('lifetime_souls'), 'migration seleciona lifetime_souls');
staticAssert(setup.includes('lifetimeSouls'), 'setup.sql espelha lifetimeSouls');

staticAssert(LOOP_BOARD_LIMIT === 15, 'limit padrão 15');
staticAssert(
  describeLoopBoardSelf({ rank: 1, prestigeCount: 2, juizoBest: 9, lifetimeSouls: 1000 }, 10, 'juizoBest').includes('recorde'),
  'self juizo',
);
staticAssert(
  describeLoopBoardSelf({ rank: 2, prestigeCount: 4, juizoBest: 40, lifetimeSouls: 1 }, 33, 'prestigeCount').includes('catábases'),
  'self catábases',
);

{
  staticAssert(formatLoopBoardScore(1200, 'prestigeCount') === (1200).toLocaleString('pt-BR'), 'format int');
  // Idle-scale: Number > MAX_SAFE_INTEGER quebrava formatSouls → "inacessível".
  const huge = '9007199254740993000.00';
  staticAssert(
    (() => {
      try {
        const label = formatLoopBoardScore(huge, 'lifetimeSouls');
        return typeof label === 'string' && label.length > 0 && !/e\+/i.test(label);
      } catch {
        return false;
      }
    })(),
    'almas grandes formatam sem throw',
  );
}

if (errors.length) {
  console.error('despertar-loop-board-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('despertar-loop-board-smoke OK');
console.log('  · 3 abas: Juízo / Catábases / Almas');
console.log('  · ranking page chips + colunas');
