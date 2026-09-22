/**
 * Smoke Task 20 — Placar do Domínio
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/ranking-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assembleLeaderboard,
  LEADERBOARD_TOP,
  normalizeLeaderboardScope,
  normalizeLeaderboardSort,
  rankLeaderboardEntries,
  toLeaderboardEntry,
} from '../api/_lib/leaderboard.js';
import { readProgressSurface } from './_helpers/progress-surface.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const html = read('pages/ranking.html');
const dashboardHtml = read('pages/dashboard.html');
const rankingJs = read('js/ranking.js');
const apiJs = read('js/api.js');
const progressApi = readProgressSurface(root);
const pkg = read('package.json');
const dashboardJs = read('js/dashboard.js');

staticAssert(fs.existsSync(path.join(root, 'pages/ranking.html')), 'pages/ranking.html');
staticAssert(fs.existsSync(path.join(root, 'js/ranking.js')), 'js/ranking.js');
staticAssert(fs.existsSync(path.join(root, 'css/ranking.css')), 'css/ranking.css');
staticAssert(fs.existsSync(path.join(root, 'api/_lib/leaderboard.js')), 'leaderboard.js');

staticAssert(html.includes('PLACAR DO'), 'título Placar');
staticAssert(html.includes('data-ranking-scope="turma"'), 'escopo turma');
staticAssert(html.includes('data-ranking-scope="global"'), 'escopo global');
staticAssert(html.includes('data-ranking-sort="juizoBest"'), 'sort juizoBest');
staticAssert(!html.includes('data-nav-item="ranking"'), 'sem item nav extra (teto)');

staticAssert(dashboardHtml.includes('id="ranking-preview"'), 'CTA no Painel');
staticAssert(dashboardHtml.includes('Ver o Placar'), 'copy Ver o Placar');
staticAssert(dashboardJs.includes('ROUTES.ranking'), 'dashboard wire ROUTES.ranking');

staticAssert(apiJs.includes('ranking:'), 'ROUTES.ranking');
staticAssert(apiJs.includes('leaderboardGet'), 'cliente leaderboardGet');
staticAssert(progressApi.includes("action === 'leaderboardGet'"), 'API leaderboardGet');
staticAssert(progressApi.includes('rejectUnlessMessengerSeal'), 'selo no progress');
staticAssert(
  progressApi.includes('juizo_best_streak') || progressApi.includes('fetchLeaderboardPageRpc'),
  'join juizo via RPC ou legado',
);
staticAssert(
  progressApi.includes('fetchLeaderboardPageRpc') || progressApi.includes('leaderboard_page'),
  'B5 path SQL/RPC',
);
staticAssert(apiJs.includes('limit') && /leaderboardGet[\s\S]*limit/.test(apiJs), 'cliente limit opcional');
staticAssert(rankingJs.includes('leaderboardGet'), 'ranking.js chama API');
staticAssert(pkg.includes('ranking-smoke.mjs'), 'check inclui ranking-smoke');

staticAssert(normalizeLeaderboardScope('GLOBAL') === 'global', 'scope normalize');
staticAssert(normalizeLeaderboardScope('x') === 'turma', 'scope default turma');
staticAssert(normalizeLeaderboardSort('juizoBest') === 'juizoBest', 'sort juizoBest');
staticAssert(normalizeLeaderboardSort('nope') === 'xp', 'sort default xp');
staticAssert(LEADERBOARD_TOP === 50, 'top 50');

if (errors.length) {
  console.error('ranking-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}

run('ordenação estável por XP e desempate username', () => {
  const ranked = rankLeaderboardEntries([
    { userId: 2, username: 'beta', fullName: 'B', turma: 'TCG01', xp: 100, achievements: 1, juizoBest: 0 },
    { userId: 1, username: 'alfa', fullName: 'A', turma: 'TCG01', xp: 100, achievements: 1, juizoBest: 0 },
    { userId: 3, username: 'zeta', fullName: 'Z', turma: 'TCG01', xp: 50, achievements: 9, juizoBest: 40 },
  ], 'xp');
  assert.equal(ranked[0].username, 'alfa');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].username, 'beta');
  assert.equal(ranked[2].username, 'zeta');
});

run('sort juizoBest e achievements', () => {
  const rows = [
    { userId: 1, username: 'a', fullName: 'A', turma: 'TCG01', xp: 10, achievements: 2, juizoBest: 5 },
    { userId: 2, username: 'b', fullName: 'B', turma: 'TCG01', xp: 99, achievements: 8, juizoBest: 1 },
  ];
  assert.equal(rankLeaderboardEntries(rows, 'juizoBest')[0].username, 'a');
  assert.equal(rankLeaderboardEntries(rows, 'achievements')[0].username, 'b');
});

run('sem despertar_states → juizoBest 0; self fora do top', () => {
  const users = [];
  for (let i = 1; i <= 55; i += 1) {
    users.push({
      id: i,
      username: `u${String(i).padStart(2, '0')}`,
      full_name: `User ${i}`,
      turma: 'TCG01',
      xp: 1000 - i,
      conquistas: i % 3 === 0 ? ['a', 'b'] : ['a'],
    });
  }
  users.push({
    id: 999,
    username: 'late',
    full_name: 'Late Soul',
    turma: 'TCG01',
    xp: 1,
    conquistas: [],
  });

  const payload = assembleLeaderboard(users, new Map(), {
    sort: 'xp',
    viewerUserId: 999,
    topN: 50,
  });
  assert.equal(payload.entries.length, 50);
  assert.ok(!payload.entries.some((row) => row.userId === 999));
  assert.equal(payload.self?.userId, 999);
  assert.equal(payload.self?.juizoBest, 0);
  assert.ok(payload.self.rank > 50);
  assert.ok(!Object.prototype.hasOwnProperty.call(payload.entries[0], 'souls'));
  assert.ok(!Object.prototype.hasOwnProperty.call(payload.entries[0], 'sps'));
  assert.ok(!Object.prototype.hasOwnProperty.call(payload.entries[0], 'obols'));
});

run('toLeaderboardEntry respeita juizo do mapa', () => {
  const entry = toLeaderboardEntry(
    { id: 7, username: 'x', full_name: 'X', turma: 'TCG02', xp: 12, conquistas: ['a', 'b', 'c'] },
    25,
  );
  assert.equal(entry.achievements, 3);
  assert.equal(entry.juizoBest, 25);
  assert.equal(entry.turma, 'TCG02');
});

run('turma ≠ global nos payloads montados', () => {
  const users = [
    { id: 1, username: 'a', full_name: 'A', turma: 'TCG01', xp: 10, conquistas: [] },
    { id: 2, username: 'b', full_name: 'B', turma: 'TCG02', xp: 20, conquistas: [] },
  ];
  const juizo = new Map([[1, 3], [2, 9]]);
  const turmaOnly = assembleLeaderboard(
    users.filter((u) => u.turma === 'TCG01'),
    juizo,
    { sort: 'xp', viewerUserId: 1 },
  );
  const globalAll = assembleLeaderboard(users, juizo, { sort: 'xp', viewerUserId: 1 });
  assert.equal(turmaOnly.total, 1);
  assert.equal(globalAll.total, 2);
  assert.equal(globalAll.entries[0].username, 'b');
});

console.log(`\nranking-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
