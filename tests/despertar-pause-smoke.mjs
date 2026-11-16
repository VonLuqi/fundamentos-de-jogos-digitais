/**
 * Smoke Task A1 — Véu da Aula (classroom_pause) schema + gate helpers + API wiring.
 * docs/plano-despertar-producao-profundo.md
 *
 * Uso: node tests/despertar-pause-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DESPERTAR_PAUSE_KEY,
  DESPERTAR_PAUSE_MAX_MS,
  DESPERTAR_PAUSE_REASON_MAX,
  DESPERTAR_PAUSE_REASON_PRESETS,
  DESPERTAR_PAUSED_ERROR,
  DESPERTAR_SEALED_ERROR,
  __resetDespertarGateCacheForTests,
  isDespertarPauseActive,
  isDespertarPlayBlocked,
  isDespertarSealedForUser,
  pausePublicDto,
  pauseWindowDto,
  resolvePauseReason,
  resolvePauseUntil,
} from '../api/_lib/despertar-gate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const gateSrc = read('api/_lib/despertar-gate.js');
const apiSrc = read('api/despertar.js');
const sharedSrc = read('api/_lib/progress/shared.js');
const setupSrc = read('db/setup.sql');
const migrateSrc = read('db/migrate-2026-09-28-despertar-classroom-pause.sql');
const clientApiSrc = read('js/api.js');
const pkgSrc = read('package.json');

assert.match(migrateSrc, /ADD COLUMN IF NOT EXISTS meta jsonb/i);
assert.match(setupSrc, /meta jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
assert.match(sharedSrc, /classroom_pause:\s*false/);
assert.match(gateSrc, /DESPERTAR_PAUSE_KEY/);
assert.match(gateSrc, /getDespertarPauseState/);
assert.match(gateSrc, /isDespertarPlayBlocked/);
assert.match(gateSrc, /setDespertarClassroomPause/);
assert.match(gateSrc, /clearDespertarClassroomPause/);
assert.match(apiSrc, /action === 'pauseSet'/);
assert.match(apiSrc, /action === 'pauseClear'/);
assert.match(apiSrc, /DESPERTAR_PAUSED_ERROR/);
assert.match(apiSrc, /pausePublicDto/);
assert.match(apiSrc, /pauseWindowDto/);
assert.match(apiSrc, /pauseWindow/);
assert.match(gateSrc, /pauseWindowDto/);
assert.match(clientApiSrc, /function despertarPauseSet/);
assert.match(clientApiSrc, /function despertarPauseClear/);
assert.match(pkgSrc, /despertar-pause-smoke\.mjs/);

assert.equal(DESPERTAR_PAUSE_KEY, 'classroom_pause');
assert.equal(DESPERTAR_PAUSED_ERROR, 'despertar_paused');
assert.equal(DESPERTAR_SEALED_ERROR, 'despertar_sealed');
assert.equal(DESPERTAR_PAUSE_MAX_MS, 4 * 60 * 60 * 1000);
assert.equal(DESPERTAR_PAUSE_REASON_MAX, 120);
assert.ok(DESPERTAR_PAUSE_REASON_PRESETS.aula);

__resetDespertarGateCacheForTests();

const now = Date.parse('2026-09-28T15:00:00.000Z');

// resolvePauseUntil
{
  const ok = resolvePauseUntil({ minutes: 30 }, now);
  assert.equal(ok.ok, true);
  assert.equal(ok.pauseUntil, '2026-09-28T15:30:00.000Z');

  const abs = resolvePauseUntil({ pauseUntil: '2026-09-28T16:00:00.000Z' }, now);
  assert.equal(abs.ok, true);

  const past = resolvePauseUntil({ pauseUntil: '2026-09-28T14:00:00.000Z' }, now);
  assert.equal(past.ok, false);

  const tooLong = resolvePauseUntil({ minutes: 5 * 60 }, now);
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.error, /4 horas/i);

  const bad = resolvePauseUntil({ minutes: 0 }, now);
  assert.equal(bad.ok, false);
}

// resolvePauseReason
{
  assert.equal(resolvePauseReason({ reasonPreset: 'aula' }).reason, 'Aula em andamento');
  assert.equal(
    resolvePauseReason({ reasonPreset: 'custom', reason: 'Prova oral' }).reason,
    'Prova oral',
  );
  const long = 'x'.repeat(121);
  assert.equal(resolvePauseReason({ reasonPreset: 'custom', reason: long }).ok, false);
  assert.equal(resolvePauseReason({ reasonPreset: 'custom', reason: '' }).ok, false);
}

// pause active / dto / play blocked
{
  const active = {
    released: true,
    pauseUntil: '2026-09-28T15:30:00.000Z',
    reason: 'Aula em andamento',
    pauseStartedAt: '2026-09-28T15:00:00.000Z',
  };
  assert.equal(isDespertarPauseActive(active, now), true);
  assert.equal(isDespertarPauseActive(active, Date.parse('2026-09-28T15:30:00.000Z')), false);
  assert.equal(isDespertarPauseActive({ ...active, released: false }, now), false);

  const dto = pausePublicDto(active, now);
  assert.equal(dto.active, true);
  assert.equal(dto.pauseUntil, active.pauseUntil);
  assert.equal(pausePublicDto(active, Date.parse('2026-09-28T16:00:00.000Z')), null);

  const winActive = pauseWindowDto(active, now);
  assert.equal(winActive.active, true);
  assert.equal(winActive.pauseUntil, active.pauseUntil);
  const winExpired = pauseWindowDto(active, Date.parse('2026-09-28T16:00:00.000Z'));
  assert.equal(winExpired.active, false);
  assert.equal(winExpired.pauseUntil, active.pauseUntil);

  const student = { role: 'student' };
  const admin = { role: 'admin' };
  assert.equal(isDespertarSealedForUser(student, false), true);
  assert.equal(isDespertarPlayBlocked(student, false, active, now), true);
  assert.equal(isDespertarPlayBlocked(student, true, active, now), true);
  assert.equal(isDespertarPlayBlocked(student, true, emptyExpired(), now), false);
  assert.equal(isDespertarPlayBlocked(admin, false, active, now), false);
  assert.equal(isDespertarPlayBlocked(admin, true, active, now), false);
}

function emptyExpired() {
  return {
    released: true,
    pauseUntil: '2026-09-28T14:00:00.000Z',
    reason: 'Aula',
    pauseStartedAt: '2026-09-28T13:00:00.000Z',
  };
}

console.log('despertar-pause-smoke: ok');
