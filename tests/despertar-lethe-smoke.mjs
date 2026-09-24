/**
 * Smoke Fase C / C1–C2 — first unlock Lethe + edu-logs.
 * Uso: node tests/despertar-lethe-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LETHE_PREVIEW_RUN_SOULS, STYX_UNLOCK_SOULS } from '../js/hades-despertar/config/constants.js';
import {
  EDU_LOG_BY_ID,
  EDU_LOG_TICKER_IDS,
  eduLogTickerPhrase,
} from '../js/hades-despertar/config/edu-logs.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  isLetheOpen,
  LETHE_UNLOCK_TICKER,
} from '../js/hades-despertar/ui/UIRenderer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const stateSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/GameState.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const juiceSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/juice.js'), 'utf8');
const eduSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/config/edu-logs.js'), 'utf8');
const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(stateSrc.includes('markLetheSeen'), 'GameState.markLetheSeen');
staticAssert(stateSrc.includes('letheSeen'), 'milestones.letheSeen');
staticAssert(stateSrc.includes('log_lethe_unlock'), '#logTriggered lethe unlock');
staticAssert(stateSrc.includes('log_lethe_ritual'), '#logTriggered lethe ritual');
staticAssert(stateSrc.includes('log_styx_open'), '#logTriggered styx open');
staticAssert(eduSrc.includes("id: 'log_lethe_unlock'"), 'edu-log lethe unlock');
staticAssert(eduSrc.includes("id: 'log_lethe_ritual'"), 'edu-log lethe ritual');
staticAssert(eduSrc.includes("id: 'log_styx_open'"), 'edu-log styx open');
staticAssert(eduSrc.includes('eduLogTickerPhrase'), 'frase do ticker');
staticAssert(uiSrc.includes('LETHE_UNLOCK_TICKER'), 'ticker copy exportada');
staticAssert(uiSrc.includes('#announceLetheUnlock') || uiSrc.includes('announceLetheUnlock'), 'announce no renderer');
staticAssert(uiSrc.includes('#announceEduLogTickers') || uiSrc.includes('announceEduLogTickers'), 'ticker edu-logs');
staticAssert(uiSrc.includes('markLetheSeen'), 'render chama markLetheSeen');
staticAssert(juiceSrc.includes('flashLetheUnlock'), 'juice flash Lethe');
staticAssert(indexSrc.includes('onLetheFirstUnlock'), 'boot sincroniza milestone');
staticAssert(css.includes('#tab-lethe.is-just-unlocked'), 'CSS aba first unlock');
staticAssert(css.includes('despertarLetheFlash') || css.includes('is-lethe'), 'CSS flash roxo');
staticAssert(css.includes('.despertar-tutorial-toast'), 'CSS toast C3');
staticAssert(pkg.includes('despertar-lethe-smoke.mjs'), 'check inclui lethe smoke');
staticAssert(typeof LETHE_UNLOCK_TICKER === 'string' && LETHE_UNLOCK_TICKER.length > 8, 'ticker não vazio');
staticAssert(EDU_LOG_TICKER_IDS.includes('log_lethe_unlock'), 'ticker ids C2');

const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
staticAssert(html.includes('id="despertar-tutorial-toast"'), 'HTML toast C3');
staticAssert(html.includes('despertar-tutorial-toast-dismiss'), 'dismiss Entendi');
staticAssert(juiceSrc.includes('showTutorialToast'), 'juice showTutorialToast');
staticAssert(uiSrc.includes('showTutorialToast'), 'renderer chama toast');

if (errors.length) {
  console.error('despertar-lethe-smoke (estático):');
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

run('Lethe fechado abaixo do preview', () => {
  const state = new GameState({ runSouls: '0', souls: '0' });
  assert.equal(isLetheOpen(state), false);
  assert.equal(state.milestones?.letheSeen, undefined);
  assert.equal(state.eduLogsSeen.includes('log_lethe_unlock'), false);
});

run('runSouls ≥ preview abre Lethe', () => {
  const state = new GameState({ runSouls: LETHE_PREVIEW_RUN_SOULS });
  assert.equal(isLetheOpen(state), true);
});

run('runSouls = 1e8 → log_lethe_unlock; segunda pass não re-dispara', () => {
  const state = new GameState({ runSouls: LETHE_PREVIEW_RUN_SOULS });
  state.unlockLogs();
  assert.ok(state.eduLogsSeen.includes('log_lethe_unlock'));
  assert.ok(state.eduLogsSeen.includes('log_wall'));
  const first = [...state.eduLogsSeen];
  state.unlockLogs();
  assert.deepEqual(state.eduLogsSeen, first);
});

run('canPrestige → log_lethe_ritual one-shot', () => {
  const state = new GameState({ runSouls: '1000000000' });
  assert.equal(state.canPrestige(), true);
  state.unlockLogs();
  assert.ok(state.eduLogsSeen.includes('log_lethe_ritual'));
  assert.ok(state.eduLogsSeen.includes('log_lethe_unlock'));
  const n = state.eduLogsSeen.filter((id) => id === 'log_lethe_ritual').length;
  assert.equal(n, 1);
  state.unlockLogs();
  assert.equal(state.eduLogsSeen.filter((id) => id === 'log_lethe_ritual').length, 1);
});

run('Styx unlock → log_styx_open (souls ≥ limiar)', () => {
  const state = new GameState({ souls: STYX_UNLOCK_SOULS });
  state.unlockLogs();
  assert.ok(state.eduLogsSeen.includes('log_styx_open'));
  state.unlockLogs();
  assert.equal(state.eduLogsSeen.filter((id) => id === 'log_styx_open').length, 1);
});

run('frase do ticker = primeira sentença do body', () => {
  const phrase = eduLogTickerPhrase(EDU_LOG_BY_ID.log_lethe_unlock);
  assert.ok(phrase.endsWith('.') || phrase.endsWith('!') || phrase.endsWith('?'));
  assert.equal(phrase.includes('—') || phrase.includes('memória') || phrase.includes('parede'), true);
  assert.equal(LETHE_UNLOCK_TICKER, phrase);
});

run('markLetheSeen one-shot + snapshot', () => {
  const state = new GameState({ runSouls: LETHE_PREVIEW_RUN_SOULS });
  assert.equal(state.markLetheSeen(), true);
  assert.equal(state.milestones.letheSeen, true);
  assert.ok(state.eduLogsSeen.includes('log_lethe_unlock'));
  assert.equal(state.markLetheSeen(), false);

  const snap = state.toSnapshot();
  assert.equal(snap.milestones.letheSeen, true);
  assert.ok(snap.eduLogsSeen.includes('log_lethe_unlock'));

  const restored = GameState.fromSnapshot(snap);
  assert.equal(restored.milestones.letheSeen, true);
  assert.equal(restored.markLetheSeen(), false);
  assert.ok(restored.eduLogsSeen.includes('log_lethe_unlock'));
});

run('reload com milestone não re-marca', () => {
  const state = new GameState({
    runSouls: LETHE_PREVIEW_RUN_SOULS,
    milestones: { letheSeen: true },
    eduLogsSeen: ['log_lethe_unlock'],
  });
  assert.equal(isLetheOpen(state), true);
  assert.equal(state.markLetheSeen(), false);
  assert.ok(state.eduLogsSeen.includes('log_lethe_unlock'));
});

run('reconcile merge preserva letheSeen local', () => {
  const state = new GameState({
    runSouls: LETHE_PREVIEW_RUN_SOULS,
    milestones: { letheSeen: true },
  });
  state.applyAuthoritativeState(
    { souls: '10', milestones: { forge: true } },
    { mode: 'reconcile' },
  );
  assert.equal(state.milestones.letheSeen, true);
  assert.equal(state.milestones.forge, true);
});

console.log(`\ndespertar-lethe-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
