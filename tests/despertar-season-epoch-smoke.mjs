/**
 * Smoke — época da temporada (reinício da T2 por bugs, 2026-11-02 12:00 Brasília).
 * O save local de outra época nunca ressuscita progresso: o boot descarta, a aba velha congela.
 *
 * Uso: node tests/despertar-season-epoch-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { bootAuthoritativeSession } from '../js/hades-despertar/services/OfflineEngine.js';
import { StorageService } from '../js/hades-despertar/services/StorageService.js';
import {
  SEASON_RESTART_AT,
  SEASON_RESTART_BANNER_COPY,
  SEASON_RESTART_COPY,
} from '../js/hades-despertar/config/season-closed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

/** IndexedDB em memória com get/put/delete. */
function createMemoryIndexedDB() {
  const stores = new Map();
  function asRequest(result) {
    const request = { result, error: null, onsuccess: null, onerror: null };
    queueMicrotask(() => request.onsuccess?.({ target: request }));
    return request;
  }
  return {
    open() {
      const request = { result: null, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      const db = {
        objectStoreNames: { contains: (name) => stores.has(name) },
        createObjectStore(name) {
          stores.set(name, new Map());
          return {};
        },
        transaction(name) {
          const map = stores.get(name);
          return {
            objectStore: () => ({
              get: (key) => asRequest(map.get(String(key))),
              put: (value) => {
                map.set(String(value.userId), value);
                return asRequest(value.userId);
              },
              delete: (key) => {
                map.delete(String(key));
                return asRequest(undefined);
              },
            }),
          };
        },
      };
      queueMicrotask(() => {
        request.result = db;
        request.onupgradeneeded?.({ target: request });
        request.onsuccess?.({ target: request });
      });
      return request;
    },
    peek: (name, key) => stores.get(name)?.get(String(key)),
  };
}

function memorySession() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(String(key), String(value)),
    removeItem: (key) => map.delete(key),
  };
}

let passed = 0;
let failed = 0;
async function check(label, fn) {
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

/** Save da T2 bugada: 25.7T almas, 7.11K óbolos, 5.1K essência, 40 sombras, época antiga. */
function buggedSnapshot(seasonEpoch) {
  const state = new GameState({
    souls: '25700000000000',
    obols: '7110',
    mnemosyne: '5100',
    lifetimeSouls: '25700000000000',
    runSouls: '25700000000000',
    prestigeCount: 6,
    generators: { wandering_shade: 40 },
    lastSyncAt: '2026-11-01T20:00:00.000Z',
    ...(seasonEpoch == null ? {} : { seasonEpoch }),
  });
  return state.toSnapshot();
}

/** Estado novo devolvido pelo servidor depois do reinício. */
const FRESH_SERVER = Object.freeze({
  souls: '0.00',
  obols: '0.00',
  mnemosyne: '0.00',
  lifetimeSouls: '0.00',
  runSouls: '0.00',
  prestigeCount: 0,
  generators: {},
  lastSyncAt: '2026-11-02T15:00:00.000Z',
  seasonEpoch: 2,
});

function newStorage() {
  const idb = createMemoryIndexedDB();
  const storage = new StorageService({ indexedDB: idb, sessionStorage: memorySession() });
  return { idb, storage };
}

await check('literal do reinício espelhado entre JS e PHP (2026-11-02T12:00:00-03:00)', () => {
  assert.equal(SEASON_RESTART_AT, '2026-11-02T12:00:00-03:00');
  const php = read('backend/src/Services/Despertar/DespertarService.php');
  const m = php.match(/const SEASON_RESTART_AT = '([^']+)'/);
  assert.ok(m, 'constante PHP ausente');
  assert.equal(m[1], SEASON_RESTART_AT);
  assert.equal(Date.parse(SEASON_RESTART_AT), Date.UTC(2026, 10, 2, 15, 0, 0));
});

await check('snapshot do GameState carrega a época e a recarrega', () => {
  const snap = buggedSnapshot(1);
  assert.equal(snap.seasonEpoch, 1);
  assert.equal(GameState.fromSnapshot(snap).seasonEpoch, 1);
  assert.equal(new GameState({}).seasonEpoch, 0);
});

await check('boot: save local da T1/T2 bugada (época 1) é DESCARTADO quando o servidor está na época 2', async () => {
  const { idb, storage } = newStorage();
  await storage.save(7, buggedSnapshot(1));
  const boot = await bootAuthoritativeSession(7, {
    storage,
    fetchServerState: async () => ({ state: { ...FRESH_SERVER } }),
  });
  assert.equal(boot.staleLocalDiscarded, true);
  assert.equal(boot.discardedProgress, true);
  assert.equal(boot.decision.source, 'server');
  assert.equal(boot.decision.shouldPush, false, 'não pode empurrar o save velho para o servidor');
  assert.equal(Number(boot.state.souls), 0);
  assert.equal(Number(boot.state.obols), 0);
  assert.equal(Number(boot.state.mnemosyne), 0);
  assert.equal(boot.state.prestigeCount, 0);
  assert.equal(boot.state.seasonEpoch, 2);
  const saved = idb.peek('states', 7);
  assert.equal(saved.state.seasonEpoch, 2, 'o novo save local já nasce na época nova');
  assert.equal(Number(saved.state.lifetimeSouls), 0);
});

await check('boot: save local SEM época (anterior ao deploy) também é descartado', async () => {
  const { storage } = newStorage();
  await storage.save(8, buggedSnapshot(null));
  const boot = await bootAuthoritativeSession(8, {
    storage,
    fetchServerState: async () => ({ state: { ...FRESH_SERVER } }),
  });
  assert.equal(boot.staleLocalDiscarded, true);
  assert.equal(Number(boot.state.lifetimeSouls), 0);
});

await check('boot: save local da MESMA época segue valendo (jogo offline antes do 1º sync)', async () => {
  const { storage } = newStorage();
  await storage.save(9, buggedSnapshot(2));
  const boot = await bootAuthoritativeSession(9, {
    storage,
    fetchServerState: async () => ({ state: { ...FRESH_SERVER, lastSyncAt: '2026-11-01T00:00:00.000Z' } }),
  });
  assert.equal(boot.staleLocalDiscarded, false);
  assert.equal(boot.decision.source, 'local');
  assert.ok(Number(boot.state.lifetimeSouls) > 0);
});

await check('boot sem resposta do servidor: não descarta às cegas (o sync recusa depois)', async () => {
  const { storage } = newStorage();
  await storage.save(10, buggedSnapshot(1));
  const boot = await bootAuthoritativeSession(10, {
    storage,
    fetchServerState: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(boot.staleLocalDiscarded, false);
  assert.ok(boot.fetchError);
});

await check('freeze() + clear(): aba velha não regrava o local nem por debounce nem por pagehide', async () => {
  const { idb, storage } = newStorage();
  const state = GameState.fromSnapshot(buggedSnapshot(1));
  await storage.save(11, state.toSnapshot());
  assert.ok(idb.peek('states', 11));
  storage.scheduleSave(11, state);
  storage.freeze();
  await storage.clear(11);
  await storage.flush();
  const res = await storage.save(11, state.toSnapshot());
  storage.scheduleSave(11, state);
  await storage.flush();
  assert.equal(res.ok, false);
  assert.equal(idb.peek('states', 11), undefined, 'nada pode ressuscitar o save apagado');
  assert.equal(await storage.load(11), null);
});

await check('textos aprovados do véu e do banner', () => {
  assert.match(SEASON_RESTART_COPY.body, /por causa de bugs|bugs na Temporada 2/);
  assert.match(SEASON_RESTART_COPY.body, /meio-dia de segunda-feira, 2 de novembro/);
  assert.match(SEASON_RESTART_BANNER_COPY.text, /reiniciar por causa de bugs/);
  assert.match(SEASON_RESTART_BANNER_COPY.text, /meio-dia/);
});

await check('fiação: api.js manda a época e trata a recusa; index limpa o local; shell monta o banner', () => {
  const api = read('js/api.js');
  assert.ok(api.includes("DESPERTAR_STALE_EPOCH_ERROR = 'despertar_stale_epoch'"));
  for (const fn of ['despertarStateSync', 'despertarPrestige', 'despertarTalentBuy', 'despertarVerdictBuy', 'despertarJuizoStart', 'despertarJuizoGuess', 'despertarJuizoAbandon']) {
    const body = api.match(new RegExp(`export function ${fn}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))?.[0] || '';
    assert.ok(body.includes('despertarWrite('), `${fn} precisa passar por despertarWrite`);
  }
  const index = read('js/hades-despertar/index.js');
  assert.ok(index.includes('setDespertarStaleEpochHandler') && index.includes('storage.freeze()') && index.includes('storage.clear(user.id)'));
  assert.ok(index.includes('setDespertarSeasonEpoch(state.seasonEpoch)'));
  const shell = read('js/app-shell.js');
  assert.ok(shell.includes('mountSeasonRestartBanner(shell, token)'));
  const php = read('backend/src/Controllers/DespertarController.php');
  assert.ok(php.includes('STALE_EPOCH_ERROR') && php.includes("'seasonStatus'"));
});

console.log(`\ndespertar-season-epoch-smoke: ${passed} ok, ${failed} falhas`);
process.exit(failed > 0 ? 1 : 0);
