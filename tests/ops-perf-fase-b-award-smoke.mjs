/**
 * Smoke Fase B / Task B4 — award / conquistas com menos RTT.
 * docs/otimizacoes/02-tasks-fase-b-rtt-batching.md · D8
 *
 * Uso: node tests/ops-perf-fase-b-award-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planDespertarAwards, isDespertarSyncRpcEnabled } from '../api/_lib/despertar-persist-rpc.js';
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

const despertarSrc = read('api/despertar.js');
const progressSrc = readProgressSurface(root);
const rpcLib = read('api/_lib/despertar-persist-rpc.js');
const faseB = read('docs/otimizacoes/02-tasks-fase-b-rtt-batching.md');
const pkg = read('package.json');

// B3/B4: path RPC cobre grant Despertar sem SELECT/UPDATE separados de users.
assert(despertarSrc.includes('persistPatchAndAward'), 'persistPatchAndAward (B3/B4)');
assert(despertarSrc.includes('isDespertarSyncRpcEnabled'), 'flag RPC');
assert(despertarSrc.includes('planDespertarAwards'), 'awards planejados em memória');
assert(despertarSrc.includes('grantDespertarAchievements'), 'grant legado mantido');
assert(/snapshot|conquistas/i.test(despertarSrc), 'grant aceita snapshot');

// Hotspot progress redeem: UPDATE … RETURNING, sem SELECT separado pós-update.
{
  const redeemIdx = progressSrc.indexOf('export async function redeem');
  assert(redeemIdx > 0, 'action redeem existe');
  const redeemSlice = progressSrc.slice(redeemIdx, redeemIdx + 4500);
  assert(redeemSlice.includes(".select('*')"), 'redeem usa RETURNING/select no update');
  assert(
    !/update\(\{[\s\S]*conquistas: newAchievements[\s\S]*\}\)\s*\.eq\('id', userId\);\s*if \(userUpdateError\)/.test(redeemSlice),
    'redeem não faz update sem returning (legado B4)',
  );
  // Não deve haver select('*') solto após o update de conquistas do redeem.
  assert(
    !redeemSlice.includes(".from(USERS_TABLE).select('*').eq('id', userId).limit(1).single()"),
    'redeem sem re-SELECT separado de users',
  );
  assert(redeemSlice.includes('metricsBumpDb'), 'redeem conta RTT');
}

assert(progressSrc.includes('awardAchievementIds'), 'awardAchievementIds existe');
assert(
  /async function awardAchievementIds[\s\S]*metricsBumpDb\(1\)/.test(progressSrc),
  'awardAchievementIds conta RTT',
);
assert(
  /B4|D8|RETURNING|sem SELECT prévio/i.test(progressSrc),
  'progress documenta padrão B4/D8',
);

assert(rpcLib.includes('planDespertarAwards'), 'helper plan awards');
assert(/Task B4|award|conquistas/i.test(faseB), 'doc Fase B cobre B4');
assert(faseB.includes('redeem') || faseB.includes('UPDATE') || faseB.includes('hotspot'), 'doc menciona hotspot progress');
assert(pkg.includes('ops-perf-fase-b-award-smoke.mjs'), 'npm check inclui este smoke');

{
  const prev = process.env.DESPERTAR_SYNC_RPC;
  process.env.DESPERTAR_SYNC_RPC = '1';
  assert(isDespertarSyncRpcEnabled() === true, 'flag on');
  if (prev === undefined) delete process.env.DESPERTAR_SYNC_RPC;
  else process.env.DESPERTAR_SYNC_RPC = prev;
}

{
  // Planejamento server-side: ids já filtrados em memória a partir do user carregado.
  const user = { xp: 0, conquistas: [] };
  const plan = planDespertarAwards(user, {
    souls: '0',
    generators: {},
    upgrades: [],
    talents: [],
    milestones: {},
    eduLogsSeen: [],
    prestigeCount: 0,
    lifetimeSouls: '0',
    juizoBestStreak: 0,
  });
  assert(Array.isArray(plan.fresh), 'plan.fresh é array');
  assert(typeof plan.xpGain === 'number', 'plan.xpGain numérico');
}

if (errors.length) {
  console.error('ops-perf-fase-b-award-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-b-award-smoke OK');
console.log('  Despertar RPC grant + redeem UPDATE RETURNING (sem re-SELECT)');
