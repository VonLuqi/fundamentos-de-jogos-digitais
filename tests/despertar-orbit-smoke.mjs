/**
 * Smoke Task G1.1 + G1.2 — auréolas Cookie + escala/shiny hook.
 * Uso: node tests/despertar-orbit-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  AltarOrbit,
  ORBIT_CURSOR_CAP,
  ORBIT_RING_OPACITY_MIN,
  ORBIT_RING_SCALE_MIN,
  ORBIT_RING_SLOTS,
  drawOrbitCursor,
  markShinyPlacements,
  orbitActiveRingCount,
  orbitCursorCount,
  orbitPlacementXY,
  orbitRingOpacity,
  orbitRingScale,
  orbitShinyCountFromState,
  orbitSlotLayout,
} from '../js/hades-despertar/ui/world/AltarOrbit.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const altarSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/AltarOrbit.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(altarSrc.includes('orbitSlotLayout'), 'export orbitSlotLayout');
staticAssert(altarSrc.includes('ORBIT_RING_SLOTS'), 'ORBIT_RING_SLOTS');
staticAssert(altarSrc.includes('orbitRingScale'), 'G1.2 orbitRingScale');
staticAssert(altarSrc.includes('drawOrbitCursor'), 'G1.2 drawOrbitCursor');
staticAssert(altarSrc.includes('markShinyPlacements'), 'G1.2 shiny hook');
staticAssert(!/i \/ count\) \* Math\.PI \* 2/.test(altarSrc), 'não redistribui i/count no anel único');
staticAssert(pkg.includes('despertar-orbit-smoke.mjs'), 'check inclui orbit smoke');

if (errors.length) {
  console.error('despertar-orbit-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
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

run('ORBIT_RING_SLOTS densos; cap 200 cobre midgame', () => {
  assert.deepEqual([...ORBIT_RING_SLOTS], [28, 36, 44, 52, 60]);
  assert.equal(ORBIT_CURSOR_CAP, 200);
  const sum = ORBIT_RING_SLOTS.reduce((a, b) => a + b, 0);
  assert.ok(sum >= ORBIT_CURSOR_CAP);
});

run('1 sombra = 1 slot no anel 0 (arco incompleto)', () => {
  const layout = orbitSlotLayout(1);
  assert.equal(layout.length, 1);
  assert.deepEqual(layout[0], { ring: 0, slot: 0, slotsInRing: 28 });
});

run('N < slots do anel: slots consecutivos, sem reespalhar', () => {
  const layout = orbitSlotLayout(3);
  assert.equal(layout.length, 3);
  assert.equal(layout[0].slot, 0);
  assert.equal(layout[1].slot, 1);
  assert.equal(layout[2].slot, 2);
  assert.ok(layout.every((p) => p.ring === 0 && p.slotsInRing === 28));

  // Ângulo fixo = slot/28 — NÃO  slot/3
  const a0 = orbitPlacementXY(layout[0], {
    cx: 0, cy: 0, baseRadius: 100, ringGap: 20, angleOffset: 0,
  });
  const a1 = orbitPlacementXY(layout[1], {
    cx: 0, cy: 0, baseRadius: 100, ringGap: 20, angleOffset: 0,
  });
  const expectedStep = (2 * Math.PI) / 28;
  const delta = ((a1.theta - a0.theta) + Math.PI * 2) % (Math.PI * 2);
  assert.ok(Math.abs(delta - expectedStep) < 1e-9, `passo ${delta} ≠ ${expectedStep}`);
});

run('anel 0 cheio (28) antes do anel 1 aparecer', () => {
  const full = orbitSlotLayout(28);
  assert.equal(full.length, 28);
  assert.ok(full.every((p) => p.ring === 0));
  assert.equal(orbitActiveRingCount(full), 1);

  const next = orbitSlotLayout(29);
  assert.equal(next.length, 29);
  assert.equal(next[28].ring, 1);
  assert.equal(next[28].slot, 0);
  assert.equal(next[28].slotsInRing, 36);
  assert.equal(orbitActiveRingCount(next), 2);
});

run('63 sombras: todas no layout (não corta em 40)', () => {
  assert.equal(orbitCursorCount(63), 63);
  const layout = orbitSlotLayout(63);
  assert.equal(layout.length, 63);
  // 28 + 35 no anel 0–1
  const byRing = [0, 0, 0, 0, 0];
  for (const p of layout) byRing[p.ring] += 1;
  assert.deepEqual(byRing.slice(0, 2), [28, 35]);
  assert.equal(orbitActiveRingCount(layout), 2);
});

run('cap 200: anéis enchem até o teto', () => {
  assert.equal(orbitCursorCount(999), 200);
  const layout = orbitSlotLayout(200);
  assert.equal(layout.length, 200);
});

run('AltarOrbit.sync popula placements Cookie', () => {
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

  const altar = new AltarOrbit({
    document: doc,
    matchMedia: () => ({ matches: true }),
    now: () => 0,
  }).mount({ orbitHost });

  altar.sync(new GameState({ generators: { wandering_shade: 9 } }));
  assert.equal(altar.cursorCount, 9);
  assert.equal(altar.placements.length, 9);
  assert.equal(altar.placements[8].ring, 0);

  altar.frame(16);
  assert.equal(altar.placements[0].slotsInRing, 28);
});

run('G1.2: escala por anel decresce; piso', () => {
  assert.equal(orbitRingScale(0), 1);
  assert.ok(orbitRingScale(1) < 1);
  assert.ok(orbitRingScale(2) < orbitRingScale(1));
  assert.equal(orbitRingScale(99), ORBIT_RING_SCALE_MIN);
});

run('opacidade cai com a distância da Foice', () => {
  assert.equal(orbitRingOpacity(0), 1);
  assert.ok(orbitRingOpacity(1) < 1);
  assert.ok(orbitRingOpacity(2) < orbitRingOpacity(1));
  assert.equal(orbitRingOpacity(99), ORBIT_RING_OPACITY_MIN);
});

run('G1.2: gancho shiny — primeiros N marcados; sync lê shinyCounts', () => {
  const layout = orbitSlotLayout(5);
  markShinyPlacements(layout, 2);
  assert.equal(layout[0].shiny, true);
  assert.equal(layout[1].shiny, true);
  assert.equal(layout[2].shiny, false);
  assert.equal(orbitShinyCountFromState({ shinyCounts: { wandering_shade: 3 } }, 5), 3);
  assert.equal(orbitShinyCountFromState({ shinyCounts: { wandering_shade: 9 } }, 5), 5);
  assert.equal(orbitShinyCountFromState({}, 5), 0);

  const mixed = orbitSlotLayout(5);
  markShinyPlacements(mixed, { shiny: 2, gold: 1 });
  assert.equal(mixed[0].rarity, 'negativo');
  assert.equal(mixed[1].rarity, 'negativo');
  assert.equal(mixed[2].rarity, 'gold');
  assert.equal(mixed[3].rarity, 'normal');

  assert.equal(typeof drawOrbitCursor, 'function');

  const orbitHost = {
    childNodes: [],
    replaceChildren(...kids) { this.childNodes = [...kids]; },
    append(...kids) { kids.forEach((k) => this.childNodes.push(k)); },
    getBoundingClientRect() { return { width: 200, height: 200 }; },
  };
  let shadowBlurCalls = 0;
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
              lineWidth: 1,
              set shadowBlur(v) { if (v > 0) shadowBlurCalls += 1; },
              get shadowBlur() { return 0; },
              shadowColor: '',
            };
          },
        };
      }
      return { className: '', setAttribute() {}, append() {}, replaceChildren() {} };
    },
  };

  const altar = new AltarOrbit({
    document: doc,
    matchMedia: () => ({ matches: false }),
    now: () => 0,
  }).mount({ orbitHost });

  altar.sync({
    generators: { wandering_shade: 8 },
    shinyCounts: { wandering_shade: 2 },
  });
  assert.equal(altar.placements.filter((p) => p.shiny).length, 2);
  assert.equal(altar.placements[0].shiny, true);
  assert.equal(orbitRingScale(altar.placements[0].ring), 1);
  altar.frame(16);
  assert.ok(shadowBlurCalls > 0, 'shiny aplica glow (shadowBlur)');
});

console.log(`\nOrbit smoke: ${passed} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
