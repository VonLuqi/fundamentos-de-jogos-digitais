/**
 * Smoke Fase Perf (Perf-0 a Perf-5) — Orçamento de render, 1 RAF, UI dirty flags,
 * cache de SPS, ResizeObserver, Prefs na Estela, Auto-LOD e Object Pooling
 * (docs/plano-paridade-cookieclicker-producao.md · docs/paridade-cookieclicker-despertar.md).
 *
 * Uso: node tests/despertar-perf-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PERF_PREFS,
  LOOP_PANIC_UPDATES,
  PERF_ANIMATED_VARIANT_CAP_PER_SHELF,
  PERF_AUTO_LOD_FPS_THRESHOLD,
  PERF_ORBIT_LOD_CURSOR_CAP,
  PERF_SHELF_NONFANCY_FRAME_SKIP,
  PERF_UI_SLOW_INTERVAL_MS,
  TICK_FPS,
} from '../js/hades-despertar/config/constants.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import { calculateTotalSPS, clickPower } from '../js/hades-despertar/core/formulas.js';
import { GameLoop } from '../js/hades-despertar/core/GameLoop.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  UIRenderer,
  isGeneratorRevealed,
  loadPerfPrefs,
  savePerfPrefs,
} from '../js/hades-despertar/ui/UIRenderer.js';
import {
  acquirePooledNode,
  getDomPoolSize,
  releasePooledNode,
  spawnReapParticles,
} from '../js/hades-despertar/ui/particles.js';
import {
  isPerfTelemetryEnabled,
  setPerfTelemetryEnabled,
  withPerfMeasure,
} from '../js/hades-despertar/ui/perfTelemetry.js';
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
const rendererSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const particlesSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/particles.js'), 'utf8');
const htmlSrc = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');

staticAssert(plan.includes('Caps finais') || plan.includes('SHELF_NPC_CAP'), 'caps documentados no plano');
staticAssert(/SHELF_NPC_CAP\s*=\s*400/.test(worldSrc), 'SHELF_NPC_CAP=400');
staticAssert(/ORBIT_CURSOR_CAP\s*=\s*200/.test(altarSrc), 'ORBIT_CURSOR_CAP=200');
staticAssert(/SHELF_MOTE_MAX_PER_SEC\s*=\s*8/.test(worldSrc), 'motes ≤8/s');
staticAssert(/SOUL_RAIN_MAX_PER_SEC\s*=\s*6/.test(altarSrc), 'chuva ≤6/s');
staticAssert(
  /REAP_PARTICLE_LAYER_CAP\s*=\s*56/.test(particlesSrc) || /REAP_PARTICLE_BURST_MAX\s*=\s*22/.test(particlesSrc),
  'reap soul burst limitado (layer 40 / burst 28)',
);

// Perf-1: WorldView não tem #startLoop nem agenda RAF próprio
staticAssert(!worldSrc.includes('#startLoop'), 'Perf-1: #startLoop removido do WorldView');
staticAssert(worldSrc.includes('frame('), 'Perf-1: WorldView expõe frame(dt)');

// Perf-2: UIRenderer NUNCA usa state.revision como dirty flag
staticAssert(!/state\.revision/.test(rendererSrc), 'Perf-2: UIRenderer nunca lê state.revision');
staticAssert(rendererSrc.includes('_uiDirty') && rendererSrc.includes('structureVersion'), 'Perf-2: UIRenderer usa _uiDirty + structureVersion');

// Perf-4: Opções de Fluidez na Estela
staticAssert(htmlSrc.includes('data-perf-pref="cursors"'), 'Perf-4: checkbox cursors no HTML');
staticAssert(htmlSrc.includes('data-perf-pref="particles"'), 'Perf-4: checkbox particles no HTML');
staticAssert(htmlSrc.includes('data-perf-pref="fancy"'), 'Perf-4: checkbox fancy no HTML');

if (errors.length) {
  console.error('despertar-perf-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

function createFakeDocument() {
  const byId = new Map();
  const doc = {
    body: null,
    getElementById(id) {
      return byId.get(id) || null;
    },
    querySelector(sel) {
      if (sel === '[data-particle-layer]') return byId.get('particle-layer') || null;
      return null;
    },
    createElement(tag) {
      const el = {
        tagName: String(tag).toUpperCase(),
        id: '',
        className: '',
        hidden: false,
        disabled: false,
        checked: true,
        title: '',
        width: 0,
        height: 0,
        clientWidth: 416,
        childNodes: [],
        childElementCount: 0,
        firstElementChild: null,
        parentNode: null,
        dataset: {},
        style: { setProperty() {}, props: {} },
        textContent: '',
        _listeners: new Map(),
        classList: {
          _on: new Set(),
          add(name) { this._on.add(name); },
          remove(name) { this._on.delete(name); },
          contains(name) { return this._on.has(name); },
          toggle(name, force) {
            const on = force === undefined ? !this._on.has(name) : Boolean(force);
            if (on) this._on.add(name);
            else this._on.delete(name);
            return on;
          },
        },
        setAttribute(k, v) {
          if (k === 'id') byId.set(String(v), this);
          this[`_attr_${k}`] = String(v);
        },
        getAttribute(k) {
          return this[`_attr_${k}`] ?? null;
        },
        hasAttribute(k) { return ` _attr_${k}` in this; },
        removeAttribute(k) { delete this[`_attr_${k}`]; },
        addEventListener(type, fn) {
          if (!this._listeners.has(type)) this._listeners.set(type, []);
          this._listeners.get(type).push(fn);
        },
        removeEventListener() {},
        dispatchEvent(type, ev = {}) {
          for (const fn of this._listeners.get(type) || []) fn(ev);
        },
        querySelector(sel) {
          if (sel === '.despertar-marquee__track') {
            return this.childNodes.find((c) => String(c.className).includes('despertar-marquee__track')) || null;
          }
          if (sel === '.despertar-marquee__seg') {
            return this.childNodes.find((c) => String(c.className).includes('despertar-marquee__seg')) || null;
          }
          if (sel === '.despertar-card__name') {
            return this.childNodes.find((c) => String(c.className).includes('despertar-card__name')) || null;
          }
          return null;
        },
        querySelectorAll(sel) {
          if (sel === '.despertar-marquee__seg') {
            return this.childNodes.filter((c) => String(c.className).includes('despertar-marquee__seg'));
          }
          if (sel === '[data-perf-pref]') {
            return this.childNodes.filter((c) => c.getAttribute?.('data-perf-pref'));
          }
          return [];
        },
        getBoundingClientRect() {
          this._rectReads = (this._rectReads || 0) + 1;
          return { width: 220, height: 220, left: 0, top: 0 };
        },
        getContext(type) {
          if (type !== '2d') return null;
          const self = this;
          return {
            clearRect() { self._paintCalls = (self._paintCalls || 0) + 1; },
            save() {},
            restore() {},
            setTransform() {},
            translate() {},
            rotate() {},
            scale() {},
            beginPath() {},
            arc() {},
            ellipse() {},
            rect() {},
            clip() {},
            moveTo() {},
            lineTo() {},
            closePath() {},
            quadraticCurveTo() {},
            fill() {},
            stroke() {},
            fillRect() {},
            strokeRect() { self._strokeRectCalls = (self._strokeRectCalls || 0) + 1; },
            drawImage() {},
            createRadialGradient() {
              return { addColorStop() {} };
            },
            setLineDash() {},
            globalAlpha: 1,
            globalCompositeOperation: 'source-over',
            fillStyle: '',
            strokeStyle: '',
            shadowColor: '',
            shadowBlur: 0,
          };
        },
        append(...kids) {
          kids.forEach((k) => this.appendChild(k));
        },
        appendChild(node) {
          if (!node) return node;
          if (typeof node === 'object') {
            node.parentNode = this;
          }
          this.childNodes.push(node);
          this.childElementCount = this.childNodes.filter((c) => typeof c === 'object').length;
          this.firstElementChild = this.childNodes.find((c) => typeof c === 'object') || null;
          return node;
        },
        remove() {
          if (!this.parentNode) return;
          const idx = this.parentNode.childNodes.indexOf(this);
          if (idx >= 0) this.parentNode.childNodes.splice(idx, 1);
          this.parentNode.childElementCount = this.parentNode.childNodes.filter((c) => typeof c === 'object').length;
          this.parentNode.firstElementChild = this.parentNode.childNodes.find((c) => typeof c === 'object') || null;
          this.parentNode = null;
        },
        replaceChildren(...kids) {
          this.childNodes = [];
          kids.forEach((k) => this.appendChild(k));
          this.childElementCount = this.childNodes.filter((c) => typeof c === 'object').length;
          this.firstElementChild = this.childNodes.find((c) => typeof c === 'object') || null;
        },
        ownerDocument: null,
      };
      el.ownerDocument = doc;
      return el;
    },
    registerById(id, el) {
      el.id = id;
      byId.set(id, el);
      return el;
    },
  };
  doc.body = doc.createElement('body');
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

run('caps e constantes de performance (Perf-0 a Perf-5)', () => {
  assert.equal(SHELF_NPC_CAP, 400);
  assert.equal(ORBIT_CURSOR_CAP, 200);
  assert.equal(SHELF_MOTE_MAX_PER_SEC, 8);
  assert.equal(SHELF_MOTE_MAX_ON_SCREEN, 20);
  assert.equal(SOUL_RAIN_MAX_PER_SEC, 6);
  assert.equal(SOUL_RAIN_MAX_MOTES, 16);
  assert.equal(TICK_FPS, 60);
  assert.equal(LOOP_PANIC_UPDATES, 300);
  assert.equal(PERF_UI_SLOW_INTERVAL_MS, 160);
  assert.equal(PERF_SHELF_NONFANCY_FRAME_SKIP, 10);
  assert.equal(PERF_AUTO_LOD_FPS_THRESHOLD, 28);
  assert.equal(PERF_ANIMATED_VARIANT_CAP_PER_SHELF, 12);
  assert.equal(PERF_ORBIT_LOD_CURSOR_CAP, 80);
  assert.deepEqual(DEFAULT_PERF_PREFS, { cursors: true, particles: true, fancy: true });
  assert.equal(cappedNpcCount(100), 100);
  assert.equal(cappedNpcCount(999), 400);
  assert.equal(orbitCursorCount(100), 100);
  assert.equal(orbitCursorCount(300), 200);
});

run('Perf-0: telemetria performance.mark/measure gated por flag dev', () => {
  const marks = [];
  const measures = [];
  const fakePerf = {
    mark(name) { marks.push(name); },
    measure(name, start, end) { measures.push({ name, start, end }); },
  };

  setPerfTelemetryEnabled(false);
  assert.equal(isPerfTelemetryEnabled({ hostname: 'projects.vonluqi.com', search: '?perf=1' }), false);
  withPerfMeasure('test.op', () => 42, fakePerf);
  assert.equal(marks.length, 0, 'custo zero quando flag dev desligada');
  assert.equal(measures.length, 0);

  setPerfTelemetryEnabled(true);
  const res = withPerfMeasure('WorldView.#paintShelf', () => 'ok', fakePerf);
  assert.equal(res, 'ok');
  assert.deepEqual(marks, ['WorldView.#paintShelf:start', 'WorldView.#paintShelf:end']);
  assert.equal(measures.length, 1);
  assert.equal(measures[0].name, 'WorldView.#paintShelf');
  setPerfTelemetryEnabled(false);
});

run('Perf-1: 1 único RAF — WorldView não agenda requestAnimationFrame próprio', () => {
  const doc = createFakeDocument();
  const shelves = doc.createElement('div');
  const hint = doc.createElement('p');
  let worldRafCalls = 0;
  const world = new WorldView({
    document: doc,
    isGeneratorRevealed,
    matchMedia: () => ({ matches: false }),
    requestFrame: () => {
      worldRafCalls += 1;
      return worldRafCalls;
    },
    cancelFrame: () => {},
    now: () => 0,
  }).mount(shelves, hint);

  const state = new GameState({
    souls: '1000',
    generators: { wandering_shade: 100, charon_servants: 100 },
  });
  world.sync(state);
  assert.equal(worldRafCalls, 0, 'WorldView.sync jamais chama requestAnimationFrame');
  assert.equal(world._shelves.get('charon_servants').count, 100);

  // Frame avança apenas quando o GameLoop chama world.frame(dt)
  const canvas = world._shelves.get('charon_servants').canvas;
  const beforePaints = canvas._paintCalls || 0;
  world.frame(1 / 60, { fancy: true, particles: true });
  assert.equal((canvas._paintCalls || 0) > beforePaints, true, 'world.frame(dt) pinta prateleira');
  assert.equal(worldRafCalls, 0, 'continua sem RAF interno');
});

run('Perf-2: UIRenderer separa HUD 60Hz de loja/stats throttled e não usa state.revision', () => {
  const doc = createFakeDocument();
  const soulsEl = doc.registerById('despertar-souls', doc.createElement('p'));
  const spsEl = doc.registerById('despertar-sps', doc.createElement('span'));
  const clickEl = doc.registerById('despertar-click', doc.createElement('dd'));
  doc.registerById('despertar-bonus', doc.createElement('dd'));
  const marketList = doc.registerById('despertar-market-list', doc.createElement('ul'));
  const styxStrip = doc.registerById('styx-upgrade-strip', doc.createElement('div'));
  doc.registerById('styx-empty', doc.createElement('p'));
  doc.registerById('styx-list', doc.createElement('ul'));
  doc.registerById('despertar-shelves', doc.createElement('div'));
  doc.registerById('despertar-reap-orbit', doc.createElement('div'));
  doc.registerById('particle-layer', doc.createElement('div'));
  doc.registerById('despertar-veil', doc.createElement('div'));

  const state = new GameState({
    souls: '50',
    generators: { wandering_shade: 5 },
  });
  const renderer = new UIRenderer(doc, {
    state,
    slowSyncIntervalMs: 200,
    perfStorage: null,
  }).mount(state);

  // Ticks a 60 Hz entre 0ms e 100ms: state.revision sobe, mas o caminho lento não re-executa até 200ms
  let marketRenders = 0;
  const firstCard = marketList.childNodes[0];
  const origSetAttr = firstCard.setAttribute.bind(firstCard);
  firstCard.setAttribute = (k, v) => {
    if (k === 'aria-disabled') marketRenders += 1;
    return origSetAttr(k, v);
  };

  for (let frame = 1; frame <= 5; frame += 1) {
    state.tick(1 / 60); // revision incrementa a cada tick!
    renderer.render(0, { reducedMotion: false, dt: 1 / 60, nowMs: frame * 16 });
  }
  assert.equal(marketRenders, 0, 'ticks intermediários (revision++) NÃO re-renderizam o Mercado');
  assert.notEqual(soulsEl.textContent, '50', 'HUD de almas atualiza a 60 Hz');
  assert.equal(spsEl.textContent, '0.5');
  assert.equal(clickEl.textContent, '1');

  // Em 250ms, o intervalo lento vence e atualiza affordability no Mercado
  renderer.render(0, { reducedMotion: false, dt: 1 / 60, nowMs: 250 });
  assert.equal(marketRenders, 1, 'caminho lento atualiza o Mercado no intervalo ~160-200ms');

  // Compra de gerador invalida structureVersion → atualiza imediatamente mesmo 10ms depois
  state.buyGenerator('wandering_shade', '1');
  renderer.render(0, { reducedMotion: false, dt: 1 / 60, nowMs: 260 });
  assert.equal(marketRenders, 2, 'mutação estrutural (compra) força sync imediato');
  void styxStrip;
});

run('Perf-3: Cache de SPS e clickPower no GameState + zero getBoundingClientRect por frame na órbita', () => {
  const state = new GameState({
    souls: '100000',
    generators: { wandering_shade: 25, charon_servants: 15 },
    upgrades: ['umbras_despertas', 'mil_foices', 'almanaques_do_destino_i'],
  });

  const pureSps = calculateTotalSPS({
    generators: state.quantities(),
    upgrades: state.upgrades,
    talents: state.talents,
    obols: state.obols,
    verdictPurchases: state.verdictPurchases,
    shinyCounts: state.shinyCounts(),
    goldCounts: state.goldCounts(),
  });
  const sps1 = state.sps();
  assert.equal(cmp(sps1, pureSps), 0, 'cache de SPS igual à fórmula pura');
  const verBefore = state.structureVersion;

  // Ticks de almas não invalidam o cache de SPS
  state.tick(1);
  state.tick(1);
  assert.equal(state.structureVersion, verBefore, 'tick não bumpa structureVersion');
  assert.equal(state.sps(), sps1);
  assert.equal(cmp(state.clickPower(), clickPower({
    generators: state.quantities(),
    upgrades: state.upgrades,
    talents: state.talents,
    obols: state.obols,
    sps: sps1,
    verdictPurchases: state.verdictPurchases,
  })), 0);

  // Compra invalida o cache e recalcula SPS maior
  assert.equal(state.buyGenerator('charon_servants', '5').ok, true);
  assert.ok(state.structureVersion > verBefore, 'compra bumpa structureVersion');
  assert.ok(cmp(state.sps(), sps1) > 0, 'SPS recalculado após compra');

  // Zero getBoundingClientRect durante AltarOrbit.frame()
  const doc = createFakeDocument();
  const orbitHost = doc.createElement('div');
  const particles = doc.createElement('div');
  const veil = doc.createElement('div');
  const altar = new AltarOrbit({
    document: doc,
    matchMedia: () => ({ matches: false }),
    now: () => 100,
  }).mount({ orbitHost, particleLayer: particles, veil });

  const readsAtMount = orbitHost._rectReads || 0;
  altar.sync(state);
  for (let i = 1; i <= 30; i += 1) {
    altar.frame(100 + i * 16);
  }
  assert.equal(
    orbitHost._rectReads || 0,
    readsAtMount,
    'AltarOrbit.frame() não chama getBoundingClientRect no loop',
  );
});

run('Perf-4: Prefs na Estela (cursors/particles/fancy) + Auto-LOD < 28 FPS sem afetar economia', () => {
  const mem = new Map();
  const fakeStorage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, String(v)),
  };
  savePerfPrefs({ cursors: false, particles: false, fancy: false }, fakeStorage);
  assert.deepEqual(loadPerfPrefs(fakeStorage), {
    cursors: false,
    particles: false,
    fancy: false,
  });

  const state = new GameState({
    souls: '1000',
    generators: { wandering_shade: 150, charon_servants: 50 },
  });
  const spsExpected = state.sps();

  const doc = createFakeDocument();
  const orbitHost = doc.createElement('div');
  const particlesLayer = doc.createElement('div');
  const altar = new AltarOrbit({
    document: doc,
    matchMedia: () => ({ matches: false }),
    now: () => 0,
  }).mount({ orbitHost, particleLayer: particlesLayer });

  // Com fancy=false, órbita aplica LOD cap (80 em vez de 150)
  altar.sync(state, { prefs: { cursors: true, particles: true, fancy: false } });
  assert.equal(altar.cursorCount, PERF_ORBIT_LOD_CURSOR_CAP);

  // Com cursors=false, órbita zera cursores visuais, mas SPS no GameState continua intacto
  altar.sync(state, { prefs: { cursors: false, particles: false, fancy: false } });
  assert.equal(altar.cursorCount, 0);
  assert.equal(cmp(state.sps(), spsExpected), 0, 'desligar cursors/particles/fancy não muda SPS');

  // Auto-LOD no GameLoop quando frame time médio > 35.7ms (< 28 FPS)
  const clock = new FakeClock();
  let lodTriggered = false;
  const loop = new GameLoop(
    (dt) => state.tick(dt),
    () => {},
    {
      now: () => clock.now(),
      requestFrame: (cb) => clock.requestFrame(cb),
      cancelFrame: (id) => clock.cancelFrame(id),
      matchMedia: () => ({ matches: false }),
      document: null,
      autoLodWindowFrames: 10,
      onAutoLod: ({ active }) => {
        lodTriggered = active;
      },
    },
  );
  loop.start();
  for (let i = 0; i < 12; i += 1) {
    clock.advance(45); // ~22 FPS (< 28 FPS)
  }
  loop.stop();
  assert.equal(lodTriggered, true, 'GameLoop ativa Auto-LOD abaixo de 28 FPS');
  assert.equal(loop.autoLodActive, true);
});

run('Perf-5: Object Pooling de partículas + Cap de variantes gold/negativo por prateleira', () => {
  const doc = createFakeDocument();
  const layer = doc.createElement('div');

  const n1 = acquirePooledNode(doc, 'test-pool', 'cls-a');
  layer.appendChild(n1);
  releasePooledNode(doc, 'test-pool', n1);
  assert.equal(getDomPoolSize(doc, 'test-pool'), 1);

  const n2 = acquirePooledNode(doc, 'test-pool', 'cls-b');
  assert.equal(n2, n1, 'reutiliza a mesma instância de nó DOM do pool');
  assert.equal(getDomPoolSize(doc, 'test-pool'), 0);

  // spawnReapParticles respeita particles: false
  assert.equal(spawnReapParticles(layer, { particles: false, clickPower: '100' }), 0);
  const spawned = spawnReapParticles(layer, { particles: true, reducedMotion: false, count: 5 });
  assert.equal(spawned, 5);

  // Cap de variantes animadas por prateleira: 40 unidades shiny com cap=12 → 28 usam fallback estático (strokeRect)
  const shelvesHost = doc.createElement('div');
  const world = new WorldView({
    document: doc,
    isGeneratorRevealed,
    animatedVariantCap: 12,
    matchMedia: () => ({ matches: false }),
    now: () => 1000,
  }).mount(shelvesHost);

  const manyShiny = new GameState({
    souls: '1000',
    generators: { wandering_shade: 1, charon_servants: 40 },
    shinyCounts: { charon_servants: 40 },
  });
  world.sync(manyShiny, { reducedMotion: false, prefs: { cursors: true, particles: true, fancy: true } });
  const shelfNodes = world._shelves.get('charon_servants');
  shelfNodes.canvas._strokeRectCalls = 0;
  // Injeta sprite fake para usar drawContainedInCell (onde variante estática chama strokeRect)
  shelfNodes.sprite = { width: 36, height: 36 };
  world.frame(1 / 60, { reducedMotion: false, fancy: true, particles: false });
  // 40 shiny - 12 animadas = 28 estáticas (com strokeRect)
  assert.equal(shelfNodes.canvas._strokeRectCalls, 28, 'apenas 12 variantes animam; 28 caem em modo estático');
});

run('perfil Node: 100 T1 + 30 s idle (sem panic, wall < 5 s)', () => {
  const state = new GameState({
    souls: '1000',
    generators: { wandering_shade: 100, charon_servants: 50 },
  });

  const weight = shelfLineMoteWeight(50, state.sps());
  const rates = allocateShelfMoteRates({ charon_servants: weight });
  const sum = Object.values(rates).reduce((a, b) => a + b, 0);
  assert.ok(sum <= SHELF_MOTE_MAX_PER_SEC + 1e-9, `motes/s=${sum}`);

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
});

console.log(`\ndespertar-perf-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
