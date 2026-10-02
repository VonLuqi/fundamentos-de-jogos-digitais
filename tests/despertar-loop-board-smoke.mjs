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
import {
  normalizeLeaderboardSort,
  rankLeaderboardEntries,
  toLeaderboardEntry,
} from '../api/_lib/leaderboard.js';

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
  'db/migrate-2026-10-02-leaderboard-prestige-count.sql',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const html = read('pages/despertar.html');
const css = read('css/despertar.css');
const ui = read('js/hades-despertar/ui/UIRenderer.js');
const moduleSrc = read('js/hades-despertar/ui/LoopLeaderboard.js');
const indexSrc = read('js/hades-despertar/index.js');
const migrate = read('db/migrate-2026-10-02-leaderboard-prestige-count.sql');
const setup = read('db/setup.sql');
const lib = read('api/_lib/leaderboard.js');
const pkg = read('package.json');

staticAssert(html.includes('id="despertar-loop-board"'), 'FAB do Placar do Loop');
staticAssert(html.includes('id="despertar-loop-board-drawer"'), 'drawer do Placar do Loop');
staticAssert(html.includes('id="loop-board-list"'), 'lista do placar');
staticAssert(html.includes('href="./ranking.html"'), 'link para Placar completo');
staticAssert(html.includes('Catábases'), 'copy Catábases no blurb');
staticAssert(html.indexOf('despertar-codex-book') < html.indexOf('despertar-loop-board'), 'ícone perto do Códice');

staticAssert(css.includes('.despertar-loop-board'), 'CSS FAB loop board');
staticAssert(css.includes('.despertar-loop-board-row'), 'CSS rows');

staticAssert(moduleSrc.includes("sort: 'prestigeCount'"), 'ordena por prestigeCount');
staticAssert(moduleSrc.includes("scope: 'turma'"), 'escopo turma');
staticAssert(moduleSrc.includes('leaderboardGet'), 'usa leaderboardGet');
staticAssert(moduleSrc.includes('prestigeCount'), 'score prestigeCount');
staticAssert(ui.includes('LoopLeaderboard'), 'UIRenderer monta LoopLeaderboard');
staticAssert(ui.includes('#mountLoopBoard'), 'UIRenderer #mountLoopBoard');
staticAssert(indexSrc.includes('getToken:'), 'boot passa getToken');

staticAssert(migrate.includes("prestigeCount"), 'migration aceita prestigeCount');
staticAssert(migrate.includes('prestige_count'), 'migration seleciona prestige_count');
staticAssert(setup.includes("prestigeCount"), 'setup.sql espelha prestigeCount');
staticAssert(lib.includes("'prestigeCount'"), 'LEADERBOARD_SORTS inclui prestigeCount');

staticAssert(pkg.includes('despertar-loop-board-smoke.mjs'), 'check inclui smoke');
staticAssert(LOOP_BOARD_LIMIT === 15, 'limit padrão 15');
staticAssert(formatLoopBoardScore(1200) === (1200).toLocaleString('pt-BR'), 'format score');
staticAssert(normalizeLeaderboardSort('prestigeCount') === 'prestigeCount', 'normalize prestigeCount');
staticAssert(
  describeLoopBoardSelf({ rank: 2, prestigeCount: 4, juizoBest: 40 }, 33).includes('#2'),
  'self line inclui rank',
);
staticAssert(
  describeLoopBoardSelf({ rank: 2, prestigeCount: 4, juizoBest: 40 }, 33).includes('Ouro'),
  'self line inclui pódio',
);
staticAssert(
  describeLoopBoardSelf({ rank: 2, prestigeCount: 4, juizoBest: 40 }, 33).includes('catábases'),
  'self line inclui catábases',
);

{
  const ranked = rankLeaderboardEntries([
    toLeaderboardEntry({ id: 1, username: 'a', full_name: 'A', turma: 'TCG01', xp: 10, conquistas: [] }, { juizoBest: 9, prestigeCount: 1 }),
    toLeaderboardEntry({ id: 2, username: 'b', full_name: 'B', turma: 'TCG01', xp: 10, conquistas: [] }, { juizoBest: 2, prestigeCount: 3 }),
    toLeaderboardEntry({ id: 3, username: 'c', full_name: 'C', turma: 'TCG01', xp: 10, conquistas: [] }, { juizoBest: 40, prestigeCount: 3 }),
  ], 'prestigeCount');
  staticAssert(ranked[0].username === 'c', 'prestige empatado → juizo desempata');
  staticAssert(ranked[1].username === 'b', 'segundo por prestige');
  staticAssert(ranked[2].username === 'a', 'menor prestige por último');
}

if (errors.length) {
  console.error('despertar-loop-board-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('despertar-loop-board-smoke OK');
console.log('  · FAB ao lado do Códice');
console.log('  · drawer turma · prestigeCount (Catábases)');
