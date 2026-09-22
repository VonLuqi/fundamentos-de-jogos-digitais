/**
 * Smoke Task E2 — Perf pass (100 T1 + Juízo + 30 s idle)
 * (docs/plano-despertar-ui-cookieclicker.md).
 *
 * Não substitui profile Chrome mobile; trava invariantes de budget:
 * caps visuais, idle simulado sem panic, wall-time do cenário.
 *
 * Uso: node tests/despertar-perf-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOP_PANIC_UPDATES, TICK_FPS } from '../js/hades-despertar/config/constants.js';
import { juizoStart } from '../api/_lib/despertar-juizo.js';
import { GameLoop } from '../js/hades-despertar/core/GameLoop.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { isGeneratorRevealed } from '../js/hades-despertar/ui/UIRenderer.js';
import {
  AltarOrbit,
  ORBIT_CURSOR_CAP,
  SOUL_RAIN_MAX_MOTES,
  SOUL_RAIN_MAX_PER_SEC,
  orbitCursorCount,
} from '../js/hades-despertar/ui/world/AltarOrbit.js';
import {
  SHELF_MOTE_MAX_ON_SCREEN,
  SHELF_MOTE_MAX_PER_SEC,
  SHELF_NPC_CAP,
  WorldView,
  allocateShelfMoteRates,
  cappedNpcCount,
  shelfLineMoteWeight,
} from '../js/hades-despertar/ui/world/WorldView.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const plan = fs.readFileSync(path.join(root, 'docs/plano-despertar-ui-cookieclicker.md'), 'utf8');
const worldSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/WorldView.js'), 'utf8');
const altarSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/AltarOrbit.js'), 'utf8');
const particlesSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/particles.js'), 'utf8');

staticAssert(pkg.includes('despertar-perf-smoke.mjs'), 'check inclui perf smoke');
staticAssert(plan.includes('Caps finais') || plan.includes('SHELF_NPC_CAP'), 'caps documentados no plano');
staticAssert(worldSrc.includes('SHELF_NPC_CAP = 400') || worldSrc.includes('SHELF_NPC_CAP=400') || /SHELF_NPC_CAP\s*=\s*400/.test(worldSrc), 'SHELF_NPC_CAP=400');
staticAssert(/ORBIT_CURSOR_CAP\s*=\s*40/.test(altarSrc), 'ORBIT_CURSOR_CAP=40');
staticAssert(/SHELF_MOTE_MAX_PER_SEC\s*=\s*8/.test(worldSrc), 'motes ≤8/s');
staticAssert(/SOUL_RAIN_MAX_PER_SEC\s*=\s*6/.test(altarSrc), 'chuva ≤6/s');
staticAssert(particlesSrc.includes('MAX_MOTES = 24') || /MAX_MOTES\s*=\s*24/.test(particlesSrc), 'reap motes ≤24');

if (errors.length) {
  console.error('despertar-perf-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

function createFakeDocument() {
  const doc = {
    createElement(tag) {
      const rains = [];
      const el = {
        tagName: String(tag).toUpperCase(),
        className: '',
        hidden: false,
        title: '',
        width: 0,
        height: 0,
        childNodes: [],
        childElementCount: 0,
        firstElementChild: null,
        dataset: {},
        style: { setProperty() {}, props: {} },
        textContent: '',
        classList: {
          _on: new Set(),
          toggle(name, force) {
            if (force) this._on.add(name);
            else this._on.delete(name);
          },
        },
        setAttribute() {},
        addEventListener() {},
        getBoundingClientRect() {
          return { width: 220, height: 220 };
        },
        getContext(type) {
          if (type !== '2d') return null;
          return {
            clearRect() {},
            save() {},
            restore() {},
            translate() {},
            rotate() {},
            scale() {},
            beginPath() {},
            arc() {},
            ellipse() {},
            moveTo() {},
            lineTo() {},
            quadraticCurveTo() {},
            fill() {},
            stroke() {},
            setLineDash() {},
            globalAlpha: 1,
            fillStyle: '',
            strokeStyle: '',
          };
        },
        append(...kids) {
          kids.forEach((k) => this.childNodes.push(k));
        },
        appendChild(node) {
          this.childNodes.push(node);
          rains.push(node);
          this.childElementCount = this.childNodes.length;
          this.firstElementChild = this.childNodes[0] || null;
          return node;
        },
        replaceChildren(...kids) {
          this.childNodes = [...kids];
          this.childElementCount = this.childNodes.length;
          this.firstElementChild = this.childNodes[0] || null;
        },
        ownerDocument: null,
      };
      el.ownerDocument = doc;
      return el;
    },
  };
  return doc;
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

run('caps finais: prateleira cresce; órbita capped 40', () => {
  assert.equal(SHELF_NPC_CAP, 400);
  assert.equal(ORBIT_CURSOR_CAP, 40);
  assert.equal(SHELF_MOTE_MAX_PER_SEC, 8);
  assert.equal(SHELF_MOTE_MAX_ON_SCREEN, 20);
  assert.equal(SOUL_RAIN_MAX_PER_SEC, 6);
  assert.equal(SOUL_RAIN_MAX_MOTES, 16);
  assert.equal(TICK_FPS, 60);
  assert.equal(LOOP_PANIC_UPDATES, 300);
  assert.equal(cappedNpcCount(100), 100);
  assert.equal(cappedNpcCount(999), 400);
  assert.equal(orbitCursorCount(100), 40);
});

run('100 T1: sem prateleira; órbita capped; T2 povoa Mundo', () => {
  const doc = createFakeDocument();
  const shelves = doc.createElement('div');
  const hint = doc.createElement('p');
  const world = new WorldView({
    document: doc,
    isGeneratorRevealed,
    matchMedia: () => ({ matches: false }),
    requestFrame: () => 1,
    cancelFrame: () => {},
    now: () => 0,
  }).mount(shelves, hint);

  const onlyT1 = new GameState({
    souls: '0',
    generators: { wandering_shade: 100 },
  });
  world.sync(onlyT1);
  assert.equal(world._shelves.has('wandering_shade'), false);
  assert.equal(world.hasSprites, false);

  const withT2 = new GameState({
    souls: '0',
    generators: { wandering_shade: 100, charon_servants: 100 },
  });
  world.sync(withT2);
  assert.equal(world._shelves.get('charon_servants').count, 100);
  assert.equal(world._shelves.get('charon_servants').cols, 25);

  const weight = shelfLineMoteWeight(100, withT2.sps());
  const rates = allocateShelfMoteRates({ charon_servants: weight });
  const sum = Object.values(rates).reduce((a, b) => a + b, 0);
  assert.ok(sum <= SHELF_MOTE_MAX_PER_SEC + 1e-9, `motes/s=${sum}`);

  const orbitHost = doc.createElement('div');
  const particles = doc.createElement('div');
  const veil = doc.createElement('div');
  const altar = new AltarOrbit({
    document: doc,
    matchMedia: () => ({ matches: false }),
    requestFrame: () => 1,
    cancelFrame: () => {},
    now: () => 0,
  }).mount({ orbitHost, particleLayer: particles, veil });
  assert.equal(altar.sync(onlyT1).cursorCount, 40);
});

run('perfil Node: 100 T1 + Juízo + 30 s idle (sem panic, wall < 5 s)', () => {
  const state = new GameState({
    souls: '1000',
    generators: { wandering_shade: 100 },
  });

  const juizo = juizoStart({
    juizoCurrentStreak: 0,
    juizoBestStreak: 0,
    juizoMilestonesClaimed: [],
    verdicts: 0,
    juizoRun: null,
  });
  assert.equal(juizo.ok, true);
  assert.ok(juizo.pair?.cardA?.rating);
  assert.equal('rating' in (juizo.pair.cardB || {}), false);

  const clock = new FakeClock();
  let maxUpdatesPerFrame = 0;
  const loop = new GameLoop(
    (dt) => { state.tick(dt); },
    (_alpha, meta = {}) => {
      if (meta.updates > maxUpdatesPerFrame) maxUpdatesPerFrame = meta.updates;
    },
    {
      now: () => clock.now(),
      requestFrame: (cb) => clock.requestFrame(cb),
      cancelFrame: (id) => clock.cancelFrame(id),
      matchMedia: () => ({ matches: false }),
      document: null,
      panicUpdates: LOOP_PANIC_UPDATES,
    },
  );
  loop.start();

  const wallStart = performance.now();
  const wallMs = 30_000;
  const step = 1000 / TICK_FPS;
  for (let elapsed = 0; elapsed < wallMs; elapsed += step) {
    clock.advance(step);
  }
  const wallElapsed = performance.now() - wallStart;
  loop.stop();

  assert.ok(
    maxUpdatesPerFrame < LOOP_PANIC_UPDATES,
    `panic-ish updates/frame=${maxUpdatesPerFrame}`,
  );
  assert.ok(
    Math.abs(state.sessionSeconds - 30) < 0.05,
    `session=${state.sessionSeconds}`,
  );
  assert.ok(
    wallElapsed < 5000,
    `30 s simulados levaram ${wallElapsed.toFixed(0)} ms (budget 5 s)`,
  );
  // Juízo overlay não pausa o loop (estado + pair vivos em paralelo).
  assert.ok(juizo.pair);
});

console.log(`\ndespertar-perf-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
