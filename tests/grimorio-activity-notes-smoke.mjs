/**
 * Smoke — notas de atividade do Grimório (derivadas de lesson_paragraphs).
 */

import assert from 'node:assert/strict';
import {
  ACTIVITY_NOTE_ID_PREFIX,
  ACTIVITY_NOTE_TAG,
  activityNoteId,
  activityReadingPayload,
  isActivityNoteId,
  isLegacyActivityUserNote,
  lessonIdFromActivityNoteId,
  toActivityNotes,
} from '../js/grimorio-activity-notes.js';

const lessons = [
  { id: 'aula1', number: '01', title: 'Círculo Mágico' },
  { id: 'aula2', number: '02', title: 'Glossário' },
];

assert.equal(activityNoteId('aula1'), 'activity:aula1');
assert.ok(isActivityNoteId('activity:aula2'));
assert.equal(isActivityNoteId(12), false);
assert.equal(lessonIdFromActivityNoteId('activity:aula1'), 'aula1');

const notes = toActivityNotes(
  [
    {
      lessonId: 'aula1',
      paragraph: 'Síntese da aula 1',
      updatedAt: '2026-09-10T12:00:00.000Z',
      createdAt: '2026-09-10T11:00:00.000Z',
    },
    {
      lessonId: 'aula2',
      paragraph: 'Core Loop: ...\nGrokking: ...\nAssets: ...',
      updatedAt: '2026-09-10T13:00:00.000Z',
    },
    { lessonId: 'aula3', paragraph: '' },
  ],
  lessons
);

assert.equal(notes.length, 2);
assert.equal(notes[0].id, `${ACTIVITY_NOTE_ID_PREFIX}aula1`);
assert.equal(notes[0].isActivityNote, true);
assert.ok(notes[0].tags.includes(ACTIVITY_NOTE_TAG));
assert.ok(notes[0].title.includes('Atividade'));
assert.ok(notes[0].title.includes('01'));
assert.equal(notes[1].lessonId, 'aula2');
assert.match(notes[1].body, /Grokking/);

const payload = activityReadingPayload(notes[0]);
assert.equal(payload.canEdit, false);
assert.equal(payload.readOnly, true);
assert.equal(payload.note.body, 'Síntese da aula 1');

assert.equal(
  isLegacyActivityUserNote({
    id: 9,
    lessonId: 'aula2',
    tags: ['aula2', 'atividade'],
  }),
  true
);
assert.equal(
  isLegacyActivityUserNote({
    id: 10,
    lessonId: null,
    tags: ['atividade'],
  }),
  false
);
assert.equal(
  isLegacyActivityUserNote({
    id: 'activity:aula1',
    isActivityNote: true,
    lessonId: 'aula1',
    tags: ['atividade', 'aula1'],
  }),
  false
);

console.log('OK — smoke notas de atividade do Grimório');
