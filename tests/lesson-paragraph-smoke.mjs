/**
 * Smoke Task 2 — Parser compartilhado do parágrafo de aula
 * (docs/plano-relatorio-admin-atividades-filtros.md).
 *
 * Uso: node tests/lesson-paragraph-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONFIG_NOTES_END,
  CONFIG_NOTES_START,
  composeLessonRecord,
  splitLessonRecord,
} from '../js/lesson-paragraph.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

assert.equal(CONFIG_NOTES_START, '=== ANOTACOES_DE_CONFIGURACAO ===');
assert.equal(CONFIG_NOTES_END, '=== FIM_ANOTACOES_DE_CONFIGURACAO ===');

const both = composeLessonRecord('Síntese da aula.', 'Teste 1\nForca De Movimento: 400');
assert.equal(
  both,
  `Síntese da aula.\n\n${CONFIG_NOTES_START}\nTeste 1\nForca De Movimento: 400\n${CONFIG_NOTES_END}`
);
assert.deepEqual(splitLessonRecord(both), {
  summary: 'Síntese da aula.',
  notes: 'Teste 1\nForca De Movimento: 400',
});

const summaryOnly = composeLessonRecord('  Só   a   síntese  \n\n', '');
assert.equal(summaryOnly, 'Só a síntese');
assert.deepEqual(splitLessonRecord(summaryOnly), {
  summary: 'Só a síntese',
  notes: '',
});

const notesOnly = composeLessonRecord('', 'Anotação da prática\r\nlinha 2');
assert.equal(
  notesOnly,
  `${CONFIG_NOTES_START}\nAnotação da prática\nlinha 2\n${CONFIG_NOTES_END}`
);
assert.deepEqual(splitLessonRecord(notesOnly), {
  summary: '',
  notes: 'Anotação da prática\nlinha 2',
});

assert.equal(composeLessonRecord('', ''), '');
assert.equal(composeLessonRecord('   ', '\n'), '');
assert.deepEqual(splitLessonRecord(''), { summary: '', notes: '' });
assert.deepEqual(splitLessonRecord(null), { summary: '', notes: '' });

const legacy = 'Parágrafo antigo sem marcadores da prática.';
assert.deepEqual(splitLessonRecord(legacy), {
  summary: legacy,
  notes: '',
});

const missingEnd = `Síntese.\n\n${CONFIG_NOTES_START}\nnotas sem fim`;
assert.deepEqual(splitLessonRecord(missingEnd), {
  summary: missingEnd,
  notes: '',
});

const missingStart = `Síntese.\n\nnotas\n${CONFIG_NOTES_END}`;
assert.deepEqual(splitLessonRecord(missingStart), {
  summary: missingStart,
  notes: '',
});

const inverted = `${CONFIG_NOTES_END}\nnotas\n${CONFIG_NOTES_START}`;
assert.deepEqual(splitLessonRecord(inverted), {
  summary: inverted,
  notes: '',
});

const roundtrip = splitLessonRecord(
  composeLessonRecord('GDD da turma.', 'Core Loop: andar e coletar.')
);
assert.deepEqual(roundtrip, {
  summary: 'GDD da turma.',
  notes: 'Core Loop: andar e coletar.',
});

const aulas = ['js/aula1.js', 'js/aula2.js', 'js/aula3.js', 'js/aula4.js'];
for (const rel of aulas) {
  const src = read(rel);
  assert.ok(
    src.includes("from './lesson-paragraph.js'"),
    `${rel} precisa importar js/lesson-paragraph.js`
  );
  assert.ok(
    src.includes('composeLessonRecord') && src.includes('splitLessonRecord'),
    `${rel} precisa usar compose/split importados`
  );
  assert.ok(
    !src.includes("const CONFIG_NOTES_START = '=== ANOTACOES_DE_CONFIGURACAO ==='"),
    `${rel} não deve redefinir CONFIG_NOTES_START`
  );
  assert.ok(
    !src.includes('function composeLessonRecord('),
    `${rel} não deve redefinir composeLessonRecord`
  );
  assert.ok(
    !src.includes('function splitLessonRecord('),
    `${rel} não deve redefinir splitLessonRecord`
  );
}

const pkg = read('package.json');
assert.ok(pkg.includes('js/lesson-paragraph.js'), 'package.json check precisa de node --check no parser');
assert.ok(pkg.includes('tests/lesson-paragraph-smoke.mjs'), 'package.json check precisa deste smoke');

console.log('OK lesson-paragraph-smoke');
