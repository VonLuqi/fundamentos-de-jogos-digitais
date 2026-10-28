#!/usr/bin/env node
/**
 * Gera ícones finais 128² WebP (SVG Hades/Submundo) para todos os upgrades do catálogo.
 * Substitui placeholders de letra. Protege em illustrated.json.
 *
 * Uso:
 *   node scripts/gen-upgrade-final-art.mjs
 *   node scripts/gen-upgrade-final-art.mjs --ids foice_afilada,mil_foices
 *   node scripts/gen-upgrade-final-art.mjs --wave A|B|C|D|E|F
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'despertar', 'sprites', 'upgrades');
const ILLUSTRATED = path.join(ROOT, 'assets', 'despertar', 'sprites', 'illustrated.json');
const ART_REQ = path.join(ROOT, 'assets', 'despertar', 'art-requests.json');
const SIZE = 128;

const GEN_TIER = Object.fromEntries(GENERATORS.map((g) => [g.id, g.tier]));

const GEN_PALETTE = {
  wandering_shade: '#7dd3c0',
  charon_servants: '#5b8def',
  cerberian_hound: '#e07a3a',
  tartarus_judge: '#c4a06a',
  phlegethon_forge: '#d90429',
  obsidian_throne: '#9b7bff',
  mnemosyne_temple: '#c084fc',
  styx_tower: '#00a896',
  star_barge: '#60a5fa',
  tartarus_lab: '#34d399',
  erebus_portal: '#a855f7',
  chronos_loom: '#f59e0b',
  void_condenser: '#64748b',
  moirai_prism: '#f472b6',
  fate_forge: '#fb7185',
  fractal_engine: '#22d3ee',
  oracle_console: '#a3e635',
  chthonic_idleverse: '#818cf8',
  cortex_baker: '#fbbf24',
  the_emperor: '#cfa759',
};

const MATERIAL = [
  { stroke: '#8b7355', glow: '#a89070', fill: '#1a1510' }, // bronze
  { stroke: '#9aa3ad', glow: '#c8d0d8', fill: '#12161a' }, // ferro
  { stroke: '#cfa759', glow: '#e8d4a8', fill: '#1a1408' }, // ouro
  { stroke: '#7dd3c0', glow: '#b6fff0', fill: '#0a1614' }, // estígio
  { stroke: '#c084fc', glow: '#e9d5ff', fill: '#140a1a' }, // lethe
  { stroke: '#f87171', glow: '#fecaca', fill: '#1a0808' }, // adamante
];

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function materialForQty(qty) {
  if (qty >= 250) return MATERIAL[5];
  if (qty >= 175) return MATERIAL[4];
  if (qty >= 100) return MATERIAL[3];
  if (qty >= 50) return MATERIAL[2];
  if (qty >= 25) return MATERIAL[1];
  return MATERIAL[0];
}

function svgShell(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#1a1a26"/>
      <stop offset="100%" stop-color="#0a0a0f"/>
    </radialGradient>
  </defs>
  <rect width="128" height="128" fill="url(#g)"/>
  ${inner}
</svg>`;
}

function genMotif(genId, accent) {
  const motifs = {
    wandering_shade: `<ellipse cx="64" cy="72" rx="22" ry="28" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="3"/>
      <path d="M50 48 Q64 28 78 48" fill="none" stroke="${accent}" stroke-width="3"/>
      <circle cx="56" cy="56" r="3" fill="${accent}"/><circle cx="72" cy="56" r="3" fill="${accent}"/>`,
    charon_servants: `<path d="M28 78 Q64 58 100 78 L92 88 Q64 72 36 88 Z" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="3"/>
      <path d="M64 40 L64 70" stroke="${accent}" stroke-width="3"/><circle cx="64" cy="36" r="6" fill="${accent}"/>`,
    cerberian_hound: `<circle cx="44" cy="58" r="12" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2"/>
      <circle cx="64" cy="50" r="14" fill="${accent}" fill-opacity="0.4" stroke="${accent}" stroke-width="3"/>
      <circle cx="84" cy="58" r="12" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2"/>
      <path d="M40 78 Q64 96 88 78" fill="none" stroke="${accent}" stroke-width="3"/>`,
    tartarus_judge: `<rect x="44" y="36" width="40" height="52" rx="4" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="3"/>
      <path d="M40 48 H88 M52 48 V78 M76 48 V78" stroke="${accent}" stroke-width="2.5"/>
      <circle cx="64" cy="40" r="8" fill="${accent}"/>`,
    phlegethon_forge: `<path d="M36 88 H92 V72 L80 56 H48 L36 72 Z" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="3"/>
      <path d="M58 56 L70 32 L78 56" fill="${accent}" fill-opacity="0.7" stroke="${accent}" stroke-width="2"/>
      <rect x="54" y="70" width="20" height="10" fill="${accent}"/>`,
    obsidian_throne: `<path d="M40 92 L40 48 L52 36 H76 L88 48 V92 Z" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="3"/>
      <rect x="48" y="60" width="32" height="18" fill="${accent}" fill-opacity="0.45"/>
      <path d="M56 36 V28 M72 36 V28" stroke="${accent}" stroke-width="3"/>`,
    mnemosyne_temple: `<path d="M28 88 H100 M34 88 V56 L64 32 L94 56 V88" fill="none" stroke="${accent}" stroke-width="3"/>
      <rect x="48" y="60" width="12" height="28" fill="${accent}" fill-opacity="0.4"/>
      <rect x="68" y="60" width="12" height="28" fill="${accent}" fill-opacity="0.4"/>`,
    styx_tower: `<rect x="54" y="28" width="20" height="68" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="3"/>
      <path d="M44 40 H84 M48 56 H80 M50 72 H78" stroke="${accent}" stroke-width="2"/>
      <polygon points="64,18 78,30 50,30" fill="${accent}"/>`,
    star_barge: `<path d="M24 70 L64 48 L104 70 L96 82 L32 82 Z" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="3"/>
      <path d="M64 48 L64 28 M56 36 L72 36" stroke="${accent}" stroke-width="2.5"/>
      <circle cx="64" cy="24" r="5" fill="${accent}"/>`,
    tartarus_lab: `<rect x="36" y="40" width="56" height="48" rx="6" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="3"/>
      <circle cx="52" cy="64" r="10" fill="${accent}" fill-opacity="0.45"/>
      <circle cx="76" cy="64" r="10" fill="${accent}" fill-opacity="0.45"/>
      <path d="M48 40 V32 H80 V40" stroke="${accent}" stroke-width="2"/>`,
    erebus_portal: `<circle cx="64" cy="64" r="34" fill="none" stroke="${accent}" stroke-width="4"/>
      <circle cx="64" cy="64" r="22" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="2"/>
      <path d="M64 42 Q78 64 64 86 Q50 64 64 42" fill="${accent}" fill-opacity="0.55"/>`,
    chronos_loom: `<circle cx="64" cy="64" r="28" fill="none" stroke="${accent}" stroke-width="3"/>
      <path d="M64 36 V92 M36 64 H92 M44 44 L84 84 M84 44 L44 84" stroke="${accent}" stroke-width="2"/>
      <circle cx="64" cy="64" r="6" fill="${accent}"/>`,
    void_condenser: `<rect x="40" y="32" width="48" height="64" rx="8" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="3"/>
      <ellipse cx="64" cy="56" rx="14" ry="10" fill="${accent}" fill-opacity="0.5"/>
      <path d="M50 78 H78" stroke="${accent}" stroke-width="3"/>`,
    moirai_prism: `<polygon points="64,24 96,64 64,104 32,64" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="3"/>
      <polygon points="64,40 80,64 64,88 48,64" fill="${accent}" fill-opacity="0.55"/>`,
    fate_forge: `<path d="M40 88 H88 L80 48 H48 Z" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="3"/>
      <path d="M64 48 V28 M56 36 H72" stroke="${accent}" stroke-width="3"/>
      <circle cx="64" cy="70" r="8" fill="${accent}"/>`,
    fractal_engine: `<circle cx="64" cy="64" r="30" fill="none" stroke="${accent}" stroke-width="2"/>
      <circle cx="64" cy="64" r="18" fill="none" stroke="${accent}" stroke-width="2"/>
      <circle cx="64" cy="64" r="8" fill="${accent}"/>
      <path d="M64 34 L74 54 L64 48 L54 54 Z M64 94 L74 74 L64 80 L54 74 Z" fill="${accent}"/>`,
    oracle_console: `<rect x="34" y="36" width="60" height="52" rx="4" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="3"/>
      <rect x="42" y="44" width="44" height="24" fill="${accent}" fill-opacity="0.35"/>
      <circle cx="52" cy="80" r="4" fill="${accent}"/><circle cx="64" cy="80" r="4" fill="${accent}"/><circle cx="76" cy="80" r="4" fill="${accent}"/>`,
    chthonic_idleverse: `<circle cx="64" cy="64" r="32" fill="${accent}" fill-opacity="0.12" stroke="${accent}" stroke-width="2"/>
      <circle cx="48" cy="56" r="10" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2"/>
      <circle cx="78" cy="52" r="8" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2"/>
      <circle cx="70" cy="78" r="12" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2"/>`,
    cortex_baker: `<ellipse cx="64" cy="68" rx="30" ry="22" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="3"/>
      <path d="M40 60 Q64 40 88 60" fill="none" stroke="${accent}" stroke-width="3"/>
      <circle cx="52" cy="66" r="4" fill="${accent}"/><circle cx="76" cy="66" r="4" fill="${accent}"/>`,
    the_emperor: `<path d="M40 88 V52 L52 40 H76 L88 52 V88 Z" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="3"/>
      <path d="M48 40 L64 24 L80 40" fill="${accent}" fill-opacity="0.6" stroke="${accent}" stroke-width="2"/>
      <circle cx="64" cy="64" r="10" fill="${accent}"/>`,
  };
  return motifs[genId] || `<circle cx="64" cy="64" r="28" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="3"/>`;
}

function scytheMotif(accent, tierIndex) {
  const blades = Math.min(1 + Math.floor(tierIndex / 2), 5);
  let extra = '';
  for (let i = 1; i < blades; i += 1) {
    const ox = i * 6;
    extra += `<path d="M${48 + ox} 88 Q${58 + ox} 40 ${88 + ox} 32" fill="none" stroke="${accent}" stroke-opacity="${0.35 + i * 0.1}" stroke-width="3"/>`;
  }
  return `${extra}
    <path d="M40 92 L52 36" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
    <path d="M52 36 Q78 28 96 48 Q78 44 58 48 Z" fill="${accent}" fill-opacity="0.85" stroke="${accent}" stroke-width="2"/>
    <circle cx="50" cy="88" r="6" fill="${accent}" fill-opacity="0.5"/>`;
}

function buildSvg(def, waveHint) {
  const qty = Number(def.requires?.quantity) || 0;
  const mat = materialForQty(qty);
  const genId = def.generatorId || def.requires?.generatorId || null;
  const accent = (genId && GEN_PALETTE[genId]) || mat.glow;
  const h = hashId(def.id);
  const rim = mat.stroke;

  let motif = '';
  switch (def.kind) {
    case 'clickMult':
    case 'clickKSps':
      motif = scytheMotif('#00a896', UPGRADES.filter((u) => u.kind === 'clickMult' || u.kind === 'clickKSps').findIndex((u) => u.id === def.id));
      break;
    case 'thousandBlades':
    case 'thousandBladesMult':
      motif = scytheMotif('#cfa759', 4 + (def.kind === 'thousandBlades' ? 0 : Number(def.id.includes('bilhao')) + Number(def.id.includes('trilhao')) * 2));
      motif += `<text x="64" y="110" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="#e8d4a8" opacity="0.9">${def.id.startsWith('trilhao') ? '∞' : '×'}</text>`;
      break;
    case 'generatorMult':
      motif = genMotif(genId, accent);
      motif += `<circle cx="100" cy="28" r="10" fill="${mat.fill}" stroke="${rim}" stroke-width="2"/>
        <circle cx="100" cy="28" r="5" fill="${accent}"/>`;
      break;
    case 'synergyMult': {
      const a = def.baseGeneratorId || Object.keys(GEN_PALETTE)[h % 20];
      const b = def.boostedGeneratorId || Object.keys(GEN_PALETTE)[(h >> 3) % 20];
      const ca = GEN_PALETTE[a] || '#cfa759';
      const cb = GEN_PALETTE[b] || '#00a896';
      motif = `<circle cx="48" cy="64" r="22" fill="${ca}" fill-opacity="0.35" stroke="${ca}" stroke-width="3"/>
        <circle cx="80" cy="64" r="22" fill="${cb}" fill-opacity="0.35" stroke="${cb}" stroke-width="3"/>
        <path d="M56 56 L72 72 M72 56 L56 72" stroke="#e8d4a8" stroke-width="3"/>
        <g transform="translate(28,44) scale(0.35)">${genMotif(a, ca)}</g>
        <g transform="translate(60,44) scale(0.35)">${genMotif(b, cb)}</g>`;
      break;
    }
    case 'veilMult':
      motif = `<path d="M32 88 Q48 40 64 52 Q80 40 96 88 Z" fill="#e8d4a8" fill-opacity="0.25" stroke="#e8d4a8" stroke-width="3"/>
        <circle cx="50" cy="70" r="8" fill="#cfa759" fill-opacity="0.5" stroke="#cfa759" stroke-width="2"/>
        <circle cx="78" cy="70" r="8" fill="#cfa759" fill-opacity="0.5" stroke="#cfa759" stroke-width="2"/>
        <circle cx="64" cy="82" r="7" fill="#d90429" fill-opacity="0.55" stroke="#d90429" stroke-width="2"/>`;
      break;
    case 'catabaseResearch':
    case 'leechCap':
    case 'leechPayout':
      motif = `<path d="M40 88 C36 58 52 34 64 24 C76 34 92 58 88 88 C76 104 52 104 40 88 Z" fill="#d90429" fill-opacity="0.35" stroke="#d90429" stroke-width="3"/>
        <circle cx="56" cy="56" r="4" fill="#e8d4a8"/><circle cx="72" cy="56" r="4" fill="#e8d4a8"/>`;
      break;
    case 'fortuneGlobal':
    case 'fortuneObol':
    case 'fortuneLine':
    case 'hermesContract':
      motif = `<path d="M40 72 Q64 28 88 72" fill="none" stroke="#cfa759" stroke-width="4"/>
        <path d="M48 56 L36 48 L44 64 Z M80 56 L92 48 L84 64 Z" fill="#e8d4a8"/>
        <circle cx="64" cy="80" r="14" fill="#cfa759" fill-opacity="0.35" stroke="#cfa759" stroke-width="3"/>
        <text x="64" y="86" text-anchor="middle" font-family="Georgia,serif" font-size="14" fill="#e8d4a8">₿</text>`;
      break;
    case 'seasonalCompound':
    case 'saturnaliaMult':
      motif = `<polygon points="64,24 74,54 106,54 80,72 90,102 64,84 38,102 48,72 22,54 54,54" fill="#34d399" fill-opacity="0.35" stroke="#34d399" stroke-width="2.5"/>
        <circle cx="64" cy="64" r="10" fill="#cfa759"/>`;
      break;
    case 'dragonScale':
      motif = `<path d="M40 80 Q48 40 64 28 Q80 40 88 80 Q64 100 40 80 Z" fill="#f59e0b" fill-opacity="0.4" stroke="#f59e0b" stroke-width="3"/>
        <path d="M52 60 L64 44 L76 60 L64 72 Z" fill="#e8d4a8"/>`;
      break;
    case 'allGeneratorsMult':
      motif = `<circle cx="64" cy="64" r="36" fill="none" stroke="#cfa759" stroke-width="3"/>
        ${GENERATORS.slice(0, 8).map((g, i) => {
          const ang = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const x = 64 + Math.cos(ang) * 22;
          const y = 64 + Math.sin(ang) * 22;
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${GEN_PALETTE[g.id] || '#cfa759'}"/>`;
        }).join('')}
        <circle cx="64" cy="64" r="8" fill="#e8d4a8"/>`;
      break;
    default:
      motif = `<circle cx="64" cy="64" r="28" fill="${accent}" fill-opacity="0.3" stroke="${rim}" stroke-width="3"/>
        <path d="M64 40 L76 64 L64 88 L52 64 Z" fill="${accent}"/>`;
  }

  const spark = (h % 5) + 1;
  let sparks = '';
  for (let i = 0; i < spark; i += 1) {
    const ang = ((h + i * 47) % 360) * (Math.PI / 180);
    const x = 64 + Math.cos(ang) * (42 + (i % 3) * 4);
    const y = 64 + Math.sin(ang) * (42 + (i % 3) * 4);
    sparks += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="${mat.glow}" opacity="0.7"/>`;
  }

  // Grão ctoniano (ruído determinístico) para leitura de pedra e WebP mais denso.
  let grain = '';
  for (let i = 0; i < 48; i += 1) {
    const x = 12 + ((h + i * 17) % 104);
    const y = 12 + ((h * 3 + i * 29) % 104);
    const o = 0.04 + ((h + i) % 7) * 0.01;
    grain += `<circle cx="${x}" cy="${y}" r="${1 + (i % 2)}" fill="${mat.glow}" opacity="${o.toFixed(2)}"/>`;
  }

  return svgShell(`
  <rect x="8" y="8" width="112" height="112" rx="18" fill="${mat.fill}" fill-opacity="0.72" stroke="${rim}" stroke-width="3"/>
  <path d="M14 20 H114" stroke="${mat.glow}" stroke-opacity="0.15" stroke-width="2"/>
  <path d="M14 108 H114" stroke="#000" stroke-opacity="0.35" stroke-width="3"/>
  ${grain}
  ${motif}
  ${sparks}
  <rect x="10" y="10" width="108" height="108" rx="16" fill="none" stroke="${mat.glow}" stroke-opacity="0.28" stroke-width="1"/>
  <!-- wave:${waveHint || ''} kind:${def.kind} -->
`);
}

async function loadPriority() {
  try {
    const doc = JSON.parse(await fs.readFile(ART_REQ, 'utf8'));
    const req = (doc.requests || []).find((r) => r.id === 'art_upgrades');
    return new Set(req?.upgradeIdsPriority || []);
  } catch {
    return new Set();
  }
}

function waveOf(def, priority) {
  if (priority.has(def.id)) return 'A';
  if (def.kind === 'clickMult' || def.kind === 'clickKSps' || def.kind === 'thousandBlades' || def.kind === 'thousandBladesMult') return 'B';
  const genId = def.generatorId || def.requires?.generatorId;
  const tier = genId ? GEN_TIER[genId] : null;
  if (def.kind === 'synergyMult') return 'C';
  if (def.kind === 'generatorMult') {
    if (tier <= 6) return 'C';
    if (tier <= 12) return 'D';
    return 'E';
  }
  return 'F';
}

function parseArgs(argv) {
  const idsFlag = argv.indexOf('--ids');
  const waveFlag = argv.indexOf('--wave');
  return {
    ids: idsFlag >= 0 ? String(argv[idsFlag + 1] || '').split(/[,:\s]+/).filter(Boolean) : null,
    wave: waveFlag >= 0 ? String(argv[waveFlag + 1] || '').toUpperCase() : null,
  };
}

async function main() {
  const { ids, wave } = parseArgs(process.argv.slice(2));
  const priority = await loadPriority();
  await fs.mkdir(OUT_DIR, { recursive: true });

  let list = UPGRADES;
  if (ids?.length) list = UPGRADES.filter((u) => ids.includes(u.id));
  else if (wave) list = UPGRADES.filter((u) => waveOf(u, priority) === wave);

  // Priority A also in B/C — when generating non-A waves, still include only matching.
  // When generating A, only priority set.
  if (wave === 'A') list = UPGRADES.filter((u) => priority.has(u.id));
  if (wave === 'B') {
    list = UPGRADES.filter((u) => waveOf(u, priority) === 'B' && !priority.has(u.id));
  }

  const preserved = [];
  for (const def of list) {
    const w = waveOf(def, priority);
    const svg = buildSvg(def, w);
    const svgPath = path.join(OUT_DIR, `${def.id}.svg`);
    const webpPath = path.join(OUT_DIR, `${def.id}.webp`);
    await fs.writeFile(svgPath, svg, 'utf8');
    const webp = await sharp(Buffer.from(svg)).resize(SIZE, SIZE).webp({ quality: 90, alphaQuality: 95 }).toBuffer();
    await fs.writeFile(webpPath, webp);
    preserved.push(`upgrades/${def.id}`);
    console.log(`${w} ${def.id} ${webp.length}B`);
  }

  let doc = { preserveWebp: [] };
  try {
    doc = JSON.parse(await fs.readFile(ILLUSTRATED, 'utf8'));
  } catch {
    doc = { preserveWebp: [] };
  }
  const set = new Set(doc.preserveWebp || []);
  for (const key of preserved) set.add(key);
  doc.preserveWebp = [...set].sort();
  await fs.writeFile(ILLUSTRATED, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  console.log(`wrote=${preserved.length} illustrated=${doc.preserveWebp.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
