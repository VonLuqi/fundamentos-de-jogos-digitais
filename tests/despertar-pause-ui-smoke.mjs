/**
 * Smoke Task A2 — UI do Véu da Aula (pauseVeil + wiring).
 * docs/plano-despertar-producao-profundo.md
 *
 * Uso: node tests/despertar-pause-ui-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PAUSE_VEIL_COPY,
  SEALED_VEIL_COPY,
  buildPauseVeilModel,
  computeServerOffsetMs,
  formatCountdown,
  formatLocalReopen,
  presentClassroomPauseVeil,
  presentSealedVeil,
  remainingPauseMs,
} from '../js/hades-despertar/ui/pauseVeil.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const indexSrc = read('js/hades-despertar/index.js');
const cssSrc = read('css/despertar.css');
const apiSrc = read('js/api.js');
const pkgSrc = read('package.json');

assert.match(indexSrc, /presentClassroomPauseVeil/);
assert.match(indexSrc, /enterClassroomPauseVeil/);
assert.match(indexSrc, /DESPERTAR_PAUSED_ERROR/);
assert.match(indexSrc, /Tua Estela está intacta|PAUSE_VEIL_COPY|pauseVeil/);
assert.match(cssSrc, /\.despertar-classroom-veil\b/);
assert.match(apiSrc, /DESPERTAR_PAUSED_ERROR\s*=\s*'despertar_paused'/);
assert.match(pkgSrc, /despertar-pause-ui-smoke\.mjs/);

assert.equal(PAUSE_VEIL_COPY.title, 'O Acheron guarda silêncio');
assert.match(PAUSE_VEIL_COPY.body, /Tua Estela está intacta/);
assert.equal(SEALED_VEIL_COPY.title, 'O Acheron ainda está selado');

const localNow = Date.parse('2026-09-28T15:00:00.000Z');
assert.equal(computeServerOffsetMs('2026-09-28T15:00:05.000Z', localNow), 5000);
assert.equal(
  remainingPauseMs('2026-09-28T15:01:00.000Z', 0, localNow),
  60_000,
);
assert.equal(
  remainingPauseMs('2026-09-28T15:01:00.000Z', 5000, localNow),
  55_000,
);
assert.equal(formatCountdown(0), '00:00');
assert.equal(formatCountdown(65_000), '01:05');
assert.equal(formatCountdown(3_661_000), '1:01:01');
assert.ok(formatLocalReopen('2026-09-28T15:30:00.000Z'));

const model = buildPauseVeilModel(
  { reason: 'Aula em andamento', pauseUntil: '2026-09-28T15:30:00.000Z' },
  { serverOffsetMs: 0, localNow: Date.parse('2026-09-28T15:00:00.000Z') },
);
assert.equal(model.title, PAUSE_VEIL_COPY.title);
assert.match(model.timerLabel, /Reabre em/);
assert.equal(model.expired, false);

// DOM stub: countdown zera → fetchPause sem active → resumed
{
  const calls = [];
  const container = {
    innerHTML: '',
    querySelector(sel) {
      if (!this._doc) return null;
      return this._doc.querySelector(sel);
    },
  };

  // Minimal fake: presentClassroomPauseVeil uses container.innerHTML + querySelector
  // We use a real linkedom-less stub via object that stores HTML and parses lightly.
  const timers = [];
  let nowTick = 0;

  await presentClassroomPauseVeil(
    {
      get innerHTML() {
        return this._html || '';
      },
      set innerHTML(v) {
        this._html = String(v);
      },
      querySelector(sel) {
        if (sel === '[data-pause-timer]') {
          return {
            textContent: '',
            hidden: false,
          };
        }
        if (sel === '[data-pause-expired]') {
          return { hidden: true };
        }
        if (sel === '[data-pause-actions]') {
          return { hidden: true };
        }
        if (sel === '[data-pause-resume]') {
          return { addEventListener() {} };
        }
        return null;
      },
    },
    {
      pause: {
        active: true,
        pauseUntil: '2026-09-28T14:59:50.000Z',
        reason: 'Aula em andamento',
      },
      serverNow: '2026-09-28T15:00:00.000Z',
      reducedMotion: true,
      setIntervalFn(fn) {
        const id = ++nowTick;
        timers.push(id);
        queueMicrotask(() => fn());
        return id;
      },
      clearIntervalFn() {},
      async fetchPause() {
        calls.push('fetch');
        return { pause: null, serverNow: '2026-09-28T15:00:01.000Z' };
      },
    },
  ).then((result) => {
    assert.equal(result, 'resumed');
    assert.ok(calls.includes('fetch'));
  });
}

// Sealed veil markup
{
  const box = { innerHTML: '' };
  presentSealedVeil(box, { aulasHref: '/pages/aulas.html' });
  assert.match(box.innerHTML, /O Acheron ainda está selado/);
  assert.match(box.innerHTML, /Voltar à Trilha/);
  assert.match(box.innerHTML, /href="\/pages\/aulas\.html"/);
}

console.log('despertar-pause-ui-smoke: ok');
