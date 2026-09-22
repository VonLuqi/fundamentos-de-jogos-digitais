/**
 * Smoke Task 5b — IndexedDB ↔ servidor (boot autoritativo)
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-boot-auth-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OFFLINE_EFFICIENCY_BASE } from '../js/hades-despertar/config/constants.js';
import { cmp, mul } from '../js/hades-despertar/core/decimal.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { calculateOfflineProgress } from '../js/hades-despertar/core/formulas.js';
import {
  bootAuthoritativeSession,
  resolveBootAuthority,
} from '../js/hades-despertar/services/OfflineEngine.js';
import { StorageService } from '../js/hades-despertar/services/StorageService.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

[
  'js/hades-despertar/services/OfflineEngine.js',
  'js/hades-despertar/index.js',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-boot-auth-smoke.mjs'), 'npm run check inclui este smoke');

const engine = fs.readFileSync(path.join(root, 'js/hades-despertar/services/OfflineEngine.js'), 'utf8');
staticAssert(engine.includes('resolveBootAuthority'), 'resolveBootAuthority exportado');
staticAssert(engine.includes('bootAuthoritativeSession'), 'bootAuthoritativeSession exportado');

const boot = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
staticAssert(boot.includes('bootAuthoritativeSession'), 'index usa boot autoritativo');
staticAssert(!boot.includes('bootLocalSession'), 'index não usa só boot local');

if (errors.length) {
  console.error('despertar-boot-auth-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

function createMemoryIndexedDB() {
  const databases = new Map();
  function asRequest(result) {
    const request = { result, error: null, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      request.result = result;
      request.onsuccess?.({ target: request });
    });
    return request;
  }
  return {
    open(name, version = 1) {
      if (!databases.has(name)) databases.set(name, { stores: new Map(), version: 0 });
      const slot = databases.get(name);
      const request = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      const db = {
        name,
        objectStoreNames: { contains: (storeName) => slot.stores.has(storeName) },
        createObjectStore(storeName, { keyPath } = {}) {
          slot.stores.set(storeName, { keyPath: keyPath || 'userId', map: new Map() });
          return {};
        },
        transaction(storeName) {
          const store = slot.stores.get(storeName);
          if (!store) throw new Error(`store ausente: ${storeName}`);
          return {
            objectStore() {
              return {
                get(key) {
                  return asRequest(store.map.get(String(key)));
                },
                put(value) {
                  store.map.set(String(value[store.keyPath]), value);
                  return asRequest(value[store.keyPath]);
                },
              };
            },
          };
        },
      };
      queueMicrotask(() => {
        request.result = db;
        if (slot.version < version) {
          request.onupgradeneeded?.({ target: request });
          slot.version = version;
        }
        request.onsuccess?.({ target: request });
      });
      return request;
    },
  };
}

function memorySession() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function eqMoney(actual, expected, message) {
  assert.equal(cmp(actual, expected), 0, message || `${actual} ≠ ${expected}`);
}

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

check('server lastSyncAt mais novo → server vence', () => {
  const decision = resolveBootAuthority({
    local: {
      souls: '10',
      lifetimeSouls: '10',
      generators: { wandering_shade: 1 },
      lastSyncAt: '2026-09-22T10:00:00.000Z',
    },
    localSavedAt: '2026-09-22T10:05:00.000Z',
    server: {
      souls: '50',
      lifetimeSouls: '50',
      generators: { wandering_shade: 2 },
      lastSyncAt: '2026-09-22T11:00:00.000Z',
    },
  });
  assert.equal(decision.source, 'server');
  assert.equal(decision.catchUpAnchor, '2026-09-22T11:00:00.000Z');
  assert.equal(decision.shouldPush, false);
  assert.equal(decision.snapshot.souls, '50');
});

check('local com progresso + server vazio → local vence e deve push', () => {
  const decision = resolveBootAuthority({
    local: {
      souls: '20',
      lifetimeSouls: '20',
      generators: { wandering_shade: 1 },
      lastSyncAt: '2026-09-22T09:00:00.000Z',
    },
    localSavedAt: '2026-09-22T12:00:00.000Z',
    server: {
      souls: '0',
      lifetimeSouls: '0',
      generators: {},
      lastSyncAt: '2026-09-22T12:01:00.000Z',
    },
  });
  assert.equal(decision.source, 'local');
  assert.equal(decision.shouldPush, true);
  assert.equal(decision.catchUpAnchor, '2026-09-22T12:00:00.000Z');
});

check('sem server → local + âncora savedAt', () => {
  const decision = resolveBootAuthority({
    local: { souls: '1', lifetimeSouls: '1', generators: {} },
    localSavedAt: '2026-09-22T08:00:00.000Z',
    server: null,
  });
  assert.equal(decision.source, 'local');
  assert.equal(decision.catchUpAnchor, '2026-09-22T08:00:00.000Z');
  assert.equal(decision.shouldPush, false);
});

await checkAsync('boot: server vence e catch-up só a partir do last_sync do server', async () => {
  let now = Date.parse('2026-09-22T12:00:15.000Z');
  const storage = new StorageService({
    indexedDB: createMemoryIndexedDB(),
    sessionStorage: memorySession(),
    now: () => now,
  });

  // Local antigo com 1 sombra, salvo há muito tempo — se catch-up viesse daqui, colheria horas.
  const localState = new GameState({
    generators: { wandering_shade: 1 },
    lifetimeSouls: '1',
    lastSyncAt: '2026-09-22T10:00:00.000Z',
  }).toSnapshot();
  await storage.save(42, localState, { savedAt: '2026-09-22T10:00:00.000Z' });

  const serverState = {
    souls: '0.00',
    obols: '0.00',
    mnemosyne: '0.00',
    lifetimeSouls: '5.00',
    runSouls: '5.00',
    prestigeCount: 0,
    generators: { wandering_shade: 1 },
    upgrades: [],
    talents: [],
    eduLogsSeen: [],
    milestones: {},
    lastSyncAt: '2026-09-22T12:00:00.000Z',
    sps: '0.10',
    prestigePreview: { obolsGain: '0', mnemosyneGain: '0', unlocked: false },
  };

  const { state, catchUp, decision } = await bootAuthoritativeSession(42, {
    storage,
    now: () => now,
    fetchServerState: async () => serverState,
  });

  assert.equal(decision.source, 'server');
  assert.equal(decision.catchUpAnchor, '2026-09-22T12:00:00.000Z');

  const expected = calculateOfflineProgress({
    elapsedSeconds: 15,
    sps: '0.1',
    talents: [],
  });
  eqMoney(expected.offlineSouls, mul(mul('15', '0.1'), OFFLINE_EFFICIENCY_BASE));
  eqMoney(catchUp.offlineSouls, expected.offlineSouls);
  eqMoney(state.souls, expected.offlineSouls);
  assert.equal(catchUp.elapsedSeconds, 15);
});

await checkAsync('boot: não soma offline duas vezes (um único applyCatchUp)', async () => {
  let now = Date.parse('2026-09-22T12:00:20.000Z');
  const storage = new StorageService({
    indexedDB: createMemoryIndexedDB(),
    sessionStorage: memorySession(),
    now: () => now,
  });
  await storage.save(9, new GameState({
    generators: { wandering_shade: 1 },
    lifetimeSouls: '1',
    lastSyncAt: '2026-09-22T11:00:00.000Z',
  }).toSnapshot(), { savedAt: '2026-09-22T11:00:00.000Z' });

  const server = {
    souls: '0.00',
    lifetimeSouls: '2.00',
    runSouls: '2.00',
    prestigeCount: 0,
    generators: { wandering_shade: 1 },
    upgrades: [],
    talents: [],
    eduLogsSeen: [],
    milestones: {},
    lastSyncAt: '2026-09-22T12:00:00.000Z',
  };

  const first = await bootAuthoritativeSession(9, {
    storage,
    now: () => now,
    fetchServerState: async () => server,
  });
  assert.equal(first.decision.source, 'server');
  eqMoney(first.state.souls, mul(mul('20', '0.1'), OFFLINE_EFFICIENCY_BASE));

  // Segundo boot imediato: savedAt ≈ now → catch-up ignorado (< 10 s), sem dobrar.
  now = Date.parse('2026-09-22T12:00:22.000Z');
  const second = await bootAuthoritativeSession(9, {
    storage,
    now: () => now,
    fetchServerState: async () => ({
      ...server,
      souls: first.state.souls,
      lifetimeSouls: first.state.lifetimeSouls,
      lastSyncAt: '2026-09-22T12:00:20.000Z',
    }),
  });
  assert.equal(second.catchUp.ignored, true);
  eqMoney(second.state.souls, first.state.souls);
});

console.log(`\ndespertar-boot-auth-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
