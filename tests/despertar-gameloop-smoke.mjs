/**
 * Smoke Task 4 — GameLoop RAF de O Despertar
 * (docs/plano-hades-despertar.md).
 *
 * Relógio e RAF falsos: prova 60 updates em ~1 s, panic e stop.
 *
 * Uso: node tests/despertar-gameloop-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOP_PANIC_UPDATES, TICK_FPS } from '../js/hades-despertar/config/constants.js';
import { GameLoop } from '../js/hades-despertar/core/GameLoop.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

staticAssert(
  fs.existsSync(path.join(root, 'js/hades-despertar/core/GameLoop.js')),
  'Arquivo ausente: js/hades-despertar/core/GameLoop.js',
);
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-gameloop-smoke.mjs'), 'npm run check inclui este smoke');
staticAssert(pkg.includes('js/hades-despertar/core/GameLoop.js'), 'npm run check cobre GameLoop.js');

const loopSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameLoop.js'), 'utf8');
staticAssert(loopSrc.includes('accumulatedLag'), 'acumulador de lag');
staticAssert(/panicUpdates|LOOP_PANIC_UPDATES/.test(loopSrc), 'panic configurado');
staticAssert(loopSrc.includes('visibilitychange'), 'ouve visibilitychange');
staticAssert(loopSrc.includes('prefers-reduced-motion'), 'respeita reduced motion no render');

if (errors.length) {
  console.error('despertar-gameloop-smoke (estático):');
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

function fakeDocument() {
  const listeners = new Map();
  return {
    hidden: false,
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type, fn) {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
    hide() {
      this.hidden = true;
      listeners.get('visibilitychange')?.();
    },
    show() {
      this.hidden = false;
      listeners.get('visibilitychange')?.();
    },
  };
}

function createLoop(clock, hooks = {}, extras = {}) {
  return new GameLoop(
    hooks.update ?? (() => {}),
    hooks.render ?? (() => {}),
    {
      now: () => clock.now(),
      requestFrame: (cb) => clock.requestFrame(cb),
      cancelFrame: (id) => clock.cancelFrame(id),
      document: extras.document ?? null,
      matchMedia: extras.matchMedia,
      onResume: extras.onResume,
      fps: extras.fps,
      panicUpdates: extras.panicUpdates,
    },
  );
}

let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

await run('60 updates em ~1 s de relógio', () => {
  const clock = new FakeClock();
  let updates = 0;
  let lastDt = null;
  const loop = createLoop(clock, {
    update: (dt) => {
      updates += 1;
      lastDt = dt;
    },
  });
  loop.start();
  clock.advance(1000);
  assert.equal(loop.step, 1000 / TICK_FPS);
  assert.ok(Math.abs(lastDt - 1 / TICK_FPS) < 1e-9, 'dt do update é step/1000');
  assert.ok(updates >= 58 && updates <= 62, `esperava ~60 updates, veio ${updates}`);
  loop.stop();
});

await run('stop cancela o próximo RAF', () => {
  const clock = new FakeClock();
  let updates = 0;
  const loop = createLoop(clock, { update: () => { updates += 1; } });
  loop.start();
  assert.equal(clock.frames.length, 1, 'start agenda um frame');
  loop.stop();
  assert.equal(loop.isRunning, false);
  assert.equal(loop.animationFrameId, null);
  assert.equal(clock.frames.length, 0, 'stop cancela o frame pendente');
  clock.advance(1000);
  assert.equal(updates, 0, 'depois do stop não há update');
});

await run('panic aos 300 updates zera o acumulador', () => {
  const clock = new FakeClock();
  let updates = 0;
  const loop = createLoop(clock, { update: () => { updates += 1; } });
  loop.start();
  clock.advance(20_000);
  assert.equal(updates, LOOP_PANIC_UPDATES);
  assert.equal(loop.accumulatedLag, 0);
  loop.stop();
});

await run('visibilitychange ao voltar não spiral; reduced motion só no render', () => {
  const clock = new FakeClock();
  const doc = fakeDocument();
  let updates = 0;
  let resumed = 0;
  let lastAlpha = null;
  let lastMeta = null;
  const loop = createLoop(
    clock,
    {
      update: () => { updates += 1; },
      render: (alpha, meta) => {
        lastAlpha = alpha;
        lastMeta = meta;
      },
    },
    {
      document: doc,
      onResume: (seconds) => { resumed = seconds; },
      matchMedia: () => ({ matches: true }),
    },
  );

  loop.start();
  clock.advance(loop.step);
  const afterFirst = updates;
  assert.ok(afterFirst >= 1);
  assert.equal(lastAlpha, 1, 'reduced motion força alpha 1');
  assert.equal(lastMeta.reducedMotion, true);

  doc.hide();
  assert.equal(clock.frames.length, 0, 'aba oculta pausa o RAF');
  clock.advance(10_000);
  assert.equal(updates, afterFirst, 'enquanto oculta não tica');

  doc.show();
  assert.ok(Math.abs(resumed - 10) < 1e-6, `onResume deveria ser ~10 s, veio ${resumed}`);
  assert.equal(updates, afterFirst, 'voltar não despeja ticks do intervalo');
  assert.equal(loop.accumulatedLag, 0);
  loop.stop();
});

await run('GameState.tick via loop em 1 s com 1 sombra', () => {
  const clock = new FakeClock();
  const state = new GameState({ generators: { wandering_shade: 1 } });
  const loop = createLoop(clock, {
    update: (dt) => state.tick(dt),
  });
  loop.start();
  clock.advance(1000);
  loop.stop();
  const souls = Number(state.souls);
  assert.ok(souls > 0.09 && souls < 0.11, `1 sombra × 1 s ≈ 0.1 alma, veio ${state.souls}`);
});

console.log(`\ndespertar-gameloop-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
