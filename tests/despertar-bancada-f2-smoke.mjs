/**
 * Smoke Task F2 — Bancada +4 · mercy Juízo · eco do veredito.
 * Uso: node tests/despertar-bancada-f2-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VERDICT_SHOP,
  VERDICT_SHOP_IDS,
  VERDICT_SHOP_TOTAL_COST,
  isKnownVerdictPurchase,
} from '../js/hades-despertar/config/verdict-shop.js';
import { clickPower, calculateTotalSPS, economyEffects } from '../js/hades-despertar/core/formulas.js';
import { cmp, mul } from '../js/hades-despertar/core/decimal.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const F2_IDS = [
  'sentenca_afiada',
  'eco_do_veredito',
  'catalogo_vivo',
  'peso_das_faixas',
];

staticAssert(VERDICT_SHOP.length === 8, '8 itens na Bancada após F2');
staticAssert(VERDICT_SHOP_TOTAL_COST === 63, 'Bancada total 63 V');
for (const id of F2_IDS) {
  staticAssert(isKnownVerdictPurchase(id), `item F2: ${id}`);
  staticAssert(VERDICT_SHOP_IDS.includes(id), `IDS inclui ${id}`);
}

const shop = Object.fromEntries(VERDICT_SHOP.map((i) => [i.id, i]));
staticAssert(shop.sentenca_afiada?.cost === 6, 'sentença custa 6');
staticAssert(shop.catalogo_vivo?.cost === 10, 'catálogo custa 10');
staticAssert(shop.peso_das_faixas?.cost === 14, 'peso custa 14');

const modalSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/JuizoModal.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(
  shop.eco_do_veredito?.blurb?.includes('permanente'),
  'eco blurb permanente',
);

if (errors.length) {
  console.error('despertar-bancada-f2-smoke (estático):');
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
    console.log(`[FAIL] ${name}`);
    console.error(error);
    failed += 1;
  }
}

function makePool() {
  return [
    { id: 'g-a', title: 'A', rating: '12', blurb: '', cover: 'a.webp', descriptors: [] },
    { id: 'g-b', title: 'B', rating: '18', blurb: '', cover: 'b.webp', descriptors: [] },
    { id: 'g-c', title: 'C', rating: '12', blurb: '', cover: 'c.webp', descriptors: [] },
    { id: 'g-d', title: 'D', rating: '10', blurb: '', cover: 'd.webp', descriptors: [] },
    { id: 'g-e', title: 'E', rating: '16', blurb: '', cover: 'e.webp', descriptors: [] },
  ];
}

run('sentenca_afiada ×1.08 click (stack com selo)', () => {
  const base = clickPower({});
  const one = clickPower({ verdictPurchases: ['sentenca_afiada'] });
  assert.equal(cmp(one, mul(base, '1.08')), 0);
  const both = clickPower({ verdictPurchases: ['selo_do_juiz', 'sentenca_afiada'] });
  assert.equal(cmp(both, mul(mul(base, '1.05'), '1.08')), 0);
});

console.log(`\ndespertar-bancada-f2-smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
