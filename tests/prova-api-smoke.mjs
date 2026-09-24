/**
 * Smoke Task A3 — API Prova Módulo 1
 * docs/plano-prova-modulo1-online.md
 *
 * Estático: arquivos, actions, sanitize sem gabarito, grade perfect.
 * Handler: 401 sem token; 405 GET; admin bloqueado sem asStudent.
 *
 * Uso: node tests/prova-api-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import provaHandler, { EXAM_ID } from '../api/prova.js';
import {
  MC_ANSWER_KEY,
  assertAnswerKeyCoversQuestions,
  gradeMultipleChoice,
  sanitizeQuestionsForClient,
} from '../api/_lib/prova/index.js';
import { assertNoAnswerKeyLeak } from '../api/_lib/prova/attempt-dto.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
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
  };
}

async function call(method, body = {}) {
  const req = { method, body };
  const res = mockRes();
  await provaHandler(req, res);
  return res;
}

[
  'api/prova.js',
  'api/_lib/prova/questions-modulo1.js',
  'api/_lib/prova/answer-key-modulo1.js',
  'api/_lib/prova/attempt-dto.js',
  'api/_lib/prova/index.js',
  'db/migrate-2026-09-24-prova-modulo1.sql',
  'local-server.mjs',
  'js/api.js',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const localServer = fs.readFileSync(path.join(root, 'local-server.mjs'), 'utf8');
staticAssert(localServer.includes('/api/prova'), 'local-server sem rota /api/prova');
staticAssert(localServer.includes('provaHandler'), 'local-server sem provaHandler');

const apiJs = fs.readFileSync(path.join(root, 'js/api.js'), 'utf8');
staticAssert(apiJs.includes('provaGetExamStatus'), 'js/api.js sem provaGetExamStatus');
staticAssert(apiJs.includes('provaStartAttempt'), 'js/api.js sem provaStartAttempt');
staticAssert(apiJs.includes('provaSubmitAttempt'), 'js/api.js sem provaSubmitAttempt');
staticAssert(apiJs.includes("prova: ()"), 'js/api.js sem ROUTES.prova');

const handlerSrc = fs.readFileSync(path.join(root, 'api/prova.js'), 'utf8');
for (const action of [
  'getExamStatus',
  'startAttempt',
  'getAttempt',
  'saveAnswer',
  'setCurrentQuestion',
  'submitAttempt',
  'reportIntegrityEvent',
  'adminGetProvaOverview',
  'adminSetExamOpen',
  'adminListAttempts',
  'adminGetAttempt',
  'adminScoreDiscursive',
  'adminFinalizeGrade',
]) {
  staticAssert(handlerSrc.includes(`action === '${action}'`), `Action ausente: ${action}`);
}

const cov = assertAnswerKeyCoversQuestions();
staticAssert(cov.ok, `Gabarito incompleto: ${JSON.stringify(cov)}`);

const clientQs = sanitizeQuestionsForClient();
staticAssert(clientQs.length === 20, `Esperado 20 questões, veio ${clientQs.length}`);
try {
  assertNoAnswerKeyLeak({ questions: clientQs });
} catch (e) {
  errors.push(String(e.message || e));
}
staticAssert(!('correctChoice' in clientQs[0]), 'sanitize vazou correctChoice');

const perfect = gradeMultipleChoice(MC_ANSWER_KEY);
staticAssert(perfect.mcScore === 12, `Nota perfeita esperada 12, veio ${perfect.mcScore}`);
staticAssert(EXAM_ID === 'modulo1-provacao', `EXAM_ID inesperado: ${EXAM_ID}`);

const getBlocked = await call('GET', {});
staticAssert(getBlocked.statusCode === 405, `GET deveria 405, veio ${getBlocked.statusCode}`);

const noToken = await call('POST', { action: 'getExamStatus' });
staticAssert(noToken.statusCode === 401, `Sem token deveria 401, veio ${noToken.statusCode}`);

console.log(
  errors.length
    ? `prova-api-smoke FAIL (${errors.length})\n - ${errors.join('\n - ')}`
    : 'prova-api-smoke OK',
);
process.exit(errors.length ? 1 : 0);
