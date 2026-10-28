/**
 * Smoke — a tela de Néctar/minigames usa os ícones de sprites/minigames (com versão de cache)
 * e o Jardim deixa escolher a semente (antes só a primeira era plantável).
 * Uso: node tests/despertar-minigames-icons-smoke.mjs
 */

import assert from 'node:assert/strict';
import { MinigamesView } from '../js/hades-despertar/ui/minigames/MinigamesView.js';
import { GARDEN_SEEDS, GRIMOIRE_SPELLS, MARKET_GOODS } from '../js/hades-despertar/config/minigames.js';
import { ART_VERSIONS } from '../js/hades-despertar/config/art-versions.js';

class FakeEl {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attrs = {};
    this.style = {};
    this.textContent = '';
    this.className = '';
    this.listeners = {};
    const self = this;
    this.classList = {
      add: (...c) => { self.className = [...new Set(`${self.className} ${c.join(' ')}`.trim().split(/\s+/))].join(' '); },
      toggle: (c, on) => { if (on) self.classList.add(c); else self.className = self.className.split(/\s+/).filter((x) => x !== c).join(' '); },
      contains: (c) => self.className.split(/\s+/).includes(c),
    };
  }
  append(...kids) { this.children.push(...kids); }
  prepend(...kids) { this.children.unshift(...kids); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  click() { (this.listeners.click || []).forEach((fn) => fn()); }
  contains(node) { return this.all().includes(node); }
  remove() {}
  all() { return [this, ...this.children.flatMap((c) => (c instanceof FakeEl ? c.all() : []))]; }
  querySelector(sel) {
    const cls = sel.replace(/^\./, '');
    return this.all().slice(1).find((n) => n.className.split(/\s+/).includes(cls)) || null;
  }
  imgSrcs() { return this.all().filter((n) => n.tagName === 'IMG').map((n) => n.src); }
}

const doc = { createElement: (tag) => new FakeEl(tag) };
const host = new FakeEl('div');
const seen = [];
const view = new MinigamesView({ document: doc, onSelectSeed: (id) => seen.push(id) }).mount(host);
const tree = host.imgSrcs();

const v = ART_VERSIONS.minigames;
assert.ok(tree.some((s) => s.includes(`minigames/nectar_normal.webp?v=${v}`)), 'gota do Néctar usa o ícone da variante');
for (const sp of GRIMOIRE_SPELLS) {
  assert.ok(tree.some((s) => s.includes(`minigames/${sp.spriteId}.webp?v=${v}`)), `feitiço ${sp.id} com ícone`);
}
for (const g of MARKET_GOODS) {
  assert.ok(tree.some((s) => s.includes(`minigames/${g.spriteId}.webp?v=${v}`)), `bem ${g.id} com ícone`);
}
for (const seed of GARDEN_SEEDS) {
  assert.ok(tree.some((s) => s.includes(`minigames/${seed.spriteId}.webp?v=${v}`)), `semente ${seed.id} com ícone`);
}

// Seletor de sementes: todas escolhíveis, uma marcada por vez.
const seedBtns = host.all().filter((n) => n.dataset.gardenSeed);
assert.equal(seedBtns.length, GARDEN_SEEDS.length, 'um botão por semente');
assert.equal(seedBtns.filter((b) => b.attrs['aria-checked'] === 'true').length, 1);
const third = seedBtns[2];
third.click();
assert.equal(view._selectedSeedId, GARDEN_SEEDS[2].id, 'clique escolhe a semente plantada');
assert.equal(third.attrs['aria-checked'], 'true');
assert.equal(seedBtns.filter((b) => b.attrs['aria-checked'] === 'true').length, 1);
assert.deepEqual(seen, [GARDEN_SEEDS[2].id], 'avisa o renderer para redesenhar o custo');

console.log('despertar-minigames-icons-smoke: ok');
