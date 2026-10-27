#!/usr/bin/env node
/**
 * Regenera a cadeia Mil Foices (12 elos = Thousand→Undecillion fingers) em
 * upgrades.js + DespertarCatalog.php. Fórmula thousandBladesBonusPerUnit inalterada.
 * Uso: node scripts/gen-mil-foices-catalog.mjs
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS_PATH = path.join(root, 'js/hades-despertar/config/upgrades.js');
const PHP_PATH = path.join(root, 'backend/src/Services/Despertar/DespertarCatalog.php');

/** Cadeia canónica wiki Cursor (gates = qty de wandering_shade). */
const LADDER = [
  {
    id: 'mil_foices',
    name: 'Mil Foices',
    blurb: 'Lâminas espectrais brotam de cada estrutura erguida além das Sombras.',
    cost: '100000',
    kind: 'thousandBlades',
    factor: '0.1',
    quantity: 25,
    prev: null,
  },
  {
    id: 'milhao_de_foices',
    name: 'Milhão de Foices',
    blurb: 'O coro metálico das margens multiplica o alcance de cada corte fantasma.',
    cost: '10000000',
    kind: 'thousandBladesMult',
    factor: '5',
    quantity: 50,
    prev: 'mil_foices',
  },
  {
    id: 'bilhao_de_foices',
    name: 'Bilhão de Foices',
    blurb: 'Uma tempestade de gumes invisíveis ceifa em uníssono com o império.',
    cost: '100000000',
    kind: 'thousandBladesMult',
    factor: '10',
    quantity: 100,
    prev: 'milhao_de_foices',
  },
  {
    id: 'trilhao_de_foices',
    name: 'Trilhão de Foices',
    blurb: 'O horizonte do Submundo inteiriço reluz como uma única lâmina viva.',
    cost: '1000000000',
    kind: 'thousandBladesMult',
    factor: '20',
    quantity: 150,
    prev: 'bilhao_de_foices',
  },
  {
    id: 'quadrilhao_de_foices',
    name: 'Quadrilhão de Foices',
    blurb: 'Quatro rios de ferro fantasma cortam o mapa do Império Ctoniano.',
    cost: '10000000000',
    kind: 'thousandBladesMult',
    factor: '20',
    quantity: 200,
    prev: 'trilhao_de_foices',
  },
  {
    id: 'quintilhao_de_foices',
    name: 'Quintilhão de Foices',
    blurb: 'Cinco coroas de gumes orbitam cada torre além das Sombras.',
    cost: '10000000000000',
    kind: 'thousandBladesMult',
    factor: '20',
    quantity: 250,
    prev: 'quadrilhao_de_foices',
  },
  {
    id: 'sextilhao_de_foices',
    name: 'Sextilhão de Foices',
    blurb: 'Seis legiões de lâminas respondem a um único gesto no cais.',
    cost: '10000000000000000',
    kind: 'thousandBladesMult',
    factor: '20',
    quantity: 300,
    prev: 'quintilhao_de_foices',
  },
  {
    id: 'septilhao_de_foices',
    name: 'Septilhão de Foices',
    blurb: 'Sete abismos ecoam o mesmo corte — nenhum espírito escapa ao eco.',
    cost: '10000000000000000000',
    kind: 'thousandBladesMult',
    factor: '20',
    quantity: 350,
    prev: 'sextilhao_de_foices',
  },
  {
    id: 'octilhao_de_foices',
    name: 'Octilhão de Foices',
    blurb: 'Oito horizontes de aço ctoniano dobram o céu noturno do Estige.',
    cost: '10000000000000000000000',
    kind: 'thousandBladesMult',
    factor: '20',
    quantity: 400,
    prev: 'septilhao_de_foices',
  },
  {
    id: 'nonilhao_de_foices',
    name: 'Nonilhão de Foices',
    blurb: 'Nove juramentos de fio fino prendem o domínio inteiro à foice.',
    cost: '10000000000000000000000000',
    kind: 'thousandBladesMult',
    factor: '20',
    quantity: 450,
    prev: 'octilhao_de_foices',
  },
  {
    id: 'decilhao_de_foices',
    name: 'Decilhão de Foices',
    blurb: 'Dez milênios de colheita condensados num único arco de lâmina.',
    cost: '10000000000000000000000000000',
    kind: 'thousandBladesMult',
    factor: '20',
    quantity: 500,
    prev: 'nonilhao_de_foices',
  },
  {
    id: 'undecilhao_de_foices',
    name: 'Undecilhão de Foices',
    blurb: 'Onze dimensões de corte — o que toca vira sombra nas tuas mãos.',
    cost: '10000000000000000000000000000000',
    kind: 'thousandBladesMult',
    factor: '20',
    quantity: 550,
    prev: 'decilhao_de_foices',
  },
];

function escapeJs(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatJsBlock() {
  const lines = ['  // --- Cadeia Mil Foices (Paridade Thousand Fingers · 12 elos wiki) ---'];
  for (const d of LADDER) {
    lines.push('  {');
    lines.push(`    id: '${d.id}',`);
    lines.push(`    name: '${escapeJs(d.name)}',`);
    lines.push(`    blurb: '${escapeJs(d.blurb)}',`);
    lines.push(`    cost: '${d.cost}',`);
    lines.push(`    kind: '${d.kind}',`);
    lines.push(`    factor: '${d.factor}',`);
    if (d.prev) {
      lines.push(
        `    requires: { upgradeId: '${d.prev}', generatorId: 'wandering_shade', quantity: ${d.quantity} },`,
      );
    } else {
      lines.push(`    requires: { generatorId: 'wandering_shade', quantity: ${d.quantity} },`);
    }
    lines.push('  },');
  }
  return lines.join('\n');
}

function formatPhpEntries() {
  const chunks = [];
  for (const d of LADDER) {
    const req = d.prev
      ? `['upgradeId' => '${d.prev}', 'generatorId' => 'wandering_shade', 'quantity' => ${d.quantity}]`
      : `['generatorId' => 'wandering_shade', 'quantity' => ${d.quantity}]`;
    chunks.push(
      `        ['id' => '${d.id}', 'cost' => '${d.cost}', 'kind' => '${d.kind}', 'factor' => '${d.factor}', 'requires' => ${req}]`,
    );
  }
  return chunks.join(',\n');
}

async function patchJs() {
  let src = await fs.readFile(JS_PATH, 'utf8');
  const start = src.indexOf('  // --- Cadeia Mil Foices');
  const end = src.indexOf('  // --- T1 Sombra Vagante');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Marcadores Mil Foices/T1 não encontrados em upgrades.js (${start}, ${end})`);
  }
  src = `${src.slice(0, start)}${formatJsBlock()}\n\n${src.slice(end)}`;
  await fs.writeFile(JS_PATH, src);
}

async function patchPhp() {
  let src = await fs.readFile(PHP_PATH, 'utf8');
  const start = src.indexOf("['id' => 'mil_foices'");
  const endMark = src.indexOf("['id' => 'umbras_despertas'");
  if (start < 0 || endMark < 0 || endMark <= start) {
    throw new Error(`Bloco mil_foices…umbras não encontrado (${start}, ${endMark})`);
  }
  // Inclui o comentário imediatamente acima, se houver.
  let blockStart = start;
  const comment = src.lastIndexOf('// --- Cadeia Mil Foices', start);
  if (comment >= 0 && start - comment < 120) {
    blockStart = src.lastIndexOf('\n', comment) + 1;
  }
  const block = `        // --- Cadeia Mil Foices (Paridade Thousand Fingers · 12 elos wiki) ---\n${formatPhpEntries()},\n\n        `;
  src = `${src.slice(0, blockStart)}${block}${src.slice(endMark)}`;
  await fs.writeFile(PHP_PATH, src);
}

if (LADDER.length !== 12) throw new Error(`esperava 12, got ${LADDER.length}`);
await patchJs();
await patchPhp();
console.log('wrote 12 elos Mil Foices (Thousand→Undecillion)');
console.log(
  'sample',
  LADDER[3].id,
  LADDER[3].quantity,
  LADDER[3].cost,
  LADDER[11].id,
  LADDER[11].quantity,
);
