/**
 * Smoke — Aba Arquivo Estígio (hub Catábase + pesquisas).
 * Uso: node tests/despertar-arquivo-estigio-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  ArquivoEstigioView,
  describeArquivoPanel,
  formatResearchCountdown,
  isArquivoTabUnlocked,
} from '../js/hades-despertar/ui/ArquivoEstigioView.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
const uiSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');

run('HTML + CSS da aba Arquivo', () => {
  assert.ok(html.includes('id="tab-arquivo"'));
  assert.ok(html.includes('id="panel-arquivo"'));
  assert.ok(html.includes('id="despertar-arquivo"'));
  assert.ok(html.includes('data-arquivo="research-fill"'));
  assert.ok(html.includes('data-arquivo-action="buy-hub"'));
  assert.ok(css.includes('.despertar-arquivo__bar-fill'));
  assert.ok(uiSrc.includes('ArquivoEstigioView'));
  assert.ok(uiSrc.includes('#renderArquivo'));
  assert.ok(uiSrc.includes('isArquivoTabUnlocked'));
});

run('helpers: unlock, countdown, painel', () => {
  assert.equal(formatResearchCountdown(0), 'pronta');
  assert.equal(formatResearchCountdown(125), '2:05');
  assert.equal(formatResearchCountdown(3725), '1h 2m');

  const locked = new GameState({ generators: { charon_servants: 3 } });
  assert.equal(isArquivoTabUnlocked(locked), false);

  const open = new GameState({ generators: { charon_servants: 7 } });
  assert.equal(isArquivoTabUnlocked(open), true);

  const viewLocked = describeArquivoPanel(locked);
  assert.equal(viewLocked.unlockedTab, false);
  assert.equal(viewLocked.hasHub, false);

  const funded = new GameState({ generators: { charon_servants: 2 } });
  funded.debugArquivoEstigio('fund');
  assert.equal(isArquivoTabUnlocked(funded), true);
  const panel = describeArquivoPanel(funded);
  assert.equal(panel.hasHub, true);
  assert.equal(panel.research.targetId, 'soro_estigio');
  assert.ok(panel.research.remainingSec > 0);
  assert.ok(panel.chain.some((c) => c.id === 'soro_estigio' && c.status === 'researching'));

  funded.debugArquivoEstigio('finishResearch');
  funded.debugArquivoEstigio('buyNext');
  const after = describeArquivoPanel(funded);
  assert.equal(after.chain.find((c) => c.id === 'soro_estigio')?.status, 'owned');
});

run('ArquivoEstigioView mount + sync (DOM mock)', () => {
  const children = [];
  const makeEl = () => {
    const el = {
      hidden: false,
      disabled: false,
      textContent: '',
      className: '',
      dataset: {},
      style: { width: '' },
      children: [],
      attrs: {},
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] ?? null; },
      append(...nodes) { this.children.push(...nodes); },
      replaceChildren(...nodes) { this.children = [...nodes]; },
      querySelector() { return null; },
      addEventListener() {},
      closest() { return null; },
    };
    return el;
  };

  const map = {
    stage: makeEl(),
    wrath: makeEl(),
    sps: makeEl(),
    leeches: makeEl(),
    'research-title': makeEl(),
    'research-time': makeEl(),
    'research-bar': makeEl(),
    'research-fill': makeEl(),
  };
  const actions = {
    'buy-hub': makeEl(),
    'buy-ready': makeEl(),
    pledge: makeEl(),
    covenant: makeEl(),
  };
  const chain = makeEl();
  const satellites = makeEl();
  const root = {
    querySelector(sel) {
      const m = sel.match(/data-arquivo="([^"]+)"/);
      if (m) {
        if (m[1] === 'chain') return chain;
        if (m[1] === 'satellites') return satellites;
        return map[m[1]] || null;
      }
      const a = sel.match(/data-arquivo-action="([^"]+)"/);
      if (a) return actions[a[1]] || null;
      if (sel === '#despertar-arquivo') return root;
      return null;
    },
    addEventListener() {},
  };

  const bought = [];
  const view = new ArquivoEstigioView({
    document: {
      createElement(tag) {
        const el = makeEl();
        el.tagName = tag;
        return el;
      },
    },
    onBuyUpgrade: (id) => bought.push(id),
  }).mount(root);

  const state = new GameState({ generators: { charon_servants: 7 }, souls: '10000000000' });
  state.debugArquivoEstigio('fund');
  view.sync(state);
  assert.match(map.stage.textContent, /Apaziguado|Despertar|Catábase|estágio|Estágio|Pacto|Comunhão/i);
  assert.ok(map['research-title'].textContent.length > 0);
  assert.equal(actions['buy-hub'].hidden, true);
  assert.ok(chain.children.length >= 5);
});

console.log(`\ndespertar-arquivo-estigio-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
