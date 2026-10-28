#!/usr/bin/env node
/**
 * Lista de arte pendente por lote (ordem de visibilidade), com nome e descrição de cada
 * placeholder tirados do catálogo do jogo. Lê docs/status-despertar.json (rode
 * `npm run despertar:status` antes) e escreve docs/ARTE-PENDENTE.md.
 *
 * Uso: npm run despertar:art-briefs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { TALENTS } from '../js/hades-despertar/config/talents.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATUS = path.join(ROOT, 'docs', 'status-despertar.json');
const OUT = path.join(ROOT, 'docs', 'ARTE-PENDENTE.md');
const CONFIG_MODULES = ['minigames', 'dragon', 'seasons', 'catabase', 'shimmers', 'achievements', 'fortunes'];

/** Ordem de visibilidade na tela; talentos por último (são muitos — dividir em vários chats). */
export const ART_BATCHES = [
  { id: 'L1', folder: 'shimmers', title: 'Ecos do Acheron', why: 'Aparecem na tela toda a cada poucos minutos — o "Golden Cookie" do jogo.' },
  { id: 'L2', folder: 'minigames', title: 'Néctar e minigames', why: 'Néctar no HUD; sementes, espíritos, feitiços e bens nas abas de minigame.' },
  { id: 'L3', folder: 'seasons', title: 'Dragão, auras e estações', why: 'Painel do Dragão e seletor de estações.' },
  { id: 'L4', folder: 'veil', title: 'Véus', why: 'Sabores do Véu sob a Foice.' },
  { id: 'L5', folder: 'catabase', title: 'Catábase', why: 'Estágios, Trégua e Aliança no Arquivo Estígio.' },
  { id: 'L6', folder: 'upgrades', title: 'Fortunas (juramentos)', why: 'Grade de juramentos da loja — os únicos upgrades ainda placeholder.' },
  { id: 'L7', folder: 'talents', title: 'Talentos do Rio do Lethe', why: 'Árvore do Rio do Lethe (nomes e textos próprios já definidos). Dividir em chats de ~20 ícones.' },
];

async function catalogEntries() {
  const bySprite = new Map();
  const add = (key, entry) => {
    if (key && !bySprite.has(key)) bySprite.set(key, entry);
  };
  for (const name of CONFIG_MODULES) {
    const mod = await import(`../js/hades-despertar/config/${name}.js`);
    const walk = (value, depth = 0) => {
      if (!value || typeof value !== 'object' || depth > 4) return;
      if (Array.isArray(value)) {
        value.forEach((v) => walk(v, depth + 1));
        return;
      }
      if (typeof value.id === 'string' && typeof value.name === 'string') {
        add(value.spriteId, value);
        add(value.id, value);
      }
      for (const v of Object.values(value)) walk(v, depth + 1);
    };
    for (const v of Object.values(mod)) walk(v);
  }
  for (const u of UPGRADES) add(u.icon || u.id, u);
  return bySprite;
}

function describe(folder, id, bySprite, talentByIcon) {
  const entry = folder === 'talents' ? talentByIcon.get(id) : bySprite.get(id);
  const name = entry?.name || id.replace(/_/g, ' ');
  const text = entry?.blurb || entry?.desc || entry?.tickerText || '';
  return { name, text: String(text).replace(/\s+/g, ' ').trim() };
}

async function main() {
  if (!fs.existsSync(STATUS)) {
    console.error('Rode `npm run despertar:status` antes (docs/status-despertar.json ausente).');
    process.exit(1);
  }
  const status = JSON.parse(fs.readFileSync(STATUS, 'utf8'));
  const bySprite = await catalogEntries();
  const talentByIcon = new Map(TALENTS.map((t) => [t.icon || t.id, t]));

  const L = [];
  L.push('# Arte pendente do Despertar');
  L.push('');
  L.push(`> **Gerado por \`npm run despertar:art-briefs\` a partir do status de ${status.generatedAt}. Não editar à mão.**`);
  L.push('> Cada linha é um placeholder no disco. Arquivo final: `assets/despertar/sprites/<pasta>/<id>.webp` (128×128, RGBA).');
  L.push('> Processar com `npm run despertar:art -- --folder <pasta> --in-dir <pasta-bruta>`; conferir com `npm run despertar:status`.');
  L.push('');
  let total = 0;
  for (const batch of ART_BATCHES) {
    const ids = status.art[batch.folder]?.placeholders || [];
    if (!ids.length) continue;
    total += ids.length;
    L.push(`## ${batch.id} — ${batch.title} (\`${batch.folder}\`, ${ids.length})`);
    L.push('');
    L.push(batch.why);
    L.push('');
    L.push('| id | Nome no jogo | O que é |');
    L.push('| --- | --- | --- |');
    for (const id of ids) {
      const { name, text } = describe(batch.folder, id, bySprite, talentByIcon);
      L.push(`| \`${id}\` | ${name.replace(/\|/g, '/')} | ${text.replace(/\|/g, '/') || '—'} |`);
    }
    L.push('');
  }
  L.splice(6, 0, `**${total} ícones pendentes.**`, '');
  fs.writeFileSync(OUT, `${L.join('\n')}\n`);
  console.log(`${total} pendentes → ${path.relative(ROOT, OUT)}`);
}

await main();
