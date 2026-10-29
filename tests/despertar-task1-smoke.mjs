/**
 * Smoke Task 1 — Schema e fiação da rota vazia de O Despertar
 * (docs/plano-hades-despertar.md).
 *
 * Estático + handler sem sessão. Não exige a tabela migrada para o 401.
 *
 * Uso: node tests/despertar-task1-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import despertarHandler from '../api/despertar.js';
import supabase from '../api/supabaseClient.js';

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

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFiles = [
  'db/migrate-2026-09-11-hades-despertar.sql',
  'db/setup.sql',
  'api/despertar.js',
  'js/api.js',
  'local-server.mjs',
];

requiredFiles.forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const migrate = read('db/migrate-2026-09-11-hades-despertar.sql');
const setup = read('db/setup.sql');
const apiJs = read('js/api.js');
const despertarApi = read('api/despertar.js');
const localServer = read('local-server.mjs');
const pkg = read('package.json');

staticAssert(/CREATE TABLE IF NOT EXISTS despertar_states/.test(migrate), 'migration cria despertar_states');
staticAssert(/user_id integer PRIMARY KEY REFERENCES users\(id\)/.test(migrate), 'migration usa users.id integer');
staticAssert(/ENABLE ROW LEVEL SECURITY/.test(migrate), 'migration liga RLS');
staticAssert(!/REFERENCES\s+auth\.users/i.test(migrate), 'migration não referencia auth.users');
staticAssert(!/CREATE POLICY/.test(migrate), 'migration não abre policy de UPDATE ao browser');
staticAssert(/CREATE TABLE IF NOT EXISTS despertar_states/.test(setup), 'setup.sql espelha despertar_states');

staticAssert(localServer.includes("'/api/despertar'"), 'local-server registra /api/despertar');
staticAssert(localServer.includes('despertarHandler'), 'local-server importa o handler do Despertar');

staticAssert(apiJs.includes('despertar:'), 'js/api.js define ROUTES.despertar');
staticAssert(apiJs.includes('pages/despertar.html'), 'ROUTES.despertar aponta para pages/despertar.html');
staticAssert(apiJs.includes("action: 'stateGet'"), 'js/api.js tem despertarStateGet');
staticAssert(apiJs.includes("action: 'stateSync'"), 'js/api.js tem despertarStateSync');
staticAssert(apiJs.includes("action: 'prestige'"), 'js/api.js tem despertarPrestige');
staticAssert(apiJs.includes("action: 'talentBuy'"), 'js/api.js tem despertarTalentBuy');
staticAssert(apiJs.includes('export function despertarStateGet'), 'exporta despertarStateGet');
staticAssert(apiJs.includes('export function despertarStateSync'), 'exporta despertarStateSync');
staticAssert(apiJs.includes('export function despertarPrestige'), 'exporta despertarPrestige');
staticAssert(apiJs.includes('export function despertarTalentBuy'), 'exporta despertarTalentBuy');

staticAssert(despertarApi.includes("action === 'stateGet'"), 'api/despertar.js trata stateGet');
staticAssert(
  despertarApi.includes('loadSessionUser') || despertarApi.includes('loadUserIdByToken'),
  'identidade vem da sessão'
);
staticAssert(despertarApi.includes('isDespertarSealedForUser'), 'gate do Acheron no handler');
staticAssert(despertarApi.includes("action === 'stateResetStudents'"), 'admin pode limpar Estelas de alunos');
staticAssert(apiJs.includes('export function despertarResetStudents'), 'cliente expõe despertarResetStudents');
staticAssert(!/req\.body\?\.userId|body\.userId/.test(despertarApi), 'não usa userId do body');
staticAssert(
  despertarApi.includes('buildStateDto') || despertarApi.includes('toStateDto'),
  'devolve DTO camelCase'
);
staticAssert(pkg.includes('api/despertar.js'), 'npm run check cobre api/despertar.js');
staticAssert(pkg.includes('despertar-task1-smoke.mjs'), 'npm run check inclui este smoke');
staticAssert(pkg.includes('api/_lib/despertar-gate.js'), 'npm run check cobre despertar-gate');

if (errors.length) {
  console.error('despertar-task1-smoke (estático):');
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

async function testGetNotAllowed() {
  const res = makeRes();
  await despertarHandler({ method: 'GET', query: { token: 'x' }, body: {} }, res);
  assert.equal(res.statusCode, 405, 'GET deve ser 405.');
  assert.equal(res.body?.ok, false);
}

async function testMissingToken() {
  const res = makeRes();
  await despertarHandler({ method: 'POST', body: { action: 'stateGet' } }, res);
  assert.equal(res.statusCode, 401, 'stateGet sem token deve ser 401.');
  assert.equal(res.body?.ok, false);
}

async function testEmptyToken() {
  const res = makeRes();
  await despertarHandler({ method: 'POST', body: { action: 'stateGet', token: '' } }, res);
  assert.equal(res.statusCode, 401, 'stateGet com token vazio deve ser 401.');
}

async function testInvalidToken() {
  const res = makeRes();
  await despertarHandler(
    { method: 'POST', body: { action: 'stateGet', token: 'token-despertar-invalido', userId: 1 } },
    res
  );
  assert.equal(res.statusCode, 401, 'stateGet com token inválido deve ser 401 (mesmo com userId no body).');
  assert.equal(res.body?.ok, false);
}

async function testInvalidTokenOnStubActions() {
  for (const action of ['stateSync', 'prestige', 'talentBuy']) {
    const res = makeRes();
    await despertarHandler(
      { method: 'POST', body: { token: 'token-despertar-invalido', action } },
      res
    );
    assert.equal(res.statusCode, 401, `${action} com token inválido deve ser 401.`);
  }
}

await run('GET /api/despertar é 405', testGetNotAllowed);
await run('stateGet sem token é 401', testMissingToken);
await run('stateGet com token vazio é 401', testEmptyToken);
await run('stateGet com token inválido é 401 e ignora userId', testInvalidToken);
await run('actions de sync com token inválido ainda são 401', testInvalidTokenOnStubActions);

async function testValidSessionStateGet() {
  if (!supabase) {
    console.log('[SKIP] Supabase não configurado — não dá para provar stateGet 200.');
    return;
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .select('token, user_id')
    .limit(1)
    .maybeSingle();

  if (error || !session?.token) {
    console.log('[SKIP] Nenhuma sessão no banco para provar stateGet 200.');
    return;
  }

  const res = makeRes();
  await despertarHandler(
    { method: 'POST', body: { action: 'stateGet', token: session.token } },
    res
  );

  assert.notEqual(res.statusCode, 401, 'sessão válida não deve ser 401.');
  if (res.statusCode === 503) {
    throw new Error(res.body?.error || 'Tabela despertar_states ausente no Supabase.');
  }
  if (res.statusCode === 403 && res.body?.error === 'despertar_sealed') {
    // Aluno com Acheron selado: gate ok. Admin / aula aberta seguem para o DTO.
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user_id)
      .maybeSingle();
    assert.notEqual(user?.role, 'admin', 'admin não deveria receber despertar_sealed.');
    console.log('[OK] stateGet 403 despertar_sealed para aluno com Acheron selado.');
    return;
  }
  assert.equal(res.statusCode, 200, `stateGet deveria ser 200, veio ${res.statusCode}.`);
  assert.equal(res.body?.ok, true);
  const state = res.body?.state;
  assert.ok(state, 'payload.state ausente.');
  assert.match(String(state.souls), /^-?\d+\.\d{2}$/, 'souls deve ser string decimal.');
  assert.match(String(state.obols), /^-?\d+\.\d{2}$/);
  assert.match(String(state.mnemosyne), /^-?\d+\.\d{2}$/);
  assert.match(String(state.lifetimeSouls), /^-?\d+\.\d{2}$/);
  assert.match(String(state.runSouls), /^-?\d+\.\d{2}$/);
  assert.equal(typeof state.prestigeCount, 'number');
  assert.equal(typeof state.generators, 'object');
  assert.ok(Array.isArray(state.upgrades));
  assert.ok(Array.isArray(state.talents));
  assert.ok(Array.isArray(state.eduLogsSeen));
  assert.equal(typeof state.milestones, 'object');
  assert.ok(state.lastSyncAt);
  assert.equal(state.sps, '0.00');
  assert.deepEqual(state.prestigePreview, {
    obolsGain: '0',
    mnemosyneGain: '0',
    unlocked: false,
  });
  assert.equal(state.userId, undefined, 'DTO não deve vazar userId.');

  const stub = makeRes();
  await despertarHandler(
    { method: 'POST', body: { action: 'stateSync', token: session.token, clientState: {} } },
    stub
  );
  if (stub.statusCode === 403 && stub.body?.error === 'despertar_sealed') {
    console.log('[OK] stateSync também respeita Acheron selado.');
    return;
  }
  assert.ok(
    stub.statusCode === 200 || stub.statusCode === 400 || stub.statusCode === 409,
    `stateSync autoritativo (Task 9) responde 200/400/409, não stub; veio ${stub.statusCode}`,
  );
  assert.notEqual(stub.statusCode, 501, 'stateSync não é mais stub 501.');
}

await run('stateGet com sessão válida devolve DTO (cria linha se preciso)', testValidSessionStateGet);

console.log(`\ndespertar-task1-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
