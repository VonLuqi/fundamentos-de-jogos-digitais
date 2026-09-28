/**
 * Smoke Task C1+C2 — Subabas Panteão e Bancada (Disponíveis / Comprados).
 * docs/plano-despertar-producao-profundo.md
 *
 * Uso: node tests/despertar-shop-tabs-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TALENTS } from '../js/hades-despertar/config/talents.js';
import { VERDICT_SHOP } from '../js/hades-despertar/config/verdict-shop.js';
import {
  BANCADA_EMPTY_AVAILABLE,
  BANCADA_EMPTY_OWNED,
  PANTHEON_EMPTY_AVAILABLE,
  PANTHEON_EMPTY_OWNED,
  SHOP_OWNED_BADGE,
  bindSubTabs,
  defaultShopSubTab,
  partitionShopCatalog,
  shopTabLabel,
} from '../js/hades-despertar/ui/subTabs.js';
import {
  describeTalentCard,
  describeVerdictCard,
} from '../js/hades-despertar/ui/UIRenderer.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const html = read('pages/despertar.html');
const css = read('css/despertar.css');
const rendererSrc = read('js/hades-despertar/ui/UIRenderer.js');
const subSrc = read('js/hades-despertar/ui/subTabs.js');
const pkg = read('package.json');

assert.match(html, /id="pantheon-subtabs"/);
assert.match(html, /id="pantheon-tab-available"/);
assert.match(html, /id="pantheon-tab-owned"/);
assert.match(html, /id="pantheon-list-available"/);
assert.match(html, /id="pantheon-list-owned"/);
assert.match(html, /id="pantheon-shop"/);
assert.doesNotMatch(html, /id="pantheon-list"/);
assert.match(html, /id="bancada-subtabs"/);
assert.match(html, /id="bancada-tab-available"/);
assert.match(html, /id="bancada-tab-owned"/);
assert.match(html, /id="bancada-list-available"/);
assert.match(html, /id="bancada-list-owned"/);
assert.match(html, /id="bancada-shop"/);
assert.doesNotMatch(html, /id="bancada-list"/);
assert.match(css, /\.despertar-subtabs\b/);
assert.match(css, /\.despertar-subtab\b/);
assert.match(subSrc, /partitionShopCatalog/);
assert.match(subSrc, /bindSubTabs/);
assert.match(rendererSrc, /pantheon-list-available|partitionShopCatalog/);
assert.match(rendererSrc, /bancada-list-available/);
assert.match(rendererSrc, /PANTHEON_EMPTY_AVAILABLE/);
assert.match(rendererSrc, /BANCADA_EMPTY_AVAILABLE/);
assert.match(pkg, /despertar-shop-tabs-smoke\.mjs/);

assert.equal(PANTHEON_EMPTY_AVAILABLE, 'O Panteão está completo.');
assert.equal(PANTHEON_EMPTY_OWNED, 'Ainda não selaste nenhum talento.');
assert.equal(BANCADA_EMPTY_AVAILABLE, 'A Bancada não tem mais sentenças.');
assert.equal(BANCADA_EMPTY_OWNED, 'Nenhuma sentença comprada.');
assert.equal(SHOP_OWNED_BADGE, 'Ativo');
assert.equal(shopTabLabel('Disponíveis', 3), 'Disponíveis (3)');
assert.equal(defaultShopSubTab(2), 'available');
assert.equal(defaultShopSubTab(0), 'owned');

{
  const catalog = [
    { id: 'a', owned: false, canBuy: false },
    { id: 'b', owned: false, canBuy: true },
    { id: 'c', owned: true, canBuy: false },
    { id: 'd', owned: false, canBuy: false, locked: true },
  ];
  const part = partitionShopCatalog(catalog, {
    isOwned: (x) => x.owned,
    canBuy: (x) => x.canBuy,
    isLocked: (x) => Boolean(x.locked),
  });
  assert.deepEqual(part.available.map((x) => x.id), ['b', 'a', 'd']);
  assert.deepEqual(part.owned.map((x) => x.id), ['c']);
  assert.equal(part.counts.available, 3);
  assert.equal(part.counts.owned, 1);
  assert.equal(part.counts.affordable, 1);
}

{
  const state = new GameState({
    prestigeCount: 1,
    mnemosyne: '50',
    talents: ['memoria_das_sombras'],
  });
  const cards = TALENTS.map((def) => describeTalentCard(state, def.id)).filter(Boolean);
  const part = partitionShopCatalog(cards, {
    isOwned: (c) => c.owned,
    canBuy: (c) => c.canBuy,
  });
  assert.ok(part.owned.some((c) => c.id === 'memoria_das_sombras'));
  assert.ok(part.available.every((c) => c.id !== 'memoria_das_sombras'));
  assert.equal(part.counts.owned, 1);
  assert.equal(part.counts.available, TALENTS.length - 1);
}

{
  const state = new GameState({
    verdicts: 10,
    verdictPurchases: ['selo_do_juiz'],
  });
  const cards = VERDICT_SHOP.map((def) => describeVerdictCard(state, def.id)).filter(Boolean);
  const part = partitionShopCatalog(cards, {
    isOwned: (c) => c.owned,
    canBuy: (c) => c.canBuy,
  });
  assert.ok(part.owned.some((c) => c.id === 'selo_do_juiz'));
  assert.ok(part.available.every((c) => c.id !== 'selo_do_juiz'));
  assert.equal(part.counts.owned, 1);
  assert.equal(part.counts.available, VERDICT_SHOP.length - 1);
  assert.ok(part.available.some((c) => c.canBuy));
}

// bindSubTabs — fake DOM
{
  function el(tag, attrs = {}, kids = []) {
    const node = {
      tagName: tag.toUpperCase(),
      id: attrs.id || '',
      className: attrs.class || '',
      hidden: Boolean(attrs.hidden),
      textContent: attrs.text || '',
      attrs: { ...attrs },
      children: [],
      parent: null,
      listeners: new Map(),
      ownerDocument: null,
      setAttribute(k, v) {
        this.attrs[k] = String(v);
        if (k === 'aria-selected') this.attrs['aria-selected'] = String(v);
      },
      getAttribute(k) { return this.attrs[k] ?? null; },
      querySelectorAll(sel) {
        if (sel.includes('[role="tab"]')) {
          return this.children.filter((c) => c.attrs.role === 'tab');
        }
        return [];
      },
      addEventListener(type, fn) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(fn);
      },
      focus() {},
      append(...nodes) {
        for (const n of nodes) {
          n.parent = this;
          this.children.push(n);
        }
      },
      closest(sel) {
        if (sel === '[role="tab"]' && this.attrs.role === 'tab') return this;
        return this.parent?.closest?.(sel) ?? null;
      },
    };
    for (const k of kids) node.append(k);
    return node;
  }

  const tabA = el('button', {
    id: 'bancada-tab-available',
    role: 'tab',
    'aria-controls': 'bancada-panel-available',
    'aria-selected': 'true',
    text: 'Disponíveis (0)',
  });
  tabA.tabIndex = 0;
  const tabB = el('button', {
    id: 'bancada-tab-owned',
    role: 'tab',
    'aria-controls': 'bancada-panel-owned',
    'aria-selected': 'false',
    text: 'Comprados (0)',
  });
  tabB.tabIndex = -1;
  const panelA = el('div', { id: 'bancada-panel-available', role: 'tabpanel' });
  const panelB = el('div', { id: 'bancada-panel-owned', role: 'tabpanel', hidden: true });
  const tablist = el('div', { id: 'bancada-subtabs', role: 'tablist' }, [tabA, tabB]);

  const byId = {
    'bancada-panel-available': panelA,
    'bancada-panel-owned': panelB,
  };
  const doc = {
    getElementById: (id) => byId[id] || null,
  };
  tablist.ownerDocument = doc;

  let activated = null;
  const api = bindSubTabs(tablist, {
    doc,
    onActivate: (_t, key) => { activated = key; },
  });
  assert.ok(api);
  assert.equal(api.getSelectedKey(), 'available');
  assert.equal(panelA.hidden, false);
  assert.equal(panelB.hidden, true);

  api.activate(tabB);
  assert.equal(activated, 'owned');
  assert.equal(api.getSelectedKey(), 'owned');
  assert.equal(panelB.hidden, false);
  assert.equal(panelA.hidden, true);

  const keyHandlers = tablist.listeners.get('keydown') || [];
  tabB.attrs.role = 'tab';
  keyHandlers[0]?.({
    target: tabB,
    key: 'ArrowLeft',
    preventDefault() {},
  });
  assert.equal(api.getSelectedKey(), 'available');
}

console.log('despertar-shop-tabs-smoke: ok');
