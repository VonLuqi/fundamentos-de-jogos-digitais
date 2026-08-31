import 'dotenv/config';
import handler from '../api/auth.js';

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

const cases = [
  {
    name: 'login with valid admin credentials',
    req: { method: 'POST', body: { action: 'login', username: 'VonLuqi', password: 'TaciLucas2002@' } },
    expect: (response) => response.statusCode === 200 && response.body?.ok === true && response.body?.user?.role === 'admin',
    failMessage: 'Login do admin falhou.'
  },
  {
    name: 'login with invalid password',
    req: { method: 'POST', body: { action: 'login', username: 'VonLuqi', password: 'senha-errada' } },
    expect: (response) => response.statusCode === 401 && response.body?.ok === false,
    failMessage: 'Senha inválida não foi rejeitada.'
  }
];

let passed = 0;
for (const test of cases) {
  const res = makeRes();
  await handler(test.req, res);
  const ok = test.expect(res);
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${test.name}`);
  if (!ok) {
    console.log(JSON.stringify({ statusCode: res.statusCode, body: res.body }, null, 2));
    process.exitCode = 1;
    break;
  }
  passed += 1;
}

console.log(`Total: ${passed}/${cases.length} testes aprovados.`);
