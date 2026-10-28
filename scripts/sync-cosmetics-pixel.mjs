#!/usr/bin/env node
/**
 * Sincroniza cosmeticos de GERADOR (64x64) a partir dos pixel-arts em
 * assets/despertar/sprites/habitats/variants/ -> cosmetics/*.webp (fundo transparente).
 *
 * Os overlays da Foice (blade_*, reap_ripple, orbit_halo em 512) nao sao pixel
 * de prateleira e ficam nos SVG/WebP gerados por gen-cosmetics-art.mjs.
 *
 * Uso: node scripts/sync-cosmetics-pixel.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets', 'despertar', 'sprites', 'habitats', 'variants');
const OUT = path.join(ROOT, 'assets', 'despertar', 'cosmetics');

const GENERATOR_COSMETICS = [
  'hat_charon',
  'boat_wake',
  'shade_wisp',
  'hound_chain',
  'hound_triple_aura',
  'judge_scale_fx',
];

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function toTransparentWebp(src, dest, size = 64) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const out = Buffer.from(data);
  const visited = new Uint8Array(width * height);
  const q = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * 4;
    const r = out[o];
    const g = out[o + 1];
    const b = out[o + 2];
    const a = out[o + 3];
    if (a < 8) {
      visited[i] = 1;
      out[o + 3] = 0;
      q.push(i);
      return;
    }
    const lum = luminance(r, g, b);
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
    // keep lit / saturated pixels (gold, fire, styx)
    if (lum > 32 || (sat > 0.28 && lum > 16)) return;
    visited[i] = 1;
    out[o + 3] = 0;
    q.push(i);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (q.length) {
    const i = q.pop();
    const x = i % width;
    const y = (i / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 92, alphaQuality: 100, effort: 4 })
    .toFile(dest);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  for (const id of GENERATOR_COSMETICS) {
    const src = path.join(SRC, `${id}.webp`);
    await fs.access(src);
    const dest = path.join(OUT, `${id}.webp`);
    await toTransparentWebp(src, dest, 64);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><title>${id}</title></svg>\n`;
    await fs.writeFile(path.join(OUT, `${id}.svg`), svg, 'utf8');
    console.log(`[ok] ${id} <- habitats/variants (pixel)`);
  }
  console.log(`\nsync-cosmetics-pixel: ${GENERATOR_COSMETICS.length} generator cosmetics`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
