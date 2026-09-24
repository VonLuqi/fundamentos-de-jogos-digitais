/**
 * Smoke Task 8 — Styx, Lethe e Panteão
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-styx-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';
import { clickPower, prestigeBonus } from '../js/hades-despertar/core/formulas.js';
import {
  describeLethe,
  describeTalentCard,
  describeUpgradeCard,
  isLetheOpen,
  isStyxUnlocked,
  sortStyxVisible,
  upgradeRequirementText,
} from '../js/hades-despertar/ui/UIRenderer.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { applyHarnessGrant, harnessEnabled, syncDiagEnabled } from '../js/hades-despertar/ui/harness.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

[
  'js/hades-despertar/ui/UIRenderer.js',
  'js/hades-despertar/ui/harness.js',
  'pages/despertar.html',
].forEach((rel) => {
  staticAssert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
staticAssert(pkg.includes('despertar-styx-smoke.mjs'), 'npm run check inclui este smoke');
staticAssert(pkg.includes('js/hades-despertar/ui/harness.js'), 'check cobre harness.js');

const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
staticAssert(html.includes('id="despertar-bonus"'), 'HUD mostra o bônus');
staticAssert(html.includes('id="styx-list"'), 'lista de juramentos');
staticAssert(html.includes('id="despertar-sealed-juramentos"'), 'Stats: Juramentos selados');
staticAssert(html.includes('id="sealed-list"'), 'lista de selados');
staticAssert(html.includes('id="lethe-ritual"'), 'CTA Ritual do Lethe');
staticAssert(html.includes('id="despertar-lethe-modal"'), 'modal de confirmação');
staticAssert(html.includes('Beber do Lethe'), 'copy confirmar');
staticAssert(html.includes('Recuar'), 'copy cancelar');
staticAssert(html.includes('Panteão de Mnemosyne'), 'Panteão na aba Lethe');

const boot = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
staticAssert(boot.includes('buyUpgrade'), 'compra de juramento no boot');
staticAssert(boot.includes('buyTalent'), 'compra de talento no boot');
staticAssert(boot.includes('applyPrestige'), 'ritual aplica prestígio');
staticAssert(boot.includes('applyHarnessGrant'), 'harness local no boot');

const harnessSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/harness.js'), 'utf8');
staticAssert(harnessSrc.includes("get('harness') === '1'"), 'query harness=1');
staticAssert(harnessSrc.includes("host !== 'localhost'") || harnessSrc.includes("host === 'localhost'"), 'harness morto fora de localhost');

const uiSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/UIRenderer.js'), 'utf8');
staticAssert(uiSrc.includes('styx-tooltip'), 'tooltip Styx no renderer');
staticAssert(uiSrc.includes('is-sealing'), 'strip mantém ícone durante seal');
staticAssert(uiSrc.includes('!view.owned'), 'owned some da strip');
staticAssert(uiSrc.includes('#renderSealed') || uiSrc.includes('renderSealed'), 'Stats selados');
staticAssert(uiSrc.includes('sortStyxVisible'), 'D3 sortStyxVisible');
staticAssert(uiSrc.includes('catalogIndex'), 'D3 reordena por índice/custo');
staticAssert(uiSrc.includes('_styxOrderSig') || uiSrc.includes('orderSig'), 'strip só reordena quando a ordem muda');
staticAssert(uiSrc.includes("strip?.addEventListener?.('pointerleave'") || uiSrc.includes("addEventListener('pointerleave'"), 'strip pointerleave fecha tip');

const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
staticAssert(css.includes('despertar-upgrade-tooltip'), 'CSS tooltip');
staticAssert(css.includes('is-affordable'), 'CSS affordable');
staticAssert(css.includes('despertar-sealed-icons'), 'CSS grade selados');
staticAssert(!css.includes('despertar-sealed-chip'), 'sem chips largos selados');
staticAssert(!css.includes('despertar-upgrade-icon__mark'), 'sem mark empilhado no ícone');
staticAssert(html.includes('id="sealed-tooltip"'), 'F3: #sealed-tooltip');

if (errors.length) {
  console.error('despertar-styx-smoke (estático):');
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

await run('F4: owned some da strip; requisito + Stats selados', () => {
  const shade = new GameState({ souls: '100', generators: { wandering_shade: 1 } });
  const before = describeUpgradeCard(shade, 'foice_afilada');
  assert.equal(before.revealed, true);
  assert.equal(before.owned, false);
  assert.equal(before.canBuy, true);
  assert.ok(before.requirement);

  const umbras = describeUpgradeCard(shade, 'umbras_despertas');
  assert.equal(umbras.revealed, true);
  assert.equal(umbras.canBuy, true);
  assert.match(umbras.requirement, /Sombra|Umbras|Exige/i);

  assert.equal(shade.buyUpgrade('foice_afilada').ok, true);
  const after = describeUpgradeCard(shade, 'foice_afilada');
  assert.equal(after.owned, true);
  assert.equal(after.canBuy, false);
  assert.equal(after.revealed, true, 'ainda elegível, mas some da strip via !owned');
  assert.equal(shade.upgrades.includes('foice_afilada'), true);

  const def = UPGRADES.find((item) => item.id === 'cortejo_das_sombras');
  assert.match(upgradeRequirementText(def), /10/);
});

await run('D2: cadeia Foice — um elo revelado por vez', () => {
  const FOICE = [
    'foice_afilada',
    'juramento_acheron',
    'pacto_das_margens',
    'ceifador_ctoniano',
    'colheita_eterna',
  ];
  const state = new GameState({ souls: '100000', generators: { wandering_shade: 1 } });

  const countRevealedUnowned = () => FOICE.filter((id) => {
    const view = describeUpgradeCard(state, id);
    return view.revealed && !view.owned;
  });

  assert.deepEqual(countRevealedUnowned(), ['foice_afilada']);
  assert.equal(describeUpgradeCard(state, 'juramento_acheron').revealed, false);
  assert.equal(state.buyUpgrade('juramento_acheron').ok, false, 'não compra N+1 sem N');

  assert.equal(state.buyUpgrade('foice_afilada').ok, true);
  assert.deepEqual(countRevealedUnowned(), ['juramento_acheron']);
  assert.match(
    describeUpgradeCard(state, 'juramento_acheron').requirement,
    /Foice Afiada/,
  );

  assert.equal(state.buyUpgrade('juramento_acheron').ok, true);
  assert.deepEqual(countRevealedUnowned(), ['pacto_das_margens']);

  assert.equal(state.buyUpgrade('pacto_das_margens').ok, true);
  assert.deepEqual(countRevealedUnowned(), ['ceifador_ctoniano']);

  assert.equal(state.buyUpgrade('ceifador_ctoniano').ok, true);
  assert.deepEqual(countRevealedUnowned(), ['colheita_eterna']);

  assert.equal(state.buyUpgrade('colheita_eterna').ok, true);
  assert.deepEqual(countRevealedUnowned(), []);
});

await run('D2: save mid-cadeia sem soft-lock (owned N+1 sem N)', () => {
  const mid = new GameState({
    souls: '1000',
    generators: { wandering_shade: 1 },
    upgrades: ['juramento_acheron'],
  });
  assert.ok(mid.upgrades.includes('juramento_acheron'));
  assert.equal(cmp(mid.clickPower(), '2'), 0, 'efeito do owned permanece');
  assert.equal(describeUpgradeCard(mid, 'juramento_acheron').owned, true);
  assert.equal(describeUpgradeCard(mid, 'juramento_acheron').revealed, true, 'owned permanece');
  assert.equal(describeUpgradeCard(mid, 'juramento_acheron').canBuy, false);
  assert.equal(describeUpgradeCard(mid, 'foice_afilada').revealed, true, 'elo anterior ainda comprável');
  assert.equal(describeUpgradeCard(mid, 'foice_afilada').canBuy, true);
  // Próximo elo exige acheron — que já está owned — então revela (sem soft-lock).
  assert.equal(describeUpgradeCard(mid, 'pacto_das_margens').revealed, true);
  assert.equal(mid.buyUpgrade('foice_afilada').ok, true);
  assert.ok(mid.upgrades.includes('foice_afilada'));
  assert.ok(mid.upgrades.includes('juramento_acheron'));
});

await run('D3: sortStyxVisible — 2 affordáveis + 1 caro → baratos primeiro', () => {
  assert.deepEqual(
    sortStyxVisible([
      { id: 'expensive', canBuy: true, cost: '1000', catalogIndex: 0 },
      { id: 'locked', canBuy: false, cost: '50', catalogIndex: 1 },
      { id: 'cheap', canBuy: true, cost: '100', catalogIndex: 2 },
    ]),
    ['cheap', 'expensive', 'locked'],
  );

  // Integração com cards reais: foice+umbras affordáveis; cortejo revelado mas caro.
  const state = new GameState({
    souls: '150',
    generators: { wandering_shade: 10 },
  });
  const visible = [];
  UPGRADES.forEach((def, catalogIndex) => {
    const view = describeUpgradeCard(state, def.id);
    if (!view?.revealed || view.owned) return;
    visible.push({
      id: def.id,
      canBuy: view.canBuy,
      cost: view.cost,
      catalogIndex,
    });
  });
  assert.ok(visible.some((c) => c.id === 'foice_afilada' && c.canBuy));
  assert.ok(visible.some((c) => c.id === 'umbras_despertas' && c.canBuy));
  assert.ok(visible.some((c) => c.id === 'cortejo_das_sombras' && !c.canBuy));
  const order = sortStyxVisible(visible);
  const iFoice = order.indexOf('foice_afilada');
  const iUmbras = order.indexOf('umbras_despertas');
  const iCortejo = order.indexOf('cortejo_das_sombras');
  assert.ok(iFoice >= 0 && iUmbras >= 0 && iCortejo >= 0);
  assert.ok(iFoice < iCortejo && iUmbras < iCortejo, 'affordáveis antes do caro');
  // Ambos a 100: empate por custo → ordem de catálogo (foice antes de umbras).
  assert.ok(iFoice < iUmbras, 'empate de custo preserva catálogo');
});

await run('D3: após foice_afilada, juramento_acheron entra na strip', () => {
  const state = new GameState({ souls: '600', generators: { wandering_shade: 1 } });
  assert.equal(describeUpgradeCard(state, 'juramento_acheron').revealed, false);
  assert.equal(state.buyUpgrade('foice_afilada').ok, true);
  const next = describeUpgradeCard(state, 'juramento_acheron');
  assert.equal(next.revealed, true);
  assert.equal(next.canBuy, true);
  const order = sortStyxVisible([
    {
      id: 'juramento_acheron',
      canBuy: next.canBuy,
      cost: next.cost,
      catalogIndex: UPGRADES.findIndex((u) => u.id === 'juramento_acheron'),
    },
    {
      id: 'umbras_despertas',
      canBuy: true,
      cost: '100',
      catalogIndex: UPGRADES.findIndex((u) => u.id === 'umbras_despertas'),
    },
  ]);
  // umbras 100 barato antes de acheron 500
  assert.deepEqual(order, ['umbras_despertas', 'juramento_acheron']);
});

await run('Styx trancado no minuto zero; abre com 1 gerador ou 100 almas', () => {
  const fresh = new GameState();
  assert.equal(isStyxUnlocked({ souls: fresh.souls, generators: fresh.quantities() }), false);
  assert.equal(describeUpgradeCard(fresh, 'foice_afilada').revealed, false);

  const withShade = new GameState({ generators: { wandering_shade: 1 } });
  assert.equal(isStyxUnlocked({ souls: withShade.souls, generators: withShade.quantities() }), true);
  assert.equal(describeUpgradeCard(withShade, 'umbras_despertas').revealed, true);
  assert.equal(describeUpgradeCard(withShade, 'foice_afilada').revealed, true);
  assert.equal(describeUpgradeCard(withShade, 'umbras_despertas').canBuy, false);

  const rich = new GameState({ souls: '100' });
  assert.equal(isStyxUnlocked({ souls: rich.souls, generators: rich.quantities() }), true);
  assert.equal(describeUpgradeCard(rich, 'foice_afilada').canBuy, true);
});

await run('juramento ×2 no clique e no gerador', () => {
  const clickState = new GameState({ souls: '100' });
  const before = clickPower({});
  const swore = clickState.buyUpgrade('foice_afilada');
  assert.equal(swore.ok, true);
  assert.equal(cmp(clickState.clickPower(), '2'), 0);
  assert.equal(cmp(before, '1'), 0);
  assert.equal(describeUpgradeCard(clickState, 'foice_afilada').owned, true);
  assert.equal(describeUpgradeCard(clickState, 'foice_afilada').canBuy, false);

  const genState = new GameState({
    souls: '100',
    generators: { wandering_shade: 1 },
  });
  const bought = genState.buyUpgrade('umbras_despertas');
  assert.equal(bought.ok, true);
  assert.equal(cmp(genState.sps(), '0.2'), 0);
});

await run('Lethe: prévia em 1e8 bloqueia o ritual; 1e9 bebe e zera geradores', () => {
  const wall = new GameState({ runSouls: '100000000', souls: '100000000' });
  assert.equal(isLetheOpen(wall), true);
  const preview = describeLethe(wall);
  assert.equal(preview.canDrink, false);
  assert.equal(wall.canPrestige(), false);

  const ripe = new GameState({
    souls: '0',
    runSouls: '1000000000',
    lifetimeSouls: '1000000000',
    generators: { wandering_shade: 3, charon_servants: 1 },
    upgrades: ['foice_afilada'],
  });
  assert.equal(ripe.canPrestige(), true);
  const lethe = describeLethe(ripe);
  assert.equal(lethe.canDrink, true);
  assert.equal(lethe.preview.obolsGain, '1');
  assert.equal(lethe.preview.mnemosyneGain, '1');

  const ritual = ripe.applyPrestige();
  assert.equal(ritual.ok, true);
  assert.equal(Object.keys(ripe.quantities()).length, 0);
  assert.equal(ripe.upgrades.length, 0);
  assert.equal(cmp(ripe.obols, '1'), 0);
  assert.equal(cmp(ripe.mnemosyne, '1'), 0);
  assert.equal(cmp(ripe.souls, '0'), 0);
  assert.equal(cmp(ripe.runSouls, '0'), 0);
  assert.equal(cmp(ripe.lifetimeSouls, '1000000000'), 0);
  assert.equal(cmp(prestigeBonus(ripe.obols, ripe.talents), '1.05'), 0);
});

await run('Panteão: 1 essência compra talento; óbolos permanecem', () => {
  const state = new GameState({
    runSouls: '1000000000',
    lifetimeSouls: '1000000000',
    generators: { wandering_shade: 2 },
  });
  assert.equal(state.applyPrestige().ok, true);
  const card = describeTalentCard(state, 'memoria_das_sombras');
  assert.equal(card.canBuy, true);
  const sealed = state.buyTalent('memoria_das_sombras');
  assert.equal(sealed.ok, true);
  assert.equal(state.talents.includes('memoria_das_sombras'), true);
  assert.equal(cmp(state.mnemosyne, '0'), 0);
  assert.equal(cmp(state.obols, '1'), 0);
  assert.equal(Object.keys(state.quantities()).length, 0);
  assert.equal(describeTalentCard(state, 'memoria_das_sombras').owned, true);
  assert.equal(describeTalentCard(state, 'memoria_das_sombras').canBuy, false);
});

await run('harness só em localhost com ?harness=1; concede 1e9', () => {
  assert.equal(harnessEnabled({ hostname: 'example.com', search: '?harness=1' }), false);
  assert.equal(harnessEnabled({ hostname: 'localhost', search: '' }), false);
  assert.equal(harnessEnabled({ hostname: 'localhost', search: '?harness=1' }), true);
  assert.equal(harnessEnabled({ hostname: '127.0.0.1', search: '?harness=1' }), true);

  const state = new GameState();
  assert.equal(applyHarnessGrant(state, { hostname: 'localhost', search: '?harness=1' }), true);
  assert.equal(cmp(state.runSouls, '1000000000'), 0);
  assert.equal(state.canPrestige(), true);
  assert.equal(applyHarnessGrant(state, { hostname: 'localhost', search: '?harness=1' }), false);
});

await run('syncDiag: harness=1 ou syncDiag=1 só em localhost (Fase A A1)', () => {
  assert.equal(syncDiagEnabled({ hostname: 'example.com', search: '?syncDiag=1' }), false);
  assert.equal(syncDiagEnabled({ hostname: 'localhost', search: '' }), false);
  assert.equal(syncDiagEnabled({ hostname: 'localhost', search: '?syncDiag=1' }), true);
  assert.equal(syncDiagEnabled({ hostname: 'localhost', search: '?harness=1' }), true);
  assert.equal(syncDiagEnabled({ hostname: '127.0.0.1', search: '?syncDiag=1' }), true);
});

console.log(`\ndespertar-styx-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
