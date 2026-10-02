/**
 * Smoke — Placar do Loop (in-game leaderboard no Despertar).
 * Uso: node tests/despertar-loop-board-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  describeLoopBoardSelf,
  formatLoopBoardScore,
  LOOP_BOARD_LIMIT,
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
  'css/despertar.css',
  'js/hades-despertar/ui/LoopLeaderboard.js',
  'js/hades-despertar/ui/UIRenderer.js',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const html = read('pages/despertar.html');
const css = read('css/despertar.css');
const ui = read('js/hades-despertar/ui/UIRenderer.js');
const moduleSrc = read('js/hades-despertar/ui/LoopLeaderboard.js');
const indexSrc = read('js/hades-despertar/index.js');
const pkg = read('package.json');

staticAssert(html.includes('id="despertar-loop-board"'), 'FAB do Placar do Loop');
staticAssert(html.includes('id="despertar-loop-board-drawer"'), 'drawer do Placar do Loop');
staticAssert(html.includes('id="loop-board-list"'), 'lista do placar');
staticAssert(html.includes('href="./ranking.html"'), 'link para Placar completo');
staticAssert(html.indexOf('despertar-codex-book') < html.indexOf('despertar-loop-board'), 'ícone perto do Códice');

staticAssert(css.includes('.despertar-loop-board'), 'CSS FAB loop board');
staticAssert(css.includes('.despertar-loop-board-row'), 'CSS rows');

staticAssert(moduleSrc.includes("sort: 'juizoBest'"), 'ordena por juizoBest');
staticAssert(moduleSrc.includes("scope: 'turma'"), 'escopo turma');
staticAssert(moduleSrc.includes('leaderboardGet'), 'usa leaderboardGet');
staticAssert(ui.includes('LoopLeaderboard'), 'UIRenderer monta LoopLeaderboard');
staticAssert(ui.includes('#mountLoopBoard'), 'UIRenderer #mountLoopBoard');
staticAssert(indexSrc.includes('getToken:'), 'boot passa getToken');

staticAssert(pkg.includes('despertar-loop-board-smoke.mjs'), 'check inclui smoke');
staticAssert(LOOP_BOARD_LIMIT === 15, 'limit padrão 15');
staticAssert(formatLoopBoardScore(1200) === (1200).toLocaleString('pt-BR'), 'format score');
staticAssert(
  describeLoopBoardSelf({ rank: 2, juizoBest: 40 }, 33).includes('#2'),
  'self line inclui rank',
);
staticAssert(
  describeLoopBoardSelf({ rank: 2, juizoBest: 40 }, 33).includes('Ouro'),
  'self line inclui pódio',
);

if (errors.length) {
  console.error('despertar-loop-board-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('despertar-loop-board-smoke OK');
console.log('  · FAB ao lado do Códice');
console.log('  · drawer turma · juizoBest');
