/**
 * Smoke Fase F / F1–F3 — Juramentos Selados (grade densa + tooltip + a11y).
 * Uso: node tests/despertar-selados-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { GameState } from '../js/hades-despertar/core/GameState.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const html = fs.readFileSync(path.join(root, 'pages/despertar.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/despertar.css'), 'utf8');
const uiSrc = fs.readFileSync(
  path.join(root, 'js/hades-despertar/ui/UIRenderer.js'),
  'utf8',
);
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(html.includes('id="despertar-sealed-juramentos"'), 'seção Selados');
staticAssert(html.includes('id="sealed-list"'), 'lista sealed-list');
staticAssert(html.includes('class="despertar-sealed-icons"'), 'ul.despertar-sealed-icons');
staticAssert(html.includes('id="sealed-tooltip"'), '#sealed-tooltip no HTML');
staticAssert(html.includes('despertar-upgrade-tooltip'), 'classes tip Styx no sealed');
staticAssert(html.includes('data-tip="mark"'), 'marca Selado no tip');
staticAssert(
  /id="sealed-tooltip"[^>]*role="tooltip"|role="tooltip"[^>]*id="sealed-tooltip"/.test(html)
    || (html.includes('id="sealed-tooltip"') && /role="tooltip"/.test(html)),
  'role=tooltip no sealed tip',
);
staticAssert(!html.includes('despertar-sealed-list'), 'sem sealed-list antiga');
staticAssert(!html.includes('despertar-sealed-chip'), 'HTML sem chips');

const sealedBlock = css.match(/\.despertar-sealed-icons\s*\{[^}]+\}/s)?.[0] || '';
staticAssert(css.includes('.despertar-sealed-icons'), 'CSS .despertar-sealed-icons');
staticAssert(/gap:\s*2px/.test(sealedBlock), 'gap 2px');
const gapMatch = sealedBlock.match(/gap:\s*([\d.]+)(px|rem)/);
if (gapMatch) {
  const value = Number(gapMatch[1]);
  const px = gapMatch[2] === 'rem' ? value * 16 : value;
  staticAssert(px <= 4, `gap ≤ 4px (atual ${px}px)`);
} else {
  staticAssert(false, 'gap parseável no CSS sealed');
}
staticAssert(
  /\.despertar-sealed-icons\s+\.despertar-upgrade-icon\s*\{[^}]*width:\s*2rem/s.test(css),
  'ícone 2rem (32px)',
);
staticAssert(/max-width:\s*100%/.test(sealedBlock), 'wrap sem estourar (max-width)');
staticAssert(css.includes('despertar-upgrade-tooltip__mark'), 'CSS marca Selado');
staticAssert(css.includes('despertar-upgrade-tooltip'), 'CSS tip classes Styx');
staticAssert(!css.includes('despertar-sealed-chip'), 'CSS sem chips');

staticAssert(uiSrc.includes('#renderSealed'), '#renderSealed existe');
staticAssert(uiSrc.includes('#mountSealedTip') || uiSrc.includes('mountSealedTip'), 'mount sealed tip');
staticAssert(uiSrc.includes('#showSealedTip') || uiSrc.includes('showSealedTip'), 'showSealedTip');
staticAssert(uiSrc.includes('#hideSealedTip') || uiSrc.includes('hideSealedTip'), 'hideSealedTip');
staticAssert(uiSrc.includes('#positionFixedTip') || uiSrc.includes('positionFixedTip'), 'tip pos compartilhado');
staticAssert(uiSrc.includes("setAttribute('aria-describedby', 'sealed-tooltip')"), 'aria-describedby tip');
staticAssert(uiSrc.includes("setText(tip.mark, 'Selado')"), 'conteúdo tip Selado');
staticAssert(uiSrc.includes("className = 'despertar-sealed-icon'"), 'li.despertar-sealed-icon');
staticAssert(uiSrc.includes("setAttribute('aria-label', def.name)"), 'aria-label no botão');
staticAssert(uiSrc.includes('UPGRADES.filter((def) => owned.has(def.id))'), 'ordem catálogo ∩ owned');
staticAssert(uiSrc.includes('pointerenter'), 'wire pointerenter');
staticAssert(
  uiSrc.includes("addEventListener('focus'") && uiSrc.includes("addEventListener('blur'"),
  'focus/blur tip (Tab)',
);
staticAssert(
  /Escape[\s\S]{0,120}hideSealedTip|hideSealedTip[\s\S]{0,80}Escape/.test(uiSrc),
  'Esc fecha tip Selados',
);
staticAssert(
  uiSrc.includes('#hideStyxTip()') && uiSrc.includes('#hideSealedTip()'),
  'Esc / tip mutual hide Styx↔Selados',
);
staticAssert(!uiSrc.includes('despertar-sealed-chip'), 'JS sem chips');
staticAssert(!uiSrc.includes('sealed-chip__name'), 'sem span de nome');
staticAssert(!/tabindex\s*=\s*['"]-1['"]/.test(
  uiSrc.slice(uiSrc.indexOf('#renderSealed'), uiSrc.indexOf('#mountSealedTip') + 80),
), 'ícones Selados sem tabindex=-1');

staticAssert(pkg.includes('despertar-selados-smoke.mjs'), 'smoke no package.json check');

if (errors.length) {
  console.error('despertar-selados-smoke (estático):');
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

await run('F3: owned aparece em ordem de catálogo (não ordem de compra)', () => {
  const first = UPGRADES[0];
  const mid = UPGRADES[Math.min(3, UPGRADES.length - 1)];
  assert.ok(first?.id);
  assert.ok(mid?.id);
  assert.notEqual(first.id, mid.id);

  const state = new GameState({
    souls: '0',
    generators: {},
    upgrades: [mid.id, first.id],
  });
  const owned = new Set(state.upgrades);
  const sealedDefs = UPGRADES.filter((def) => owned.has(def.id));
  assert.deepEqual(
    sealedDefs.map((d) => d.id),
    [first.id, mid.id],
    'catálogo ∩ owned preserva índice UPGRADES',
  );
});

console.log(`despertar-selados-smoke: ok (estático) + ${passed} runtime, ${failed} failed`);
if (failed) process.exitCode = 1;
else {
  console.log(`despertar-selados-smoke: ok (${[
    'grade icons',
    'gap≤4px',
    'sealed-tooltip',
    'aria-label',
    'aria-describedby',
    'Esc',
    'catalog order',
  ].join(', ')})`);
}
