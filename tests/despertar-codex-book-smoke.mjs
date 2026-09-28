/**
 * Smoke Task B1 + B2 — Códice Livro (widget + drawer + badge + tips).
 * docs/plano-despertar-producao-profundo.md
 *
 * Uso: node tests/despertar-codex-book-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CODEX_TIP_MS,
  EDU_LOG_TIP,
  EDU_LOG_TIP_IDS,
  eduLogTip,
} from '../js/hades-despertar/config/edu-logs.js';
import {
  CodexBook,
  CODEX_DRAWER_SEEN_PREFIX,
  codexBookAriaLabel,
  computeUnseenIds,
  describeCodex,
  drawerSeenStorageKey,
  formatCodexBadge,
  loadDrawerSeen,
  saveDrawerSeen,
} from '../js/hades-despertar/ui/CodexBook.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const html = read('pages/despertar.html');
const css = read('css/despertar.css');
const bookSrc = read('js/hades-despertar/ui/CodexBook.js');
const eduSrc = read('js/hades-despertar/config/edu-logs.js');
const rendererSrc = read('js/hades-despertar/ui/UIRenderer.js');
const indexSrc = read('js/hades-despertar/index.js');
const pkg = read('package.json');

assert.match(html, /id="despertar-codex-book"/);
assert.match(html, /id="despertar-codex-drawer"/);
assert.match(html, /id="despertar-codex-tip"/);
assert.match(html, /id="codex-drawer-list"/);
assert.match(html, />Arquivo</);
assert.match(html, /aria-label="Arquivo do Códice"/);
assert.match(css, /\.despertar-codex-book\b/);
assert.match(css, /z-index:\s*35/);
assert.match(css, /\.despertar-codex-drawer\b/);
assert.match(css, /z-index:\s*55/);
assert.match(css, /\.despertar-codex-tip\b/);
assert.match(bookSrc, /CODEX_DRAWER_SEEN_PREFIX/);
assert.match(bookSrc, /computeUnseenIds/);
assert.match(bookSrc, /showTip|#announceNewTips/);
assert.match(eduSrc, /EDU_LOG_TIP/);
assert.match(eduSrc, /CODEX_TIP_MS/);
assert.match(rendererSrc, /CodexBook/);
assert.match(rendererSrc, /mountCodexBook|_codexBook/);
assert.match(indexSrc, /getUserId/);
assert.match(pkg, /despertar-codex-book-smoke\.mjs/);

assert.equal(CODEX_TIP_MS, 5_000);
assert.ok(EDU_LOG_TIP_IDS.includes('log_input'));
for (const id of [
  'log_input',
  'log_lethe_unlock',
  'log_lethe_ritual',
  'log_styx_open',
  'log_reap_power',
  'log_buy_modes',
  'log_sealed_juramentos',
  'log_verdicts_milestone',
  'log_obols_bonus',
]) {
  const tip = eduLogTip(id);
  assert.ok(tip, `tip obrigatória: ${id}`);
  assert.ok(tip.length <= 90, `tip ≤90: ${id} (${tip.length})`);
  assert.equal(EDU_LOG_TIP[id], tip);
}
assert.equal(eduLogTip('log_loop'), '');

assert.equal(CODEX_DRAWER_SEEN_PREFIX, 'despertar:codex:seenDrawer:');
assert.equal(drawerSeenStorageKey('u1'), 'despertar:codex:seenDrawer:u1');
assert.equal(formatCodexBadge(0), '');
assert.equal(formatCodexBadge(3), '3');
assert.equal(formatCodexBadge(12), '9+');
assert.equal(codexBookAriaLabel(0), 'Códice do Loop');
assert.equal(codexBookAriaLabel(1), 'Códice do Loop — 1 página nova');
assert.equal(codexBookAriaLabel(2), 'Códice do Loop — 2 páginas novas');

assert.deepEqual(
  computeUnseenIds(['log_input', 'log_loop'], ['log_input']),
  ['log_loop'],
);

{
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
  };
  saveDrawerSeen('alice', ['log_input'], storage);
  assert.deepEqual(loadDrawerSeen('alice', storage), ['log_input']);
  assert.deepEqual(loadDrawerSeen('bob', storage), []);
}

{
  const view = describeCodex({ eduLogsSeen: ['log_input'] });
  assert.equal(view.unlockedCount, 1);
  assert.equal(view.showList, true);
  assert.equal(view.entries[0].title, 'O clique é o input');
}

function makeDomHarness({ state, storage, timers }) {
  function el(tag, attrs = {}, children = []) {
    const node = {
      tagName: tag.toUpperCase(),
      id: attrs.id || '',
      className: attrs.class || '',
      hidden: Boolean(attrs.hidden),
      textContent: '',
      attrs: { ...attrs },
      children: [],
      parent: null,
      dataset: {},
      listeners: new Map(),
      get parentElement() { return this.parent; },
      get classList() {
        const self = this;
        return {
          add(name) {
            const set = new Set(String(self.className || '').split(/\s+/).filter(Boolean));
            set.add(name);
            self.className = [...set].join(' ');
          },
          remove(name) {
            const set = new Set(String(self.className || '').split(/\s+/).filter(Boolean));
            set.delete(name);
            self.className = [...set].join(' ');
          },
          contains(name) {
            return String(self.className || '').split(/\s+/).includes(name);
          },
          toggle(name, on) {
            if (on) this.add(name);
            else this.remove(name);
          },
        };
      },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] ?? null; },
      querySelector(sel) {
        if (sel.startsWith('.')) {
          const cls = sel.slice(1).split('.')[0];
          const walk = (n) => {
            if (String(n.className || '').split(/\s+/).includes(cls)) return n;
            for (const c of n.children) {
              const hit = walk(c);
              if (hit) return hit;
            }
            return null;
          };
          return walk(this);
        }
        if (sel.includes('[')) {
          const walk = (n) => {
            if (sel.includes('data-codex-close') && n.attrs?.['data-codex-close'] != null) return n;
            if (sel.includes('.despertar-codex-drawer__close')
              && String(n.className || '').includes('despertar-codex-drawer__close')) {
              return n;
            }
            for (const c of n.children) {
              const hit = walk(c);
              if (hit) return hit;
            }
            return null;
          };
          return walk(this);
        }
        return null;
      },
      querySelectorAll(sel) {
        const out = [];
        const walk = (n) => {
          if (sel.includes('data-codex-close') && n.attrs?.['data-codex-close'] != null) out.push(n);
          if (sel.includes('button') && n.tagName === 'BUTTON') out.push(n);
          for (const c of n.children) walk(c);
        };
        walk(this);
        return out;
      },
      addEventListener(type, fn) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(fn);
      },
      removeEventListener(type, fn) {
        const list = this.listeners.get(type) || [];
        this.listeners.set(type, list.filter((f) => f !== fn));
      },
      focus() {},
      append(...nodes) {
        for (const n of nodes) {
          n.parent = this;
          this.children.push(n);
        }
      },
      replaceChildren(...nodes) {
        this.children = [];
        this.append(...nodes);
      },
    };
    for (const child of children) node.append(child);
    return node;
  }

  const tipText = el('p', { class: 'despertar-codex-tip__text' });
  const tip = el('div', {
    id: 'despertar-codex-tip',
    class: 'despertar-codex-tip',
    hidden: true,
  }, [tipText]);
  const badge = el('span', { class: 'despertar-codex-book__badge', hidden: true });
  const button = el('button', { id: 'despertar-codex-book', class: 'despertar-codex-book' }, [badge]);
  const empty = el('p', { id: 'codex-drawer-empty', class: 'despertar-empty' });
  const list = el('ol', { id: 'codex-drawer-list', class: 'despertar-codex-list', hidden: true });
  const closeBtn = el('button', {
    class: 'despertar-codex-drawer__close',
    'data-codex-close': '',
  });
  const panel = el('aside', { class: 'despertar-codex-drawer__panel' }, [closeBtn, empty, list]);
  const backdrop = el('div', { class: 'despertar-codex-drawer__backdrop', 'data-codex-close': '' });
  const drawer = el('div', {
    id: 'despertar-codex-drawer',
    class: 'despertar-codex-drawer',
    hidden: true,
  }, [backdrop, panel]);
  const realm = el('section', { class: 'despertar-col--realm' }, [button, tip]);
  const tab = el('button', { id: 'tab-codex' });

  const byId = {
    'despertar-codex-book': button,
    'despertar-codex-drawer': drawer,
    'despertar-codex-tip': tip,
    'codex-drawer-list': list,
    'codex-drawer-empty': empty,
    'tab-codex': tab,
  };

  const doc = {
    activeElement: button,
    body: realm,
    getElementById: (id) => byId[id] || null,
    createElement: (tag) => el(tag),
    addEventListener: () => {},
    removeEventListener: () => {},
    defaultView: { matchMedia: () => ({ matches: true }) },
  };

  const book = new CodexBook(doc, {
    getUserId: () => 'student-1',
    getState: () => state,
    storage,
    setTimeout: timers?.setTimeout,
    clearTimeout: timers?.clearTimeout,
  });
  book.mount();
  return { book, button, badge, tip, tipText, list, state };
}

// DOM leve: open → mark seen → badge some
{
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
  };
  const state = { eduLogsSeen: ['log_input', 'log_loop'] };
  const { book, button, badge, list } = makeDomHarness({ state, storage });
  assert.equal(book.unseenCount, 2);
  assert.equal(button.getAttribute('aria-label'), 'Códice do Loop — 2 páginas novas');
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, '2');

  book.open();
  assert.equal(book.isOpen, true);
  assert.equal(book.unseenCount, 0);
  assert.equal(badge.hidden, true);
  assert.equal(list.hidden, false);
  assert.equal(list.children.length, 2);
  assert.equal(book.tipVisible, false);

  book.close();
  assert.equal(book.isOpen, false);
  assert.deepEqual(loadDrawerSeen('student-1', storage), ['log_input', 'log_loop']);
}

// B2: tip no unlock pedagógico; rajada → tip mais recente do catálogo
{
  const mem = new Map();
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
  };
  let tipTimer = null;
  const timers = {
    setTimeout: (fn) => {
      tipTimer = fn;
      return 1;
    },
    clearTimeout: () => { tipTimer = null; },
  };
  const state = { eduLogsSeen: [] };
  const { book, tipText } = makeDomHarness({ state, storage, timers });

  state.eduLogsSeen = ['log_input'];
  book.sync(state);
  assert.equal(book.tipVisible, true);
  assert.equal(tipText.textContent, EDU_LOG_TIP.log_input);

  // Sem tip mapeada → só badge / sem novo popover
  state.eduLogsSeen = ['log_input', 'log_loop'];
  book.sync(state);
  assert.equal(book.tipVisible, true);
  assert.equal(tipText.textContent, EDU_LOG_TIP.log_input);

  // Rajada com tip posterior no catálogo
  state.eduLogsSeen = ['log_input', 'log_loop', 'log_styx_open'];
  book.sync(state);
  assert.equal(tipText.textContent, EDU_LOG_TIP.log_styx_open);

  tipTimer?.();
  assert.equal(book.tipVisible, false);
}

console.log('despertar-codex-book-smoke: ok');
