import 'dotenv/config';
import assert from 'node:assert/strict';
import authHandler from '../api/auth.js';
import progressHandler from '../api/progress.js';

/* ============================================================
   HELPERS — simula o contrato (req, res) das rotas serverless
   ============================================================ */
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

function levelForXp(xp) {
  const LEVEL_XP_BASE = 100;
  return Math.max(1, Math.floor(xp / LEVEL_XP_BASE) + 1);
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

/* ============================================================
   1. REDIRECIONAMENTO DE SESSÃO INVÁLIDA
   ============================================================
   Uma sessão com token inexistente deve ser rejeitada com 401
   tanto em /api/auth quanto em /api/progress — é esse contrato
   que o front-end usa para decidir o redirect ao Pacto de Sangue.
   ============================================================ */
async function testInvalidSessionOnAuth() {
  const res = makeRes();
  await authHandler({ method: 'GET', query: { token: 'token-que-nao-existe' } }, res);

  assert.equal(res.statusCode, 401, 'GET /api/auth com token inválido deve retornar 401.');
  assert.equal(res.body?.ok, false, 'Payload deve indicar falha (ok: false).');
}

async function testInvalidSessionOnProgress() {
  const res = makeRes();
  await progressHandler({ method: 'GET', query: { token: 'token-que-nao-existe' } }, res);

  assert.equal(res.statusCode, 401, 'GET /api/progress com token inválido deve retornar 401.');
  assert.equal(res.body?.ok, false, 'Payload deve indicar falha (ok: false).');
}

/* ============================================================
   2. CÁLCULO DE XP E SUBIDA DE NÍVEL
   ============================================================
   Regra espelhada de api/progress.js: levelForXp = floor(xp/100)+1.
   Validamos a fronteira exata em que o nível sobe.
   ============================================================ */
async function testXpLevelUpCalculation() {
  assert.equal(levelForXp(0), 1, 'XP 0 deve ser nível 1.');
  assert.equal(levelForXp(80), 1, 'XP 80 ainda deve ser nível 1.');
  assert.equal(levelForXp(99), 1, 'XP 99 ainda deve ser nível 1.');
  assert.equal(levelForXp(100), 2, 'XP 100 deve subir para nível 2.');
  assert.equal(levelForXp(199), 2, 'XP 199 ainda deve ser nível 2.');
  assert.equal(levelForXp(200), 3, 'XP 200 deve subir para nível 3.');
}

/* ============================================================
   3. RESGATE DE CÓDIGO — VÁLIDO vs. INVÁLIDO
   ============================================================
   Cria um usuário novo via /api/auth (register), autentica a
   sessão e usa o token real para tentar resgatar:
     a) o código MDA2026 (válido) — deve conceder XP e conquista.
     b) um código inexistente — deve ser rejeitado com 400.
     c) o mesmo código MDA2026 de novo — deve ser rejeitado (409),
        pois o usuário já resgatou.
   ============================================================ */
async function testRedeemValidAndInvalidCode() {
  const uniqueName = `qa_teste_${Date.now()}`;
  const registerRes = makeRes();
  await authHandler(
    {
      method: 'POST',
      body: {
        action: 'register',
        fullName: 'Usuario de Teste',
        turma: 'TCG01',
        username: uniqueName,
        password: 'SenhaTeste@123',
      },
    },
    registerRes
  );

  assert.equal(registerRes.statusCode, 201, 'Registro deve criar o usuário de teste.');
  assert.equal(registerRes.body?.ok, true, 'Registro deve retornar ok: true.');
  assert.equal(registerRes.body?.user?.turma, 'TCG01', 'Registro deve persistir a turma do usuário.');

  const token = registerRes.body.token;
  assert.ok(token, 'Token de sessão deve ser retornado no registro.');

  // (a) código válido
  const validRedeem = makeRes();
  await progressHandler({ method: 'POST', body: { token, action: 'redeem', code: 'MDA2026' } }, validRedeem);

  assert.equal(validRedeem.statusCode, 200, 'Código válido deve ser aceito (200).');
  assert.equal(validRedeem.body?.ok, true, 'Resgate válido deve retornar ok: true.');
  assert.equal(validRedeem.body?.awarded?.xp, 20, 'MDA2026 deve conceder 20 XP.');
  assert.ok(
    validRedeem.body?.awarded?.achievements?.includes('primeiro_sangue'),
    'MDA2026 deve conceder a conquista primeiro_sangue.'
  );

  // (b) código inexistente
  const invalidRedeem = makeRes();
  await progressHandler(
    { method: 'POST', body: { token, action: 'redeem', code: 'CODIGO_INEXISTENTE_999' } },
    invalidRedeem
  );

  assert.equal(invalidRedeem.statusCode, 400, 'Código inexistente deve ser rejeitado (400).');
  assert.equal(invalidRedeem.body?.ok, false, 'Resgate inválido deve retornar ok: false.');

  // (c) código já resgatado
  const duplicateRedeem = makeRes();
  await progressHandler({ method: 'POST', body: { token, action: 'redeem', code: 'MDA2026' } }, duplicateRedeem);

  assert.equal(duplicateRedeem.statusCode, 409, 'Código já resgatado deve ser rejeitado (409).');
  assert.equal(duplicateRedeem.body?.ok, false, 'Resgate duplicado deve retornar ok: false.');
}

/* ============================================================
   EXECUÇÃO
   ============================================================ */
await run('sessão inválida é rejeitada em /api/auth (GET)', testInvalidSessionOnAuth);
await run('sessão inválida é rejeitada em /api/progress (GET)', testInvalidSessionOnProgress);
await run('cálculo de XP e subida de nível', testXpLevelUpCalculation);
await run('resgate de código válido, inválido e duplicado', testRedeemValidAndInvalidCode);

console.log(`\nTotal: ${passed}/${passed + failed} testes aprovados.`);
if (failed > 0) process.exitCode = 1;
