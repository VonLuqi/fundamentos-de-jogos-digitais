/**
 * Smoke — relógio do Despertar (Task 0.2 / P0)
 * 60 s de parede ≈ 60 s de sessionSeconds e de produção SPS (±2%).
 *
 * Root cause documentado: a HUD interpolava almas com alpha×SPS (até 1 s à frente),
 * dando a sensação de tempo acelerado. A HUD agora mostra o saldo real; interpolatedSouls
 * limita-se a no máximo 1/TICK_FPS s.
 *
 * Uso: node tests/despertar-clock-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TICK_FPS } from '../js/hades-despertar/config/constants.js';
import { add, cmp, mul, sub } from '../js/hades-despertar/core/decimal.js';
import { GameLoop } from '../js/hades-despertar/core/GameLoop.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { interpolatedSouls } from '../js/hades-despertar/ui/UIRenderer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const rendererSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-clock-smoke.mjs'), 'check inclui clock smoke');
staticAssert(
  rendererSrc.includes('saldo real') || rendererSrc.includes('Cookie Clicker'),
  'HUD documenta saldo real (sem interpolação enganosa)',
);
staticAssert(
  rendererSrc.includes('/ TICK_FPS') || rendererSrc.includes('/TICK_FPS'),
  'interpolatedSouls limita ao tick (não 1 s inteiro)',
);
staticAssert(
  /setText\(this\._hud\?\.souls,\s*formatSouls\(state\.souls\)\)/.test(rendererSrc)
    || rendererSrc.includes('formatSouls(state.souls)'),
  'render da HUD usa state.souls (não interpolatedSouls)',
);

if (errors.length) {
  console.error('despertar-clock-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

class FakeClock {
  constructor() {
    this.nowMs = 0;
    this.frames = [];
    this.nextId = 1;
  }

  now() {
    return this.nowMs;
  }

  requestFrame(callback) {
    const id = this.nextId;
    this.nextId += 1;
    this.frames.push({ id, callback });
    return id;
  }

  cancelFrame(id) {
    this.frames = this.frames.filter((frame) => frame.id !== id);
  }

  advance(ms) {
    this.nowMs += ms;
    const queue = this.frames;
    this.frames = [];
    for (const frame of queue) frame.callback(this.nowMs);
  }
}

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}

run('interpolação ≤ 1/TICK_FPS s de SPS', () => {
  const base = '100';
  const sps = '60';
  const mid = interpolatedSouls(base, sps, 0.5, false);
  const expected = add(base, mul(sps, String(0.5 / TICK_FPS)));
  assert.equal(cmp(mid, expected), 0);
  const full = interpolatedSouls(base, sps, 1, false);
  const maxLead = add(base, mul(sps, String(1 / TICK_FPS)));
  assert.equal(cmp(full, maxLead), 0);
  assert.ok(cmp(full, add(base, sps)) < 0);
});

run('60 s simulados de loop ≈ 60 s de sessionSeconds e SPS (±2%)', () => {
  const state = new GameState({
    souls: '0',
    generators: { wandering_shade: 10 },
  });
  const sps = state.sps();
  assert.ok(cmp(sps, '0') > 0);

  const clock = new FakeClock();
  const loop = new GameLoop(
    (dt) => { state.tick(dt); },
    () => {},
    {
      now: () => clock.now(),
      requestFrame: (cb) => clock.requestFrame(cb),
      cancelFrame: (id) => clock.cancelFrame(id),
      matchMedia: () => ({ matches: false }),
      document: null,
    },
  );
  loop.start();

  const wallMs = 60_000;
  const step = 1000 / TICK_FPS;
  for (let elapsed = 0; elapsed < wallMs; elapsed += step) {
    clock.advance(step);
  }

  assert.ok(
    Math.abs(state.sessionSeconds - 60) < 0.05,
    `session=${state.sessionSeconds}`,
  );
  const expectedSouls = mul(sps, '60');
  const err = Math.abs(Number(sub(state.souls, expectedSouls)));
  const tol = Number(mul(expectedSouls, '0.02')) + 0.05;
  assert.ok(
    err <= tol,
    `souls=${state.souls} expected≈${expectedSouls} err=${err} tol=${tol}`,
  );
});

console.log(`\ndespertar-clock-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
