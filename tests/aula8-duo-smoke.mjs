/**
 * Smoke — Aula 08 dupla + diário (contrato API + wiring UI).
 * Uso: node tests/aula8-duo-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import progressHandler from '../api/progress.js';
import { __test as duoTest } from '../api/_lib/progress/lesson-duos.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const DUO_ACTIONS = [
  'lessonDuoList',
  'lessonDuoRequest',
  'lessonDuoRespond',
  'lessonDuoLeave',
  'lessonDuoSetRole',
  'lessonJournalGet',
  'lessonJournalSave',
  'lessonJournalFinalize',
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

for (const action of DUO_ACTIONS) {
  const res = makeRes();
  await progressHandler(
    {
      method: 'POST',
      body: {
        token: 'token-duo-invalido',
        action,
        lessonId: 'aula8',
        username: 'alma',
        decision: 'accept',
        role: 'design',
        body: 'diário',
        revision: 1,
      },
    },
    res
  );
  assert.equal(res.statusCode, 401, `${action} com token inválido → 401`);
}

assert.ok(duoTest.DUO_LESSON_IDS.has('aula8'), 'aula8 em DUO_LESSON_IDS');
assert.deepEqual(duoTest.rolesForLesson('aula8'), ['design', 'programacao']);
assert.equal(duoTest.normalizeRole('design', 'aula8'), 'design');
assert.equal(duoTest.normalizeRole('arte', 'aula8'), null);
assert.equal(duoTest.oppositeRole('design', 'aula8'), 'programacao');
assert.equal(duoTest.oppositeRole('programacao', 'aula8'), 'design');
assert.equal(duoTest.oppositeRole('arte', 'aula7'), 'programacao');

const html = read('pages/aula8.html');
assert.ok(html.includes('id="lesson-duo-panel"'), 'widget de dupla');
assert.ok(html.includes('id="duo-role-design"'), 'botão design');
assert.ok(html.includes('id="lesson-journal"'), 'diário');

const aula8Js = read('js/aula8.js');
assert.ok(aula8Js.includes('lessonDuoList'), 'poll lista');
assert.ok(aula8Js.includes('lessonJournalSave'), 'autosave');
assert.ok(aula8Js.includes("LESSON_ID = 'aula8'"), 'lesson id');

const pkg = read('package.json');
assert.ok(pkg.includes('tests/aula8-duo-smoke.mjs'), 'package.json check inclui duo-smoke');

console.log('OK aula8-duo-smoke');
