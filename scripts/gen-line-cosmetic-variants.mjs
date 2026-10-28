#!/usr/bin/env node
/**
 * Gera habitats/variants/{accessory}.webp para cada juramento generatorMult (15x20).
 * Parte do habitat base do gerador + recolor/progressao por marco (pixel, RGBA).
 * Nao sobrescreve os 6 variants P0 ja entregues (hat_charon, boat_wake, ...).
 *
 * Uso: node scripts/gen-line-cosmetic-variants.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  GENERATOR_LINE_COSMETIC_IDS,
  LEGACY_GENERATOR_COSMETIC_ALIAS,
  P0_COSMETIC_ACCESSORIES,
  UPGRADE_COSMETICS,
} from '../js/hades-despertar/config/upgrade-cosmetics.js';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HABITATS = path.join(ROOT, 'assets', 'despertar', 'sprites', 'habitats');
const OUT = path.join(HABITATS, 'variants');
const COSMETICS_OUT = path.join(ROOT, 'assets', 'despertar', 'cosmetics');

const PRESERVE = new Set(P0_COSMETIC_ACCESSORIES);

function seed32(id) {
  let h = 2166136261;
  const s = String(id || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Recolor pixel-art preservando alpha: hue shift + boost de saturacao + vinheta de acento.
 */
async function renderVariant(srcBuf, accessory, tierIndex) {
  const seed = seed32(accessory);
  const hue = (seed % 360 + (tierIndex - 1) * 17) % 360;
  const satBoost = 1 + Math.min(0.55, 0.08 + tierIndex * 0.03);
  const bright = 1 + (tierIndex - 8) * 0.018;
  const accentStrength = 0.12 + tierIndex * 0.035;

  const base = sharp(srcBuf).ensureAlpha();
  const meta = await base.metadata();
  const w = meta.width || 64;
  const h = meta.height || 64;

  const recolored = await sharp(srcBuf)
    .ensureAlpha()
    .modulate({
      hue,
      saturation: satBoost,
      brightness: Math.max(0.85, Math.min(1.25, bright)),
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = recolored;
  const out = Buffer.from(data);
  const accent = hslToRgb(hue, 0.7, 0.55);
  const rim = hslToRgb((hue + 40) % 360, 0.75, 0.62);

  // Acento nos pixels claros + borda luminosa progressiva por marco.
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      const a = out[i + 3];
      if (a < 8) continue;
      const lum = 0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2];
      const edge = x <= 1 || y <= 1 || x >= info.width - 2 || y >= info.height - 2;
      let t = 0;
      if (lum > 70) t = accentStrength * ((lum - 70) / 185);
      if (edge && a > 40) t = Math.max(t, 0.15 + tierIndex * 0.02);
      // "estrelas" / faíscas em marcos altos
      if (tierIndex >= 8) {
        const spark = ((seed >> ((x + y * 3) & 15)) ^ (x * 13 + y * 7)) & 31;
        if (spark === 0 && lum > 40) t = Math.max(t, 0.55);
      }
      if (t <= 0) continue;
      const mix = Math.min(1, t);
      const col = edge && tierIndex >= 10 ? rim : accent;
      out[i] = Math.round(out[i] * (1 - mix) + col[0] * mix);
      out[i + 1] = Math.round(out[i + 1] * (1 - mix) + col[1] * mix);
      out[i + 2] = Math.round(out[i + 2] * (1 - mix) + col[2] * mix);
    }
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100, effort: 4, nearLossless: false })
    .toBuffer();
}

function hslToRgb(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(COSMETICS_OUT, { recursive: true });

  const byId = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
  let wrote = 0;
  let skipped = 0;
  let missingBase = 0;

  for (const upgradeId of GENERATOR_LINE_COSMETIC_IDS) {
    const def = UPGRADE_COSMETICS[upgradeId];
    if (!def?.accessory || !def.targetGeneratorId) continue;
    const accessory = def.accessory;
    if (PRESERVE.has(accessory)) {
      skipped += 1;
      continue;
    }
    // Alias legado: nao gerar ficheiro com o id do upgrade; o accessory e o P0.
    if (LEGACY_GENERATOR_COSMETIC_ALIAS[upgradeId]) {
      skipped += 1;
      continue;
    }

    const basePath = path.join(HABITATS, `${def.targetGeneratorId}.webp`);
    let srcBuf;
    try {
      srcBuf = await fs.readFile(basePath);
    } catch {
      missingBase += 1;
      console.warn(`[skip] sem habitat base: ${def.targetGeneratorId} (${accessory})`);
      continue;
    }

    const tierIndex = Number(def.priority) || 1;
    const webp = await renderVariant(srcBuf, accessory, tierIndex);
    const destVariant = path.join(OUT, `${accessory}.webp`);
    const destCosmetic = path.join(COSMETICS_OUT, `${accessory}.webp`);
    await fs.writeFile(destVariant, webp);
    await fs.writeFile(destCosmetic, webp);
    wrote += 1;
    if (wrote <= 5 || wrote % 50 === 0) {
      const up = byId[upgradeId];
      console.log(`[ok] ${accessory} ← ${def.targetGeneratorId} t${tierIndex} (${up?.name || upgradeId})`);
    }
  }

  console.log(
    `\ngen-line-cosmetic-variants: wrote=${wrote} skippedPreserve=${skipped} missingBase=${missingBase} totalLine=${GENERATOR_LINE_COSMETIC_IDS.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
