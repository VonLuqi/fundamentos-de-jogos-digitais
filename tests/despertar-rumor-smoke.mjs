/**
 * Smoke Task G2.3 — fila de rumores (Q4+Q6).
 * Uso: node tests/despertar-rumor-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GOLD_FIRST_TICKER,
  JUDGES_REFUSED_TICKER,
  RUMOR_CURIOSITIES,
  RUMOR_ENIGMA_HINTS,
  RUMOR_INTERRUPT_MS,
  RUMOR_ROTATE_MS,
  SHINY_FIRST_TICKER,
  buildCodexRumors,
  buildProgressRumors,
  buildRumorPool,
  pickRumor,
  rumorPoolSignature,
} from '../js/hades-despertar/config/rumors.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const rumorsSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/config/rumors.js'), 'utf8');
const rendererSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(fs.existsSync(path.join(root, 'js/hades-despertar/config/rumors.js')), 'rumors.js');
staticAssert(rumorsSrc.includes('RUMOR_CURIOSITIES'), 'catálogo curiosidades');
staticAssert(rumorsSrc.includes('RUMOR_ENIGMA_HINTS'), 'catálogo dicas');
staticAssert(rumorsSrc.includes('buildRumorPool'), 'buildRumorPool');
staticAssert(!rumorsSrc.includes('/submundo/'), 'sem paths /submundo no catálogo');
staticAssert(rendererSrc.includes('buildRumorPool'), 'UIRenderer usa fila');
staticAssert(rendererSrc.includes('interruptTicker'), 'interruptTicker');
staticAssert(rendererSrc.includes('announceShinyFirst'), 'announceShinyFirst');
staticAssert(rendererSrc.includes('RUMOR_ROTATE_MS'), 'rotação');
staticAssert(indexSrc.includes('interruptTicker'), 'index Juízes → interrupt');
staticAssert(indexSrc.includes('announceShinyFirst'), 'buy negativo → announceShinyFirst');
staticAssert(indexSrc.includes('announceGoldFirst'), 'buy gold → announceGoldFirst');
staticAssert(indexSrc.includes('resetShinyRumor'), 'Lethe reseta rarity rumor');
staticAssert(indexSrc.includes('shinyGained'), 'buy checa shinyGained');
staticAssert(indexSrc.includes('goldGained'), 'buy checa goldGained');
staticAssert(pkg.includes('despertar-rumor-smoke.mjs'), 'check inclui smoke');
staticAssert(pkg.includes('config/rumors.js'), 'check inclui rumors.js');

if (errors.length) {
  console.error('despertar-rumor-smoke (estático):');
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

run('catálogos não vazios e editáveis', () => {
  assert.ok(RUMOR_CURIOSITIES.length >= 6);
  assert.ok(RUMOR_ENIGMA_HINTS.length >= 4);
  assert.ok(RUMOR_ROTATE_MS >= 8_000);
  assert.ok(RUMOR_INTERRUPT_MS >= RUMOR_ROTATE_MS);
  for (const item of [...RUMOR_CURIOSITIES, ...RUMOR_ENIGMA_HINTS]) {
    assert.ok(item.id && item.text);
    assert.equal(item.text.includes('/submundo'), false);
  }
});

run('progresso + códice entram no pool', () => {
  const state = {
    clickCount: 3,
    eduLogsSeen: ['log_input', 'log_loop'],
    sps: () => '1.5',
    quantities: () => ({ wandering_shade: 2, charon_servants: 1 }),
  };
  const progress = buildProgressRumors(state);
  assert.ok(progress.some((r) => r.id === 'prog_sps'));
  assert.ok(progress.some((r) => r.id === 'prog_shelf'));
  const codex = buildCodexRumors(state.eduLogsSeen);
  assert.equal(codex.length, 2);
  assert.ok(codex[0].text.includes('Rumor:'));

  const pool = buildRumorPool(state);
  assert.ok(pool.length > RUMOR_CURIOSITIES.length);
  assert.ok(pool.some((r) => r.id.startsWith('codex_')));
  assert.ok(pool.some((r) => r.id.startsWith('cur_')));
  assert.ok(pool.some((r) => r.id.startsWith('hint_')));
});

run('pickRumor rotaciona; assinatura muda com códice', () => {
  const state = {
    clickCount: 1,
    eduLogsSeen: [],
    sps: () => '0',
    quantities: () => ({}),
  };
  const pool = buildRumorPool(state);
  const a = pickRumor(pool, 0);
  const b = pickRumor(pool, 1);
  assert.equal(a.index, 0);
  assert.equal(b.index, 1);
  assert.notEqual(a.text, b.text);

  const sig0 = rumorPoolSignature(state);
  state.eduLogsSeen = ['log_input'];
  assert.notEqual(rumorPoolSignature(state), sig0);
});

run('prioridade sync / raridade copy congelada', () => {
  assert.ok(JUDGES_REFUSED_TICKER.includes('servidor julga') || JUDGES_REFUSED_TICKER.includes('Juízes') || JUDGES_REFUSED_TICKER.includes('Estela'));
  assert.ok(SHINY_FIRST_TICKER.toLowerCase().includes('negativo'));
  assert.ok(GOLD_FIRST_TICKER.toLowerCase().includes('dourada'));
});

console.log(`\nRumor smoke: ${passed} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
