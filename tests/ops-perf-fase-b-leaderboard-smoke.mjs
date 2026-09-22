/**
 * Smoke Fase B / Task B5 — leaderboard SQL paginado.
 * docs/otimizacoes/02-tasks-fase-b-rtt-batching.md · contratos-fase-b.md §4
 *
 * Uso: node tests/ops-perf-fase-b-leaderboard-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assembleLeaderboard,
  isLeaderboardRpcMissing,
  LEADERBOARD_PAGE_RPC,
  LEADERBOARD_TOP,
  normalizeLeaderboardLimit,
  normalizeRpcLeaderboardRow,
  rankLeaderboardEntries,
} from '../api/_lib/leaderboard.js';
import { readProgressSurface } from './_helpers/progress-surface.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const migrate = read('db/migrate-2026-09-22-leaderboard-page-rpc.sql');
const setup = read('db/setup.sql');
const lib = read('api/_lib/leaderboard.js');
const progress = readProgressSurface(root);
const apiJs = read('js/api.js');
const faseB = read('docs/otimizacoes/02-tasks-fase-b-rtt-batching.md');
const contratos = read('docs/otimizacoes/contratos-fase-b.md');
const pkg = read('package.json');

assert(migrate.includes('CREATE OR REPLACE FUNCTION public.leaderboard_page'), 'migration cria RPC');
assert(migrate.includes('ORDER BY'), 'RPC ordena no SQL');
assert(migrate.includes('juizo_best_streak') || migrate.includes('juizo_best'), 'RPC join juizo');
assert(migrate.includes('GRANT EXECUTE') && migrate.includes('service_role'), 'GRANT service_role');
assert(setup.includes('leaderboard_page'), 'setup.sql espelha RPC');

assert(lib.includes('fetchLeaderboardPageRpc'), 'helper fetchLeaderboardPageRpc');
assert(lib.includes(LEADERBOARD_PAGE_RPC) || lib.includes("'leaderboard_page'"), 'const RPC');
assert(progress.includes('fetchLeaderboardPageRpc'), 'progress usa RPC');
assert(progress.includes('leaderboard_rpc_fallback=1') || progress.includes('isLeaderboardRpcMissing'), 'fallback legado');
assert(progress.includes('VALID_TURMAS'), 'admin turmas sem full-scan');
assert(apiJs.includes('limit') && apiJs.includes('leaderboardGet'), 'cliente aceita limit');

assert(/Task B5|leaderboard_page|Leaderboard SQL/i.test(faseB), 'doc Fase B cobre B5');
assert(contratos.includes('leaderboard') || contratos.includes('LEADERBOARD_TOP'), 'contrato §4');
assert(pkg.includes('ops-perf-fase-b-leaderboard-smoke.mjs'), 'npm check inclui este smoke');

assert(normalizeLeaderboardLimit(10) === 10, 'limit 10');
assert(normalizeLeaderboardLimit(999) === 200, 'limit capped 200');
assert(normalizeLeaderboardLimit('x') === LEADERBOARD_TOP, 'limit default');

assert(isLeaderboardRpcMissing({ code: 'PGRST202', message: 'Could not find' }), 'detect missing RPC');

{
  const row = normalizeRpcLeaderboardRow({
    rank: 2,
    userId: 7,
    username: 'alfa',
    fullName: 'Alfa',
    turma: 'TCG01',
    xp: 40,
    achievements: 3,
    juizoBest: 9,
  });
  assert(row?.rank === 2 && row.userId === 7 && row.juizoBest === 9, 'normalize RPC row');
}

{
  // Paridade top-N: assemble legado vs ordenação esperada (fixture pequena).
  const users = [
    { id: 1, username: 'zeta', full_name: 'Z', turma: 'TCG01', xp: 50, conquistas: ['a'] },
    { id: 2, username: 'alfa', full_name: 'A', turma: 'TCG01', xp: 100, conquistas: ['a', 'b'] },
    { id: 3, username: 'beta', full_name: 'B', turma: 'TCG01', xp: 100, conquistas: [] },
  ];
  const juizo = new Map([[1, 0], [2, 5], [3, 1]]);
  const payload = assembleLeaderboard(users, juizo, { sort: 'xp', viewerUserId: 1, topN: 2 });
  assert(payload.entries.length === 2, 'topN=2');
  assert(payload.entries[0].username === 'alfa', 'empate XP → username ASC');
  assert(payload.entries[1].username === 'beta', 'segundo no top');
  assert(payload.self?.userId === 1 && payload.self.rank === 3, 'self fora do top com rank');

  const byJuizo = rankLeaderboardEntries(
    users.map((u) => ({
      userId: u.id,
      username: u.username,
      fullName: u.full_name,
      turma: u.turma,
      xp: u.xp,
      achievements: u.conquistas.length,
      juizoBest: juizo.get(u.id) || 0,
    })),
    'juizoBest',
  );
  assert(byJuizo[0].username === 'alfa', 'sort juizoBest no fixture');
}

if (errors.length) {
  console.error('ops-perf-fase-b-leaderboard-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-b-leaderboard-smoke OK');
console.log('  RPC leaderboard_page + fallback + paridade top-N fixture');
