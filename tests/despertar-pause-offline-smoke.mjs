/**
 * Smoke Task A4 — Offline / catch-up durante Véu da Aula.
 * docs/plano-despertar-producao-profundo.md
 *
 * Uso: node tests/despertar-pause-offline-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  bootAuthoritativeSession,
  clampHiddenSeconds,
  effectiveOfflineSeconds,
  isPauseWindowActive,
  normalizePauseWindow,
  previewCatchUp,
  resumeFromHidden,
} from '../js/hades-despertar/services/OfflineEngine.js';
import { pauseWindowDto } from '../api/_lib/despertar-gate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const engineSrc = read('js/hades-despertar/services/OfflineEngine.js');
const indexSrc = read('js/hades-despertar/index.js');
const shellSrc = read('js/app-shell.js');
const apiSrc = read('api/despertar.js');
const gateSrc = read('api/_lib/despertar-gate.js');
const pkgSrc = read('package.json');

assert.match(engineSrc, /effectiveOfflineSeconds/);
assert.match(engineSrc, /clampHiddenSeconds/);
assert.match(engineSrc, /normalizePauseWindow/);
assert.match(engineSrc, /pauseExcluded/);
assert.match(gateSrc, /pauseWindowDto/);
assert.match(apiSrc, /pauseWindow/);
assert.match(indexSrc, /pauseWindowRef/);
assert.match(indexSrc, /rememberPauseWindow/);
assert.match(indexSrc, /resumeFromHidden\(state, seconds,\s*\{\s*pause:/);
assert.match(shellSrc, /pauseActive/);
assert.match(shellSrc, /Em aula/);
assert.match(pkgSrc, /despertar-pause-offline-smoke\.mjs/);

const now = Date.parse('2026-09-28T16:00:00.000Z');
const pauseActive = {
  active: true,
  pauseUntil: '2026-09-28T16:30:00.000Z',
  pauseStartedAt: '2026-09-28T15:00:00.000Z',
};
const pauseExpired = {
  active: false,
  pauseUntil: '2026-09-28T15:30:00.000Z',
  pauseStartedAt: '2026-09-28T15:00:00.000Z',
};

assert.equal(isPauseWindowActive(pauseActive, now), true);
assert.equal(isPauseWindowActive(pauseExpired, now), false);
assert.deepEqual(normalizePauseWindow({
  pause_until: '2026-09-28T15:30:00.000Z',
  pause_started_at: '2026-09-28T15:00:00.000Z',
}), {
  active: false,
  pauseUntil: '2026-09-28T15:30:00.000Z',
  pauseStartedAt: '2026-09-28T15:00:00.000Z',
});

// Pausa ativa → zero catch-up
assert.equal(
  effectiveOfflineSeconds({
    savedAt: '2026-09-28T14:00:00.000Z',
    now,
    pause: pauseActive,
  }),
  0,
);

// Após expirar: exclui [started, until] do intervalo [savedAt, now]
// saved 14:00 → now 16:00 = 2h; pausa 15:00–15:30 = 30 min → 1.5h = 5400s
assert.equal(
  effectiveOfflineSeconds({
    savedAt: '2026-09-28T14:00:00.000Z',
    now,
    pause: pauseExpired,
  }),
  5400,
);

// Sem pauseStartedAt → clamp conservador (início = savedAt)
assert.equal(
  effectiveOfflineSeconds({
    savedAt: '2026-09-28T14:00:00.000Z',
    now,
    pause: { pauseUntil: '2026-09-28T15:30:00.000Z' },
  }),
  1800,
);

// Sem overlap com pausa → full elapsed
assert.equal(
  effectiveOfflineSeconds({
    savedAt: '2026-09-28T15:45:00.000Z',
    now,
    pause: pauseExpired,
  }),
  900,
);

// Hidden tab clamp
assert.equal(clampHiddenSeconds(600, { pause: pauseActive, now }), 0);
// hidden 14:45–15:45; pausa 15:00–15:30 → exclui 30 min → 1800s
assert.equal(
  clampHiddenSeconds(3600, {
    pause: pauseExpired,
    now: Date.parse('2026-09-28T15:45:00.000Z'),
  }),
  1800,
);

// previewCatchUp zero sob pausa ativa
{
  const state = GameState.fromSnapshot({
    souls: '100',
    generators: { styx_ferry: 1 },
  });
  const preview = previewCatchUp(state.toSnapshot(), {
    savedAt: '2026-09-28T14:00:00.000Z',
    now,
    pause: pauseActive,
  });
  assert.equal(preview.elapsedSeconds, 0);
  assert.equal(preview.pauseExcluded, true);
}

// resumeFromHidden zera sob pausa
{
  const state = GameState.fromSnapshot({
    souls: '50',
    generators: { styx_ferry: 1 },
  });
  const before = state.souls;
  const resumed = resumeFromHidden(state, 1800, { pause: pauseActive, now });
  assert.equal(resumed.elapsedSeconds, 0);
  assert.equal(String(state.souls), String(before));
}

// pauseWindowDto: ativo e pós-expiração
{
  const raw = {
    released: true,
    pauseUntil: '2026-09-28T15:30:00.000Z',
    reason: 'Aula',
    pauseStartedAt: '2026-09-28T15:00:00.000Z',
  };
  const during = pauseWindowDto(raw, Date.parse('2026-09-28T15:10:00.000Z'));
  assert.equal(during.active, true);
  assert.equal(during.pauseUntil, raw.pauseUntil);

  const after = pauseWindowDto(raw, now);
  assert.equal(after.active, false);
  assert.equal(after.pauseUntil, raw.pauseUntil);
  assert.equal(after.pauseStartedAt, raw.pauseStartedAt);
}

// bootAuthoritativeSession honra pause do fetch
{
  const saves = [];
  const storage = {
    async load() {
      return {
        savedAt: '2026-09-28T14:00:00.000Z',
        state: {
          souls: '10',
          generators: { styx_ferry: 1 },
          lastSyncAt: '2026-09-28T14:00:00.000Z',
        },
      };
    },
    async save(_id, snap) {
      saves.push(snap);
    },
    attach() {
      return () => {};
    },
  };

  const paused = await bootAuthoritativeSession('u1', {
    storage,
    now: () => now,
    pause: pauseActive,
    fetchServerState: async () => ({
      state: null,
      pause: pauseActive,
    }),
  });
  assert.equal(paused.catchUp.elapsedSeconds, 0);

  const afterPause = await bootAuthoritativeSession('u1', {
    storage,
    now: () => now,
    fetchServerState: async () => ({
      state: null,
      pause: pauseExpired,
    }),
  });
  assert.equal(afterPause.catchUp.elapsedSeconds, 5400);
  assert.ok(saves.length >= 2);
}

console.log('despertar-pause-offline-smoke: ok');
