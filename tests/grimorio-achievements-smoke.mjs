/**
 * Smoke — Fase 4: conquistas do Grimório (públicas + secretas)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACHIEVEMENTS,
  getAchievementById,
  getAchievementXp,
} from '../js/game-catalog.js';
import {
  GRIMORIO_ACHIEVEMENT_IDS,
  GRIMORIO_PUBLIC_IDS,
  GRIMORIO_SECRET_IDS,
  GRIMORIO_THRESHOLDS,
  evaluateGrimoireAchievementIds,
  matchesCartografoPessoal,
  matchesEscribaRitual,
} from '../api/_lib/grimoire-achievements.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

for (const id of GRIMORIO_ACHIEVEMENT_IDS) {
  const entry = getAchievementById(id);
  assert.ok(entry, `catálogo tem ${id}`);
  assert.ok(entry.name && entry.desc, `${id} tem name/desc`);
  assert.ok(Number.isFinite(getAchievementXp(id)), `${id} xp`);
}

for (const id of GRIMORIO_PUBLIC_IDS) {
  assert.equal(getAchievementById(id)?.hidden, false, `${id} pública`);
}

for (const id of GRIMORIO_SECRET_IDS) {
  assert.equal(getAchievementById(id)?.hidden, true, `${id} secreta`);
  assert.ok(getAchievementById(id)?.meta?.kind, `${id} meta.kind`);
}

const publics = ACHIEVEMENTS.filter((a) => !a.hidden);
const letters = [];
for (const ach of publics) {
  for (const i of ach.trailhead?.nameIndexes || []) letters.push(ach.name[i]);
  for (const i of ach.trailhead?.descIndexes || []) letters.push(ach.desc[i]);
}
const sorted = [...letters].sort().join('');
const expected = [...'TARTAROOCULTO'].sort().join('');
assert.equal(sorted, expected, 'trailhead intacto após conquistas do Grimório');

assert.deepEqual(
  evaluateGrimoireAchievementIds({
    event: 'create',
    originalNoteCount: 1,
    isCloneNote: false,
    note: { lessonId: null, body: 'curto', tags: [] },
    unlocked: [],
  }),
  ['grimorio_primeira_inscricao'],
  '1ª inscrição'
);

assert.deepEqual(
  evaluateGrimoireAchievementIds({
    event: 'create',
    originalNoteCount: 1,
    isCloneNote: true,
    note: { lessonId: 'aula1', body: 'x', tags: ['a', 'b', 'c', 'd'] },
    unlocked: [],
  }),
  [],
  'create clone não premia públicas/conteúdo'
);

assert.ok(
  evaluateGrimoireAchievementIds({
    event: 'create',
    originalNoteCount: GRIMORIO_THRESHOLDS.dezInscricoes,
    isCloneNote: false,
    note: { lessonId: 'aula1', body: 'curto', tags: [] },
    unlocked: [],
  }).includes('grimorio_dez_inscricoes'),
  'dez próprias (sem clones)'
);

assert.ok(
  evaluateGrimoireAchievementIds({
    event: 'create',
    originalNoteCount: GRIMORIO_THRESHOLDS.dezInscricoes,
    isCloneNote: false,
    note: { lessonId: 'aula1', body: 'curto', tags: [] },
    unlocked: [],
  }).includes('grimorio_elo_da_trilha'),
  'elo da trilha no create com lesson'
);

assert.deepEqual(
  evaluateGrimoireAchievementIds({
    event: 'share',
    originalNoteCount: 3,
    note: { lessonId: 'aula1', shareCount: 1 },
    unlocked: ['grimorio_primeira_inscricao'],
  }).sort(),
  ['grimorio_revelacao', 'grimorio_vinculo_oculto'].sort(),
  'share com aula → revelação + vínculo'
);

assert.deepEqual(
  evaluateGrimoireAchievementIds({
    event: 'share',
    originalNoteCount: 3,
    note: { lessonId: null, shareCount: 1 },
    unlocked: [],
  }),
  ['grimorio_revelacao'],
  'share sem aula → só revelação'
);

assert.deepEqual(
  evaluateGrimoireAchievementIds({
    event: 'clone',
    originalNoteCount: 2,
    isCloneNote: true,
    note: {},
    unlocked: [],
  }).sort(),
  ['grimorio_eco_clonado', 'grimorio_eco_invertido'].sort(),
  'clone → eco clonado (público) + eco invertido (secreta)'
);

assert.ok(
  evaluateGrimoireAchievementIds({
    event: 'create',
    originalNoteCount: 1,
    isCloneNote: false,
    unlocked: [],
    note: { pinned: true, body: 'x', tags: [] },
  }).includes('grimorio_fixador'),
  'create pinned → fixador'
);

assert.ok(
  evaluateGrimoireAchievementIds({
    event: 'update',
    originalNoteCount: 3,
    isCloneNote: false,
    unlocked: [],
    note: { pinned: true, body: 'x', tags: [] },
  }).includes('grimorio_fixador'),
  'update pin → fixador'
);

assert.ok(
  !evaluateGrimoireAchievementIds({
    event: 'create',
    originalNoteCount: 1,
    isCloneNote: false,
    unlocked: [],
    note: { pinned: false, body: 'x', tags: [] },
  }).includes('grimorio_fixador'),
  'sem pin → sem fixador'
);

assert.deepEqual(
  evaluateGrimoireAchievementIds({
    event: 'create',
    originalNoteCount: 1,
    unlocked: ['grimorio_primeira_inscricao'],
    note: { body: 'curto', tags: [] },
  }),
  [],
  'idempotente: já tem primeira'
);

const ritualBody = Array.from({ length: 90 }, () => 'palavra').join(' ')
  + ' O jogo na aula exige mecânica e o herói do domínio.';
assert.ok(matchesEscribaRitual(ritualBody), 'escriba ritual match');
assert.ok(!matchesEscribaRitual('curto demais'), 'escriba rejeita curto');

assert.ok(matchesCartografoPessoal(['a', 'b', 'c', 'd']), 'cartógrafo 4 tags');
assert.ok(!matchesCartografoPessoal(['a', 'b', 'c']), 'cartógrafo <4');

assert.ok(
  evaluateGrimoireAchievementIds({
    event: 'update',
    originalNoteCount: 5,
    isCloneNote: false,
    unlocked: [],
    note: {
      lessonId: null,
      body: ritualBody,
      tags: ['ritmo', 'boss', 'arena', 'loop'],
      shareCount: 0,
    },
  }).includes('grimorio_escriba_ritual'),
  'update concede escriba'
);

assert.ok(
  evaluateGrimoireAchievementIds({
    event: 'update',
    originalNoteCount: 5,
    isCloneNote: false,
    unlocked: [],
    note: {
      lessonId: 'aula1',
      body: 'x',
      tags: ['a'],
      shareCount: 2,
    },
  }).includes('grimorio_vinculo_oculto'),
  'update com aula + shares → vínculo'
);

const progress = read('api/progress.js');
assert.ok(progress.includes('countOriginalUserNotes'), 'countOriginalUserNotes');
assert.ok(progress.includes('.is(\'cloned_from_note_id\', null)'), 'filtro clones');
assert.ok(progress.includes('evaluateAndAwardGrimoire'), 'hook award');
assert.ok(progress.includes("event: 'create'"), 'hook create');
assert.ok(progress.includes("event: 'share'"), 'hook share');
assert.ok(progress.includes("event: 'clone'"), 'hook clone');

const awardsJs = read('js/grimorio-awards.js');
assert.ok(awardsJs.includes('showGrimoireAwardToast'), 'toast helper');
assert.ok(read('js/grimorio-editar.js').includes('presentGrimoireAwards'), 'editar usa toast');
assert.ok(read('js/grimorio-reading.js').includes('presentGrimoireAwards'), 'reading usa toast');
assert.ok(read('js/grimorio.js').includes('flushQueuedGrimoireAwards'), 'flush na lista');
assert.ok(read('css/grimorio.css').includes('grimorio-award-toast'), 'CSS toast');
assert.ok(read('pages/grimorio.html').includes('grimorio-award-toast'), 'host toast workspace');
assert.ok(read('js/grimorio-reading.js').includes("event.key === 'Escape'"), 'modal Escape');
assert.ok(read('js/grimorio-reading.js').includes("event.key !== 'Tab'"), 'modal focus trap Tab');
assert.ok(progress.includes('pinned: Boolean(created.pinned)') || progress.includes('pinned: Boolean(updated.pinned)'), 'pin no award');

console.log('OK — smoke conquistas Grimório (Fase 4 + 7)');
