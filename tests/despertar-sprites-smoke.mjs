/**
 * Smoke Task B3 — pipeline de sprites (manifest + fallback)
 * Uso: node tests/despertar-sprites-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import {
  createSpriteNode,
  generatorSprite,
  spritePaths,
  upgradeSprite,
} from '../js/hades-despertar/ui/world/SpriteAtlas.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spritesRoot = path.join(root, 'assets', 'despertar', 'sprites');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const manifestPath = path.join(spritesRoot, 'manifest.json');
staticAssert(fs.existsSync(manifestPath), 'manifest.json presente');
staticAssert(fs.existsSync(path.join(root, 'scripts/gen-despertar-sprites.mjs')), 'script de geração');
staticAssert(fs.existsSync(path.join(root, 'scripts/p5/export-despertar-sprites.html')), 'sketch p5 export');

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const rendererSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
staticAssert(pkg.includes('despertar:sprites'), 'npm script despertar:sprites');
staticAssert(pkg.includes('despertar-sprites-smoke.mjs'), 'check inclui sprites smoke');
staticAssert(pkg.includes('js/hades-despertar/ui/world/SpriteAtlas.js'), 'check cobre SpriteAtlas');
staticAssert(rendererSrc.includes('createSpriteNode'), 'mercado usa SpriteAtlas');
staticAssert(rendererSrc.includes('generatorSprite'), 'ícones de gerador');

let manifest = null;
if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  staticAssert(manifest.format?.fallback === 'svg', 'fallback SVG no manifest');
  for (const def of GENERATORS) {
    const entry = manifest.generators?.[def.id];
    staticAssert(entry, `manifest generator ${def.id}`);
    if (entry) {
      staticAssert(fs.existsSync(path.join(spritesRoot, entry.webp)), `${def.id}.webp`);
      staticAssert(fs.existsSync(path.join(spritesRoot, entry.svg)), `${def.id}.svg`);
    }
  }
  for (const def of UPGRADES) {
    const entry = manifest.upgrades?.[def.id];
    staticAssert(entry, `manifest upgrade ${def.id}`);
    if (entry) {
      staticAssert(fs.existsSync(path.join(spritesRoot, entry.webp)), `${def.id}.webp`);
      staticAssert(fs.existsSync(path.join(spritesRoot, entry.svg)), `${def.id}.svg`);
    }
  }
}

if (errors.length) {
  console.error('despertar-sprites-smoke (estático):');
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

run('spritePaths / generatorSprite / upgradeSprite', () => {
  const g = generatorSprite('wandering_shade');
  assert.ok(g.webp.includes('generators/wandering_shade.webp'));
  assert.ok(g.svg.includes('generators/wandering_shade.svg'));
  assert.equal(g.mark, 'S');
  const u = upgradeSprite('foice_afilada');
  assert.ok(u.webp.includes('upgrades/foice_afilada.webp'));
  const missing = spritePaths('generators', '');
  assert.equal(missing.webp, null);
});

run('createSpriteNode: WebP → SVG → mark', () => {
  const created = [];
  const doc = {
    createElement(tag) {
      const el = {
        tagName: tag,
        className: '',
        textContent: '',
        src: '',
        dataset: {},
        childNodes: [],
        setAttribute() {},
        addEventListener(type, fn) {
          this._on = this._on || {};
          this._on[type] = fn;
        },
        append(...kids) {
          kids.forEach((k) => this.childNodes.push(k));
        },
        contains(node) {
          return this.childNodes.includes(node);
        },
        remove() {
          this.removed = true;
        },
      };
      created.push(el);
      return el;
    },
  };

  const host = createSpriteNode(doc, {
    webp: 'x.webp',
    svg: 'x.svg',
    mark: 'Z',
  });
  const img = host.childNodes[0];
  assert.equal(img.src, 'x.webp');
  assert.equal(img.dataset.fallback, 'x.svg');

  // 1º erro → SVG
  img._on.error();
  assert.equal(img.src, 'x.svg');
  assert.equal(img.dataset.fallback, undefined);

  // 2º erro → mark
  img._on.error();
  assert.equal(img.removed, true);
  assert.equal(host.childNodes.some((n) => n.textContent === 'Z'), true);
});

run('createSpriteNode sem urls → só mark', () => {
  const doc = {
    createElement(tag) {
      return {
        tagName: tag,
        className: '',
        textContent: '',
        childNodes: [],
        setAttribute() {},
        append(...kids) { kids.forEach((k) => this.childNodes.push(k)); },
      };
    },
  };
  const host = createSpriteNode(doc, { mark: 'Q' });
  assert.equal(host.childNodes[0].textContent, 'Q');
});

console.log(`\ndespertar-sprites-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
