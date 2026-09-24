/**
 * Smoke Task 10a — Códice do Loop (UI)
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-codex-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDU_LOG_IDS, EDU_LOGS } from '../js/hades-despertar/config/edu-logs.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  describeCodex,
  describeCodexEntry,
} from '../js/hades-despertar/ui/UIRenderer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

[
  'js/hades-despertar/ui/UIRenderer.js',
  'js/hades-despertar/config/edu-logs.js',
  'pages/despertar.html',
  'css/despertar.css',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-codex-smoke.mjs'), 'npm run check inclui este smoke');

const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
staticAssert(html.includes('id="tab-codex"'), 'aba Códice');
staticAssert(html.includes('id="panel-codex"'), 'painel do Códice');
staticAssert(html.includes('id="codex-list"'), 'lista do Códice');
staticAssert(html.includes('id="codex-empty"'), 'empty state do Códice');
staticAssert(html.includes('>Códice<') || html.includes('Códice do Loop') || html.includes('O Códice'), 'copy Códice');

const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
staticAssert(css.includes('.despertar-codex-list'), 'estilo da lista');
staticAssert(css.includes('.despertar-codex-entry'), 'estilo da entrada');
staticAssert(css.includes('is-locked'), 'estado bloqueado');

const rendererSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
staticAssert(rendererSrc.includes('#mountCodex') || rendererSrc.includes('mountCodex'), 'monta o Códice');
staticAssert(rendererSrc.includes('#renderCodex') || rendererSrc.includes('renderCodex'), 'renderiza o Códice');
staticAssert(rendererSrc.includes('describeCodex'), 'describeCodex exportado');
staticAssert(!rendererSrc.includes('innerHTML'), 'UIRenderer não usa innerHTML');

const boot = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
staticAssert(boot.includes('markAmortSeen'), 'amortização vista alimenta o Códice');

if (errors.length) {
  console.error('despertar-codex-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok — ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL — ${label}`);
    console.error(`  ${error.message}`);
  }
}

check('catálogo tem 16 logs', () => {
  assert.equal(EDU_LOGS.length, 16);
  assert.equal(EDU_LOG_IDS.length, 16);
  assert.ok(EDU_LOG_IDS.includes('log_lethe_unlock'));
  assert.ok(EDU_LOG_IDS.includes('log_lethe_ritual'));
  assert.ok(EDU_LOG_IDS.includes('log_styx_open'));
});

check('Códice vazio antes do primeiro clique', () => {
  const state = new GameState();
  const view = describeCodex(state);
  assert.equal(view.unlockedCount, 0);
  assert.equal(view.showList, false);
  assert.equal(view.emptyText, 'O Códice espera o primeiro clique.');
  const locked = describeCodexEntry(state, 'log_input');
  assert.equal(locked.unlocked, false);
  assert.equal(locked.title, 'Página selada');
});

check('1º clique revela log_input', () => {
  const state = new GameState();
  state.click();
  assert.ok(state.eduLogsSeen.includes('log_input'));
  const entry = describeCodexEntry(state, 'log_input');
  assert.equal(entry.unlocked, true);
  assert.equal(entry.title, 'O clique é o input');
  const view = describeCodex(state);
  assert.equal(view.showList, true);
  assert.ok(view.unlockedCount >= 1);
});

check('1º gerador revela log_generator', () => {
  const state = new GameState({ souls: '100' });
  state.click();
  assert.equal(state.eduLogsSeen.includes('log_generator'), false);
  assert.ok(state.buyGenerator('wandering_shade', 1));
  assert.ok(state.eduLogsSeen.includes('log_generator'));
  const entry = describeCodexEntry(state, 'log_generator');
  assert.equal(entry.unlocked, true);
  assert.equal(entry.title, 'Automação');
});

check('eduLogsSeen persiste no snapshot', () => {
  const state = new GameState();
  state.click();
  const snap = state.toSnapshot();
  assert.ok(snap.eduLogsSeen.includes('log_input'));
  const restored = GameState.fromSnapshot(snap);
  assert.ok(restored.eduLogsSeen.includes('log_input'));
  assert.equal(describeCodex(restored).unlockedCount >= 1, true);
});

check('entradas bloqueadas não vazam título real', () => {
  const state = new GameState();
  state.click();
  const wall = describeCodexEntry(state, 'log_wall');
  assert.equal(wall.unlocked, false);
  assert.equal(wall.title, 'Página selada');
  assert.equal(wall.body, 'O Submundo só revela o que a corrida já encontrou.');
});

console.log(`\ndespertar-codex-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
