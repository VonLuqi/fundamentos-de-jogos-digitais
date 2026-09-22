/**
 * Smoke Task B1 — WorldView (prateleiras + cap + reduced-motion)
 * Uso: node tests/despertar-world-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { isGeneratorRevealed } from '../js/hades-despertar/ui/UIRenderer.js';
import {
  SHELF_NPC_CAP,
  SHELF_MOTE_MAX_PER_SEC,
  SHELF_GRID_COLS,
  SHELF_GRID_ROWS,
  SHELF_CELL,
  SHELF_ORBIT_ONLY_IDS,
  WorldView,
  allocateShelfMoteRates,
  cappedNpcCount,
  drawContainedInCell,
  drawNpcSilhouette,
  isShelfGenerator,
  prefersReducedMotion,
  shelfCanvasSize,
  shelfCellOrigin,
  shelfColumnsForCount,
  shelfColumnsForWidth,
  shelfLineMoteWeight,
} from '../js/hades-despertar/ui/world/WorldView.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const worldSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/WorldView.js'), 'utf8');
const rendererSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(fs.existsSync(path.join(root, 'js/hades-despertar/ui/world/WorldView.js')), 'WorldView.js existe');
staticAssert(html.includes('id="despertar-shelves"'), 'host das prateleiras');
staticAssert(rendererSrc.includes('WorldView'), 'UIRenderer usa WorldView');
staticAssert(worldSrc.includes('prefers-reduced-motion') || worldSrc.includes('reducedMotion'), 'reduced-motion');
staticAssert(worldSrc.includes(String(SHELF_NPC_CAP)) || worldSrc.includes('SHELF_NPC_CAP'), 'cap documentado');
staticAssert(worldSrc.includes('SHELF_MOTE_MAX_PER_SEC') || worldSrc.includes('shelfLineMoteWeight'), 'C2 motes budget');
staticAssert(worldSrc.includes('NUNCA') || worldSrc.includes('teatro') || worldSrc.includes('HUD'), 'motes ≠ saldo');
staticAssert(worldSrc.includes('SHELF_GRID_COLS') && worldSrc.includes('drawContainedInCell'), 'F1 grade + contain');
staticAssert(worldSrc.includes('shelfCellOrigin') && worldSrc.includes('coluna'), 'F1 coluna-major');
staticAssert(worldSrc.includes('despertar-shelf__field'), 'F1 campo fixo no mount');
staticAssert(css.includes('despertar-shelf__field'), 'CSS campo fixo');
staticAssert(css.includes('overflow-x: auto') || css.includes('overflow-x:auto'), 'CSS overflow horizontal');
staticAssert(css.includes('--shelf-h'), 'CSS altura via --shelf-h');
staticAssert(css.includes('data-tier="1"') && css.includes('data-tier="6"'), 'campos distintos por tier');
staticAssert(!css.includes('aspect-ratio: 210 / 90') && !css.includes('aspect-ratio:210/90'), 'sem aspect antigo 210/90');
staticAssert(pkg.includes('despertar-world-smoke.mjs'), 'check inclui world smoke');
staticAssert(pkg.includes('js/hades-despertar/ui/world/WorldView.js'), 'check cobre WorldView.js');
staticAssert(worldSrc.includes('SHELF_ORBIT_ONLY') || worldSrc.includes('isShelfGenerator'), 'T1 só na órbita');
staticAssert(worldSrc.includes('drawShelfCellHighlight') && worldSrc.includes('pulseBuy'), 'G5.2 highlight + pulseBuy');
staticAssert(html.includes('orbitam a Foice') || html.includes('mundo-hint'), 'hint Mundo menciona órbita');

if (errors.length) {
  console.error('despertar-world-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

function createFakeDocument() {
  const nodes = [];
  const doc = {
    createElement(tag) {
      const el = {
        tagName: String(tag).toUpperCase(),
        className: '',
        hidden: false,
        title: '',
        width: 0,
        height: 0,
        childNodes: [],
        dataset: {},
        style: { setProperty() {} },
        textContent: '',
        classList: {
          _on: new Set(),
          add(name) { this._on.add(name); },
          remove(name) { this._on.delete(name); },
          toggle(name, force) {
            if (force === undefined) {
              if (this._on.has(name)) this._on.delete(name);
              else this._on.add(name);
              return;
            }
            if (force) this._on.add(name);
            else this._on.delete(name);
          },
          contains(name) { return this._on.has(name); },
        },
        setAttribute() {},
        hasAttribute() { return false; },
        addEventListener() {},
        querySelector(sel) {
          if (sel === '.despertar-marquee__track') {
            return this.childNodes.find((c) => String(c.className).includes('despertar-marquee__track')) || null;
          }
          if (sel === '.despertar-marquee__seg') {
            return this.childNodes.find((c) => String(c.className).includes('despertar-marquee__seg')) || null;
          }
          return null;
        },
        querySelectorAll(sel) {
          if (sel === '.despertar-marquee__seg') {
            return this.childNodes.filter((c) => String(c.className).includes('despertar-marquee__seg'));
          }
          return [];
        },
        getContext(type) {
          if (type !== '2d') return null;
          return {
            clearRect() {},
            save() {},
            restore() {},
            translate() {},
            scale() {},
            beginPath() {},
            ellipse() {},
            fill() {},
            drawImage() {},
            globalAlpha: 1,
            fillStyle: '',
          };
        },
        append(...kids) {
          kids.forEach((k) => this.childNodes.push(k));
        },
        appendChild(node) {
          this.childNodes.push(node);
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
      nodes.push(el);
      return el;
    },
  };
  return { doc, nodes };
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

run('cap visual alto; órbita permanece 40', () => {
  assert.equal(SHELF_NPC_CAP, 400);
  assert.equal(cappedNpcCount(100), 100);
  assert.equal(cappedNpcCount(12), 12);
  assert.equal(cappedNpcCount(0), 0);
  assert.equal(cappedNpcCount(-3), 0);
  assert.equal(cappedNpcCount(999), 400);
});

run('F1: grade por colunas cresce com qty (overflow)', () => {
  assert.equal(SHELF_GRID_COLS, 10);
  assert.equal(SHELF_GRID_ROWS, 4);
  assert.equal(SHELF_CELL, 36);
  assert.equal(shelfColumnsForCount(1), 1);
  assert.equal(shelfColumnsForCount(4), 1);
  assert.equal(shelfColumnsForCount(5), 2);
  assert.equal(shelfColumnsForCount(40), 10);
  assert.equal(shelfColumnsForCount(56), 14);
  assert.equal(shelfColumnsForCount(400), 100);
  assert.equal(shelfColumnsForWidth(416), 10);
  const size = shelfCanvasSize(14, 4);
  assert.ok(size.width > 416);
  assert.equal(size.height, 176);
  const a = shelfCellOrigin(0);
  const b = shelfCellOrigin(1);
  const c = shelfCellOrigin(4);
  assert.equal(a.col, 0);
  assert.equal(a.row, 0);
  assert.equal(b.col, 0, '2º NPC na mesma coluna');
  assert.equal(b.row, 1);
  assert.ok(b.y > a.y);
  assert.equal(c.col, 1, '5º NPC abre a 2ª coluna');
  assert.equal(c.row, 0);
  assert.ok(c.x > a.x);
});

run('F1: campo full-width; canvas pode crescer (overflow)', () => {
  const size = shelfCanvasSize(12, 4);
  assert.ok(size.width > 416, 'mais colunas → canvas mais largo');
  assert.equal(size.height, 176, 'altura fixa nas 4 linhas');
  assert.ok(SHELF_CELL >= 32, 'células grandes o bastante para sprite legível');
});

run('F1: drawContainedInCell nunca estica (object-fit contain)', () => {
  const calls = [];
  const ctx = {
    save() {},
    restore() {},
    drawImage(...args) {
      calls.push(args);
    },
  };
  // Sprite 36×18 numa célula 18² → escala 0.5 → 18×9, centrado.
  drawContainedInCell(ctx, { width: 36, height: 18 }, 10, 20, 18, 0);
  assert.equal(calls.length, 1);
  const [, dx, dy, dw, dh] = calls[0];
  assert.equal(dw, 18);
  assert.equal(dh, 9);
  assert.equal(dx, 10);
  assert.equal(dy, 20 + (18 - 9) / 2);
});

run('G4.2: shelf shiny — primeiros N com glow/invert; reduced = borda', () => {
  let shadowBlurCalls = 0;
  let strokeRectCalls = 0;
  const glowCtx = {
    save() {},
    restore() {},
    drawImage() {},
    set shadowBlur(v) { if (v > 0) shadowBlurCalls += 1; },
    get shadowBlur() { return 0; },
    shadowColor: '',
    filter: '',
  };
  drawContainedInCell(glowCtx, { width: 36, height: 36 }, 0, 0, 36, 0, {
    shiny: true,
    reducedMotion: false,
  });
  assert.ok(shadowBlurCalls > 0, 'shiny sprite aplica glow');

  const reducedCtx = {
    save() {},
    restore() {},
    drawImage() {},
    strokeRect() { strokeRectCalls += 1; },
    strokeStyle: '',
    lineWidth: 1,
  };
  drawContainedInCell(reducedCtx, { width: 36, height: 36 }, 0, 0, 36, 0, {
    shiny: true,
    reducedMotion: true,
  });
  assert.equal(strokeRectCalls, 1, 'reduced-motion usa borda dourada');

  let silhouetteGlow = 0;
  const silCtx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    beginPath() {},
    ellipse() {},
    fill() {},
    stroke() {},
    arc() {},
    set shadowBlur(v) { if (v > 0) silhouetteGlow += 1; },
    get shadowBlur() { return 0; },
    shadowColor: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  };
  drawNpcSilhouette(silCtx, 0, 0, 2, 0, 36, { shiny: true, reducedMotion: false });
  assert.ok(silhouetteGlow > 0, 'shiny silhueta aplica glow');
});

run('prefersReducedMotion lê matchMedia', () => {
  assert.equal(prefersReducedMotion(() => ({ matches: true })), true);
  assert.equal(prefersReducedMotion(() => ({ matches: false })), false);
});

run('T1 só na órbita: sem prateleira no Mundo', () => {
  assert.ok(SHELF_ORBIT_ONLY_IDS.includes('wandering_shade'));
  assert.equal(isShelfGenerator('wandering_shade'), false);
  assert.equal(isShelfGenerator('charon_servants'), true);
  assert.equal(isShelfGenerator({ id: 'cerberian_hound', tier: 3 }), true);
});

run('sync: 1× T2 revela prateleira; T1 não monta; qty≥1 only; cap respeitado', () => {
  const { doc } = createFakeDocument();
  const host = doc.createElement('div');
  const hint = doc.createElement('p');
  hint.hidden = false;

  let frames = 0;
  const world = new WorldView({
    document: doc,
    isGeneratorRevealed,
    matchMedia: () => ({ matches: false }),
    requestFrame: (cb) => {
      frames += 1;
      return frames;
    },
    cancelFrame: () => {},
    now: () => 0,
  }).mount(host, hint);

  const shelfCount = GENERATORS.filter((g) => isShelfGenerator(g)).length;
  assert.equal(host.childNodes.length, shelfCount);
  assert.equal(world._shelves.has('wandering_shade'), false);

  const empty = new GameState();
  world.sync(empty);
  assert.equal(world.hasSprites, false);
  assert.equal(hint.hidden, false);

  const onlyT1 = new GameState({ generators: { wandering_shade: 12 } });
  world.sync(onlyT1);
  assert.equal(world.hasSprites, false, 'T1 não povoa prateleiras');
  assert.equal(hint.hidden, false);

  const state = new GameState({ generators: { wandering_shade: 1, charon_servants: 1 } });
  world.sync(state);
  assert.equal(world.hasSprites, true);
  assert.equal(hint.hidden, true);
  const t2 = world._shelves.get('charon_servants');
  assert.equal(t2.shelf.hidden, false);
  assert.equal(t2.count, 1);

  const crowded = new GameState({ generators: { wandering_shade: 1, charon_servants: 99 } });
  world.sync(crowded);
  const crowdedShelf = world._shelves.get('charon_servants');
  assert.equal(crowdedShelf.count, 99);
  assert.equal(crowdedShelf.cols, 25);
  assert.equal(crowdedShelf.canvas.width, shelfCanvasSize(25, 4).width);
  assert.equal(crowdedShelf.canvas.height, shelfCanvasSize(25, 4).height);
  assert.ok(crowdedShelf.field?.className.includes('despertar-shelf__field'));

  const many = new GameState({ generators: { wandering_shade: 1, charon_servants: 56 } });
  world.sync(many);
  const manyShelf = world._shelves.get('charon_servants');
  assert.equal(manyShelf.count, 56);
  assert.equal(manyShelf.cols, 14, '56 NPCs → 14 colunas (overflow)');
  assert.equal(manyShelf.canvas.width, shelfCanvasSize(14, 4).width);

  // T3 sem qty permanece oculto mesmo revelável por almas
  const rich = new GameState({ souls: '5000', generators: { wandering_shade: 1, charon_servants: 1 } });
  world.sync(rich);
  assert.equal(world._shelves.get('cerberian_hound').shelf.hidden, true);
});

run('reduced-motion: não inicia loop de bob', () => {
  const { doc } = createFakeDocument();
  const host = doc.createElement('div');
  let scheduled = 0;
  const world = new WorldView({
    document: doc,
    isGeneratorRevealed,
    matchMedia: () => ({ matches: true }),
    requestFrame: () => {
      scheduled += 1;
      return scheduled;
    },
    cancelFrame: () => {},
    now: () => 1000,
  }).mount(host);

  world.sync(new GameState({ generators: { wandering_shade: 1, charon_servants: 5 } }), { reducedMotion: true });
  assert.equal(world.hasSprites, true);
  assert.equal(world.isAnimating, false);
  assert.equal(scheduled, 0);
  assert.deepEqual(world.moteRates, {});
});

run('C2: motes com budget; peso log ≠ linear no saldo', () => {
  const light = shelfLineMoteWeight(10, 0.1);
  const heavy = shelfLineMoteWeight(1000, 0.1);
  assert.ok(heavy > light);
  assert.ok(heavy / light < 20); // não 100×

  const rates = allocateShelfMoteRates({
    charon_servants: light,
    cerberian_hound: heavy,
  });
  const sum = Object.values(rates).reduce((a, b) => a + b, 0);
  assert.ok(sum <= SHELF_MOTE_MAX_PER_SEC + 1e-9);
  assert.ok(sum > 0);

  const { doc } = createFakeDocument();
  const host = doc.createElement('div');
  let now = 0;
  const frames = [];
  const world = new WorldView({
    document: doc,
    isGeneratorRevealed,
    matchMedia: () => ({ matches: false }),
    requestFrame: (cb) => {
      frames.push(cb);
      return frames.length;
    },
    cancelFrame: () => {},
    now: () => now,
  }).mount(host);

  world.sync(new GameState({ generators: { wandering_shade: 1, charon_servants: 50 } }));
  assert.ok(Object.values(world.moteRates).reduce((a, b) => a + b, 0) <= SHELF_MOTE_MAX_PER_SEC + 1e-9);

  // ~2 s de frames
  now = 0;
  for (let t = 0; t <= 2000; t += 50) {
    now = t;
    const cb = frames.pop();
    if (cb) cb(now);
  }
  const shelf = world._shelves.get('charon_servants');
  assert.ok(shelf.motes.childNodes.length > 0);
  assert.ok(shelf.motes.childNodes.length <= 40);
});

console.log(`\ndespertar-world-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
