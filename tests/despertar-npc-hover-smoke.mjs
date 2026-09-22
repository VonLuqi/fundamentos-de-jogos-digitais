/**
 * Smoke Task G3.1 + G3.2 — hit-test + tooltip SPS por NPC vs linha da store.
 * Uso: node tests/despertar-npc-hover-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHINY_MULT } from '../js/hades-despertar/config/constants.js';
import { add, cmp, mul } from '../js/hades-despertar/core/decimal.js';
import {
  calculateTotalSPS,
  effectiveUnitSPS,
  prestigeBonus,
} from '../js/hades-despertar/core/formulas.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { describeGeneratorCard, describeNpcUnit, NPC_UNIT_PRODUCTION_BLURB } from '../js/hades-despertar/ui/UIRenderer.js';
import {
  ORBIT_HIT_RADIUS,
  orbitHitIndex,
  orbitPlacementXY,
  orbitSlotLayout,
} from '../js/hades-despertar/ui/world/AltarOrbit.js';
import {
  SHELF_CELL,
  SHELF_PAD,
  buyPulseScale,
  shelfCellOrigin,
  shelfHitIndex,
  shinyCountFromState,
} from '../js/hades-despertar/ui/world/WorldView.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const formulasSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/core/formulas.js'), 'utf8');
const worldSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/WorldView.js'), 'utf8');
const altarSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/world/AltarOrbit.js'), 'utf8');
const rendererSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(formulasSrc.includes('effectiveUnitSPS'), 'effectiveUnitSPS export');
staticAssert(worldSrc.includes('shelfHitIndex'), 'shelfHitIndex');
staticAssert(worldSrc.includes('drawShelfCellHighlight') || worldSrc.includes('buyPulseScale'), 'G5.2 highlight/pulse shelf');
staticAssert(altarSrc.includes('orbitHitIndex'), 'orbitHitIndex');
staticAssert(altarSrc.includes('pulseBuy') && altarSrc.includes('_hoverIndex'), 'G5.2 orbit highlight/pulse');
staticAssert(rendererSrc.includes('describeNpcUnit'), 'describeNpcUnit');
staticAssert(rendererSrc.includes('produção desta unidade') || rendererSrc.includes('NPC_UNIT_PRODUCTION_BLURB'), 'copy G3.2 unidade');
staticAssert(rendererSrc.includes('Linha total'), 'store title marca linha total');
staticAssert(rendererSrc.includes('despertar-npc-tooltip'), 'NPC tooltip DOM');
staticAssert(rendererSrc.includes('pulseGeneratorBuy'), 'G5.2 pulseGeneratorBuy');
staticAssert(css.includes('despertar-npc-tooltip') || css.includes('upgrade-tooltip__shiny'), 'CSS tip shiny');
staticAssert(css.includes('is-buy-pulse') || css.includes('despertarOrbitBuyPulse'), 'CSS orbit buy pulse');
staticAssert(pkg.includes('despertar-npc-hover-smoke.mjs'), 'check inclui npc hover smoke');

if (errors.length) {
  console.error('despertar-npc-hover-smoke (estático):');
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

run('effectiveUnitSPS = base × upgrade × prestige × verdict', () => {
  const rate = effectiveUnitSPS({
    generatorId: 'wandering_shade',
    upgrades: [],
    talents: [],
    obols: '0',
    verdictPurchases: [],
  });
  assert.equal(rate, '0.1');

  const withObol = effectiveUnitSPS({
    generatorId: 'wandering_shade',
    upgrades: [],
    talents: [],
    obols: '20',
    verdictPurchases: [],
  });
  assert.equal(withObol, mul('0.1', prestigeBonus('20', [])));
});

run('effectiveUnitSPS shiny aplica SHINY_MULT', () => {
  const base = effectiveUnitSPS({ generatorId: 'wandering_shade', shiny: false });
  const shiny = effectiveUnitSPS({ generatorId: 'wandering_shade', shiny: true });
  assert.equal(shiny, mul(base, SHINY_MULT));
  assert.equal(SHINY_MULT, '2');
});

run('effectiveUnitSPS alinhado a calculateTotalSPS / qty', () => {
  const upgrades = [];
  const talents = [];
  const obols = '4';
  const verdictPurchases = [];
  const generators = { wandering_shade: 5, charon_servants: 2 };
  const total = calculateTotalSPS({ generators, upgrades, talents, obols, verdictPurchases });
  const uShade = effectiveUnitSPS({
    generatorId: 'wandering_shade',
    upgrades,
    talents,
    obols,
    verdictPurchases,
  });
  const uServant = effectiveUnitSPS({
    generatorId: 'charon_servants',
    upgrades,
    talents,
    obols,
    verdictPurchases,
  });
  const fromUnits = add(mul(uShade, '5'), mul(uServant, '2'));
  assert.equal(fromUnits, total);
  assert.ok(cmp(total, '0') > 0);
});

run('shelfHitIndex: centro da célula 0', () => {
  const { x, y } = shelfCellOrigin(0);
  const cx = x + SHELF_CELL / 2;
  const cy = y + SHELF_CELL / 2;
  assert.equal(shelfHitIndex(cx, cy, 5), 0);
});

run('shelfHitIndex: célula coluna-major (índice 4 = col1 row0)', () => {
  const { x, y } = shelfCellOrigin(4);
  assert.equal(shelfHitIndex(x + 2, y + 2, 8), 4);
});

run('shelfHitIndex: gap e fora do count → -1', () => {
  const { x, y } = shelfCellOrigin(0);
  assert.equal(shelfHitIndex(x + SHELF_CELL + 1, y + 2, 5), -1);
  assert.equal(shelfHitIndex(SHELF_PAD + 2, SHELF_PAD + 2, 0), -1);
  assert.equal(shelfHitIndex(x + 2, y + 2, 1), 0);
  const o5 = shelfCellOrigin(5);
  assert.equal(shelfHitIndex(o5.x + 2, o5.y + 2, 5), -1);
});

run('orbitHitIndex: ponto no placement', () => {
  const placements = orbitSlotLayout(3);
  const geom = {
    cx: 100,
    cy: 100,
    baseRadius: 40,
    ringGap: 12,
    angleOffset: 0,
    ringParallax: 0.07,
  };
  const p0 = orbitPlacementXY(placements[0], geom);
  assert.equal(orbitHitIndex(p0.x, p0.y, placements, geom), 0);
  assert.equal(orbitHitIndex(p0.x + ORBIT_HIT_RADIUS + 20, p0.y, placements, geom), -1);
});

run('shinyCountFromState + describeNpcUnit', () => {
  assert.equal(shinyCountFromState({ shinyCounts: { charon_servants: 2 } }, 'charon_servants', 5), 2);
  assert.equal(shinyCountFromState({ shinyCounts: { charon_servants: 9 } }, 'charon_servants', 3), 3);

  const gs = new GameState({
    souls: '1000',
    generators: { wandering_shade: 3 },
  });
  const view = describeNpcUnit(gs, 'wandering_shade', { shiny: false });
  assert.equal(view.name, 'Sombra Vagante');
  assert.equal(view.blurb, NPC_UNIT_PRODUCTION_BLURB);
  assert.equal(view.rate, effectiveUnitSPS({
    generatorId: 'wandering_shade',
    upgrades: gs.upgrades,
    talents: gs.talents,
    obols: gs.obols,
    verdictPurchases: gs.verdictPurchases,
  }));
  const shinyView = describeNpcUnit(gs, 'wandering_shade', { shiny: true });
  assert.equal(shinyView.shiny, true);
  assert.equal(shinyView.rate, mul(view.rate, SHINY_MULT));
});

run('G3.2: unidade × qty ≈ linha da store (Servo)', () => {
  const gs = new GameState({
    souls: '100000',
    generators: { charon_servants: 7 },
    obols: '10',
  });
  const unit = describeNpcUnit(gs, 'charon_servants', { shiny: false });
  const card = describeGeneratorCard(gs, 'charon_servants', '1');
  assert.ok(unit && card);
  assert.equal(unit.blurb, 'produção desta unidade');
  assert.equal(card.quantity, 7);
  assert.equal(card.rate, mul(unit.rate, String(card.quantity)));
  assert.equal(card.unitRate, unit.rate);
});

run('G5.2: buyPulseScale pico no meio e 1 nas pontas', () => {
  assert.equal(buyPulseScale(0), 1);
  assert.equal(buyPulseScale(1), 1);
  assert.ok(buyPulseScale(0.5) > 1.15);
  assert.ok(buyPulseScale(0.5) < 1.25);
});

if (failed) {
  console.error(`\n${failed} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`\nAll ${passed} checks passed.`);
