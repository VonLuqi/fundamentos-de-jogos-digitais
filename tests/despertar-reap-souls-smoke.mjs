/**
 * Smoke — alminhas do Ceifar (escala com almas/clique).
 * Uso: node tests/despertar-reap-souls-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REAP_PARTICLE_BURST_MAX,
  REAP_PARTICLE_BURST_MIN,
  reapParticleCount,
  spawnReapParticles,
} from '../js/hades-despertar/ui/particles.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const particlesSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/particles.js'), 'utf8');
const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(particlesSrc.includes('reapParticleCount'), 'reapParticleCount');
staticAssert(particlesSrc.includes('despertar-particle--soul'), 'classe soul');
staticAssert(indexSrc.includes('clickPower: gained') || indexSrc.includes('gained'), 'passa gained ao spawn');
staticAssert(css.includes('despertarSoulRise'), 'CSS soul rise');
staticAssert(css.includes('despertar-particle--soul'), 'CSS --soul');
staticAssert(pkg.includes('despertar-reap-souls-smoke.mjs'), 'check inclui smoke');

if (errors.length) {
  console.error('despertar-reap-souls-smoke (estático):');
  errors.forEach((e) => console.error(` - ${e}`));
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

run('contagem sobe com click power (log)', () => {
  const a = reapParticleCount(1);
  const b = reapParticleCount(100);
  const c = reapParticleCount(1e6);
  assert.equal(a, REAP_PARTICLE_BURST_MIN);
  assert.ok(b > a);
  assert.ok(c >= b);
  assert.ok(c <= REAP_PARTICLE_BURST_MAX);
  assert.equal(reapParticleCount(0), REAP_PARTICLE_BURST_MIN);
});

run('spawn cria --soul e respeita reduced-motion', () => {
  const kids = [];
  const layer = {
    childElementCount: 0,
    firstElementChild: null,
    ownerDocument: {
      createElement() {
        return {
          className: '',
          style: { setProperty() {} },
          setAttribute() {},
          addEventListener() {},
        };
      },
    },
    appendChild(node) {
      kids.push(node);
      this.childElementCount = kids.length;
      this.firstElementChild = kids[0];
      return node;
    },
  };

  assert.equal(spawnReapParticles(layer, { reducedMotion: true, clickPower: 100 }), 0);
  assert.equal(kids.length, 0);

  const n = spawnReapParticles(layer, { reducedMotion: false, clickPower: 100 });
  assert.ok(n > REAP_PARTICLE_BURST_MIN);
  assert.equal(kids.length, n);
  assert.ok(kids.every((k) => k.className.includes('despertar-particle--soul')));
});

console.log(`\nReap souls smoke: ${passed} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
