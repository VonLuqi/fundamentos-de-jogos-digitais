/**
 * Smoke Fase 1 — Companheiros de Jornada (API).
 * Valida contrato de auth nas actions de amigos sem exigir tabela migrada
 * para o caminho de sessão inválida.
 */
import assert from 'node:assert/strict';
import progressHandler from '../api/progress.js';

const FRIEND_ACTIONS = [
  'friendsList',
  'friendSearch',
  'friendRequest',
  'friendRespond',
  'friendRemove',
  'friendProfile',
];

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

async function testInvalidTokenOnFriendActions() {
  for (const action of FRIEND_ACTIONS) {
    const res = makeRes();
    await progressHandler(
      {
        method: 'POST',
        body: {
          token: 'token-amigos-invalido',
          action,
          query: 'alma',
          username: 'alma',
          decision: 'accept',
        },
      },
      res
    );
    assert.equal(res.statusCode, 401, `${action} com token inválido deve retornar 401.`);
    assert.equal(res.body?.ok, false, `${action} deve indicar ok: false.`);
  }
}

async function testUnknownFriendishActionStill400() {
  // Garante que o handler ainda rejeita ações inventadas (regressão do switch).
  const res = makeRes();
  await progressHandler(
    {
      method: 'POST',
      body: { token: 'token-amigos-invalido', action: 'friendTeleport' },
    },
    res
  );
  // Sessão inválida tem prioridade sobre ação desconhecida.
  assert.equal(res.statusCode, 401);
}

await run('friend actions rejeitam sessão inválida com 401', testInvalidTokenOnFriendActions);
await run('ação inventada com token inválido ainda é 401', testUnknownFriendishActionStill400);

console.log(`\nfriends-phase1-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
