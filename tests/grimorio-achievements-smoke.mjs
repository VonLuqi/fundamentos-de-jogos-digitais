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
import { readProgressSurface } from './_helpers/progress-surface.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
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

const ritualBody = Array.from({ length: 90 }, () => 'palavra').join(' ')
  + ' O jogo na aula exige mecânica e o herói do domínio.';
const progress = readProgressSurface(root);
assert.ok(progress.includes('countOriginalUserNotes'), 'countOriginalUserNotes');
assert.ok(progress.includes('evaluateAndAwardGrimoire'), 'hook award');
const awardsJs = read('js/grimorio-awards.js');
assert.ok(awardsJs.includes('showGrimoireAwardToast'), 'toast helper');
assert.ok(read('js/grimorio-editar.js').includes('presentGrimoireAwards'), 'editar usa toast');
assert.ok(read('js/grimorio-reading.js').includes('presentGrimoireAwards'), 'reading usa toast');
assert.ok(read('js/grimorio.js').includes('flushQueuedGrimoireAwards'), 'flush na lista');
assert.ok(read('css/grimorio.css').includes('grimorio-award-toast'), 'CSS toast');
assert.ok(read('pages/grimorio.html').includes('grimorio-award-toast'), 'host toast workspace');
assert.ok(read('js/grimorio-reading.js').includes("event.key === 'Escape'"), 'modal Escape');
assert.ok(read('js/grimorio-reading.js').includes("event.key !== 'Tab'"), 'modal focus trap Tab');
console.log('OK — smoke conquistas Grimório (Fase 4 + 7)');
