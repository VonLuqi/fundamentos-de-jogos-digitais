#!/usr/bin/env node
/**
 * Recorta pixel art dos habitats (fundo magenta) para WebP nítido.
 * A grade nativa é detetada e reamostrada com vizinho mais próximo,
 * para os pixels continuarem quadrados nas prateleiras e na órbita.
 *
 * Uso: node scripts/process-habitat-art.mjs --in-dir <pasta>
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'despertar', 'sprites', 'habitats');
const ILLUSTRATED = path.join(ROOT, 'assets', 'despertar', 'sprites', 'illustrated.json');

const IDS = [
  'wandering_shade',
  'charon_servants',
  'cerberian_hound',
  'tartarus_judge',
  'phlegethon_forge',
  'obsidian_throne',
  'mnemosyne_temple',
  'styx_tower',
  'star_barge',
  'tartarus_lab',
  'erebus_portal',
  'chronos_loom',
  'void_condenser',
  'moirai_prism',
  'fate_forge',
  'fractal_engine',
  'oracle_console',
  'chthonic_idleverse',
  'cortex_baker',
  'the_emperor',
];

function colorDist(r, g, b, r2, g2, b2) {
  const dr = r - r2;
  const dg = g - g2;
  const db = b - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleBackground(data, width, height) {
  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
    [Math.floor(width / 2), 2],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const [x, y] of points) {
    const i = (y * width + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return [Math.round(r / points.length), Math.round(g / points.length), Math.round(b / points.length)];
}

function isBackground(r, g, b, bg) {
  return colorDist(r, g, b, bg[0], bg[1], bg[2]) < 52;
}

function keyBackground(data, width, height) {
  const bg = sampleBackground(data, width, height);
  const out = new Uint8Array(width * height * 4);
  let opaque = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isBackground(r, g, b, bg)) continue;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
      opaque += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { buffer: out, opaque, minX, minY, maxX, maxY, bg };
}

function quantize(buffer, width, height, box, cell) {
  const cols = Math.max(8, Math.round((box.maxX - box.minX + 1) / cell));
  const rows = Math.max(8, Math.round((box.maxY - box.minY + 1) / cell));
  const side = Math.max(cols, rows);
  const out = new Uint8Array(side * side * 4);
  const ox = Math.floor((side - cols) / 2);
  const oy = Math.floor((side - rows) / 2);
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const x0 = box.minX + Math.floor(gx * (box.maxX - box.minX + 1) / cols);
      const x1 = box.minX + Math.floor((gx + 1) * (box.maxX - box.minX + 1) / cols);
      const y0 = box.minY + Math.floor(gy * (box.maxY - box.minY + 1) / rows);
      const y1 = box.minY + Math.floor((gy + 1) * (box.maxY - box.minY + 1) / rows);
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = (y * width + x) * 4;
          if (buffer[i + 3] < 16) continue;
          r += buffer[i];
          g += buffer[i + 1];
          b += buffer[i + 2];
          n += 1;
        }
      }
      if (!n) continue;
      const cover = n / Math.max(1, (x1 - x0) * (y1 - y0));
      if (cover < 0.35) continue;
      const o = ((oy + gy) * side + (ox + gx)) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = 255;
    }
  }
  return { buffer: out, side };
}

async function findSource(dir, id) {
  for (const name of [`hab_${id}.jpg`, `hab_${id}.jpeg`, `hab_${id}.png`, `${id}.jpg`]) {
    const candidate = path.join(dir, name);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* próxima */
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const dirFlag = args.indexOf('--in-dir');
  if (dirFlag === -1 || !args[dirFlag + 1]) {
    console.error('Uso: node scripts/process-habitat-art.mjs --in-dir <pasta>');
    process.exit(1);
  }
  const inDir = path.resolve(args[dirFlag + 1]);
  await fs.mkdir(OUT_DIR, { recursive: true });
  const preserved = [];

  for (const id of IDS) {
    const source = await findSource(inDir, id);
    if (!source) {
      console.error(`em falta: ${id}`);
      process.exitCode = 1;
      continue;
    }
    const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const keyed = keyBackground(data, info.width, info.height);
    if (keyed.maxX < keyed.minX) {
      console.error(`sem sprite: ${id}`);
      process.exitCode = 1;
      continue;
    }
    const span = Math.max(keyed.maxX - keyed.minX + 1, keyed.maxY - keyed.minY + 1);
    const cell = Math.max(4, Math.round(span / 32));
    const grid = quantize(keyed.buffer, info.width, info.height, keyed, cell);
    const target = 64;
    const webp = await sharp(grid.buffer, {
      raw: { width: grid.side, height: grid.side, channels: 4 },
    })
      .resize(target, target, { kernel: 'nearest' })
      .webp({ lossless: true, effort: 4 })
      .toBuffer();
    await fs.writeFile(path.join(OUT_DIR, `${id}.webp`), webp);
    preserved.push(`habitats/${id}`);
    console.log(`${id}  grade ${grid.side}  fundo ${keyed.bg.join(',')}`);
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
