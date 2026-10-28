#!/usr/bin/env node
/**
 * Status real do Despertar, medido no disco (não nos checkboxes dos docs).
 *
 * Arte: compara cada WebP com o SVG procedural da mesma pasta. WebP que é só o SVG
 * rasterizado = arte gerada por script; WebP diferente = pintado (Gemini → WebP).
 *   ilustrada   — pintado, ou sem SVG procedural (pipeline só gera SVG para placeholder)
 *   vetorial    — upgrade com SVG estilizado final (gen-upgrade-final-art), aceitável interino
 *   placeholder — resto derivado do SVG (nome escrito, letra, losango genérico)
 *   faltando    — sem WebP
 * Conteúdo: talentos com texto genérico ou sem efeito; conquistas reaproveitando arte.
 *
 * Uso:
 *   npm run despertar:status                  # escreve docs/STATUS-DESPERTAR.md + .json
 *   npm run despertar:status -- --tests       # inclui o resultado de test:despertar
 *   npm run despertar:status -- --sync-requests  # reescreve status de art-requests.json
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { TALENTS } from '../js/hades-despertar/config/talents.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { DESPERTAR_ACHIEVEMENT_IDS } from '../js/hades-despertar/config/achievements.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = path.join(ROOT, 'assets', 'despertar', 'sprites');
const ART_REQUESTS = path.join(ROOT, 'assets', 'despertar', 'art-requests.json');
const OUT_MD = path.join(ROOT, 'docs', 'STATUS-DESPERTAR.md');
const OUT_JSON = path.join(ROOT, 'docs', 'status-despertar.json');

/**
 * Diferença média por canal (0–255) a 32×32, compondo sobre cinza 128 e somando o alfa
 * (arte quase preta sumia sobre fundo preto). Calibrado: derivado ≤ 2, pintado ≥ 15.
 */
export const PAINTED_DIFF_THRESHOLD = 5;
export const ART_FOLDERS = [
  'foice', 'generators', 'habitats', 'hud', 'shimmers', 'upgrades',
  'talents', 'minigames', 'veil', 'catabase', 'seasons',
];
const GENERIC_TALENT_BLURB = /Eco celestial espelhado/i;
/** Chaves de efeito que nenhum sistema do jogo lê (cosmético sem tela, telas inexistentes). */
const DEAD_TALENT_EFFECT_KEYS = new Set(['cosmeticId', 'goldenSwitchUnlock', 'buyAllUnlock', 'vaultUnlock', 'labelPrinter']);

async function thumb(input, isSvg) {
  const img = isSvg ? sharp(fs.readFileSync(input), { density: 72 }) : sharp(input);
  return img
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

/** RGBA 32×32: cor composta sobre cinza 128 + diferença de alfa, média por canal. */
function rgbaDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    const aa = a[i + 3] / 255;
    const ba = b[i + 3] / 255;
    for (let k = 0; k < 3; k += 1) {
      sum += Math.abs((a[i + k] * aa + 128 * (1 - aa)) - (b[i + k] * ba + 128 * (1 - ba)));
    }
    sum += Math.abs(a[i + 3] - b[i + 3]);
  }
  return sum / a.length;
}

/** Classifica um sprite `pasta/id`. */
export async function classifySprite(folder, id) {
  const webp = path.join(SPRITES, folder, `${id}.webp`);
  const svg = path.join(SPRITES, folder, `${id}.svg`);
  if (!fs.existsSync(webp)) return { status: 'faltando' };
  if (!fs.existsSync(svg)) return { status: 'ilustrada' };
  const [a, b] = await Promise.all([thumb(webp), thumb(svg, true)]);
  const diff = rgbaDiff(a, b);
  if (diff >= PAINTED_DIFF_THRESHOLD) return { status: 'ilustrada', diff };
  const hasText = fs.readFileSync(svg, 'utf8').includes('<text');
  if (folder === 'upgrades' && !hasText) return { status: 'vetorial', diff };
  return { status: 'placeholder', diff };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

/** Pastas com catálogo: só contam os ícones que o jogo usa (o resto é arquivo órfão de legado). */
const IN_USE = {
  upgrades: new Set(UPGRADES.map((u) => u.icon || u.id)),
  talents: new Set(TALENTS.map((t) => t.icon || t.id)),
};

export async function auditArt() {
  const byKey = {};
  const folders = {};
  for (const folder of ART_FOLDERS) {
    const dir = path.join(SPRITES, folder);
    if (!fs.existsSync(dir)) continue;
    const onDisk = fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)).sort();
    const inUse = IN_USE[folder];
    const ids = inUse ? onDisk.filter((id) => inUse.has(id)) : onDisk;
    const results = await mapLimit(ids, 8, (id) => classifySprite(folder, id));
    const counts = { ilustrada: 0, vetorial: 0, placeholder: 0, faltando: 0 };
    ids.forEach((id, i) => {
      counts[results[i].status] += 1;
      byKey[`${folder}/${id}`] = results[i].status;
    });
    folders[folder] = {
      total: ids.length,
      ...counts,
      orphanFiles: onDisk.length - ids.length,
      placeholders: ids.filter((_, i) => results[i].status === 'placeholder'),
    };
  }
  return { folders, byKey };
}

function expandGlob(pattern) {
  const clean = pattern.trim();
  const slash = clean.lastIndexOf('/');
  const folder = clean.slice(0, slash);
  const file = clean.slice(slash + 1);
  const dir = path.join(SPRITES, folder);
  if (slash < 0 || !ART_FOLDERS.includes(folder) || !fs.existsSync(dir)) return [];
  const brace = /^\{(.+)\}\.webp$/.exec(file);
  if (brace) return brace[1].split(',').map((id) => `${folder}/${id.trim()}`);
  const re = new RegExp(`^${file.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);
  return fs.readdirSync(dir).filter((f) => re.test(f)).map((f) => `${folder}/${f.replace(/\.webp$/, '')}`);
}

const ID_LIST_FOLDER = {
  f1UpgradeIds: 'upgrades',
  f3SynergyIds: 'upgrades',
  upgradeIds: 'upgrades',
  minigameSpriteIds: 'minigames',
  veilSpriteIds: 'veil',
  catabaseSpriteIds: 'catabase',
  generatorIds: 'generators',
};

/** Sprites (`pasta/id`) de um pedido; vazio = fora do diretório de sprites (não auditável). */
export function requestSpriteKeys(req) {
  const keys = new Set();
  for (const [field, folder] of Object.entries(ID_LIST_FOLDER)) {
    for (const id of req[field] || []) keys.add(`${folder}/${id}`);
  }
  if (keys.size === 0) {
    for (const file of req.files || []) {
      if (file.endsWith('.webp')) keys.add(file.replace(/\.webp$/, ''));
    }
  }
  if (keys.size === 0 && req.filesGlob) {
    for (const part of String(req.filesGlob).split(/,\s*(?![^{]*\})/)) {
      for (const key of expandGlob(part)) keys.add(key);
    }
  }
  return [...keys].filter((key) => ART_FOLDERS.includes(key.split('/')[0]));
}

/** delivered = tudo ilustrado; interim = sem placeholder mas com vetorial; open = falta arte. */
export function requestStatus(keys, byKey) {
  const counts = { ilustrada: 0, vetorial: 0, placeholder: 0, faltando: 0 };
  for (const key of keys) counts[byKey[key] || 'faltando'] += 1;
  let status = 'delivered';
  if (counts.placeholder > 0 || counts.faltando > 0) status = 'open';
  else if (counts.vetorial > 0) status = 'interim';
  return { status, counts };
}

function auditContent() {
  const generic = TALENTS.filter((t) => GENERIC_TALENT_BLURB.test(t.blurb || ''));
  const noEffect = TALENTS.filter((t) => t.id !== 'legado'
    && Object.keys(t.effects || {}).every((key) => DEAD_TALENT_EFFECT_KEYS.has(key)));
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'game-catalog.json'), 'utf8'));
  const arts = DESPERTAR_ACHIEVEMENT_IDS
    .map((id) => catalog.achievements.find((a) => a.id === id)?.art)
    .filter(Boolean);
  return {
    talents: TALENTS.length,
    talentsGenericCopy: generic.map((t) => t.id),
    talentsNoEffect: noEffect.map((t) => t.id),
    achievements: DESPERTAR_ACHIEVEMENT_IDS.length,
    achievementUniqueArt: new Set(arts).size,
  };
}

function runTests() {
  const res = spawnSync(process.execPath, ['scripts/run-despertar-tests.mjs'], { cwd: ROOT, encoding: 'utf8' });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  const summary = /(\d+)\/(\d+) passaram/.exec(out);
  return {
    passed: summary ? Number(summary[1]) : 0,
    total: summary ? Number(summary[2]) : 0,
    failing: [...out.matchAll(/^FAIL {2}(\S+)/gm)].map((m) => m[1]),
  };
}

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '—');

function renderMarkdown({ generatedAt, art, requests, content, tests }) {
  const L = [];
  L.push('# Status do Despertar');
  L.push('');
  L.push(`> **Gerado por \`npm run despertar:status\` em ${generatedAt}. Não editar à mão.**`);
  L.push('> Fonte de verdade de "o que está pronto": este arquivo e `npm run test:despertar`.');
  L.push('> Os percentuais de `paridade-cookieclicker-despertar.md` são de design, não de entrega.');
  L.push('');
  if (tests) {
    L.push('## Testes');
    L.push('');
    L.push(`**${tests.passed}/${tests.total}** smokes passando${tests.failing.length ? ` — falhando: ${tests.failing.map((f) => `\`${f}\``).join(', ')}` : '.'}`);
    L.push('');
  }
  const totals = Object.values(art.folders).reduce((acc, f) => {
    for (const k of ['total', 'ilustrada', 'vetorial', 'placeholder', 'faltando']) acc[k] += f[k];
    return acc;
  }, { total: 0, ilustrada: 0, vetorial: 0, placeholder: 0, faltando: 0 });
  L.push('## Arte por pasta');
  L.push('');
  L.push(`Ilustrada: **${totals.ilustrada}/${totals.total} (${pct(totals.ilustrada, totals.total)})** · vetorial interina: ${totals.vetorial} · placeholder: **${totals.placeholder}** · faltando: ${totals.faltando}`);
  L.push('');
  L.push('| Pasta | Total | Ilustrada | Vetorial | Placeholder | Faltando |');
  L.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const [folder, f] of Object.entries(art.folders)) {
    L.push(`| \`${folder}\` | ${f.total} | ${f.ilustrada} | ${f.vetorial} | ${f.placeholder} | ${f.faltando} |`);
  }
  L.push('');
  const orphans = Object.entries(art.folders).filter(([, f]) => f.orphanFiles > 0);
  if (orphans.length) {
    L.push(`Fora da conta (ícones que nenhum item usa): ${orphans.map(([folder, f]) => `\`${folder}\` ${f.orphanFiles}`).join(' · ')}.`);
    L.push('');
  }
  L.push('Lista de pedidos por lote, com nome e descrição: [`ARTE-PENDENTE.md`](./ARTE-PENDENTE.md) (`npm run despertar:art-briefs`).');
  L.push('');
  L.push('Placeholders por pasta (IDs para gerar arte):');
  L.push('');
  for (const [folder, f] of Object.entries(art.folders)) {
    if (!f.placeholders.length) continue;
    L.push(`<details><summary><code>${folder}</code> — ${f.placeholders.length}</summary>`);
    L.push('');
    L.push(f.placeholders.map((id) => `\`${id}\``).join(' · '));
    L.push('');
    L.push('</details>');
    L.push('');
  }
  L.push('## Pedidos de arte (`art-requests.json`)');
  L.push('');
  L.push('`delivered` = tudo ilustrado · `interim` = só vetorial · `open` = há placeholder/faltando · `não auditável` = fora de `sprites/`.');
  L.push('');
  L.push('| Pedido | Status medido | Ilustrada | Vetorial | Placeholder | Faltando |');
  L.push('| --- | --- | ---: | ---: | ---: | ---: |');
  for (const r of requests) {
    const c = r.counts;
    L.push(r.auditable
      ? `| \`${r.id}\` | ${r.status} | ${c.ilustrada} | ${c.vetorial} | ${c.placeholder} | ${c.faltando} |`
      : `| \`${r.id}\` | não auditável | — | — | — | — |`);
  }
  L.push('');
  L.push('## Conteúdo');
  L.push('');
  L.push(`- Talentos com texto genérico ("Eco celestial espelhado"): **${content.talentsGenericCopy.length}/${content.talents}**`);
  L.push(`- Talentos sem efeito (fora \`legado\`): **${content.talentsNoEffect.length}** — ${content.talentsNoEffect.map((id) => `\`${id}\``).join(', ') || 'nenhum'}`);
  L.push(`- Conquistas \`despertar_*\`: ${content.achievements} usando **${content.achievementUniqueArt}** artes únicas`);
  L.push('');
  return `${L.join('\n')}\n`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const art = await auditArt();
  const doc = JSON.parse(fs.readFileSync(ART_REQUESTS, 'utf8'));
  const requests = doc.requests.map((req) => {
    const keys = requestSpriteKeys(req);
    if (!keys.length) return { id: req.id, auditable: false, status: req.status, counts: null };
    return { id: req.id, auditable: true, ...requestStatus(keys, art.byKey) };
  });
  const content = auditContent();
  const tests = args.has('--tests') ? runTests() : null;
  const generatedAt = new Date().toISOString().slice(0, 10);

  fs.writeFileSync(OUT_MD, renderMarkdown({ generatedAt, art, requests, content, tests }));
  fs.writeFileSync(OUT_JSON, `${JSON.stringify({ generatedAt, art: art.folders, requests, content, tests }, null, 2)}\n`);

  if (args.has('--sync-requests')) {
    const byId = Object.fromEntries(requests.map((r) => [r.id, r]));
    for (const req of doc.requests) {
      const measured = byId[req.id];
      if (!measured?.auditable) continue;
      req.status = measured.status;
      req.detected = measured.counts;
    }
    doc.statusSource = 'scripts/despertar-status.mjs --sync-requests (status medido; não editar à mão)';
    fs.writeFileSync(ART_REQUESTS, `${JSON.stringify(doc, null, 2)}\n`);
  }

  for (const [folder, f] of Object.entries(art.folders)) {
    console.log(`${folder.padEnd(11)} ${String(f.ilustrada).padStart(4)}/${String(f.total).padEnd(4)} ilustrada · vetorial ${f.vetorial} · placeholder ${f.placeholder}`);
  }
  console.log(`\n→ ${path.relative(ROOT, OUT_MD)}${args.has('--sync-requests') ? ' · art-requests.json sincronizado' : ''}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
