/**
 * Smoke Task 9 — sync autoritativo (cliente; servidor PHP em despertar-php-server-smoke)
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-sync-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getGenerator } from '../js/hades-despertar/config/generators.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { ApiService } from '../js/hades-despertar/services/ApiService.js';
import { syncDiagEnabled } from '../js/hades-despertar/ui/harness.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

[
  'backend/src/Controllers/DespertarController.php',
  'backend/src/Services/Despertar/DespertarService.php',
  'js/hades-despertar/services/ApiService.js',
  'js/hades-despertar/core/formulas.js',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('js/hades-despertar/services/ApiService.js'), 'check cobre ApiService');

const boot = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
staticAssert(boot.includes('ApiService'), 'index liga ApiService');
staticAssert(boot.includes('requestSync'), 'flush em compra');
staticAssert(boot.includes('api.start'), 'heartbeat start');

const apiService = fs.readFileSync(path.join(root, 'js/hades-despertar/services/ApiService.js'), 'utf8');
staticAssert(apiService.includes('SYNC_HEARTBEAT_MS') || apiService.includes('30000'), 'heartbeat 30 s');
staticAssert(apiService.includes('SYNC_MIN_INTERVAL_MS') || apiService.includes('5000'), 'mínimo 5 s');
staticAssert(apiService.includes('if (!this._dirty) return') || apiService.includes('!this._dirty'), 'heartbeat dirty-only B6');
staticAssert(apiService.includes('logDiag') && apiService.includes('_diag'), 'Fase A A1 diag gated via logDiag');
staticAssert(apiService.includes('flush:start') || apiService.includes("flush:start"), 'A1 loga flush:start');

const gameStateSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8');
staticAssert(gameStateSrc.includes('syncEpoch'), 'A2 GameState.syncEpoch');
staticAssert(gameStateSrc.includes('#bumpSyncEpoch'), 'A2 bumpSyncEpoch em mutações');
staticAssert(gameStateSrc.includes('clientEpoch'), 'A2 toSnapshot envia clientEpoch');
staticAssert(
  fs.readFileSync(path.join(root, 'backend/src/Services/Despertar/DespertarService.php'), 'utf8').includes('parseClientEpoch'),
  'A3 parseClientEpoch no validate',
);
staticAssert(
  fs.readFileSync(path.join(root, 'backend/src/Services/Despertar/DespertarService.php'), 'utf8').includes('echoEpoch'),
  'A3 echoEpoch no DTO',
);
staticAssert(apiService.includes("mode: 'reconcile'") || apiService.includes('reconcile'), 'A4 flush reconcile');
staticAssert(apiService.includes('epochAdvanced'), 'A4 dirty-preserve mid-flight');
staticAssert(gameStateSrc.includes('#reconcileFromSnapshot') || gameStateSrc.includes('reconcileFromSnapshot'), 'A4 GameState reconcile');

const harnessSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/harness.js'), 'utf8');
staticAssert(harnessSrc.includes('syncDiagEnabled'), 'A1 syncDiagEnabled no harness');
staticAssert(harnessSrc.includes('logSyncDiag'), 'A1 logSyncDiag no harness');
staticAssert(harnessSrc.includes("get('syncDiag') === '1'") || harnessSrc.includes("get('syncDiag')"), 'A1 query syncDiag=1');
staticAssert(boot.includes('syncDiagEnabled') && boot.includes('logSyncDiag'), 'index liga diag A1');
staticAssert(boot.includes('apply:before') || boot.includes("apply:before"), 'index loga souls before/after apply');

const contratos = fs.readFileSync(path.join(root, 'docs/otimizacoes/contratos-fase-b.md'), 'utf8');
staticAssert(contratos.includes('clientEpoch'), 'Task 0: clientEpoch documentado em contratos-fase-b');
staticAssert(contratos.includes('echoEpoch'), 'Task 0: echoEpoch documentado em contratos-fase-b');

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

check('A1 syncDiag gated: morto fora de localhost', () => {
  assert.equal(syncDiagEnabled({ hostname: 'evil.example', search: '?syncDiag=1' }), false);
  assert.equal(syncDiagEnabled({ hostname: 'localhost', search: '?syncDiag=1' }), true);
});

check('A2 syncEpoch sobe em buys; clientEpoch no snapshot; apply não zera', () => {
  const state = new GameState({ souls: '10000' });
  assert.equal(state.syncEpoch, 0);

  const n = 5;
  for (let i = 0; i < n; i += 1) {
    const bought = state.buyGenerator('wandering_shade', '1');
    assert.equal(bought.ok, true, `buy ${i + 1} ok`);
  }
  assert.equal(state.syncEpoch, n);

  const beforeFail = state.syncEpoch;
  const fail = state.buyGenerator('obsidian_throne', '1');
  assert.equal(fail.ok, false);
  assert.equal(state.syncEpoch, beforeFail, 'buy falho não bumpa');

  const up = state.buyUpgrade('foice_afilada');
  assert.equal(up.ok, true);
  assert.equal(state.syncEpoch, n + 1);

  const snap = state.toSnapshot();
  assert.equal(snap.clientEpoch, state.syncEpoch);
  assert.equal(snap.syncEpoch, state.syncEpoch);

  const restored = GameState.fromSnapshot(snap);
  assert.equal(restored.syncEpoch, state.syncEpoch);

  const ep = restored.syncEpoch;
  restored.applyAuthoritativeState({ souls: '1', generators: { wandering_shade: 1 } });
  assert.equal(restored.syncEpoch, ep, 'apply autoritativo preserva syncEpoch');

  restored.grantSouls('10');
  assert.equal(restored.syncEpoch, ep + 1);
});

check('A4 reconcile: buys locais não somem; souls não andam para trás sem motivo', () => {
  const state = new GameState({
    souls: '500',
    generators: { wandering_shade: 3 },
    upgrades: ['foice_afilada'],
  });
  state.syncEpoch = 5;

  state.applyAuthoritativeState(
    {
      souls: '100',
      generators: { wandering_shade: 2 },
      upgrades: [],
      verdicts: 2,
      lastSyncAt: '2026-09-22T12:00:00.000Z',
    },
    { mode: 'reconcile', sps: '10', elapsedMs: 2000, tickToleranceSec: 2 },
  );

  assert.equal(state.quantities().wandering_shade, 3, 'max qty local');
  assert.ok(state.upgrades.includes('foice_afilada'), 'união upgrades');
  assert.equal(state.verdicts, 2, 'always-server verdicts');
  assert.equal(cmp(state.souls, '100'), 0, 'souls unexplained → server');

  state.souls = '120';
  state.applyAuthoritativeState(
    { souls: '100', generators: { wandering_shade: 3 } },
    { mode: 'reconcile', sps: '10', elapsedMs: 1000, tickToleranceSec: 2 },
  );
  assert.equal(cmp(state.souls, '120'), 0, 'souls explained by ticks → local');
});

check('A4 replace: reject restaura snapshot do server', () => {
  const state = new GameState({
    souls: '999',
    generators: { wandering_shade: 9 },
    upgrades: ['foice_afilada'],
  });
  state.applyAuthoritativeState(
    {
      souls: '10',
      generators: { wandering_shade: 1 },
      upgrades: [],
    },
    { mode: 'replace' },
  );
  assert.equal(cmp(state.souls, '10'), 0);
  assert.equal(state.quantities().wandering_shade, 1);
  assert.deepEqual(state.upgrades, []);
});

await checkAsync('A4 flush: epoch avançou mid-flight → dirty preservado + reconcile', async () => {
  const state = new GameState({
    souls: '1000',
    generators: { wandering_shade: 1 },
  });
  let now = 1_000_000;
  const applyMeta = [];
  const api = new ApiService({
    getToken: () => 'tok',
    getSnapshot: () => state.toSnapshot(),
    applyServerState: (serverState, meta = {}) => {
      applyMeta.push(meta);
      state.applyAuthoritativeState(serverState, {
        mode: meta.mode || 'replace',
        sps: state.sps(),
        elapsedMs: meta.elapsedMs,
      });
    },
    minIntervalMs: 60_000,
    now: () => now,
    syncFn: async (_token, snap) => {
      state.buyGenerator('wandering_shade', '1');
      now += 50;
      return {
        ok: true,
        echoEpoch: snap.clientEpoch,
        state: {
          souls: snap.souls,
          generators: snap.generators,
          upgrades: snap.upgrades || [],
          echoEpoch: snap.clientEpoch,
          lastSyncAt: '2026-09-22T12:00:00.000Z',
        },
      };
    },
  });

  api._lastSyncAt = now;
  api.markDirty();
  const epochBefore = state.syncEpoch;
  await api.flush();
  assert.ok(state.syncEpoch > epochBefore, 'buy mid-flight bumpou epoch');
  assert.equal(state.quantities().wandering_shade, 2, 'qty pós-compra mid-flight');
  assert.equal(api.isDirty, true, 'dirty preservado');
  assert.equal(applyMeta[0]?.mode, 'reconcile');
  api.stop();
});

// a82f1fd: reject faz reconcile (replace apagava selos otimistas do Rio) e mantém dirty
// para o próximo flush tentar de novo.
await checkAsync('A4 flush: reject 400 → reconcile + dirty preservado', async () => {
  const state = new GameState({
    souls: '999',
    generators: { wandering_shade: 5 },
  });
  const applyModes = [];
  const api = new ApiService({
    getToken: () => 'tok',
    getSnapshot: () => state.toSnapshot(),
    applyServerState: (serverState, meta = {}) => {
      applyModes.push(meta.mode);
      state.applyAuthoritativeState(serverState, { mode: meta.mode || 'replace' });
    },
    minIntervalMs: 0,
    now: () => 1_000_000,
    syncFn: async () => {
      const err = new Error('judges');
      err.status = 400;
      err.payload = {
        error: 'Os Juízes recusaram',
        state: { souls: '10', generators: { wandering_shade: 1 }, upgrades: [] },
      };
      throw err;
    },
  });
  api.markDirty();
  await assert.rejects(() => api.flush(), (e) => e.status === 400);
  assert.equal(applyModes.join(','), 'reconcile');
  assert.equal(cmp(state.souls, '10'), 0, 'souls sem explicação → server');
  assert.equal(state.quantities().wandering_shade, 5, 'reconcile mantém qty local');
  assert.equal(api.isDirty, true);
  api.stop();
});

await checkAsync('A1 ApiService.logDiag: dirty + reuse-in-flight (baseline)', async () => {
  const phases = [];
  const api = new ApiService({
    getToken: () => 'tok',
    getSnapshot: () => ({ souls: '100', clientEpoch: 0 }),
    applyServerState: () => {},
    minIntervalMs: 60_000,
    now: () => 1_000_000,
    logDiag: (phase, data) => {
      phases.push({ phase, ...data });
    },
  });
  api._lastSyncAt = 1_000_000;
  api.scheduleFlush({ force: true });
  assert.ok(phases.some((p) => p.phase === 'dirty' && p.dirty === true), 'dirty logado');
  assert.equal(api.isDirty, true);
  api.stop();

  let resolveSync;
  const syncPromise = new Promise((resolve) => {
    resolveSync = resolve;
  });
  api._inFlight = syncPromise;
  assert.equal(api.isInFlight, true);
  // flush() passa pela fila de mutações (a82f1fd): o reuso só é logado quando a fila chega nele.
  const reused = api.flush();
  resolveSync({ ok: true });
  await reused;
  assert.ok(
    phases.some((p) => p.phase === 'flush:reuse-in-flight' && p.inFlight === true),
    'reuse-in-flight logado'
  );
});

await checkAsync('A5 spam 20 buys mid-flight: qty/upgrades sem snap-back + dirty', async () => {
  const state = new GameState({ souls: '1000000000000' });
  let now = 2_000_000;
  const api = new ApiService({
    getToken: () => 'tok',
    getSnapshot: () => state.toSnapshot(),
    applyServerState: (serverState, meta = {}) => {
      state.applyAuthoritativeState(serverState, {
        mode: meta.mode || 'replace',
        sps: state.sps(),
        elapsedMs: meta.elapsedMs,
      });
    },
    minIntervalMs: 60_000,
    now: () => now,
    syncFn: async (_token, snap) => {
      for (let i = 0; i < 19; i += 1) {
        const r = state.buyGenerator('wandering_shade', '1');
        assert.equal(r.ok, true, `spam buy ${i + 1}`);
      }
      const up = state.buyUpgrade('foice_afilada');
      assert.equal(up.ok, true, 'spam upgrade mid-flight');
      now += 100;
      return {
        ok: true,
        echoEpoch: snap.clientEpoch,
        state: {
          souls: snap.souls,
          runSouls: snap.runSouls,
          lifetimeSouls: snap.lifetimeSouls,
          generators: snap.generators,
          upgrades: snap.upgrades || [],
          echoEpoch: snap.clientEpoch,
          lastSyncAt: '2026-09-22T13:00:00.000Z',
        },
      };
    },
  });

  api._lastSyncAt = now;
  api.markDirty();
  const epochAtStart = state.syncEpoch;
  await api.flush();

  assert.equal(state.quantities().wandering_shade, 19, '19 gens após spam');
  assert.ok(state.upgrades.includes('foice_afilada'), 'upgrade mid-flight preservado');
  assert.ok(state.syncEpoch >= epochAtStart + 20, 'epoch ≥ start+20');
  assert.equal(api.isDirty, true, 'dirty após spam mid-flight');
  assert.ok(cmp(state.souls, '0') >= 0, 'souls não negativos');
  api.stop();
});

console.log(`\ndespertar-sync-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
