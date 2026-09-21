/**
 * Smoke Task 5 — Persistência local + offline de O Despertar
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-offline-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OFFLINE_EFFICIENCY_BASE,
  OFFLINE_MAX_HOURS_BASE,
  SAVE_DEBOUNCE_MS,
  STORAGE_DB_NAME,
  STORAGE_SESSION_PREFIX,
  STORAGE_STORE_NAME,
} from '../js/hades-despertar/config/constants.js';
import { cmp, mul } from '../js/hades-despertar/core/decimal.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { calculateOfflineProgress } from '../js/hades-despertar/core/formulas.js';
import {
  applyCatchUp,
  bootLocalSession,
  formatHarvest,
} from '../js/hades-despertar/services/OfflineEngine.js';
import { StorageService } from '../js/hades-despertar/services/StorageService.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

[
  'js/hades-despertar/services/StorageService.js',
  'js/hades-despertar/services/OfflineEngine.js',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-offline-smoke.mjs'), 'npm run check inclui este smoke');
staticAssert(pkg.includes('js/hades-despertar/services/StorageService.js'), 'check cobre StorageService');
staticAssert(pkg.includes('js/hades-despertar/services/OfflineEngine.js'), 'check cobre OfflineEngine');

const storageSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/services/StorageService.js'), 'utf8');
staticAssert(storageSrc.includes(STORAGE_DB_NAME), 'IndexedDB despertar-db');
staticAssert(storageSrc.includes(STORAGE_STORE_NAME), 'store states');
staticAssert(storageSrc.includes('sessionStorage'), 'fallback sessionStorage');
staticAssert(!/localStorage\.(get|set|remove)Item/.test(storageSrc), 'não usa API localStorage');
staticAssert(storageSrc.includes('pagehide'), 'flush no pagehide');

if (errors.length) {
  console.error('despertar-offline-smoke (estático):');
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
      if (!databases.has(name)) {
        databases.set(name, { stores: new Map(), version: 0 });
      }
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
        objectStoreNames: {
          contains: (storeName) => slot.stores.has(storeName),
        },
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

function failingIndexedDB() {
  return {
    open() {
      const request = {
        result: null,
        error: new Error('IndexedDB bloqueado'),
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      queueMicrotask(() => request.onerror?.({ target: request }));
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
    keys() {
      return [...map.keys()];
    },
  };
}

function timerHub() {
  let nextId = 1;
  const pending = new Map();
  return {
    setTimeout(fn) {
      const id = nextId;
      nextId += 1;
      pending.set(id, fn);
      return id;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
    runAll() {
      const jobs = [...pending.values()];
      pending.clear();
      for (const fn of jobs) fn();
    },
    get size() {
      return pending.size;
    },
  };
}

function fakeWindow() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type, fn) {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
    dispatch(type) {
      listeners.get(type)?.();
    },
  };
}

function eqMoney(actual, expected, message) {
  assert.equal(cmp(actual, expected), 0, message || `${actual} ≠ ${expected}`);
}

let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

await run('reload após 15 s com 1 sombra colhe 80% do SPS', async () => {
  let now = 1_000_000;
  const storage = new StorageService({
    indexedDB: createMemoryIndexedDB(),
    sessionStorage: memorySession(),
    now: () => now,
  });
  const snapshot = new GameState({ generators: { wandering_shade: 1 } }).toSnapshot();
  await storage.save(7, snapshot);
  now += 15_000;

  const { state, catchUp } = await bootLocalSession(7, { storage, now: () => now });
  const expected = calculateOfflineProgress({
    elapsedSeconds: 15,
    sps: '0.1',
    talents: [],
  });
  eqMoney(expected.offlineSouls, mul(mul('15', '0.1'), OFFLINE_EFFICIENCY_BASE));
  eqMoney(catchUp.offlineSouls, expected.offlineSouls);
  eqMoney(state.souls, expected.offlineSouls);
  assert.equal(catchUp.ignored, false);
  assert.equal(catchUp.harvest.show, true);
  assert.equal(catchUp.harvest.title, 'Colheita na ausência');
  assert.match(catchUp.harvest.body, /15 s/);
  assert.match(catchUp.harvest.body, /almas chegaram à margem/);
  assert.equal(catchUp.harvest.cta, 'Retomar o trono');
  assert.equal(state.eduLogsSeen.includes('log_offline'), false, '15 s ainda não é o log de > 60 s');
});

await run('teto de 8 h é respeitado', () => {
  const state = new GameState({ generators: { wandering_shade: 1 } });
  const tenHours = 10 * 3600;
  const result = applyCatchUp(state, {
    savedAt: new Date(0).toISOString(),
    now: tenHours * 1000,
  });
  const capSeconds = OFFLINE_MAX_HOURS_BASE * 3600;
  assert.equal(result.cappedOut, true);
  assert.equal(result.effectiveSeconds, capSeconds);
  eqMoney(result.offlineSouls, mul(mul(String(capSeconds), '0.1'), OFFLINE_EFFICIENCY_BASE));
  assert.match(result.harvest.capNote, /8 h/);
  const skipped = applyCatchUp(new GameState({ generators: { wandering_shade: 1 } }), {
    savedAt: new Date(0).toISOString(),
    now: 9_000,
  });
  assert.equal(skipped.ignored, true);
  assert.equal(skipped.harvest.show, false);
});

await run('IndexedDB falha cai em sessionStorage, não em localStorage', async () => {
  const session = memorySession();
  const storage = new StorageService({
    indexedDB: failingIndexedDB(),
    sessionStorage: session,
    now: () => 50_000,
  });
  const snapshot = new GameState({ souls: '3', generators: { wandering_shade: 1 } }).toSnapshot();
  const saved = await storage.save(3, snapshot);
  assert.equal(saved.via, 'session');
  assert.deepEqual(session.keys(), [`${STORAGE_SESSION_PREFIX}3`]);
  const loaded = await storage.load(3);
  assert.equal(loaded.userId, '3');
  eqMoney(loaded.state.souls, '3');
});

await run('debounce 1 s após mutação; pagehide faz flush', async () => {
  const timers = timerHub();
  const host = fakeWindow();
  let now = 2_000_000;
  const storage = new StorageService({
    indexedDB: createMemoryIndexedDB(),
    sessionStorage: memorySession(),
    now: () => now,
    setTimeout: (fn) => timers.setTimeout(fn),
    clearTimeout: (id) => timers.clearTimeout(id),
    debounceMs: SAVE_DEBOUNCE_MS,
  });
  const state = new GameState({ generators: { wandering_shade: 1 } });
  await storage.save(11, state.toSnapshot());
  const detach = storage.attach(state, 11, { target: host });

  state.click();
  const beforeDebounce = await storage.load(11);
  eqMoney(beforeDebounce.state.souls, '0');
  assert.equal(timers.size, 1);

  timers.runAll();
  await storage.flush();
  const afterDebounce = await storage.load(11);
  eqMoney(afterDebounce.state.souls, '1');

  state.click();
  host.dispatch('pagehide');
  await storage.flush();
  const afterHide = await storage.load(11);
  eqMoney(afterHide.state.souls, '2');
  detach();
});

await run('formatHarvest usa a copy congelada', () => {
  const harvest = formatHarvest({
    ok: true,
    ignored: false,
    cappedOut: true,
    effectiveSeconds: 28800,
    offlineSouls: '2304.00',
    maxHours: 8,
  });
  assert.equal(harvest.title, 'Colheita na ausência');
  assert.equal(harvest.cta, 'Retomar o trono');
  assert.match(harvest.body, /8 h/);
  assert.match(harvest.capNote, /O véu fechou após 8 h/);
});

console.log(`\ndespertar-offline-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
