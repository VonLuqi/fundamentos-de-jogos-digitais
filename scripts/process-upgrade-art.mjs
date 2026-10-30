#!/usr/bin/env node
/**
 * Pós-processa ícones brutos (Gemini / GenerateImage) → WebP 128² RGBA em sprites/<pasta>/.
 * Flood-fill só na borda (obsidiana interna preservada), trim+center, protege em illustrated.json
 * (sem isso `npm run despertar:sprites` volta o placeholder). O SVG da pasta não é tocado:
 * ele é a referência que `npm run despertar:status` usa para saber que o WebP foi pintado.
 *
 * Uso:
 *   npm run despertar:art -- --in-dir <pasta-com-{id}.png|jpg|webp>                 (upgrades)
 *   npm run despertar:art -- --folder minigames --in-dir <pasta> [--ids id1,id2]
 * Pastas: upgrades, talents, minigames, seasons, catabase, veil, shimmers.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { trimAndCenterIcon, liftSubjectVisibility } from './process-achievement-art.mjs';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { writeArtVersions } from './update-art-versions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = path.join(ROOT, 'assets', 'despertar', 'sprites');
const ILLUSTRATED = path.join(SPRITES, 'illustrated.json');
const TARGET = 128;
const ICON_FOLDERS = ['upgrades', 'talents', 'minigames', 'seasons', 'catabase', 'veil', 'shimmers'];

/** IDs válidos da pasta: catálogo para upgrades; sprites existentes (SVG/WebP) nas demais. */
async function knownIds(folder) {
  if (folder === 'upgrades') return UPGRADES.map((u) => u.id);
  const files = await fs.readdir(path.join(SPRITES, folder));
  return [...new Set(files.filter((f) => /\.(svg|webp)$/.test(f)).map((f) => f.replace(/\.(svg|webp)$/, '')))];
}

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
    const a = data[i + 3];
    if (a < 12) {
      ink[p] = 0;
      continue;
    }
    const d = colorDist(r, g, b, bgR, bgG, bgB);
    const lum = luminance(r, g, b);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
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
  }

  liftSubjectVisibility(data, { alphaFloor: 235, lumFloor: 48 });

  return { buffer: Buffer.from(data.buffer), opaqueRatio: opaque / total, bg: [bgR, bgG, bgB] };
}

async function findSource(dir, id) {
  for (const ext of ['.png', '.webp', '.jpg', '.jpeg']) {
    const candidate = path.join(dir, `${id}${ext}`);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* next */
    }
  }
  return null;
}

function parseIds(args) {
  const flag = args.indexOf('--ids');
  if (flag === -1 || !args[flag + 1]) return null;
  return args[flag + 1]
    .split(/[,:\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const args = process.argv.slice(2);
  const dirFlag = args.indexOf('--in-dir');
  const folderFlag = args.indexOf('--folder');
  const folder = folderFlag === -1 ? 'upgrades' : String(args[folderFlag + 1] || '');
  if (dirFlag === -1 || !args[dirFlag + 1] || !ICON_FOLDERS.includes(folder)) {
    console.error(`Uso: npm run despertar:art -- [--folder ${ICON_FOLDERS.join('|')}] --in-dir <pasta> [--ids id1,id2]`);
    process.exit(1);
  }
  const inDir = path.resolve(args[dirFlag + 1]);
  const OUT_DIR = path.join(SPRITES, folder);
  const ALL_IDS = await knownIds(folder);
  const only = parseIds(args);
  const ids = only || ALL_IDS;
  await fs.mkdir(OUT_DIR, { recursive: true });

  const preserved = [];
  let ok = 0;
  let missing = 0;

  for (const id of ids) {
    if (!ALL_IDS.includes(id)) {
      console.error(`id desconhecido em ${folder}/ (pulado): ${id}`);
      process.exitCode = 1;
      continue;
    }
    const source = await findSource(inDir, id);
    if (!source) {
      console.error(`em falta: ${id}`);
      missing += 1;
      process.exitCode = 1;
      continue;
    }
    const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cleaned = removeEdgeBackground(data, info.width, info.height);
    const webpSoft = await trimAndCenterIcon(cleaned.buffer, info.width, info.height, TARGET);
    // Resize 128² introduz AA semi-transparente — fecha o sujeito de novo.
    const { data: sized, info: sizedInfo } = await sharp(webpSoft)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < sized.length; i += 4) {
      const a = sized[i + 3];
      if (a > 12 && a < 250) sized[i + 3] = 255;
    }
    liftSubjectVisibility(sized, { alphaFloor: 250, lumFloor: 48 });
    const webp = await sharp(sized, {
      raw: { width: sizedInfo.width, height: sizedInfo.height, channels: 4 },
    })
      .webp({ quality: 90, alphaQuality: 100 })
      .toBuffer();
    await fs.writeFile(path.join(OUT_DIR, `${id}.webp`), webp);
    preserved.push(`${folder}/${id}`);
    ok += 1;
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
  console.log(`ok=${ok} missing=${missing} illustrated.json=${doc.preserveWebp.length}`);
  // Troca a URL dos sprites da pasta: sem isso o WebP antigo fica 7 dias em cache.
  if (ok > 0) writeArtVersions();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
