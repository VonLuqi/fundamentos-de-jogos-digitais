/**
 * Smoke — Aula 07 dupla + diário (contrato API + wiring UI).
 * Não exige tabelas migradas: valida auth 401 e superfície estática.
 *
 * Uso: node tests/aula7-duo-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import progressHandler from '../api/progress.js';

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

// —— Auth: token inválido → 401 em todas as actions ——
for (const action of DUO_ACTIONS) {
  const res = makeRes();
  // eslint-disable-next-line no-await-in-loop
  await progressHandler(
    {
      method: 'POST',
      body: {
        token: 'token-duo-invalido',
        action,
        lessonId: 'aula7',
        username: 'alma',
        decision: 'accept',
        role: 'arte',
        body: 'diário',
        revision: 1,
      },
    },
    res
  );
  assert.equal(res.statusCode, 401, `${action} com token inválido → 401`);
  assert.equal(res.body?.ok, false, `${action} ok:false`);
}

// —— Wiring progress + lesson-duos ——
const progressJs = read('api/progress.js');
assert.ok(progressJs.includes("from './_lib/progress/lesson-duos.js'"), 'progress importa lesson-duos');
for (const action of DUO_ACTIONS) {
  assert.ok(progressJs.includes(`action === '${action}'`), `progress roteia ${action}`);
}

const duosJs = read('api/_lib/progress/lesson-duos.js');
assert.ok(duosJs.includes("DUO_LESSON_IDS = new Set(['aula7'])"), 'só aula7');
assert.ok(duosJs.includes('LESSON_DUOS_TABLE'), 'usa lesson_duos');
assert.ok(duosJs.includes('LESSON_JOURNALS_TABLE'), 'usa lesson_journals');
assert.ok(!duosJs.includes('FRIENDSHIPS_TABLE'), 'não usa friendships');
assert.ok(duosJs.includes('evaluateSecretAchievements'), 'finalize avalia secretas');
assert.ok(duosJs.includes('LESSON_PARAGRAPHS_TABLE'), 'finalize grava lesson_paragraphs');

const migration = read('db/migrate-2026-10-05-lesson-duos.sql');
assert.ok(/create table[\s\S]*lesson_duos/i.test(migration), 'migration lesson_duos');
assert.ok(/create table[\s\S]*lesson_journals/i.test(migration), 'migration lesson_journals');

// —— Client API ——
const apiJs = read('js/api.js');
for (const fn of [
  'lessonDuoList',
  'lessonDuoRequest',
  'lessonDuoRespond',
  'lessonDuoLeave',
  'lessonDuoSetRole',
  'lessonJournalGet',
  'lessonJournalSave',
  'lessonJournalFinalize',
]) {
  assert.ok(apiJs.includes(`export function ${fn}`), `api.js exporta ${fn}`);
}

// —— Página / JS oficina ——
const html = read('pages/aula7.html');
assert.ok(html.includes('id="lesson-duo-panel"'), 'widget de dupla');
assert.ok(html.includes('id="lesson-journal"'), 'diário único');
assert.ok(!html.includes('id="config-notes"'), 'sem config-notes');
assert.ok(!html.includes('id="gdd-text"'), 'sem gdd-text');
assert.ok(/individual ou dupla|trabalhar sozinho/i.test(html), 'copy solo/dupla');

const aula7Js = read('js/aula7.js');
assert.ok(aula7Js.includes('lessonDuoList'), 'poll lista dupla');
assert.ok(aula7Js.includes('lessonJournalSave'), 'autosave diário');
assert.ok(aula7Js.includes('lessonJournalFinalize'), 'finalize diário');
assert.ok(/POLL|poll|setInterval|5000|6000|7000|8000/.test(aula7Js), 'polling 5–8s');
assert.ok(!aula7Js.includes('createNote'), 'sem createNote no grimório');

const shared = read('api/_lib/progress/shared.js');
assert.ok(shared.includes('LESSON_DUOS_TABLE') || shared.includes('lesson_duos'), 'shared const duos');
assert.ok(
  shared.includes('LESSON_JOURNALS_TABLE') || shared.includes('lesson_journals'),
  'shared const journals'
);

const pkg = read('package.json');
assert.ok(pkg.includes('tests/aula7-duo-smoke.mjs'), 'package.json check inclui duo-smoke');
assert.ok(pkg.includes('api/_lib/progress/lesson-duos.js'), 'node --check lesson-duos');

console.log('OK aula7-duo-smoke');
