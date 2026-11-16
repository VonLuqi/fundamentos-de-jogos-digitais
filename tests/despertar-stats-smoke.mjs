/**
 * Smoke Fase D / Task D1 — stats jsonb (clicks / max_buy / juizo_tie).
 * docs/plano-despertar-producao-profundo.md
 *
 * Uso: node tests/despertar-stats-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bumpClicks,
  bumpJuizoTieWins,
  bumpMaxBuyBiggest,
  emptyDespertarStats,
  mergeDespertarStats,
  normalizeDespertarStats,
  statsToDto,
  statsToRowJson,
} from '../api/_lib/despertar-stats.js';
import {
  buildStateDto,
  rowToCanonical,
  validateSync,
} from '../api/_lib/despertar-validate.js';
import {
  isCorrectJuizoGuess,
  juizoGuess,
  juizoPatchFromState,
  juizoStart,
} from '../api/_lib/despertar-juizo.js';
import { JUIZO_READY_POOL } from '../js/hades-despertar/config/juizo-pool.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const migrate = 'db/migrate-2026-09-28-despertar-stats.sql';
const helpers = 'api/_lib/despertar-stats.js';

[
  migrate,
  helpers,
  'api/_lib/despertar-validate.js',
  'api/_lib/despertar-juizo.js',
  'db/setup.sql',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const migrateSql = fs.readFileSync(path.join(root, migrate), 'utf8');
staticAssert(migrateSql.includes('ADD COLUMN IF NOT EXISTS stats'), 'migration ADD stats');
staticAssert(migrateSql.includes('max_buy_biggest'), 'migration shape max_buy');
staticAssert(migrateSql.includes('juizo_tie_wins'), 'migration shape juizo_tie');
staticAssert(migrateSql.includes("v_patch ? 'stats'"), 'RPC CASE stats');

const setupSql = fs.readFileSync(path.join(root, 'db/setup.sql'), 'utf8');
staticAssert(setupSql.includes('stats jsonb NOT NULL DEFAULT'), 'setup.sql coluna stats');
staticAssert(setupSql.includes("v_patch ? 'stats'"), 'setup RPC CASE stats');

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-stats-smoke.mjs'), 'npm run check inclui este smoke');
staticAssert(pkg.includes('api/_lib/despertar-stats.js'), 'check cobre despertar-stats.js');

const apiSrc = fs.readFileSync(path.join(root, 'api/despertar.js'), 'utf8');
staticAssert(apiSrc.includes("'stats'"), 'ROW_SELECT inclui stats');

const validateSrc = fs.readFileSync(path.join(root, 'api/_lib/despertar-validate.js'), 'utf8');
staticAssert(validateSrc.includes('bumpMaxBuyBiggest'), 'validate bump max buy');
staticAssert(validateSrc.includes('normalizeDespertarStats'), 'validate normalize stats');

const juizoSrc = fs.readFileSync(path.join(root, 'api/_lib/despertar-juizo.js'), 'utf8');
staticAssert(juizoSrc.includes('bumpJuizoTieWins'), 'juizo bump tie wins');
staticAssert(juizoSrc.includes("pick === 'tie'"), 'juizo só incrementa no empate');

// --- helpers ---
{
  const empty = emptyDespertarStats();
  assert.equal(empty.clicks, 0);
  assert.equal(empty.maxBuyBiggest, 0);
  assert.equal(empty.juizoTieWins, 0);

  const fromSnake = normalizeDespertarStats({
    clicks: 3,
    max_buy_biggest: 50,
    juizo_tie_wins: 2,
  });
  assert.equal(fromSnake.maxBuyBiggest, 50);
  assert.equal(fromSnake.juizoTieWins, 2);

  const row = statsToRowJson(fromSnake);
  assert.equal(row.max_buy_biggest, 50);
  assert.equal(row.juizo_tie_wins, 2);

  const dto = statsToDto(row);
  assert.equal(dto.maxBuyBiggest, 50);

  const merged = mergeDespertarStats(
    { clicks: 10, maxBuyBiggest: 5, juizoTieWins: 1 },
    { clicks: 4, max_buy_biggest: 40, juizo_tie_wins: 0 },
  );
  assert.equal(merged.clicks, 10, 'merge nunca desce clicks');
  assert.equal(merged.maxBuyBiggest, 40);
  assert.equal(merged.juizoTieWins, 1);

  assert.equal(bumpClicks(empty, 5).clicks, 5);
  assert.equal(bumpMaxBuyBiggest(empty, 25).maxBuyBiggest, 25);
  assert.equal(bumpMaxBuyBiggest({ maxBuyBiggest: 100 }, 25).maxBuyBiggest, 100);
  assert.equal(bumpJuizoTieWins(empty).juizoTieWins, 1);
}

// --- row / dto ---
{
  const row = {
    souls: '10.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '10.00',
    run_souls: '10.00',
    prestige_count: 0,
    generators_state: {},
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
    stats: { clicks: 7, max_buy_biggest: 30, juizo_tie_wins: 1 },
    verdicts: 0,
    juizo_best_streak: 0,
    juizo_current_streak: 0,
    juizo_milestones_claimed: [],
    verdict_purchases: [],
    juizo_run: null,
    last_sync_at: new Date().toISOString(),
  };
  const canonical = rowToCanonical(row);
  assert.equal(canonical.stats.clicks, 7);
  assert.equal(canonical.stats.maxBuyBiggest, 30);

  const dto = buildStateDto(canonical);
  assert.equal(dto.stats.clicks, 7);
  assert.equal(dto.stats.juizoTieWins, 1);

  const legacy = rowToCanonical({ ...row, stats: undefined });
  assert.equal(legacy.stats.clicks, 0, 'stats ausente → zeros');
}

// --- sync bump max_buy ---
{
  const now = new Date();
  const last = new Date(now.getTime() - 60_000).toISOString();
  const dbRow = {
    souls: '100000.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '100000.00',
    run_souls: '100000.00',
    prestige_count: 0,
    generators_state: { wandering_shade: 0 },
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
    stats: {},
    verdicts: 0,
    juizo_best_streak: 0,
    juizo_current_streak: 0,
    juizo_milestones_claimed: [],
    verdict_purchases: [],
    juizo_run: null,
    last_sync_at: last,
  };
  const result = validateSync(dbRow, {
    souls: '96808.10',
    generators: { wandering_shade: 25 },
    upgrades: [],
    runSouls: '100000.00',
    lifetimeSouls: '100000.00',
    eduLogsSeen: [],
    milestones: {},
    lastSyncAt: last,
  }, now);
  assert.equal(result.ok, true, `sync ok: ${result.error || ''}`);
  assert.equal(result.next.stats.maxBuyBiggest, 25, 'max buy 25 no lote');
  assert.equal(result.patch.stats.max_buy_biggest, 25);
}

// --- juizo tie wins ---
{
  const seeded = (() => {
    let i = 0;
    const seq = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    return () => seq[i++ % seq.length];
  })();

  let state = {
    verdicts: 0,
    juizoBestStreak: 0,
    juizoCurrentStreak: 0,
    juizoMilestonesClaimed: [],
    verdictPurchases: [],
    juizoRun: null,
    stats: emptyDespertarStats(),
  };

  const started = juizoStart(state, JUIZO_READY_POOL, { rng: seeded });
  assert.equal(started.ok, true, started.error || 'juizoStart');
  state = started.next;

  const run = state.juizoRun;
  assert.ok(run?.ratingA && run?.ratingB, 'run com ratings');

  // Força cenário de empate: se ratings diferentes, reescreve run para empate.
  if (run.ratingA !== run.ratingB) {
    state = {
      ...state,
      juizoRun: { ...run, ratingA: run.ratingA, ratingB: run.ratingA },
    };
  }
  assert.equal(
    isCorrectJuizoGuess(state.juizoRun.ratingA, state.juizoRun.ratingB, 'tie'),
    true,
  );

  const guessed = juizoGuess(state, 'tie', JUIZO_READY_POOL, { rng: seeded });
  assert.equal(guessed.ok, true, guessed.error || 'juizoGuess tie');
  assert.equal(guessed.next.stats.juizoTieWins, 1);

  const patch = juizoPatchFromState(guessed.next);
  assert.equal(patch.stats.juizo_tie_wins, 1);

  // Acerto A/B não incrementa tie wins
  const started2 = juizoStart(
    { ...guessed.next, juizoRun: null },
    JUIZO_READY_POOL,
    { rng: seeded },
  );
  assert.equal(started2.ok, true);
  let s2 = started2.next;
  const r2 = s2.juizoRun;
  // Força A vence (campeão maior): ratingA > ratingB → choice A
  // Usamos ordem do pool — set ratings distintos e pick correto.
  const order = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
  const hi = order[order.length - 1];
  const lo = order[0];
  s2 = {
    ...s2,
    juizoRun: { ...r2, ratingA: hi, ratingB: lo },
  };
  const before = s2.stats.juizoTieWins;
  const g2 = juizoGuess(s2, 'A', JUIZO_READY_POOL, { rng: seeded });
  assert.equal(g2.ok, true, g2.error || 'juizoGuess A');
  assert.equal(g2.next.stats.juizoTieWins, before, 'A/B não bumpa tie');
}

if (errors.length) {
  console.error('despertar-stats-smoke FAIL:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log('despertar-stats-smoke OK');
