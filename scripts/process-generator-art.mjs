#!/usr/bin/env node
/**
 * Recorta ícones brutos dos geradores (Gemini) para WebP 128² RGBA.
 * Flood-fill estrito: só come o fundo ligado às bordas, para não devorar
 * volumes de obsidiana que são quase pretos.
 *
 * Uso:
 *   node scripts/process-generator-art.mjs --in-dir <pasta-com-jpg>
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { trimAndCenterIcon } from './process-achievement-art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'despertar', 'sprites', 'generators');
const ILLUSTRATED = path.join(ROOT, 'assets', 'despertar', 'sprites', 'illustrated.json');
const TARGET = 128;

const GENERATOR_IDS = [
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

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function estimateBorderBackgroundColor(data, width, height) {
  const samples = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 64));
  for (let x = 0; x < width; x += step) {
    for (const y of [0, 1, height - 2, height - 1]) {
      const idx = (y * width + x) * 4;
      samples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  for (let y = 0; y < height; y += step) {
    for (const x of [0, 1, width - 2, width - 1]) {
      const idx = (y * width + x) * 4;
      samples.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  samples.sort((a, b) => luminance(a[0], a[1], a[2]) - luminance(b[0], b[1], b[2]));
  return samples[Math.floor(samples.length * 0.35)] || [10, 10, 15];
}

/**
 * O desenho ctoniano é quase preto sobre preto. Um flood-fill por cor
 * apaga o miolo. Aqui o filete (ouro, teal, brasa) fecha o contorno e
 * o interior vira obsidiana opaca; o campo ligado à borda sai.
 */
function removeEdgeBackground(rawBuffer, width, height) {
  const data = new Uint8Array(rawBuffer);
  const total = width * height;
  const [bgR, bgG, bgB] = estimateBorderBackgroundColor(data, width, height);
  const ink = new Uint8Array(total);

  for (let p = 0; p < total; p += 1) {
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const d = colorDist(r, g, b, bgR, bgG, bgB);
    const lum = luminance(r, g, b);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    // Campo escuro saturado (teal da borda) não é traço.
    if (d > 22 || lum > 30 || (sat > 0.35 && lum > 28)) ink[p] = 1;
  }

  const barrier = new Uint8Array(ink);
  const bridge = 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!ink[y * width + x]) continue;
      for (let dy = -bridge; dy <= bridge; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -bridge; dx <= bridge; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          barrier[ny * width + nx] = 1;
        }
      }
    }
  }

  const exterior = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  function push(p) {
    if (exterior[p] || barrier[p]) return;
    exterior[p] = 1;
    queue[tail++] = p;
  }
  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const curr = queue[head++];
    const cx = curr % width;
    const neighbors = [curr - 1, curr + 1, curr - width, curr + width];
    for (let n = 0; n < 4; n += 1) {
      const next = neighbors[n];
      if (next < 0 || next >= total || exterior[next] || barrier[next]) continue;
      const nx = next % width;
      if (Math.abs(nx - cx) > 1) continue;
      exterior[next] = 1;
      queue[tail++] = next;
    }
  }

  let opaque = 0;
  for (let p = 0; p < total; p += 1) {
    const i = p * 4;
    if (exterior[p]) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      continue;
    }
    data[i + 3] = 255;
    opaque += 1;
    const lum = luminance(data[i], data[i + 1], data[i + 2]);
    const d = colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB);
    if (lum < 16 && d < 22) {
      data[i] = 14;
      data[i + 1] = 16;
      data[i + 2] = 22;
    }
  }

  return { buffer: Buffer.from(data.buffer), opaqueRatio: opaque / total, bg: [bgR, bgG, bgB] };
}

async function findSource(dir, id) {
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    const candidate = path.join(dir, `${id}${ext}`);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* tenta a próxima extensão */
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const dirFlag = args.indexOf('--in-dir');
  if (dirFlag === -1 || !args[dirFlag + 1]) {
    console.error('Uso: node scripts/process-generator-art.mjs --in-dir <pasta>');
    process.exit(1);
  }
  const inDir = path.resolve(args[dirFlag + 1]);
  await fs.mkdir(OUT_DIR, { recursive: true });

  const preserved = [];
  for (const id of GENERATOR_IDS) {
    const source = await findSource(inDir, id);
    if (!source) {
      console.error(`em falta: ${id}`);
      process.exitCode = 1;
      continue;
    }
    const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cleaned = removeEdgeBackground(data, info.width, info.height);
    const webp = await trimAndCenterIcon(cleaned.buffer, info.width, info.height, TARGET);
    const outPath = path.join(OUT_DIR, `${id}.webp`);
    await fs.writeFile(outPath, webp);
    preserved.push(`generators/${id}`);
    const pct = (cleaned.opaqueRatio * 100).toFixed(1);
    console.log(`${id}  opaco ${pct}%  fundo ${cleaned.bg.join(',')}  ${info.width}x${info.height}`);
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
  console.log(`illustrated.json: ${doc.preserveWebp.length} webp protegidos`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
