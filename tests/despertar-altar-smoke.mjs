/**
 * Smoke Task B2 — AltarOrbit (órbita T1 + chuva + véu)
 * Uso: node tests/despertar-altar-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  AltarOrbit,
  ORBIT_CURSOR_CAP,
  SOUL_RAIN_MAX_MOTES,
  SOUL_RAIN_MAX_PER_SEC,
  orbitCursorCount,
  soulRainRate,
  veilPercent,
} from '../js/hades-despertar/ui/world/AltarOrbit.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const altarSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/AltarOrbit.js'), 'utf8');
const rendererSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(fs.existsSync(path.join(root, 'js/hades-despertar/ui/world/AltarOrbit.js')), 'AltarOrbit.js');
staticAssert(html.includes('id="despertar-reap-orbit"'), 'host da órbita');
staticAssert(html.includes('id="despertar-veil"'), 'véu milk');
staticAssert(html.includes('data-particle-layer'), 'camada de chuva');
staticAssert(rendererSrc.includes('AltarOrbit'), 'UIRenderer integra AltarOrbit');
staticAssert(css.includes('despertar-particle--rain'), 'CSS chuva');
staticAssert(css.includes('is-milk'), 'CSS véu milk');
staticAssert(altarSrc.includes('wandering_shade'), 'órbita = T1');
staticAssert(pkg.includes('despertar-altar-smoke.mjs'), 'check inclui altar smoke');
staticAssert(pkg.includes('js/hades-despertar/ui/world/AltarOrbit.js'), 'check cobre AltarOrbit.js');

if (errors.length) {
  console.error('despertar-altar-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

function fakeHosts() {
  const rains = [];
  const particles = {
    childElementCount: 0,
    firstElementChild: null,
    ownerDocument: {
      createElement() {
        const mote = {
          className: '',
          style: { setProperty() {} },
          setAttribute() {},
          addEventListener() {},
        };
        return mote;
      },
    },
    appendChild(node) {
      rains.push(node);
      this.childElementCount = rains.length;
      this.firstElementChild = rains[0];
      return node;
    },
  };
  const veil = {
    hidden: true,
    classList: {
      _on: new Set(),
      toggle(name, on) {
        if (on) this._on.add(name);
        else this._on.delete(name);
      },
    },
    style: {
      props: {},
      setProperty(k, v) { this.props[k] = v; },
    },
  };
  const orbitHost = {
    childNodes: [],
    replaceChildren(...kids) { this.childNodes = [...kids]; },
    append(...kids) { kids.forEach((k) => this.childNodes.push(k)); },
    getBoundingClientRect() { return { width: 200, height: 200 }; },
  };
  const doc = {
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          className: '',
          width: 0,
          height: 0,
          setAttribute() {},
          getContext() {
            return {
              clearRect() {},
              beginPath() {},
              arc() {},
              stroke() {},
              setLineDash() {},
              save() {},
              restore() {},
              translate() {},
              rotate() {},
              scale() {},
              moveTo() {},
              lineTo() {},
              quadraticCurveTo() {},
              fill() {},
              strokeStyle: '',
              fillStyle: '',
            };
          },
        };
      }
      return { className: '', setAttribute() {}, append() {}, replaceChildren() {} };
    },
  };
  return { doc, orbitHost, particles, veil, rains };
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

run('órbita: 0 → limpo; 100 T1 → 100 (cap 200)', () => {
  assert.equal(ORBIT_CURSOR_CAP, 200);
  assert.equal(orbitCursorCount(0), 0);
  assert.equal(orbitCursorCount(100), 100);
  assert.equal(orbitCursorCount(12), 12);
  assert.equal(orbitCursorCount(300), 200);
});

run('chuva: SPS 0 → 0; SPS alto ≤ teto', () => {
  assert.equal(soulRainRate('0'), 0);
  assert.ok(soulRainRate('0.1') > 0);
  assert.ok(soulRainRate('1e12') <= SOUL_RAIN_MAX_PER_SEC);
});

run('véu cresce com prestígio e lifetime', () => {
  const base = veilPercent({ prestigeCount: 0, lifetimeSouls: '0' });
  const mid = veilPercent({ prestigeCount: 2, lifetimeSouls: '10000' });
  const hi = veilPercent({ prestigeCount: 5, lifetimeSouls: '1e9' });
  assert.ok(mid > base);
  assert.ok(hi >= mid);
  assert.ok(hi <= 22);
});

run('AltarOrbit sync: cursors T1 + véu; reduced-motion sem chuva', () => {
  const { doc, orbitHost, particles, veil, rains } = fakeHosts();
  const altar = new AltarOrbit({
    document: doc,
    matchMedia: () => ({ matches: false }),
    now: () => 0,
  }).mount({ orbitHost, particleLayer: particles, veil });

  const empty = new GameState();
  altar.sync(empty);
  assert.equal(altar.cursorCount, 0);
  assert.ok(veil.style.props['--despertar-veil']);

  const rich = new GameState({
    generators: { wandering_shade: 100 },
    prestigeCount: 1,
  });
  // dá SPS > 0
  assert.equal(altar.sync(rich).cursorCount, 100);

  altar.sync(rich, { reducedMotion: true });
  altar._lastFrame = 0;
  altar.frame(1000);
  assert.equal(rains.length, 0);

  altar.sync(rich, { reducedMotion: false });
  altar._sps = '10';
  altar._rainCarry = 0;
  altar._lastFrame = 0;
  // dt clamp 50ms: ~2 s de chuva em passos
  for (let t = 50; t <= 2000; t += 50) {
    altar.frame(t);
  }
  assert.ok(rains.length > 0);
  assert.ok(rains.length <= SOUL_RAIN_MAX_MOTES);
});

console.log(`\ndespertar-altar-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
