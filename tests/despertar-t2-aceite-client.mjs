/**
 * Aceite T6 (achados 1 e 4 da revisão T2): reprodutores convertidos para afirmar o comportamento correto.
 *  1) boot com época conhecida e stateGet falhando nunca joga/regrava save de outra época;
 *  4) a rechecagem do banner depois de restartAt consulta o seasonStatus de verdade.
 *
 * Uso: node tests/despertar-t2-aceite-client.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { bootAuthoritativeSession } from '../js/hades-despertar/services/OfflineEngine.js';

let passed = 0;
let failed = 0;
async function check(label, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok — ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL — ${label}\n  ${error.message}`);
  }
}

const snapshotOf = (epoch) => new GameState({
  souls: '777', lifetimeSouls: '777', generators: { wandering_shade: 5 },
  seasonEpoch: epoch, lastSyncAt: '2026-11-01T10:00:00Z',
}).toSnapshot();

function fakeStorage(epoch) {
  const calls = { save: 0, clear: 0, attach: 0 };
  const storage = {
    calls,
    load: async () => (epoch == null ? null : { state: snapshotOf(epoch), savedAt: '2026-11-01T10:00:00Z' }),
    save: async () => { calls.save += 1; },
    attach: () => { calls.attach += 1; return () => {}; },
    clear: async () => { calls.clear += 1; },
  };
  return storage;
}
const NOW = () => Date.parse('2026-11-02T15:01:00Z');
const down = async () => { throw new Error('stateGet indisponível'); };

await check('achado 1: época 2 conhecida + stateGet falhando + save da época 1 → descarta ANTES do catch-up e não monta o jogo', async () => {
  const storage = fakeStorage(1);
  const boot = await bootAuthoritativeSession(7, {
    storage, fetchServerState: down, now: NOW, knownSeasonEpoch: 2, requireSeasonEpoch: true,
  });
  assert.equal(boot.unavailable, true);
  assert.equal(boot.staleLocalDiscarded, true);
  assert.equal(boot.discardedProgress, true);
  assert.equal(boot.state, undefined, 'não pode haver GameState');
  assert.equal(storage.calls.clear, 1, 'o save velho é apagado');
  assert.equal(storage.calls.save, 0, 'nada é regravado');
  assert.equal(storage.calls.attach, 0, 'nada passa a gravar');
});

await check('achado 1: sem NENHUMA confirmação de época (status e stateGet caíram) → não joga o save local', async () => {
  const storage = fakeStorage(1);
  const boot = await bootAuthoritativeSession(7, { storage, fetchServerState: down, now: NOW, requireSeasonEpoch: true });
  assert.equal(boot.unavailable, true);
  assert.equal(boot.staleLocalDiscarded, false, 'sem época conhecida não apaga às cegas');
  assert.equal(storage.calls.save, 0);
  assert.equal(storage.calls.attach, 0);
});

await check('achado 1: sem save local e sem servidor → não monta jogo vazio de época desconhecida', async () => {
  const storage = fakeStorage(null);
  const boot = await bootAuthoritativeSession(7, { storage, fetchServerState: down, now: NOW, knownSeasonEpoch: 2, requireSeasonEpoch: true });
  assert.equal(boot.unavailable, true);
  assert.equal(storage.calls.save, 0);
});

await check('achado 1: época confirmada IGUAL à do save + stateGet falhando → jogo local da época atual segue (offline legítimo)', async () => {
  const storage = fakeStorage(2);
  const boot = await bootAuthoritativeSession(7, {
    storage, fetchServerState: down, now: NOW, knownSeasonEpoch: 2, requireSeasonEpoch: true,
  });
  assert.equal(boot.unavailable, undefined);
  assert.equal(boot.staleLocalDiscarded, false);
  assert.equal(boot.state.seasonEpoch, 2);
  assert.equal(storage.calls.clear, 0);
});

await check('achado 1: stateGet ok na época 2 + save da época 1 → servidor vence, local apagado (comportamento da T1 mantido)', async () => {
  const storage = fakeStorage(1);
  const boot = await bootAuthoritativeSession(7, {
    storage, now: NOW, knownSeasonEpoch: 2, requireSeasonEpoch: true,
    fetchServerState: async () => ({ state: { souls: '0.00', lifetimeSouls: '0.00', runSouls: '0.00', generators: {}, seasonEpoch: 2, lastSyncAt: '2026-11-02T15:00:00Z' } }),
  });
  assert.equal(boot.staleLocalDiscarded, true);
  assert.equal(boot.decision.source, 'server');
  assert.equal(Number(boot.state.souls), 0);
  assert.equal(boot.state.seasonEpoch, 2);
});

await check('achado 1: sem requireSeasonEpoch o comportamento antigo dos chamadores existentes não muda', async () => {
  const storage = fakeStorage(null);
  const boot = await bootAuthoritativeSession(7, { storage, fetchServerState: down, now: NOW });
  assert.equal(boot.unavailable, undefined);
  assert.ok(boot.state);
});

await check('achado 4: rechecagem do banner depois de restartAt ignora o bootstrap em memória e consulta o servidor', async () => {
  const shell = fs.readFileSync(new URL('../js/app-shell.js', import.meta.url), 'utf8');
  const fn = shell.match(/async function readRestartHold\(token, \{ fresh = false \} = \{\}\) \{[\s\S]*?\n\}/)[0];
  let statusCalls = 0;
  let serverHold = true;
  const read = vm.runInNewContext(`(${fn})`, {
    getBootstrapGates: () => ({ token: 't', gates: { despertar: { restartHold: true, restartAt: '2026-11-02T12:00:00-03:00' } } }),
    despertarSeasonStatus: async () => { statusCalls += 1; return { restartHold: serverHold, restartAt: '2026-11-02T12:00:00-03:00' }; },
    fetchDespertarSeasonHold: async () => ({ restartHold: true }),
    SEASON_RESTART_AT: '2026-11-02T12:00:00-03:00',
  });
  assert.equal((await read('t')).restartHold, true, 'leitura inicial pode usar o bootstrap');
  assert.equal(statusCalls, 0);
  assert.equal((await read('t', { fresh: true })).restartHold, true);
  serverHold = false;
  assert.equal((await read('t', { fresh: true })).restartHold, false, 'o servidor liberou: o banner tem que sumir');
  assert.equal(statusCalls, 2, 'cada rechecagem fresca vai ao servidor');
  const failing = vm.runInNewContext(`(${fn})`, {
    getBootstrapGates: () => null,
    despertarSeasonStatus: async () => { throw new Error('rede'); },
    fetchDespertarSeasonHold: async () => ({ restartHold: false }),
    SEASON_RESTART_AT: '2026-11-02T12:00:00-03:00',
  });
  assert.equal((await failing('t', { fresh: true })).restartHold, true, 'falha de rede mantém o aviso e tenta de novo');
  assert.match(shell, /readRestartHold\(token, \{ fresh: true \}\)/, 'o recheck usa fresh');
});

console.log(`\ndespertar-t2-aceite-client: ${passed} ok, ${failed} falhas`);
process.exit(failed > 0 ? 1 : 0);
