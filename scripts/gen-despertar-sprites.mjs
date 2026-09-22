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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'assets', 'despertar', 'sprites');
const GEN_DIR = path.join(OUT, 'generators');
const UP_DIR = path.join(OUT, 'upgrades');
const SIZE = 128;
const QUALITY = 82;

const TIER_ACCENT = {
  1: '#00a896',
  2: '#cfa759',
  3: '#d90429',
  4: '#a855f7',
  5: '#ff6b6b',
  6: '#e8d4a8',
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
    default:
      return svgShell(`
  <rect x="30" y="78" width="68" height="18" rx="3" fill="${body}"/>
  <path d="M40 78 L48 48 H80 L88 78 Z" fill="${body}" fill-opacity="0.95"/>
  <rect x="54" y="28" width="20" height="24" rx="2" fill="${accent}" fill-opacity="0.75"/>
  <circle cx="64" cy="24" r="8" fill="${accent}"/>
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

async function writeSvgAndWebp(dir, id, svg) {
  const svgPath = path.join(dir, `${id}.svg`);
  const webpPath = path.join(dir, `${id}.webp`);
  await fs.writeFile(svgPath, svg, 'utf8');
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: QUALITY, alphaQuality: 100 })
    .toFile(webpPath);
  return {
    webp: path.relative(OUT, webpPath).replace(/\\/g, '/'),
    svg: path.relative(OUT, svgPath).replace(/\\/g, '/'),
  };
}

async function main() {
  await fs.mkdir(GEN_DIR, { recursive: true });
  await fs.mkdir(UP_DIR, { recursive: true });

  const manifest = {
    version: 1,
    size: SIZE,
    format: { primary: 'webp', fallback: 'svg' },
    note: 'Gerado por scripts/gen-despertar-sprites.mjs (Task B3). Placeholders até arte do Mestre.',
    generators: {},
    upgrades: {},
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

  const manifestPath = path.join(OUT, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`wrote ${path.relative(root, manifestPath)}`);
  console.log(`generators=${Object.keys(manifest.generators).length} upgrades=${Object.keys(manifest.upgrades).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
