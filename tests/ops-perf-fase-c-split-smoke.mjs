/**
 * Smoke Fase C / Task C3 — split do monólito api/progress.js.
 * docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 *
 * Uso: node tests/ops-perf-fase-c-split-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProgressSurface } from './_helpers/progress-surface.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

const DOMAIN_FILES = [
  'api/_lib/progress/shared.js',
  'api/_lib/progress/friends.js',
  'api/_lib/progress/notes.js',
  'api/_lib/progress/lessons.js',
  'api/_lib/progress/admin.js',
  'api/_lib/progress/underworld.js',
  'api/_lib/progress/redeem.js',
  'api/_lib/progress/profile.js',
  'api/_lib/progress/leaderboard-handler.js',
];

const ACTIONS = [
  'friendsList',
  'classmatesList',
  'leaderboardGet',
  'friendSearch',
  'friendRequest',
  'friendRespond',
  'friendRemove',
  'friendProfile',
  'notesList',
  'noteGet',
  'noteCreate',
  'noteUpdate',
  'noteDelete',
  'noteShare',
  'noteUnshare',
  'noteClone',
  'noteRefuseShare',
  'noteEventsAck',
  'notesListAdmin',
  'notesListForUser',
  'underworldJudgment',
  'underworldRedeem',
  'redeem',
  'avatar',
  'generateCode',
  'lessonCode',
  'lessonGates',
  'lessonGatesBatch',
  'getLessonParagraph',
  'listMyLessonParagraphs',
  'saveLessonParagraph',
  'lessonEventsBatch',
  'lessonView',
  'setLessonGate',
  'listCodes',
  'listUsers',
  'adminUpdateProfile',
  'adminAdjustXp',
  'adminSetLessonCompleted',
  'adminGrantAchievement',
  'adminRevokeAchievement',
  'adminClearEmailSeal',
  'adminInvalidateSessions',
];

for (const rel of DOMAIN_FILES) {
  assert(fs.existsSync(path.join(root, rel)), `domínio presente: ${rel}`);
}

const facade = read('api/progress.js');
assert(facade.includes('runWithMetrics'), 'fachada mantém runWithMetrics');
assert(facade.includes('rejectUnlessMessengerSeal'), 'fachada mantém rejectUnlessMessengerSeal');
assert(facade.includes('MESSENGER_SEAL_EXEMPT_ACTIONS'), 'fachada mantém MESSENGER_SEAL_EXEMPT_ACTIONS');
assert(facade.includes('profileGet'), 'fachada referencia profileGet');
assert(facade.includes("action === 'friendsList'"), 'fachada dispatch friendsList com action ===');
assert(!/const\s+ACTION_HANDLERS\s*=/.test(facade), 'fachada não usa map-only dispatch');

for (const action of ACTIONS) {
  assert(
    facade.includes(`action === '${action}'`),
    `fachada expõe action === '${action}'`,
  );
}

const surface = readProgressSurface(root);
assert(surface.length > facade.length, 'surface inclui módulos além da fachada');

// Nenhuma action do inventário pode ficar só no surface sem a fachada
for (const action of ACTIONS) {
  assert(surface.includes(`action === '${action}'`), `surface cobre ${action}`);
}

const pkg = read('package.json');
assert(pkg.includes('ops-perf-fase-c-split-smoke.mjs'), 'npm check inclui split smoke');
for (const rel of [
  'api/_lib/progress/shared.js',
  'api/_lib/progress/friends.js',
  'api/_lib/progress/notes.js',
  'api/_lib/progress/lessons.js',
  'api/_lib/progress/admin.js',
  'api/_lib/progress/underworld.js',
  'api/_lib/progress/redeem.js',
  'api/_lib/progress/profile.js',
  'api/_lib/progress/leaderboard-handler.js',
]) {
  assert(pkg.includes(rel.replace(/\\/g, '/')) || pkg.includes(rel), `check cobre ${rel}`);
}

const coldDoc = read('docs/load-results/COLD-START-PROGRESS-C3.md');
assert(coldDoc.includes('pending_staging_measure'), 'cold start doc marca pending_staging_measure');

if (errors.length) {
  console.error('ops-perf-fase-c-split-smoke FAIL');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}
console.log('ops-perf-fase-c-split-smoke OK');
