/**
 * Smoke Task 7 + E1 — Mercado/altar + layout Cookie (selectors)
 * (docs/plano-hades-despertar.md · plano-despertar-ui-cookieclicker.md).
 *
 * Uso: node tests/despertar-ui-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TICK_FPS } from '../js/hades-despertar/config/constants.js';
import { add, cmp, mul } from '../js/hades-despertar/core/decimal.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { calculateTotalSPS } from '../js/hades-despertar/core/formulas.js';
import {
  formatAmortSeconds,
  formatGameNumber,
  formatSouls,
} from '../js/hades-despertar/ui/NumberFormatter.js';
import { spawnReapParticles } from '../js/hades-despertar/ui/particles.js';
import {
  describeGeneratorCard,
  interpolatedSouls,
  isGeneratorRevealed,
} from '../js/hades-despertar/ui/UIRenderer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFiles = [
  'js/hades-despertar/ui/UIRenderer.js',
  'js/hades-despertar/ui/NumberFormatter.js',
  'js/hades-despertar/ui/particles.js',
];

requiredFiles.forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-ui-smoke.mjs'), 'npm run check inclui este smoke');
staticAssert(pkg.includes('js/hades-despertar/ui/UIRenderer.js'), 'check cobre UIRenderer.js');
staticAssert(pkg.includes('js/hades-despertar/ui/NumberFormatter.js'), 'check cobre NumberFormatter.js');
staticAssert(pkg.includes('js/hades-despertar/ui/particles.js'), 'check cobre particles.js');

const rendererSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
staticAssert(!rendererSrc.includes('innerHTML'), 'UIRenderer não usa innerHTML');
staticAssert(rendererSrc.includes('textContent'), 'updates cirúrgicos via textContent');
staticAssert(rendererSrc.includes('createElement'), 'mercado montado uma vez com createElement');

const boot = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
staticAssert(boot.includes('GameLoop'), 'index.js liga o GameLoop');
staticAssert(boot.includes('buyGenerator'), 'compras no estado, não no render');
staticAssert(boot.includes('.click(') || boot.includes('state.click()'), 'Ceifar chama state.click');
staticAssert(boot.includes('bootAuthoritativeSession') || boot.includes('bootLocalSession'), 'boot persiste a corrida');
staticAssert(boot.includes('ApiService'), 'index liga ApiService');
staticAssert(boot.includes('spawnReapParticles'), 'partículas no clique');

const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
staticAssert(css.includes('despertar-particle') || css.includes('.despertar-particle'), 'CSS das partículas');
staticAssert(css.includes('prefers-reduced-motion'), 'reduced-motion desliga shake/partículas');
staticAssert(css.includes('despertarReapShake') || css.includes('is-reaping'), 'gamefeel leve no Ceifar');

const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
staticAssert(html.includes('id="despertar-reap"'), 'botão Ceifar');
staticAssert(html.includes('data-particle-layer'), 'camada de partículas');
staticAssert(html.includes('id="despertar-market-list"'), 'lista do mercado para mount único');
staticAssert(html.includes('data-buy-mode="max"'), 'toggle Máx');

/* --- Task E1 — layout Cookie (selectors) --- */
staticAssert(html.includes('despertar-layout'), 'grid Cookie 3 colunas');
staticAssert(html.includes('despertar-col--acheron'), 'coluna esquerda (altar)');
staticAssert(html.includes('despertar-col--realm'), 'coluna centro (mundo/tabs)');
staticAssert(html.includes('despertar-col--store'), 'coluna direita (store)');
staticAssert(html.includes('id="tab-mundo"'), 'aba Mundo');
staticAssert(html.includes('id="panel-mundo"'), 'painel Mundo');
staticAssert(html.includes('id="despertar-shelves"'), 'prateleiras');
staticAssert(html.includes('id="despertar-reap-orbit"'), 'órbita do altar');
staticAssert(html.includes('id="despertar-souls"'), 'HUD de almas');
staticAssert(html.includes('id="despertar-juizo-open"'), 'CTA Juízo');
staticAssert(html.includes('data-juizo-choice="A"'), 'Juízo card campeão');
staticAssert(html.includes('data-juizo-choice="B"'), 'Juízo card desafiante');
staticAssert(html.includes('data-juizo-choice="tie"'), 'Juízo Empate');
staticAssert(!html.includes('data-juizo-choice="higher"'), 'Juízo sem Maior');
staticAssert(!html.includes('data-juizo-choice="lower"'), 'Juízo sem Menor');
staticAssert(html.includes('id="despertar-sealed-juramentos"'), 'Stats Juramentos selados');
staticAssert(html.includes('data-reap-foice'), 'Foice no Ceifar');
staticAssert(html.includes('despertar-shelf') || html.includes('despertar-shelves'), 'prateleiras');
staticAssert(css.includes('despertar-layout'), 'CSS layout Cookie');
staticAssert(css.includes('despertar-col--store'), 'CSS coluna store');

staticAssert(pkg.includes('despertar-clock-smoke.mjs'), 'E1: clock smoke no check');
staticAssert(pkg.includes('despertar-world-smoke.mjs'), 'E1: world smoke no check');
staticAssert(pkg.includes('despertar-juizo-smoke.mjs'), 'E1: juizo smoke no check');

if (errors.length) {
  console.error('despertar-ui-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

await run('NumberFormatter usa sufixos 1.2M / 4.7B sem Number na carteira', () => {
  assert.equal(formatSouls('0.1'), '0.1');
  assert.equal(formatSouls('15'), '15');
  assert.equal(formatGameNumber('1100'), '1.1K');
  assert.equal(formatGameNumber('1200000'), '1.2M');
  assert.equal(formatGameNumber('4700000000'), '4.7B');
  assert.equal(formatAmortSeconds('150'), '150 s');
});

await run('máscaras de rio: T1 sempre, T2/T5 fechados no minuto zero', () => {
  const empty = { souls: '0', generators: {} };
  assert.equal(isGeneratorRevealed('wandering_shade', empty), true);
  assert.equal(isGeneratorRevealed('charon_servants', empty), false);
  assert.equal(isGeneratorRevealed('cerberian_hound', empty), false);
  assert.equal(isGeneratorRevealed('tartarus_judge', empty), true);
  assert.equal(isGeneratorRevealed('phlegethon_forge', empty), false);
  assert.equal(isGeneratorRevealed('obsidian_throne', empty), false);

  assert.equal(isGeneratorRevealed('charon_servants', { souls: '50', generators: {} }), true);
  assert.equal(isGeneratorRevealed('charon_servants', {
    souls: '0',
    generators: { wandering_shade: 1 },
  }), true);
  assert.equal(isGeneratorRevealed('phlegethon_forge', {
    souls: '0',
    generators: { tartarus_judge: 1 },
  }), true);
  assert.equal(isGeneratorRevealed('phlegethon_forge', { souls: '32500', generators: {} }), true);
});

await run('15 cliques compram T1; T2 revela; SPS sobe; lote 10 fica pobre', () => {
  const state = new GameState();
  for (let i = 0; i < 15; i += 1) state.click();

  const t1Poor = describeGeneratorCard(state, 'wandering_shade', '10');
  assert.equal(t1Poor.revealed, true);
  assert.equal(t1Poor.canBuy, false, '15 almas não cobrem lote 10');

  const t1 = describeGeneratorCard(state, 'wandering_shade', '1');
  assert.equal(t1.canBuy, true);
  assert.equal(t1.quantity, 0);

  const bought = state.buyGenerator('wandering_shade', '1');
  assert.equal(bought.ok, true);
  assert.equal(state.quantities().wandering_shade, 1);

  const sps = calculateTotalSPS({ generators: { wandering_shade: 1 } });
  assert.equal(cmp(state.sps(), sps), 0);
  assert.equal(cmp(sps, '0.1'), 0);

  const t1Owned = describeGeneratorCard(state, 'wandering_shade', '1');
  assert.equal(t1Owned.quantity, 1);
  assert.equal(t1Owned.canBuy, false, 'carteira após T1 não cobre a próxima sombra');

  const t2 = describeGeneratorCard(state, 'charon_servants', '1');
  assert.equal(t2.revealed, true, '1× T1 revela Servos de Caronte');
  assert.equal(t2.canBuy, false);

  const t5 = describeGeneratorCard(state, 'phlegethon_forge', '1');
  assert.equal(t5.revealed, false);
  assert.equal(t5.canBuy, false);
});

await run('interpolação anima só o display de almas; reduced motion não adianta o tick', () => {
  const souls = '10';
  const sps = '0.1';
  const half = interpolatedSouls(souls, sps, 0.5, false);
  assert.equal(cmp(half, add(souls, mul(sps, String(0.5 / TICK_FPS)))), 0);
  assert.equal(interpolatedSouls(souls, sps, 1, true), souls);
  assert.equal(interpolatedSouls(souls, sps, 0, false), souls);
});

await run('partículas respeitam prefers-reduced-motion', () => {
  let created = 0;
  const layer = {
    childElementCount: 0,
    firstElementChild: null,
    ownerDocument: {
      createElement() {
        created += 1;
        return {
          className: '',
          style: { setProperty() {} },
          setAttribute() {},
          addEventListener() {},
        };
      },
    },
    appendChild() {
      this.childElementCount += 1;
    },
  };
  assert.equal(spawnReapParticles(layer, { reducedMotion: true, count: 8 }), 0);
  assert.equal(created, 0);
  const spawned = spawnReapParticles(layer, { reducedMotion: false, count: 8, matchMedia: () => ({ matches: false }) });
  assert.equal(spawned, 8);
  assert.equal(created, 8);
});

await run('T2 compra depois de acumular 100 almas', () => {
  const state = new GameState({
    souls: '100',
    generators: { wandering_shade: 1 },
  });
  const view = describeGeneratorCard(state, 'charon_servants', '1');
  assert.equal(view.revealed, true);
  assert.equal(view.canBuy, true);
  const bought = state.buyGenerator('charon_servants', '1');
  assert.equal(bought.ok, true);
  assert.equal(state.quantities().charon_servants, 1);
  assert.ok(cmp(state.sps(), '0.9') === 0, `SPS T1+T2 deveria ser 0.9, veio ${state.sps()}`);
});

console.log(`\ndespertar-ui-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
