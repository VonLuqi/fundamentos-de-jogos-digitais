/**
 * Smoke — abas Dragão e Estações + Corça de Ártemis: a mecânica (GameState) ganha tela.
 * Os botões chamam o GameState de verdade: chocar, sacrificar, auras, trocar estação, Rei Saturno
 * e capturar a Corça (só na Saturnália).
 * Uso: node tests/despertar-dragon-seasons-ui-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import {
  DragonSeasonsView,
  formatSeasonRemaining,
  isDragonTabUnlocked,
  isSaturnaliaActive,
  isSeasonsTabUnlocked,
  splitDisplayName,
} from '../js/hades-despertar/ui/DragonSeasonsView.js';
import { ArtemisDeerView, DEER_RUN_MS } from '../js/hades-despertar/ui/ArtemisDeerView.js';
import { ART_VERSIONS } from '../js/hades-despertar/config/art-versions.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

class FakeEl {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parent = null;
    this.dataset = {};
    this.attrs = {};
    this.props = {};
    this.style = { setProperty: (k, v) => { this.props[k] = v; }, getPropertyValue: (k) => this.props[k] || '' };
    this.textContent = '';
    this.className = '';
    this.listeners = {};
    this.disabled = false;
    this.value = '';
  }
  append(...kids) { for (const k of kids) { if (k instanceof FakeEl) k.parent = this; this.children.push(k); } }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type) { (this.listeners[type] || []).forEach((fn) => fn()); }
  click() { this.dispatch('click'); }
  contains(node) { return this.all().includes(node); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; }
  all() { return [this, ...this.children.flatMap((c) => (c instanceof FakeEl ? c.all() : []))]; }
  querySelector(sel) { const cls = sel.replace(/^\./, ''); return this.all().slice(1).find((n) => n.className.split(/\s+/).includes(cls)) || null; }
  byClass(cls) { return this.all().filter((n) => n.className.split(/\s+/).includes(cls)); }
  text() { return this.all().map((n) => n.textContent).join(' '); }
  buttons() { return this.all().filter((n) => n.tagName === 'BUTTON'); }
  button(re) { return this.buttons().find((b) => re.test(b.textContent)); }
}
const doc = { createElement: (tag) => new FakeEl(tag), hidden: false };

let seed = 5;
const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
let clock = 1_800_000_000_000;
const state = new GameState({}, { random, initialNowMs: clock, now: () => clock });

// 1. Abas só aparecem quando o Rio libera (Ovo Primordial / Rodízio das Estações).
assert.equal(isDragonTabUnlocked(state), false);
assert.equal(isSeasonsTabUnlocked(state), false);
state.talents = ['legado', 'ovo_primordial', 'rodizio_das_estacoes'];
assert.equal(isDragonTabUnlocked(state), true);
assert.equal(isSeasonsTabUnlocked(state), true);

// 2. Nomes: estação mantém o subtítulo, aura perde o original em inglês.
assert.deepEqual(splitDisplayName('Antestéria (Festival das Flores e Espíritos)'), { title: 'Antestéria', sub: 'Festival das Flores e Espíritos' });
assert.equal(splitDisplayName('Cursor Ancestral (Dragon Cursor)', { keepSubtitle: false }).title, 'Cursor Ancestral');
assert.equal(formatSeasonRemaining(3_660_000), '1h 01min');

// 3. Tela do Dragão ligada ao GameState real.
const dragonPanel = new FakeEl('div');
const seasonsPanel = new FakeEl('div');
const view = new DragonSeasonsView({
  document: doc,
  onEvolve: (gen) => state.evolveDragon({ targetGeneratorId: gen }),
  onSetAura: (slot, aura) => state.setDragonAura(slot, aura),
  onActivateSeason: (id) => state.activateSeason(id),
  onUpgradeSaturn: () => state.upgradeSaturnKing(),
}).mount(dragonPanel, seasonsPanel);

view.sync(state);
assert.match(dragonPanel.text(), /Ovo Primordial/);
assert.ok(dragonPanel.button(/Chocar o Ovo/).disabled, 'sem almas o Ovo não choca');
assert.ok(dragonPanel.all().some((n) => n.tagName === 'IMG' && n.src.includes(`/seasons/dragon_stage_0.webp?v=${ART_VERSIONS.seasons}`)), 'arte do estágio com versão de cache');

state.grantSouls('5000000000');
view.sync(state);
dragonPanel.button(/Chocar o Ovo/).click();
assert.equal(state.dragon.stage, 1, 'Ovo chocou');
view.sync(state);
assert.match(dragonPanel.text(), /Filhote de Pitão/);
assert.ok(dragonPanel.button(/precisa de 50/).disabled, 'sacrifício sem 50 unidades fica travado');

// Sacrifício escolhido pelo jogador (não o primeiro da lista).
state.generators.applyQuantities({ wandering_shade: 60, charon_servants: 55 });
state.invalidateEconomyCache();
view.sync(state);
const select = dragonPanel.all().find((n) => n.tagName === 'SELECT');
assert.deepEqual(select.children.map((o) => o.value), ['wandering_shade', 'charon_servants']);
select.value = 'charon_servants';
select.dispatch('change');
dragonPanel.button(/Evoluir · −50/).click();
assert.equal(state.dragon.stage, 2);
assert.equal(state.quantities().charon_servants, 5, 'sacrificou o gerador escolhido');
assert.equal(state.quantities().wandering_shade, 60);

// Aura: equipa no slot 1 (custa 1 do maior gerador), e o slot 2 só no estágio 4.
view.sync(state);
assert.match(dragonPanel.text(), /Abre no Ladão de Cem Cabeças/);
const before = state.quantities().charon_servants;
dragonPanel.byClass('despertar-rites__card').find((c) => /Cursor Ancestral/.test(c.text())).button(/Slot 1/).click();
assert.equal(state.dragon.auraSlot1, 'cursor_ancestral');
assert.equal(state.quantities().charon_servants, before - 1, 'aura sacrifica 1 do gerador de maior tier');
view.sync(state);
assert.match(dragonPanel.text(), /No slot 1/);
dragonPanel.button(/^Remover$/).click();
assert.equal(state.dragon.auraSlot1, null, 'remover aura é de graça');

// 4. Estações: troca custa e dobra; Saturnália mostra Rei Saturno e libera a Corça.
view.sync(state);
assert.match(seasonsPanel.text(), /Nenhuma estação ativa/);
const soulsBefore = state.souls;
seasonsPanel.byClass('despertar-rites__card').find((c) => /Saturnália/.test(c.text())).button(/Ativar/).click();
assert.equal(state.seasons.activeSeason, 'saturnalia');
assert.ok(Number(state.souls) < Number(soulsBefore), 'trocar de estação cobra almas');
assert.equal(isSaturnaliaActive(state), true);
view.sync(state);
assert.match(seasonsPanel.text(), /Termina em 24h 00min|Termina em 23h 59min/);
assert.match(seasonsPanel.text(), /Rei Saturno · nível 0/);
seasonsPanel.button(/^Despertar ·/).click();
assert.equal(state.seasons.saturnKingLevel, 1);
view.sync(state);
assert.match(seasonsPanel.text(), /2 000 000 000|2B|2,00B|2\.00B|Trocar de estação/);

// Falha mostra o motivo no painel (aria-live).
state.souls = '0';
view.showFeedback('seasons', 'teste');
assert.equal(seasonsPanel.querySelector('.despertar-rites__feedback').textContent, 'teste');

// 5. Corça de Ártemis: só na Saturnália, aparece, rende produção ao clicar e some.
const layer = new FakeEl('div');
let realMs = 0;
const deer = new ArtemisDeerView({
  document: doc,
  layer,
  getState: () => state,
  random: () => 0,
  onCatch: () => state.catchArtemisDeer(),
});
deer.frame(realMs);
assert.equal(deer.visible, false, 'primeira corça espera um pouco');
realMs += 31_000;
deer.frame(realMs);
assert.equal(deer.visible, true, 'corça entra na Saturnália');
const corca = layer.byClass('despertar-corca')[0];
assert.equal(corca.getAttribute('aria-label'), 'Capturar a Corça de Ártemis');
const caughtBefore = state.seasons.deerCaught;
const soulsAtCatch = Number(state.souls);
corca.click();
assert.equal(state.seasons.deerCaught, caughtBefore + 1);
assert.ok(Number(state.souls) > soulsAtCatch, 'Corça rende almas');
assert.equal(deer.visible, false);
assert.match(layer.byClass('despertar-corca__pop')[0].textContent, /Corça! \+/);

// Corça que ninguém clica some sozinha.
realMs += DEER_RUN_MS + 120_000;
deer.frame(realMs);
assert.equal(deer.visible, true);
realMs += DEER_RUN_MS;
deer.frame(realMs);
assert.equal(deer.visible, false, 'corça foge depois da corrida');

// Fora da Saturnália: nenhuma corça.
state.tick(25 * 3600); // relógio do jogo anda com o tick
assert.equal(isSaturnaliaActive(state), false, 'estação expira em 24h');
realMs += 600_000;
deer.frame(realMs);
assert.equal(deer.visible, false);

// 6. Fiação: abas no HTML, renderer monta/sincroniza, loop chama a Corça.
const page = read('pages/despertar.html');
assert.match(page, /id="tab-dragao"[^>]*hidden>Dragão</);
assert.match(page, /id="tab-estacoes"[^>]*hidden>Estações</);
assert.match(page, /id="panel-dragao"/);
assert.match(page, /id="panel-estacoes"/);
const renderer = read('js/hades-despertar/ui/UIRenderer.js');
assert.match(renderer, /this\.#mountDragonSeasons\(\);/);
assert.match(renderer, /this\.#renderDragonSeasons\(state\);/);
const index = read('js/hades-despertar/index.js');
assert.match(index, /artemisDeer\?\.frame\(performance\.now\(\)\);/);
assert.ok(!/requestAnimationFrame\s*\(/.test(read('js/hades-despertar/ui/ArtemisDeerView.js')), 'Corça sem RAF próprio');

console.log('despertar-dragon-seasons-ui-smoke: ok');
