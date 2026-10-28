#!/usr/bin/env node
/**
 * Gera silhuetas T1–T6 + ícones de juramento (SVG + WebP) — Task B3.
 * One-shot commitado (Q15). Reexecutar: node scripts/gen-despertar-sprites.mjs
 *
 * Uso: npm run despertar:sprites
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { VEIL_TIERS } from '../js/hades-despertar/config/achievements.js';
import { CATABASE_SPRITE_ITEMS } from '../js/hades-despertar/config/catabase.js';
import { DRAGON_AURAS, DRAGON_STAGES } from '../js/hades-despertar/config/dragon.js';
import { SEASONS } from '../js/hades-despertar/config/seasons.js';
import {
  GARDEN_SEEDS,
  GRIMOIRE_SPELLS,
  MARKET_GOODS,
  NECTAR_VARIANTS,
  PANTHEON_SPIRITS,
} from '../js/hades-despertar/config/minigames.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'assets', 'despertar', 'sprites');
const GEN_DIR = path.join(OUT, 'generators');
const UP_DIR = path.join(OUT, 'upgrades');
const SHIMMER_DIR = path.join(OUT, 'shimmers');
const MINIGAMES_DIR = path.join(OUT, 'minigames');
const VEIL_DIR = path.join(OUT, 'veil');
const CATABASE_DIR = path.join(OUT, 'catabase');
const SEASONS_DIR = path.join(OUT, 'seasons');
const SIZE = 128;
const QUALITY = 82;

const TIER_ACCENT = {
  1: '#00a896',
  2: '#cfa759',
  3: '#d90429',
  4: '#a855f7',
  5: '#ff6b6b',
  6: '#e8d4a8',
  7: '#c084fc',
  8: '#2dd4bf',
  9: '#fde68a',
  10: '#fb923c',
  11: '#9333ea',
  12: '#f5c542',
  13: '#38bdf8',
  14: '#f472b6',
  15: '#facc15',
  16: '#34d399',
  17: '#a3e635',
  18: '#818cf8',
  19: '#fb7185',
  20: '#fde047',
};

function svgShell(inner, size = SIZE) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  ${inner}
</svg>
`;
}

function generatorSvg(def) {
  const accent = TIER_ACCENT[def.tier] || '#00a896';
  const body = '#0c1218';
  switch (def.tier) {
    case 1:
      return svgShell(`
  <ellipse cx="64" cy="78" rx="26" ry="34" fill="${body}" fill-opacity="0.92"/>
  <ellipse cx="64" cy="42" rx="19" ry="18" fill="${body}" fill-opacity="0.96"/>
  <ellipse cx="56" cy="44" rx="3" ry="2.5" fill="${accent}"/>
  <ellipse cx="72" cy="44" rx="3" ry="2.5" fill="${accent}"/>
  <ellipse cx="64" cy="96" rx="20" ry="8" fill="${accent}" fill-opacity="0.28"/>
`);
    case 2:
      return svgShell(`
  <ellipse cx="64" cy="88" rx="40" ry="12" fill="${accent}" fill-opacity="0.25"/>
  <path d="M22 78 Q64 48 106 78 L98 86 Q64 62 30 86 Z" fill="${body}" fill-opacity="0.94"/>
  <rect x="60" y="36" width="8" height="40" rx="2" fill="${accent}"/>
  <circle cx="64" cy="34" r="8" fill="${body}"/>
  <circle cx="64" cy="34" r="3" fill="${accent}"/>
`);
    case 3:
      return svgShell(`
  <ellipse cx="64" cy="92" rx="28" ry="14" fill="${body}" fill-opacity="0.9"/>
  <ellipse cx="40" cy="58" rx="16" ry="18" fill="${body}"/>
  <ellipse cx="64" cy="50" rx="18" ry="20" fill="${body}"/>
  <ellipse cx="88" cy="58" rx="16" ry="18" fill="${body}"/>
  <circle cx="40" cy="56" r="3" fill="${accent}"/>
  <circle cx="58" cy="48" r="3" fill="${accent}"/>
  <circle cx="70" cy="48" r="3" fill="${accent}"/>
  <circle cx="88" cy="56" r="3" fill="${accent}"/>
`);
    case 4:
      return svgShell(`
  <rect x="58" y="28" width="12" height="58" rx="2" fill="${body}"/>
  <path d="M34 40 H94 L88 56 H40 Z" fill="${accent}" fill-opacity="0.85"/>
  <circle cx="64" cy="92" r="14" fill="${body}"/>
  <circle cx="64" cy="92" r="6" fill="${accent}"/>
`);
    case 5:
      return svgShell(`
  <rect x="28" y="70" width="72" height="28" rx="4" fill="${body}"/>
  <path d="M40 70 L48 36 H80 L88 70 Z" fill="${body}" fill-opacity="0.95"/>
  <path d="M52 50 L64 28 L76 50" stroke="${accent}" stroke-width="4" stroke-linecap="round" fill="none"/>
  <circle cx="64" cy="58" r="6" fill="${accent}" fill-opacity="0.8"/>
`);
    case 6:
      return svgShell(`
  <rect x="30" y="78" width="68" height="18" rx="3" fill="${body}"/>
  <path d="M40 78 L48 48 H80 L88 78 Z" fill="${body}" fill-opacity="0.95"/>
  <rect x="54" y="28" width="20" height="24" rx="2" fill="${accent}" fill-opacity="0.75"/>
  <circle cx="64" cy="24" r="8" fill="${accent}"/>
`);
    case 7:
      return svgShell(`
  <polygon points="64,20 104,44 24,44" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <rect x="32" y="46" width="12" height="44" fill="${body}" stroke="${accent}" stroke-width="2"/>
  <rect x="58" y="46" width="12" height="44" fill="${body}" stroke="${accent}" stroke-width="2"/>
  <rect x="84" y="46" width="12" height="44" fill="${body}" stroke="${accent}" stroke-width="2"/>
  <rect x="20" y="90" width="88" height="12" rx="3" fill="${accent}" fill-opacity="0.8"/>
`);
    case 8:
      return svgShell(`
  <path d="M44 100 L52 34 L64 16 L76 34 L84 100 Z" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <circle cx="64" cy="46" r="9" fill="${accent}"/>
  <rect x="58" y="66" width="12" height="22" rx="4" fill="${accent}" fill-opacity="0.5"/>
`);
    case 9:
      return svgShell(`
  <path d="M18 76 Q64 98 110 76 L96 94 Q64 106 32 94 Z" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <path d="M64 22 L92 68 H36 Z" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2.5"/>
  <circle cx="64" cy="22" r="5" fill="${accent}"/>
`);
    case 10:
      return svgShell(`
  <circle cx="64" cy="76" r="28" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <rect x="56" y="24" width="16" height="26" rx="3" fill="${body}" stroke="${accent}" stroke-width="2.5"/>
  <path d="M42 80 Q64 68 86 80 A22 22 0 0 1 42 80 Z" fill="${accent}" fill-opacity="0.75"/>
`);
    case 11:
      return svgShell(`
  <ellipse cx="64" cy="64" rx="34" ry="44" fill="${body}" stroke="${accent}" stroke-width="4"/>
  <ellipse cx="64" cy="64" rx="20" ry="30" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="2" stroke-dasharray="6 4"/>
  <circle cx="64" cy="64" r="8" fill="${accent}"/>
`);
    case 12:
      return svgShell(`
  <path d="M36 22 H92 L68 64 L92 106 H36 L60 64 Z" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <circle cx="64" cy="64" r="10" fill="${accent}"/>
  <line x1="28" y1="22" x2="100" y2="22" stroke="${accent}" stroke-width="4"/>
  <line x1="28" y1="106" x2="100" y2="106" stroke="${accent}" stroke-width="4"/>
`);
    case 13:
      return svgShell(`
  <circle cx="64" cy="64" r="36" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <ellipse cx="64" cy="64" rx="46" ry="16" transform="rotate(30 64 64)" stroke="${accent}" stroke-width="2.5" fill="none"/>
  <ellipse cx="64" cy="64" rx="46" ry="16" transform="rotate(-30 64 64)" stroke="${accent}" stroke-width="2.5" fill="none"/>
  <circle cx="64" cy="64" r="10" fill="${accent}"/>
`);
    case 14:
      return svgShell(`
  <polygon points="64,18 106,98 22,98" fill="${body}" stroke="${accent}" stroke-width="3.5"/>
  <polygon points="64,36 88,88 40,88" fill="${accent}" fill-opacity="0.32"/>
  <line x1="16" y1="64" x2="112" y2="52" stroke="${accent}" stroke-width="3"/>
`);
    case 15:
      return svgShell(`
  <rect x="30" y="30" width="68" height="68" rx="12" fill="${body}" stroke="${accent}" stroke-width="3.5"/>
  <circle cx="48" cy="48" r="6" fill="${accent}"/>
  <circle cx="64" cy="64" r="6" fill="${accent}"/>
  <circle cx="80" cy="80" r="6" fill="${accent}"/>
  <circle cx="80" cy="48" r="6" fill="${accent}"/>
  <circle cx="48" cy="80" r="6" fill="${accent}"/>
`);
    case 16:
      return svgShell(`
  <polygon points="64,16 108,96 20,96" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <polygon points="64,56 86,96 42,96" fill="${accent}" fill-opacity="0.35"/>
  <polygon points="64,34 76,56 52,56" fill="${accent}" fill-opacity="0.7"/>
`);
    case 17:
      return svgShell(`
  <rect x="20" y="26" width="88" height="76" rx="8" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <path d="M36 52 L50 64 L36 76" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="58" y1="76" x2="84" y2="76" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
`);
    case 18:
      return svgShell(`
  <circle cx="64" cy="64" r="42" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <circle cx="52" cy="56" r="18" fill="none" stroke="${accent}" stroke-width="2.5"/>
  <circle cx="76" cy="72" r="18" fill="none" stroke="${accent}" stroke-width="2.5"/>
  <circle cx="64" cy="64" r="7" fill="${accent}"/>
`);
    case 19:
      return svgShell(`
  <ellipse cx="52" cy="64" rx="22" ry="30" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <ellipse cx="76" cy="64" rx="22" ry="30" fill="${body}" stroke="${accent}" stroke-width="3"/>
  <circle cx="64" cy="64" r="10" fill="${accent}" fill-opacity="0.8"/>
`);
    case 20:
    default:
      return svgShell(`
  <path d="M24 88 L32 42 L50 62 L64 28 L78 62 L96 42 L104 88 Z" fill="${body}" stroke="${accent}" stroke-width="3.5"/>
  <rect x="24" y="90" width="80" height="12" rx="4" fill="${accent}"/>
  <circle cx="64" cy="24" r="6" fill="${accent}"/>
`);
  }
}

function upgradeSvg(def, index) {
  const click = def.kind === 'clickMult';
  const accent = click ? '#00a896' : (TIER_ACCENT[(index % 6) + 1] || '#cfa759');
  const mark = String(def.name || '?').trim().slice(0, 1).toUpperCase() || '?';
  return svgShell(`
  <rect x="10" y="10" width="108" height="108" rx="16" fill="#0c1218" fill-opacity="0.92" stroke="${accent}" stroke-opacity="0.55" stroke-width="3"/>
  <circle cx="64" cy="54" r="22" fill="${accent}" fill-opacity="0.2" stroke="${accent}" stroke-width="2"/>
  <path d="M64 36 L72 58 L64 70 L56 58 Z" fill="${accent}" fill-opacity="0.9"/>
  <text x="64" y="100" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${accent}">${mark}</text>
`);
}

function shimmerSvg(id) {
  const isWrath = id === 'eco_colerico';
  const accent = isWrath ? '#d90429' : '#cfa759';
  const rim = isWrath ? '#ff6b6b' : '#e8d4a8';
  const core = '#0c1218';
  return svgShell(`
  <circle cx="64" cy="64" r="50" fill="${accent}" fill-opacity="0.18"/>
  <circle cx="64" cy="64" r="38" fill="${core}" stroke="${accent}" stroke-width="4"/>
  <circle cx="64" cy="64" r="30" fill="none" stroke="${rim}" stroke-opacity="0.7" stroke-width="2" stroke-dasharray="6 4"/>
  <path d="M64 26 L74 54 L102 64 L74 74 L64 102 L54 74 L26 64 L54 54 Z" fill="${accent}" fill-opacity="0.92" stroke="${rim}" stroke-width="2"/>
  <circle cx="64" cy="64" r="8" fill="${rim}"/>
`);
}

function minigameItemSvg(id, name, category) {
  const palette = {
    nectar: '#f5c542',
    seed: '#2dd4bf',
    spirit: '#c084fc',
    spell: '#fb923c',
    good: '#cfa759',
  };
  const accent = palette[category] || '#cfa759';
  const mark = String(name || id || '?').trim().slice(0, 1).toUpperCase();
  return svgShell(`
  <rect x="12" y="12" width="104" height="104" rx="20" fill="#0c1218" stroke="${accent}" stroke-width="3"/>
  <circle cx="64" cy="54" r="24" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2"/>
  <text x="64" y="98" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="${accent}">${mark}</text>
`);
}

function veilTierSvg(tier) {
  const accent = tier.color || '#00a896';
  return svgShell(`
  <rect x="8" y="8" width="112" height="112" rx="18" fill="#080c12" stroke="${accent}" stroke-width="3"/>
  <path d="M12 78 Q38 64 64 78 T116 78 L116 116 L12 116 Z" fill="${accent}" fill-opacity="0.38"/>
  <path d="M12 90 Q38 78 64 90 T116 90 L116 116 L12 116 Z" fill="${accent}" fill-opacity="0.72"/>
  <circle cx="64" cy="44" r="14" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="2"/>
`);
}

function catabaseItemSvg(item) {
  const isShiny = item.category === 'leech_shiny';
  const accent = isShiny ? '#f5c542' : (item.category === 'pact' ? '#2dd4bf' : '#d90429');
  return svgShell(`
  <rect x="10" y="10" width="108" height="108" rx="22" fill="#12060c" stroke="${accent}" stroke-width="3"/>
  <path d="M40 88 C36 60 52 38 64 26 C76 38 92 60 88 88 C76 102 52 102 40 88 Z" fill="${accent}" fill-opacity="0.32" stroke="${accent}" stroke-width="3"/>
  <circle cx="56" cy="54" r="4" fill="${accent}"/>
  <circle cx="72" cy="54" r="4" fill="${accent}"/>
`);
}

function seasonOrDragonItemSvg(item) {
  const accent = item.category === 'dragon'
    ? '#f59e0b'
    : (item.category === 'aura' ? '#f43f5e' : '#34d399');
  return svgShell(`
  <rect x="10" y="10" width="108" height="108" rx="22" fill="#0d111a" stroke="${accent}" stroke-width="3"/>
  <polygon points="64,22 98,64 64,106 30,64" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="3"/>
  <circle cx="64" cy="64" r="14" fill="${accent}"/>
`);
}

let preserveWebp = new Set();

async function loadIllustratedWebps() {
  try {
    const raw = await fs.readFile(path.join(OUT, 'illustrated.json'), 'utf8');
    const doc = JSON.parse(raw);
    preserveWebp = new Set(doc.preserveWebp || []);
  } catch {
    preserveWebp = new Set();
  }
}

async function writeSvgAndWebp(dir, id, svg) {
  const svgPath = path.join(dir, `${id}.svg`);
  const webpPath = path.join(dir, `${id}.webp`);
  await fs.writeFile(svgPath, svg, 'utf8');
  const relWebp = path.relative(OUT, webpPath).replace(/\\/g, '/');
  const relKey = relWebp.replace(/\.webp$/, '');
  const svgRel = path.relative(OUT, svgPath).replace(/\\/g, '/');
  try {
    await fs.access(webpPath);
    if (preserveWebp.has(relKey)) {
      return { webp: relWebp, svg: svgRel, source: 'gemini' };
    }
  } catch {
    /* WebP ainda não existe: grava o placeholder. */
  }
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: QUALITY, alphaQuality: 100 })
    .toFile(webpPath);
  return {
    webp: relWebp,
    svg: svgRel,
  };
}

async function main() {
  await loadIllustratedWebps();
  await fs.mkdir(GEN_DIR, { recursive: true });
  await fs.mkdir(UP_DIR, { recursive: true });
  await fs.mkdir(SHIMMER_DIR, { recursive: true });
  await fs.mkdir(MINIGAMES_DIR, { recursive: true });
  await fs.mkdir(VEIL_DIR, { recursive: true });
  await fs.mkdir(CATABASE_DIR, { recursive: true });
  await fs.mkdir(SEASONS_DIR, { recursive: true });

  const manifest = {
    version: 1,
    size: SIZE,
    format: { primary: 'webp', fallback: 'svg' },
    note: 'Gerado por scripts/gen-despertar-sprites.mjs (Task B3). Placeholders até arte do Mestre.',
    generators: {},
    upgrades: {},
    shimmers: {},
    minigames: {},
    veil: {},
    catabase: {},
    seasons: {},
  };

  for (const def of GENERATORS) {
    const paths = await writeSvgAndWebp(GEN_DIR, def.id, generatorSvg(def));
    manifest.generators[def.id] = {
      tier: def.tier,
      name: def.name,
      ...paths,
      size: SIZE,
    };
    console.log(`generator ${def.id}`);
  }

  let i = 0;
  for (const def of UPGRADES) {
    const paths = await writeSvgAndWebp(UP_DIR, def.id, upgradeSvg(def, i));
    manifest.upgrades[def.id] = {
      name: def.name,
      kind: def.kind,
      ...paths,
      size: SIZE,
    };
    console.log(`upgrade ${def.id}`);
    i += 1;
  }

  const shimmerDefs = [
    { id: 'eco_dourado', name: 'Eco Dourado do Acheron', variant: 'golden' },
    { id: 'eco_colerico', name: 'Eco Colérico do Acheron', variant: 'wrath' },
  ];
  for (const s of shimmerDefs) {
    const paths = await writeSvgAndWebp(SHIMMER_DIR, s.id, shimmerSvg(s.id));
    manifest.shimmers[s.id] = {
      name: s.name,
      variant: s.variant,
      ...paths,
      size: SIZE,
    };
    console.log(`shimmer ${s.id}`);
  }

  const minigameItems = [
    ...NECTAR_VARIANTS.map((v) => ({ id: v.spriteId, name: v.name, category: 'nectar' })),
    ...GARDEN_SEEDS.map((s) => ({ id: s.spriteId, name: s.name, category: 'seed' })),
    ...PANTHEON_SPIRITS.map((sp) => ({ id: sp.spriteId, name: sp.name, category: 'spirit' })),
    ...GRIMOIRE_SPELLS.map((sp) => ({ id: sp.spriteId, name: sp.name, category: 'spell' })),
    ...MARKET_GOODS.map((g) => ({ id: g.spriteId, name: g.name, category: 'good' })),
  ];
  for (const item of minigameItems) {
    const paths = await writeSvgAndWebp(
      MINIGAMES_DIR,
      item.id,
      minigameItemSvg(item.id, item.name, item.category),
    );
    manifest.minigames[item.id] = {
      name: item.name,
      category: item.category,
      ...paths,
      size: SIZE,
    };
    console.log(`minigame ${item.id}`);
  }

  for (const tier of VEIL_TIERS) {
    const paths = await writeSvgAndWebp(VEIL_DIR, tier.spriteId, veilTierSvg(tier));
    manifest.veil[tier.spriteId] = {
      id: tier.id,
      name: tier.name,
      minVeilPercent: tier.minVeilPercent,
      color: tier.color,
      ...paths,
      size: SIZE,
    };
    console.log(`veil ${tier.spriteId}`);
  }

  for (const item of CATABASE_SPRITE_ITEMS) {
    const paths = await writeSvgAndWebp(CATABASE_DIR, item.id, catabaseItemSvg(item));
    manifest.catabase[item.id] = {
      name: item.name,
      category: item.category,
      ...paths,
      size: SIZE,
    };
    console.log(`catabase ${item.id}`);
  }

  const seasonItems = [
    ...DRAGON_STAGES.map((s) => ({ id: s.spriteId, name: s.name, category: 'dragon' })),
    ...DRAGON_AURAS.map((a) => ({ id: a.spriteId, name: a.name, category: 'aura' })),
    ...SEASONS.map((s) => ({ id: s.spriteId, name: s.name, category: 'season' })),
    { id: 'corca_de_artemis', name: 'Corça Dourada de Ártemis', category: 'season' },
  ];
  for (const item of seasonItems) {
    const paths = await writeSvgAndWebp(SEASONS_DIR, item.id, seasonOrDragonItemSvg(item));
    manifest.seasons[item.id] = {
      name: item.name,
      category: item.category,
      ...paths,
      size: SIZE,
    };
    console.log(`season ${item.id}`);
  }

  const manifestPath = path.join(OUT, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`wrote ${path.relative(root, manifestPath)}`);
  console.log(`generators=${Object.keys(manifest.generators).length} upgrades=${Object.keys(manifest.upgrades).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
