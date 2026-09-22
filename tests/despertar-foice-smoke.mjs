/**
 * Smoke Task F2 — Foice.png + animação de corte no Ceifar
 * Uso: node tests/despertar-foice-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playFoiceSlash } from '../js/hades-despertar/ui/juice.js';
import { bindFoiceAsset, pulseReapButton } from '../js/hades-despertar/ui/particles.js';

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
const particlesSrc = read('js/hades-despertar/ui/particles.js');
const pkg = read('package.json');

staticAssert(fs.existsSync(path.join(root, 'assets/despertar/sprites/Foice.png')), 'Foice.png existe');
staticAssert(fs.existsSync(path.join(root, 'assets/despertar/sprites/foice/foice-idle.png')), 'cópia foice-idle.png');
staticAssert(html.includes('data-reap-foice'), 'img Foice no HTML');
staticAssert(html.includes('assets/despertar/sprites/Foice.png'), 'src Foice.png');
staticAssert(html.includes('data-reap-glyph'), 'glyph fallback');
staticAssert(css.includes('despertar-reap__foice'), 'CSS foice');
staticAssert(css.includes('despertarFoiceSlash') || css.includes('@keyframes despertarFoiceSlash'), 'keyframes slash');
staticAssert(css.includes('is-slashing'), 'classe is-slashing');
staticAssert(css.includes('is-slash-soft'), 'classe is-slash-soft (reduced)');
staticAssert(css.includes('mix-blend-mode: screen') || css.includes('mix-blend-mode:screen'), 'screen no fundo preto');
staticAssert(css.includes('scaleX(-1)'), 'Foice espelhada');
staticAssert(!/\.despertar-reap\s*\{[^}]*border-radius:\s*50%/s.test(css), 'Ceifar sem círculo');
staticAssert(css.includes('prefers-reduced-motion') && css.includes('is-slashing'), 'reduced-motion cobre slash');
staticAssert(indexJs.includes('playFoiceSlash'), 'index dispara slash');
staticAssert(indexJs.includes('bindFoiceAsset'), 'index bind asset');
staticAssert(juiceSrc.includes('playFoiceSlash'), 'juice exporta playFoiceSlash');
staticAssert(particlesSrc.includes('bindFoiceAsset'), 'particles bindFoiceAsset');
staticAssert(pkg.includes('despertar-foice-smoke.mjs'), 'check inclui este smoke');
staticAssert(pkg.includes('despertar-world-smoke.mjs'), 'check inclui world smoke (F5)');

if (errors.length) {
  console.error('despertar-foice-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

function fakeButton({ brokenImg = false } = {}) {
  const classes = new Set();
  const button = {
    classList: {
      remove(...names) { names.forEach((n) => classes.delete(n)); },
      add(...names) { names.forEach((n) => classes.add(n)); },
      contains(name) { return classes.has(name); },
    },
    offsetWidth: 1,
    querySelector(sel) {
      if (sel.includes('data-reap-foice')) return img;
      if (sel.includes('data-reap-glyph')) return glyph;
      return null;
    },
  };
  const listeners = {};
  const img = {
    complete: true,
    naturalWidth: brokenImg ? 0 : 256,
    hidden: false,
    addEventListener(type, fn) { listeners[type] = fn; },
    removeEventListener(type, fn) {
      if (listeners[type] === fn) delete listeners[type];
    },
  };
  const glyph = { hidden: true };
  return { button, img, glyph, listeners, classes };
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

run('playFoiceSlash aplica is-slashing; reduced → soft', () => {
  const { button, classes } = fakeButton();
  assert.equal(playFoiceSlash(button, { reducedMotion: false }), true);
  assert.equal(classes.has('is-slashing'), true);
  assert.equal(playFoiceSlash(button, { reducedMotion: true }), true);
  assert.equal(classes.has('is-slash-soft'), true);
  assert.equal(classes.has('is-slashing'), false);
});

run('pulseReapButton não some o slash (só is-reaping)', () => {
  const { button, classes } = fakeButton();
  pulseReapButton(button, { reducedMotion: false });
  assert.equal(classes.has('is-reaping'), true);
});

run('bindFoiceAsset: img quebrada → glyph', () => {
  const { button, img, glyph } = fakeButton({ brokenImg: true });
  bindFoiceAsset(button);
  assert.equal(img.hidden, true);
  assert.equal(glyph.hidden, false);
});

console.log(`\ndespertar-foice-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
