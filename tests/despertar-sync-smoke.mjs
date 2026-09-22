/**
 * Smoke Task 9 — /api/despertar sync autoritativo
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-sync-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import despertarHandler from '../api/despertar.js';
import {
  applyPrestige,
  applyTalentBuy,
  buildStateDto,
  validateSync,
} from '../api/_lib/despertar-validate.js';
import { getGenerator } from '../js/hades-despertar/config/generators.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

[
  'api/despertar.js',
  'api/_lib/despertar-validate.js',
  'js/hades-despertar/services/ApiService.js',
  'js/hades-despertar/core/formulas.js',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-sync-smoke.mjs'), 'npm run check inclui este smoke');
staticAssert(pkg.includes('api/_lib/despertar-validate.js'), 'check cobre validate');
staticAssert(pkg.includes('js/hades-despertar/services/ApiService.js'), 'check cobre ApiService');

const apiSrc = fs.readFileSync(path.join(root, 'api/despertar.js'), 'utf8');
staticAssert(apiSrc.includes('validateSync'), 'handler usa validateSync');
staticAssert(apiSrc.includes("action === 'stateSync'"), 'stateSync implementado');
staticAssert(apiSrc.includes('persistPatchAndAward') || apiSrc.includes('persistPatch'), 'persistência de estado');
staticAssert(apiSrc.includes("'shiny_counts'") || apiSrc.includes('shiny_counts'), 'ROW_SELECT shiny_counts G4.3');
staticAssert(apiSrc.includes('DESPERTAR_SYNC_RPC') || apiSrc.includes('isDespertarSyncRpcEnabled'), 'flag RPC B3');
staticAssert(apiSrc.includes("action === 'prestige'"), 'prestige implementado');
staticAssert(apiSrc.includes("action === 'talentBuy'"), 'talentBuy implementado');
staticAssert(!apiSrc.includes('STUB_ACTIONS'), 'stubs 501 removidos');
staticAssert(apiSrc.includes('isSyncRateLimited') || apiSrc.includes('consumeGameRateLimit'), 'rate limit de sync');
staticAssert(apiSrc.includes('applyRetryAfterHeader'), '429 sync com Retry-After');
staticAssert(apiSrc.includes('consumeGameRateLimit'), 'sync usa rate-limit-kv');
staticAssert(!apiSrc.includes('syncAttempts'), 'Map syncAttempts removido (A2)');

const boot = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
staticAssert(boot.includes('ApiService'), 'index liga ApiService');
staticAssert(boot.includes('requestSync'), 'flush em compra');
staticAssert(boot.includes('api.start'), 'heartbeat start');

const apiService = fs.readFileSync(path.join(root, 'js/hades-despertar/services/ApiService.js'), 'utf8');
staticAssert(apiService.includes('SYNC_HEARTBEAT_MS') || apiService.includes('30000'), 'heartbeat 30 s');
staticAssert(apiService.includes('SYNC_MIN_INTERVAL_MS') || apiService.includes('5000'), 'mínimo 5 s');
staticAssert(apiService.includes('if (!this._dirty) return') || apiService.includes('!this._dirty'), 'heartbeat dirty-only B6');

if (errors.length) {
  console.error('despertar-sync-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

const makeRes = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return payload;
  },
});

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok — ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL — ${label}`);
    console.error(`  ${error.message}`);
  }
}

async function checkAsync(label, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok — ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL — ${label}`);
    console.error(`  ${error.message}`);
  }
}

function blankRow(overrides = {}) {
  const now = new Date('2026-09-22T12:00:00.000Z');
  return {
    user_id: 1,
    souls: '0.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetime_souls: '0.00',
    run_souls: '0.00',
    prestige_count: 0,
    generators_state: {},
    upgrades_state: [],
    talents_state: [],
    edu_logs_seen: [],
    milestones: {},
    last_sync_at: now.toISOString(),
    ...overrides,
  };
}

await checkAsync('sem token → 401', async () => {
  const res = makeRes();
  await despertarHandler({ method: 'POST', body: { action: 'stateSync', clientState: {} } }, res);
  assert.equal(res.statusCode, 401);
});

check('almas absurdas em Δt≈1 s → 400 + state do DB', () => {
  const db = blankRow({
    souls: '10.00',
    lifetime_souls: '10.00',
    run_souls: '10.00',
    last_sync_at: '2026-09-22T12:00:00.000Z',
  });
  const client = {
    souls: '1000000.00',
    lifetimeSouls: '1000000.00',
    runSouls: '1000000.00',
    generators: {},
    upgrades: [],
    talents: [],
    eduLogsSeen: [],
    milestones: {},
    lastSyncAt: db.last_sync_at,
  };
  const result = validateSync(db, client, new Date('2026-09-22T12:00:01.000Z'));
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.ok(result.state);
  assert.equal(result.state.souls, '10.00');
});

check('compra T1 com souls suficientes no DB → ok', () => {
  const t1 = getGenerator('wandering_shade');
  assert.ok(t1);
  const db = blankRow({
    souls: '100.00',
    lifetime_souls: '100.00',
    run_souls: '100.00',
    last_sync_at: '2026-09-22T12:00:00.000Z',
  });
  const result = validateSync(db, {
    souls: '85.00',
    lifetimeSouls: '100.00',
    runSouls: '100.00',
    generators: { wandering_shade: 1 },
    upgrades: [],
    talents: [],
    eduLogsSeen: ['log_input', 'log_generator'],
    milestones: {},
    lastSyncAt: db.last_sync_at,
  }, new Date('2026-09-22T12:00:05.000Z'));

  assert.equal(result.ok, true, result.detail || result.error || JSON.stringify(result));
  assert.equal(result.next.generators.wandering_shade, 1);
  assert.equal(result.next.souls, '85.00');
  assert.equal(t1.baseCost, '15');
});

check('id de gerador desconhecido → 400', () => {
  const db = blankRow({ souls: '100.00' });
  const result = validateSync(db, {
    souls: '50.00',
    generators: { hacker_bot: 99 },
    upgrades: [],
    lastSyncAt: db.last_sync_at,
  }, new Date('2026-09-22T12:01:00.000Z'));
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

check('client lastSyncAt mais velho que DB → 409', () => {
  const db = blankRow({
    souls: '50.00',
    last_sync_at: '2026-09-22T12:05:00.000Z',
  });
  const result = validateSync(db, {
    souls: '50.00',
    generators: {},
    upgrades: [],
    lastSyncAt: '2026-09-22T12:00:00.000Z',
  }, new Date('2026-09-22T12:06:00.000Z'));
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.state.souls, '50.00');
});

check('prestige com runSouls alto credita óbolos e zera geradores', () => {
  const db = blankRow({
    souls: '1000.00',
    run_souls: '1000000000.00',
    lifetime_souls: '1000000000.00',
    generators_state: { wandering_shade: 5 },
    upgrades_state: ['foice_afilada'],
  });
  const result = applyPrestige(db, new Date('2026-09-22T12:00:00.000Z'));
  assert.equal(result.ok, true);
  assert.equal(result.next.prestigeCount, 1);
  assert.ok(cmp(result.next.obols, '0') > 0);
  assert.equal(result.next.generators.wandering_shade || 0, 0);
  assert.deepEqual(result.next.upgrades, []);
});

check('talentBuy debita essência', () => {
  const db = blankRow({ mnemosyne: '2.00' });
  const result = applyTalentBuy(db, 'memoria_das_sombras', new Date());
  assert.equal(result.ok, true);
  assert.ok(result.next.talents.includes('memoria_das_sombras'));
  assert.equal(result.next.mnemosyne, '1.00');
});

check('buildStateDto calcula sps', () => {
  const dto = buildStateDto(blankRow({
    generators_state: { wandering_shade: 1 },
  }));
  assert.ok(cmp(dto.sps, '0') > 0);
  assert.equal(typeof dto.prestigePreview.unlocked, 'boolean');
});

console.log(`\ndespertar-sync-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
