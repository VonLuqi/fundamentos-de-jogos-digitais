#!/usr/bin/env node
/**
 * Gera overlays da FOICE / órbita (512²) como SVG silhueta + WebP RGBA.
 * Cosméticos de GERADOR (64² pixel art) → use scripts/sync-cosmetics-pixel.mjs
 *
 * Uso: node scripts/gen-cosmetics-art.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'despertar', 'cosmetics');

const GOLD = '#cfa759';
const GOLD_BRIGHT = '#e8d4a8';
const STYX = '#00a896';
const STYX_SOFT = '#5eead4';
const LETHE = '#a855f7';
const FIRE = '#d90429';
const BODY = '#0c1218';
const CREAM = '#f2e8dc';

/** Overlays Foice/órbita apenas (geradores = sync-cosmetics-pixel.mjs). */
/** @type {Record<string, { size: number, svg: (s: number) => string }>} */
const SPECS = {
  blade_glow: {
    size: 512,
    svg: (s) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
        <defs>
          <radialGradient id="g" cx="50%" cy="42%" r="45%">
            <stop offset="0%" stop-color="${STYX_SOFT}" stop-opacity="0.55"/>
            <stop offset="45%" stop-color="${STYX}" stop-opacity="0.28"/>
            <stop offset="100%" stop-color="${STYX}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="${s * 0.5}" cy="${s * 0.42}" rx="${s * 0.38}" ry="${s * 0.48}" fill="url(#g)"/>
        <path d="M${s * 0.5} ${s * 0.12} L${s * 0.58} ${s * 0.55} L${s * 0.5} ${s * 0.82} L${s * 0.42} ${s * 0.55} Z"
          fill="${STYX}" opacity="0.35" stroke="${STYX_SOFT}" stroke-width="${s * 0.012}"/>
      </svg>`,
  },
  blade_runes: {
    size: 512,
    svg: (s) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
        <path d="M${s * 0.5} ${s * 0.18} V${s * 0.78}" stroke="${GOLD}" stroke-width="${s * 0.028}" stroke-linecap="round" opacity="0.85"/>
        <path d="M${s * 0.42} ${s * 0.32} H${s * 0.58}" stroke="${LETHE}" stroke-width="${s * 0.018}" opacity="0.9"/>
        <path d="M${s * 0.4} ${s * 0.45} H${s * 0.6}" stroke="${GOLD_BRIGHT}" stroke-width="${s * 0.016}" opacity="0.75"/>
        <path d="M${s * 0.43} ${s * 0.58} H${s * 0.57}" stroke="${LETHE}" stroke-width="${s * 0.018}" opacity="0.9"/>
        <circle cx="${s * 0.5}" cy="${s * 0.7}" r="${s * 0.035}" fill="${GOLD}" opacity="0.8"/>
      </svg>`,
  },
  blade_ember: {
    size: 512,
    svg: (s) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
        <circle cx="${s * 0.38}" cy="${s * 0.55}" r="${s * 0.04}" fill="${FIRE}" opacity="0.9"/>
        <circle cx="${s * 0.55}" cy="${s * 0.42}" r="${s * 0.03}" fill="${GOLD}" opacity="0.85"/>
        <circle cx="${s * 0.62}" cy="${s * 0.62}" r="${s * 0.025}" fill="${FIRE}" opacity="0.75"/>
        <circle cx="${s * 0.45}" cy="${s * 0.7}" r="${s * 0.02}" fill="${GOLD_BRIGHT}" opacity="0.7"/>
        <circle cx="${s * 0.52}" cy="${s * 0.3}" r="${s * 0.022}" fill="${FIRE}" opacity="0.65"/>
        <path d="M${s * 0.4} ${s * 0.5} Q${s * 0.48} ${s * 0.35} ${s * 0.5} ${s * 0.22}" stroke="${FIRE}" stroke-width="${s * 0.02}" opacity="0.5" stroke-linecap="round"/>
      </svg>`,
  },
  blade_seal: {
    size: 512,
    svg: (s) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
        <circle cx="${s * 0.5}" cy="${s * 0.48}" r="${s * 0.16}" fill="${BODY}" stroke="${GOLD}" stroke-width="${s * 0.02}"/>
        <circle cx="${s * 0.5}" cy="${s * 0.48}" r="${s * 0.11}" stroke="${LETHE}" stroke-width="${s * 0.014}" opacity="0.9"/>
        <path d="M${s * 0.5} ${s * 0.38} L${s * 0.56} ${s * 0.52} H${s * 0.44} Z" fill="${GOLD}"/>
        <path d="M${s * 0.42} ${s * 0.58} H${s * 0.58}" stroke="${GOLD_BRIGHT}" stroke-width="${s * 0.012}" stroke-linecap="round"/>
      </svg>`,
  },
  reap_ripple: {
    size: 512,
    svg: (s) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
        <circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.18}" stroke="${STYX}" stroke-width="${s * 0.02}" opacity="0.75"/>
        <circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.28}" stroke="${STYX_SOFT}" stroke-width="${s * 0.016}" opacity="0.5"/>
        <circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.38}" stroke="${STYX}" stroke-width="${s * 0.012}" opacity="0.3"/>
      </svg>`,
  },
  orbit_halo: {
    size: 512,
    svg: (s) => `
      <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
        <defs>
          <radialGradient id="h" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stop-color="${GOLD}" stop-opacity="0"/>
            <stop offset="88%" stop-color="${GOLD}" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="${GOLD_BRIGHT}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.42}" fill="url(#h)"/>
        <circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.4}" stroke="${GOLD}" stroke-width="${s * 0.018}" opacity="0.7" fill="none"/>
        <circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.44}" stroke="${CREAM}" stroke-width="${s * 0.008}" opacity="0.35" fill="none"/>
      </svg>`,
  },
};

async function writeOne(id, spec) {
  const svg = spec.svg(spec.size).trim();
  const svgPath = path.join(OUT, `${id}.svg`);
  const webpPath = path.join(OUT, `${id}.webp`);
  await fs.writeFile(svgPath, `${svg}\n`, 'utf8');
  await sharp(Buffer.from(svg))
    .resize(spec.size, spec.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 100, effort: 4 })
    .toFile(webpPath);
  return { id, size: spec.size, svgPath, webpPath };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const ids = Object.keys(SPECS);
  const results = [];
  for (const id of ids) {
    results.push(await writeOne(id, SPECS[id]));
    console.log(`[ok] ${id} (${SPECS[id].size}²)`);
  }
  console.log(`\ngen-cosmetics-art: ${results.length} accessories → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
