/**
 * Smoke — Aba Arquivo Estígio (hub Catábase + árvore de pesquisas).
 * Uso: node tests/despertar-arquivo-estigio-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  ArquivoEstigioView,
  arquivoBuyFailureMessage,
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

run('HTML + CSS da aba Arquivo (árvore ONI)', () => {
  assert.ok(html.includes('id="tab-arquivo"'));
  assert.ok(html.includes('id="panel-arquivo"'));
  assert.ok(html.includes('id="despertar-arquivo"'));
  assert.ok(html.includes('data-arquivo="research-fill"'));
  assert.ok(html.includes('data-arquivo="tree"'));
  assert.ok(html.includes('despertar-arquivo__layout'));
  assert.ok(html.includes('despertar-arquivo__sidebar'));
  assert.ok(html.includes('data-arquivo="feedback"'));
  assert.ok(!html.includes('data-arquivo-action="buy-hub"'));
  assert.ok(!html.includes('data-arquivo-action="buy-ready"'));
  assert.ok(!html.includes('data-arquivo-filter="available"'));
  assert.ok(css.includes('.despertar-arquivo__bar-fill'));
  assert.ok(css.includes('.despertar-arquivo__now'));
  assert.ok(css.includes('.despertar-arquivo__tree'));
  assert.ok(css.includes('.despertar-arquivo__node'));
  assert.ok(css.includes('.despertar-arquivo__edge'));
  assert.ok(uiSrc.includes('ArquivoEstigioView'));
  assert.ok(uiSrc.includes('#renderArquivo'));
  assert.ok(uiSrc.includes('isArquivoTabUnlocked'));
  assert.ok(uiSrc.includes('flashArquivoBuyFailure'));
});

run('helpers: unlock, countdown, painel + affordable/canClick', () => {
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
  const hubLocked = viewLocked.chain.find((c) => c.id === 'concilio_das_moiras');
  assert.equal(hubLocked?.status, 'locked');
  assert.equal(hubLocked?.canClick, false);

  const poor = new GameState({ generators: { charon_servants: 7 }, souls: '1' });
  const poorPanel = describeArquivoPanel(poor);
  const hubPoor = poorPanel.chain.find((c) => c.id === 'concilio_das_moiras');
  assert.equal(hubPoor?.status, 'ready');
  assert.equal(hubPoor?.affordable, false);
  assert.equal(hubPoor?.canClick, false);
  assert.match(hubPoor?.tip || '', /Faltam almas/i);

  const rich = new GameState({ generators: { charon_servants: 7 }, souls: '10000000000' });
  const richPanel = describeArquivoPanel(rich);
  const hubRich = richPanel.chain.find((c) => c.id === 'concilio_das_moiras');
  assert.equal(hubRich?.status, 'ready');
  assert.equal(hubRich?.affordable, true);
  assert.equal(hubRich?.canClick, true);

  const funded = new GameState({ generators: { charon_servants: 2 } });
  funded.debugArquivoEstigio('fund');
  assert.equal(isArquivoTabUnlocked(funded), true);
  const panel = describeArquivoPanel(funded);
  assert.equal(panel.hasHub, true);
  assert.equal(panel.research.targetId, 'soro_estigio');
  assert.ok(panel.research.remainingSec > 0);
  assert.equal(panel.research.researching, true);
  assert.ok(panel.research.progress >= 0 && panel.research.progress <= 1);
  assert.ok(panel.chain.some((c) => c.id === 'soro_estigio' && c.status === 'researching'));

  funded.debugArquivoEstigio('finishResearch');
  funded.debugArquivoEstigio('buyNext');
  const after = describeArquivoPanel(funded);
  assert.equal(after.chain.find((c) => c.id === 'soro_estigio')?.status, 'owned');

  const idle = describeArquivoPanel(new GameState({ generators: { charon_servants: 7 }, souls: '1' }));
  assert.equal(idle.research.researching, false);
  assert.equal(idle.research.progress, 0);
  assert.match(idle.research.title, /Fundar o Concílio/i);

  assert.match(
    arquivoBuyFailureMessage({ reason: 'insufficient_souls', cost: '4000000000' }, 'soro_estigio'),
    /Almas insuficientes/i,
  );
  assert.match(
    arquivoBuyFailureMessage({ reason: 'requires' }, 'soro_estigio'),
    /Requisitos/i,
  );
});

run('buyUpgrade retorna reason em falha', () => {
  const state = new GameState({ generators: { charon_servants: 7 }, souls: '1' });
  const fail = state.buyUpgrade('concilio_das_moiras');
  assert.equal(fail.ok, false);
  assert.equal(fail.reason, 'insufficient_souls');

  state.souls = '10000000000';
  const ok = state.buyUpgrade('concilio_das_moiras');
  assert.equal(ok.ok, true);
  const owned = state.buyUpgrade('concilio_das_moiras');
  assert.equal(owned.ok, false);
  assert.equal(owned.reason, 'already_owned');
});

run('ArquivoEstigioView mount + sync + click no nó', () => {
  const makeEl = () => {
    const el = {
      hidden: false,
      disabled: false,
      textContent: '',
      className: '',
      dataset: {},
      style: {},
      children: [],
      attrs: {},
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] ?? null; },
      removeAttribute(k) { delete this.attrs[k]; },
      append(...nodes) { this.children.push(...nodes); },
      replaceChildren(...nodes) { this.children = [...nodes]; },
      querySelector() { return null; },
      addEventListener() {},
      closest() { return null; },
      contains() { return false; },
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
    feedback: makeEl(),
  };
  const actions = {
    pledge: makeEl(),
    covenant: makeEl(),
  };
  const tree = makeEl();
  let clickHandler = null;
  const root = {
    querySelector(sel) {
      const m = sel.match(/data-arquivo="([^"]+)"/);
      if (m) {
        if (m[1] === 'tree') return tree;
        return map[m[1]] || null;
      }
      const a = sel.match(/data-arquivo-action="([^"]+)"/);
      if (a) return actions[a[1]] || null;
      if (sel === '#despertar-arquivo') return root;
      return null;
    },
    addEventListener(type, fn) {
      if (type === 'click') clickHandler = fn;
    },
  };

  const bought = [];
  const view = new ArquivoEstigioView({
    document: {
      createElement(tag) {
        const el = makeEl();
        el.tagName = tag;
        return el;
      },
      createElementNS(_ns, tag) {
        const el = makeEl();
        el.tagName = tag;
        return el;
      },
    },
    onBuyUpgrade: (id) => bought.push(id),
  }).mount(root);

  const state = new GameState({ generators: { charon_servants: 7 }, souls: '10000000000' });
  view.sync(state);
  assert.match(map.stage.textContent, /Apaziguado|Despertar|Catábase|estágio|Estágio|Pacto|Comunhão/i);
  assert.ok(map['research-title'].textContent.length > 0);
  assert.ok(tree.children.length >= 2, 'SVG + nós esperados');

  const hubBtn = tree.children.find(
    (c) => c.getAttribute?.('data-arquivo-buy') === 'concilio_das_moiras',
  );
  assert.ok(hubBtn, 'nó do Concílio clicável');
  assert.equal(hubBtn.disabled, false);

  assert.equal(typeof clickHandler, 'function');
  clickHandler({
    target: {
      closest(sel) {
        if (sel.includes('data-arquivo-buy') || sel.includes('data-arquivo-action')) {
          return hubBtn;
        }
        return null;
      },
    },
  });
  assert.deepEqual(bought, ['concilio_das_moiras']);

  state.debugArquivoEstigio('fund');
  view.sync(state);
  assert.equal(map['research-bar'].hidden, false);

  view.showFeedback('Almas insuficientes para teste.');
  assert.equal(map.feedback.hidden, false);
  assert.match(map.feedback.textContent, /Almas insuficientes/i);
});

console.log(`\ndespertar-arquivo-estigio-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
