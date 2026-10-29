#!/usr/bin/env node
/**
 * Lotes U01… dos upgrades cujo WebP ainda é o vetor interino.
 * Ordena pelo custo (o que a loja mostra primeiro) e fatia de 20 em 20.
 *
 * Uso: node scripts/despertar-art-lotes.mjs
 * Reescreve a seção de lotes em docs/ARTE-PENDENTE.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { cmp } from '../js/hades-despertar/core/decimal.js';
import { classifySprite } from './despertar-status.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'ARTE-PENDENTE.md');
const LOT = 20;
const MARKER = '<!-- lotes-vetoriais -->';

export async function renderVetorialLots() {
  const rows = [];
  for (const upgrade of UPGRADES) {
    const id = upgrade.icon || upgrade.id;
    const art = await classifySprite('upgrades', id);
    if (art.status !== 'vetorial') continue;
    rows.push({
      id,
      name: String(upgrade.name || id).replace(/\|/g, '/'),
      text: String(upgrade.blurb || '').replace(/\s+/g, ' ').replace(/\|/g, '/').trim(),
      cost: String(upgrade.cost || '0'),
    });
  }
  rows.sort((a, b) => {
    const byCost = cmp(a.cost, b.cost);
    return byCost !== 0 ? byCost : a.id.localeCompare(b.id);
  });

  const lots = [];
  for (let i = 0; i < rows.length; i += LOT) {
    const chunk = rows.slice(i, i + LOT);
    const n = String(lots.length + 1).padStart(2, '0');
    lots.push({ id: `U${n}`, chunk });
  }

  const L = [];
  L.push(MARKER);
  L.push('');
  L.push('## Upgrades ainda vetoriais');
  L.push('');
  L.push(`> **Gerado por \`node scripts/despertar-art-lotes.mjs\`. Não editar à mão.**`);
  L.push(`> ${rows.length} ícones em \`assets/despertar/sprites/upgrades/\` cujo WebP ainda coincide com o SVG. Um chat por lote. Não pintar fora da lista.`);
  L.push('> PNG em `.art-raw/upgrades/<id>.png`, depois `npm run despertar:art -- --folder upgrades --in-dir .art-raw/upgrades`. O SVG não se edita.');
  L.push('');
  for (const lot of lots) {
    const first = lot.chunk[0];
    const last = lot.chunk[lot.chunk.length - 1];
    L.push(`## ${lot.id} — upgrades (${lot.chunk.length})`);
    L.push('');
    L.push(`Custo de \`${first.cost}\` (\`${first.id}\`) até \`${last.cost}\` (\`${last.id}\`).`);
    L.push('');
    L.push('| id | Nome no jogo | O que é |');
    L.push('| --- | --- | --- |');
    for (const row of lot.chunk) {
      L.push(`| \`${row.id}\` | ${row.name} | ${row.text || '—'} |`);
    }
    L.push('');
  }
  return { markdown: `${L.join('\n')}\n`, count: rows.length, lots: lots.length };
}

function writeSection(markdown) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const cut = current.indexOf(MARKER);
  const head = (cut === -1 ? current : current.slice(0, cut)).replace(/\s*$/, '');
  const base = head || [
    '# Arte pendente do Despertar',
    '',
    '> A lista de placeholders continua em `npm run despertar:art-briefs`. Os lotes U abaixo são os upgrades vetoriais.',
    '',
    '**0 ícones pendentes.**',
  ].join('\n');
  fs.writeFileSync(OUT, `${base}\n\n${markdown}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { markdown, count, lots } = await renderVetorialLots();
  writeSection(markdown);
  console.log(`${count} vetoriais em ${lots} lotes → ${path.relative(ROOT, OUT)}`);
}
