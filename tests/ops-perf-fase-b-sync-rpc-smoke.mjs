/**
 * Smoke Fase B / Task B3 — RPC híbrida stateSync (DESPERTAR_SYNC_RPC).
 * docs/otimizacoes/02-tasks-fase-b-rtt-batching.md · contratos-fase-b.md §2
 *
 * Uso: node tests/ops-perf-fase-b-sync-rpc-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  awardedFromPlan,
  DESPERTAR_PERSIST_RPC,
  isDespertarPersistRpcMissing,
  isDespertarSyncRpcEnabled,
  planDespertarAwards,
} from '../api/_lib/despertar-persist-rpc.js';
import { validateSync } from '../api/_lib/despertar-validate.js';

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

const migrate = read('db/migrate-2026-09-22-despertar-persist-award-rpc.sql');
const setup = read('db/setup.sql');
const rpcLib = read('api/_lib/despertar-persist-rpc.js');
const despertarSrc = read('api/despertar.js');
const validateSrc = read('api/_lib/despertar-validate.js');
const contratos = read('docs/otimizacoes/contratos-fase-b.md');
const faseB = read('docs/otimizacoes/02-tasks-fase-b-rtt-batching.md');
const envExample = read('.env.example');
const pkg = read('package.json');

assert(migrate.includes('CREATE OR REPLACE FUNCTION public.despertar_persist_and_award'), 'migration cria RPC');
assert(migrate.includes('p_user_id integer'), 'RPC p_user_id integer');
assert(migrate.includes('GRANT EXECUTE') && migrate.includes('service_role'), 'GRANT EXECUTE service_role');
assert(migrate.includes('SECURITY DEFINER'), 'SECURITY DEFINER');
assert(setup.includes('despertar_persist_and_award'), 'setup.sql espelha RPC');

assert(rpcLib.includes('DESPERTAR_SYNC_RPC'), 'helper lê flag');
assert(rpcLib.includes("rpc('despertar_persist_and_award'") || rpcLib.includes('DESPERTAR_PERSIST_RPC'), 'helper chama rpc');
assert(rpcLib.includes('planDespertarAwards'), 'plan awards em Node');

assert(despertarSrc.includes('persistPatchAndAward'), 'handler usa persistPatchAndAward');
assert(despertarSrc.includes('isDespertarSyncRpcEnabled'), 'handler checa flag');
assert(despertarSrc.includes('sync_rpc_fallback=1'), 'log de fallback');
assert(/validateSync[\s\S]*persistPatchAndAward/.test(despertarSrc), 'validateSync antes do persist/RPC');
assert(despertarSrc.includes("action === 'stateSync'"), 'stateSync presente');

// validateSync permanece a fonte de regras (D1) — arquivo não deve sumir nem ser esvaziado.
assert(validateSrc.includes('export function validateSync'), 'despertar-validate intacto');
assert(validateSrc.length > 500, 'despertar-validate não esvaziado');

assert(contratos.includes('DESPERTAR_SYNC_RPC'), 'contrato documenta flag');
assert(contratos.includes('despertar_persist_and_award'), 'contrato nome RPC');
assert(/Task B3|DESPERTAR_SYNC_RPC|persist_and_award/i.test(faseB), 'doc Fase B cobre B3');
assert(envExample.includes('DESPERTAR_SYNC_RPC'), '.env.example documenta flag');
assert(pkg.includes('ops-perf-fase-b-sync-rpc-smoke.mjs'), 'npm check inclui este smoke');
assert(pkg.includes('api/_lib/despertar-persist-rpc.js'), 'npm check syntax-check helper');

assert(DESPERTAR_PERSIST_RPC === 'despertar_persist_and_award', 'const nome RPC');

{
  const prev = process.env.DESPERTAR_SYNC_RPC;
  delete process.env.DESPERTAR_SYNC_RPC;
  assert(isDespertarSyncRpcEnabled() === false, 'flag default off');
  process.env.DESPERTAR_SYNC_RPC = '0';
  assert(isDespertarSyncRpcEnabled() === false, 'flag 0 = off');
  process.env.DESPERTAR_SYNC_RPC = '1';
  assert(isDespertarSyncRpcEnabled() === true, 'flag 1 = on');
  if (prev === undefined) delete process.env.DESPERTAR_SYNC_RPC;
  else process.env.DESPERTAR_SYNC_RPC = prev;
}

assert(
  isDespertarPersistRpcMissing({ code: 'PGRST202', message: 'Could not find the function' }),
  'detecta RPC ausente PGRST202',
);
assert(
  isDespertarPersistRpcMissing({ message: 'function despertar_persist_and_award does not exist' }),
  'detecta RPC ausente por message',
);

{
  // Paridade de planejamento: mesmo filtro de conquistas que o grant legado.
  const user = { xp: 10, conquistas: ['despertar_primeira_alma'] };
  const planEmpty = planDespertarAwards(user, {
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
  assert(Array.isArray(planEmpty.fresh), 'plan retorna fresh[]');
  const awardedEmpty = awardedFromPlan(planEmpty);
  assert(awardedEmpty.xp === 0 && awardedEmpty.achievements.length === 0, 'plan vazio → awarded vazio');
}

{
  // validateSync continua a porta de autoridade (CPU Node) — smoke de sanidade.
  const now = new Date('2026-09-22T12:00:00.000Z');
  const dbRow = {
    user_id: 1,
    souls: '0',
    obols: '0',
    mnemosyne: '0',
    lifetime_souls: '0',
    run_souls: '0',
    prestige_count: 0,
    generators_state: {},
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
    verdicts: 0,
    juizo_best_streak: 0,
    juizo_current_streak: 0,
    juizo_milestones_claimed: [],
    verdict_purchases: [],
    juizo_run: null,
    last_sync_at: now.toISOString(),
  };
  const refused = validateSync(dbRow, { souls: '-1' }, now);
  assert(refused.ok === false, 'validateSync ainda recusa estado inválido');
}

if (errors.length) {
  console.error('ops-perf-fase-b-sync-rpc-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-b-sync-rpc-smoke OK');
console.log('  migration + flag + validateSync-before-RPC + fallback log');
