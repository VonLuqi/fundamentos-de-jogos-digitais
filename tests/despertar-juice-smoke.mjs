/**
 * Smoke Task 15 — Polarização juice (sem mentir o saldo)
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-juice-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { flashStyx, playLetheRitualFeel, playReapJuice, flashBuyRow, tweenShelfSpawn, sealUpgradeIcon } from '../js/hades-despertar/ui/juice.js';
import {
  SHELF_MOTE_MAX_PER_SEC,
  allocateShelfMoteRates,
  shelfLineMoteWeight,
} from '../js/hades-despertar/ui/world/WorldView.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const html = read('pages/despertar.html');
const css = read('css/despertar.css');
const indexJs = read('js/hades-despertar/index.js');
const juiceSrc = read('js/hades-despertar/ui/juice.js');
const pkg = read('package.json');

staticAssert(html.includes('id="despertar-styx-flash"'), 'flash Styx no HTML');
staticAssert(html.includes('id="despertar-lethe-overlay"'), 'overlay Lethe no HTML');
staticAssert(html.includes('despertar-lethe-overlay-title'), 'título do overlay Lethe');
staticAssert(!html.toLowerCase().includes('level up'), 'overlay Lethe sem copy de Level Up/XP');

staticAssert(css.includes('despertarReapPulse') || css.includes('is-reaping'), 'pulso no altar');
staticAssert(css.includes('despertar-float') || css.includes('despertarFloatUp'), 'float +N');
staticAssert(css.includes('despertar-shockwave') || css.includes('despertarShockwave'), 'shockwave');
staticAssert(css.includes('is-shaking') || css.includes('despertarAltarShake'), 'shake suave');
staticAssert(css.includes('is-bought-flash') || css.includes('despertarBuyFlash'), 'flash compra');
staticAssert(css.includes('is-spawn-pop') || css.includes('despertarShelfPop'), 'spawn tween prateleira');
staticAssert(css.includes('is-sealing') || css.includes('despertarSealUpgrade'), 'selo upgrade');
staticAssert(css.includes('.despertar-styx-flash'), 'CSS flash Styx');
staticAssert(css.includes('.despertar-lethe-overlay'), 'CSS overlay Lethe');
staticAssert(css.includes('transition: opacity') || css.includes('opacity 0.45s'), 'máscaras com transição de opacidade');
staticAssert(css.includes('.despertar-card.is-masked'), 'classe de máscara de rio');
staticAssert(css.includes('prefers-reduced-motion'), 'juice respeita reduced-motion');

staticAssert(indexJs.includes('flashStyx'), 'juramento dispara flashStyx');
staticAssert(indexJs.includes('playLetheRitualFeel'), 'ritual dispara overlay Lethe');
staticAssert(indexJs.includes('playReapJuice'), 'ceifar dispara playReapJuice');
staticAssert(indexJs.includes('flashBuyRow'), 'compra dispara flashBuyRow');
staticAssert(indexJs.includes('sealUpgradeIcon'), 'upgrade dispara sealUpgradeIcon');
staticAssert(juiceSrc.includes('sem alterar saldo') || juiceSrc.includes('reduced-motion'), 'juice documenta sem saldo');
staticAssert(juiceSrc.includes('spawnFloatText') || juiceSrc.includes('playReapJuice'), 'C1 float/shockwave');
const worldSrc = read('js/hades-despertar/ui/world/WorldView.js');
staticAssert(worldSrc.includes('SHELF_MOTE_MAX_PER_SEC'), 'C2 budget de motes');
staticAssert(css.includes('despertar-shelf__mote') || css.includes('despertarShelfMote'), 'CSS mote prateleira');
staticAssert(pkg.includes('despertar-juice-smoke.mjs'), 'npm run check inclui este smoke');
staticAssert(pkg.includes('js/hades-despertar/ui/juice.js') || pkg.includes('ui/juice.js'), 'check cobre juice.js');

if (errors.length) {
  console.error('despertar-juice-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
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

function makeDom() {
  const classes = new Map();
  function el(id) {
    return {
      id,
      textContent: '',
      classList: {
        add(name) {
          const set = classes.get(id) || new Set();
          set.add(name);
          classes.set(id, set);
        },
        remove(name) {
          classes.get(id)?.delete(name);
        },
      },
      offsetWidth: 1,
    };
  }
  const nodes = {
    'despertar-styx-flash': el('despertar-styx-flash'),
    'despertar-lethe-overlay': el('despertar-lethe-overlay'),
    'despertar-lethe-overlay-title': el('despertar-lethe-overlay-title'),
    'despertar-lethe-overlay-detail': el('despertar-lethe-overlay-detail'),
  };
  return {
    getElementById(id) {
      return nodes[id] || null;
    },
    _classes: classes,
    _nodes: nodes,
  };
}

await run('flashStyx ativa classe sem reduced-motion', () => {
  const doc = makeDom();
  assert.equal(flashStyx({ root: doc, reducedMotion: false }), true);
  assert.ok(doc._classes.get('despertar-styx-flash')?.has('is-active'));
});

await run('flashStyx / Lethe desligam com reduced-motion', () => {
  const doc = makeDom();
  assert.equal(flashStyx({ root: doc, reducedMotion: true }), false);
  assert.equal(
    playLetheRitualFeel({
      root: doc,
      reducedMotion: true,
      title: 'Catábase',
      detail: 'teste',
    }),
    false,
  );
});

await run('overlay Lethe usa copy própria (sem XP)', () => {
  const doc = makeDom();
  assert.equal(
    playLetheRitualFeel({
      root: doc,
      reducedMotion: false,
      title: 'Catábase',
      detail: 'O Lethe bebeu a corrida. +1 Óbolos · +1 Essência.',
      durationMs: 10,
    }),
    true,
  );
  assert.equal(doc._nodes['despertar-lethe-overlay-title'].textContent, 'Catábase');
  assert.match(doc._nodes['despertar-lethe-overlay-detail'].textContent, /Óbolos/);
  assert.doesNotMatch(doc._nodes['despertar-lethe-overlay-detail'].textContent, /XP/i);
  assert.ok(doc._classes.get('despertar-lethe-overlay')?.has('is-active'));
});

await run('C1: float/shockwave/shake respeitam reduced-motion', () => {
  const created = [];
  const stage = {
    ownerDocument: {
      createElement(tag) {
        const el = {
          tagName: tag,
          className: '',
          textContent: '',
          style: { setProperty() {} },
          setAttribute() {},
          addEventListener() {},
          classList: {
            _on: new Set(),
            add(n) { this._on.add(n); },
            remove(n) { this._on.delete(n); },
          },
          offsetWidth: 1,
        };
        created.push(el);
        return el;
      },
    },
    appendChild(node) {
      created.push(node);
      return node;
    },
    classList: {
      _on: new Set(),
      add(n) { this._on.add(n); },
      remove(n) { this._on.delete(n); },
    },
    offsetWidth: 1,
  };
  const layer = {
    ownerDocument: stage.ownerDocument,
    appendChild(node) {
      created.push(node);
      return node;
    },
  };

  assert.equal(playReapJuice({
    stage,
    particleLayer: layer,
    amount: '3',
    reducedMotion: true,
  }), false);
  assert.equal(created.length, 0);

  assert.equal(playReapJuice({
    stage,
    particleLayer: layer,
    amount: '3',
    reducedMotion: false,
  }), true);
  assert.ok(created.some((n) => n.className === 'despertar-float'));
  assert.ok(created.some((n) => n.className === 'despertar-shockwave'));
  assert.ok(stage.classList._on.has('is-shaking'));
});

await run('C1: compra flash + shelf pop + selo upgrade', () => {
  const classes = new Map();
  function fakeEl(sel) {
    return {
      hidden: false,
      classList: {
        add(name) {
          const set = classes.get(sel) || new Set();
          set.add(name);
          classes.set(sel, set);
        },
        remove(name) {
          classes.get(sel)?.delete(name);
        },
      },
      offsetWidth: 1,
    };
  }
  const nodes = {
    card: fakeEl('card'),
    shelf: fakeEl('shelf'),
    upgrade: fakeEl('upgrade'),
  };
  const root = {
    querySelector(sel) {
      if (sel.includes('despertar-card')) return nodes.card;
      if (sel.includes('despertar-shelf')) return nodes.shelf;
      if (sel.includes('data-buy-upgrade')) return nodes.upgrade;
      return null;
    },
  };

  assert.equal(flashBuyRow(root, 'charon_servants', { reducedMotion: false }), true);
  assert.ok(classes.get('card')?.has('is-bought-flash'));
  assert.equal(tweenShelfSpawn(root, 'charon_servants', { reducedMotion: false }), true);
  assert.ok(classes.get('shelf')?.has('is-spawn-pop'));
  assert.equal(sealUpgradeIcon(root, 'foice_afilada', { reducedMotion: false }), true);
  assert.ok(classes.get('upgrade')?.has('is-sealing'));
  assert.equal(classes.get('upgrade')?.has('is-owned'), false, 'F4: seal não marca owned permanente');

  assert.equal(flashBuyRow(root, 'wandering_shade', { reducedMotion: true }), false);
  assert.equal(tweenShelfSpawn(root, 'wandering_shade', { reducedMotion: false }), true, 'smoke DOM ainda tem shelf fake');
});

await run('C2: budget de motes não espelha saldo', () => {
  const a = shelfLineMoteWeight(10, 1);
  const b = shelfLineMoteWeight(10000, 1);
  assert.ok(b / a < 50);
  const rates = allocateShelfMoteRates({ t1: a, t2: b, t3: b });
  const sum = Object.values(rates).reduce((x, y) => x + y, 0);
  assert.ok(sum <= SHELF_MOTE_MAX_PER_SEC + 1e-9);
  assert.equal(SHELF_MOTE_MAX_PER_SEC, 8);
});

console.log(`\ndespertar-juice-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
