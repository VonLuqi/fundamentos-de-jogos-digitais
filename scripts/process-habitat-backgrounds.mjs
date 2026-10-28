#!/usr/bin/env node
/**
 * Chão pixel art das prateleiras: tile 64×64 com textura, sem cenário.
 * Uso: node scripts/process-habitat-backgrounds.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'despertar', 'sprites', 'habitats', 'backgrounds');
const ILLUSTRATED = path.join(ROOT, 'assets', 'despertar', 'sprites', 'illustrated.json');
const S = 64;

const IDS = [
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

function hash(x, y, salt = 0) {
  let n = Math.imul((x + 1) ^ (salt * 17), 374761393) ^ Math.imul(y + 19, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

function roll(x, y, salt) {
  return hash(x, y, salt) % 1000;
}

function buf() {
  return new Uint8Array(S * S * 4);
}

function put(px, x, y, rgb) {
  const xx = ((x % S) + S) % S;
  const yy = ((y % S) + S) % S;
  const i = (yy * S + xx) * 4;
  px[i] = rgb[0];
  px[i + 1] = rgb[1];
  px[i + 2] = rgb[2];
  px[i + 3] = 255;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Laje em fileira alternada. Cada pedra tem grão; a junta leva um acento raro.
 */
function stoneFloor(px, cell, tall, colors, grout, accent, salt) {
  for (let y = 0; y < S; y += 1) {
    const row = Math.floor(y / tall);
    const shift = (row % 2) * Math.floor(cell / 2);
    const localY = y % tall;
    for (let x = 0; x < S; x += 1) {
      const sx = (x + shift) % S;
      const localX = sx % cell;
      const col = Math.floor(sx / cell);
      const edge = localX === 0 || localY === 0;
      if (edge) {
        const joint = roll(col, row, salt + 3) > 920 && localX !== 0 && localY === 0
          ? accent
          : grout;
        put(px, x, y, joint);
        continue;
      }
      const tone = colors[roll(col, row, salt) % colors.length];
      const n = roll(x, y, salt + 9);
      let rgb = tone;
      if (n > 860) rgb = mix(tone, [255, 255, 255], 0.18);
      else if (n < 120) rgb = mix(tone, [0, 0, 0], 0.35);
      else if (n > 760 && n < 790) rgb = mix(tone, accent, 0.55);
      if (localX === 1 || localY === 1) rgb = mix(rgb, grout, 0.45);
      put(px, x, y, rgb);
    }
  }
}

/** Água do Estige: ondulação que fecha nas bordas do tile. */
function waterFloor(px, deep, body, crest, glint, salt) {
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const s1 = Math.sin((x / S) * Math.PI * 2);
      const s2 = Math.sin((x / S) * Math.PI * 4 + 1.1);
      const yy = y + Math.round(s1 * 1.4 + s2 * 0.7);
      const band = ((yy % 8) + 8) % 8;
      const n = roll(x, y, salt);
      let rgb = body;
      if (band === 0 || band === 1 || band === 6) rgb = deep;
      else if (band === 3) rgb = mix(body, crest, 0.72);
      else if (band === 4) rgb = mix(body, crest, 0.28);
      if (n > 930) rgb = mix(rgb, [0, 0, 0], 0.35);
      else if (n < 40) rgb = mix(rgb, crest, 0.35);
      if (band === 3 && n > 970) rgb = glint;
      put(px, x, y, rgb);
    }
  }
}

/** Tábuas com veio, nó e fresta. A soma das alturas fecha o tile. */
function plankFloor(px, heights, boards, gap, grain, salt) {
  let y = 0;
  let row = 0;
  for (const h of heights) {
    const seam = (row % 2) * 16;
    const knotX = 6 + (roll(row, 2, salt) % (S - 12));
    const knotY = 2 + (roll(row, 4, salt) % Math.max(1, h - 4));
    for (let dy = 0; dy < h; dy += 1) {
      const board = boards[row % boards.length];
      for (let x = 0; x < S; x += 1) {
        if (dy === h - 1) {
          put(px, x, y + dy, gap);
          continue;
        }
        const onSeam = x % 32 === seam;
        let rgb = board;
        if (onSeam) rgb = mix(board, [0, 0, 0], 0.55);
        else if ((x + row * 3) % 7 === 0) rgb = mix(board, grain, 0.35);
        else if (roll(x, y + dy, salt) > 900) rgb = mix(board, [255, 255, 255], 0.12);
        const dx = Math.abs(x - knotX);
        const ddy = Math.abs(dy - knotY);
        if (dx + ddy <= 1 && h > 6) rgb = mix(board, grain, 0.7);
        put(px, x, y + dy, rgb);
      }
    }
    y += h;
    row += 1;
  }
}

function paint(id) {
  const px = buf();
  switch (id) {
    case 'charon_servants':
      waterFloor(
        px,
        [6, 22, 24],
        [10, 40, 40],
        [18, 96, 90],
        [120, 210, 196],
        1,
      );
      break;
    case 'cerberian_hound':
      stoneFloor(
        px, 8, 8,
        [[42, 40, 48], [34, 32, 40], [50, 46, 52], [28, 26, 34]],
        [14, 12, 16],
        [168, 120, 48],
        2,
      );
      break;
    case 'tartarus_judge':
      stoneFloor(
        px, 16, 16,
        [[108, 106, 122], [92, 90, 108], [120, 118, 134], [80, 78, 96]],
        [58, 56, 70],
        [196, 164, 88],
        3,
      );
      break;
    case 'phlegethon_forge':
      stoneFloor(
        px, 8, 8,
        [[48, 24, 26], [36, 18, 20], [58, 28, 28], [28, 14, 16]],
        [18, 8, 10],
        [196, 36, 32],
        4,
      );
      break;
    case 'obsidian_throne':
      stoneFloor(
        px, 16, 16,
        [[26, 26, 32], [18, 18, 24], [34, 32, 38], [14, 14, 18]],
        [8, 8, 12],
        [207, 167, 89],
        5,
      );
      break;
    case 'mnemosyne_temple':
      stoneFloor(
        px, 12, 12,
        [[58, 46, 78], [46, 36, 64], [70, 54, 92], [38, 30, 54]],
        [24, 16, 36],
        [168, 110, 210],
        6,
      );
      break;
    case 'styx_tower':
      stoneFloor(
        px, 10, 8,
        [[28, 42, 44], [22, 34, 36], [36, 50, 50], [16, 26, 28]],
        [8, 18, 20],
        [0, 168, 150],
        7,
      );
      break;
    case 'star_barge':
      plankFloor(
        px,
        [8, 10, 7, 9, 8, 7, 8, 7],
        [[32, 36, 54], [24, 28, 44], [40, 44, 64], [20, 22, 36]],
        [8, 10, 18],
        [120, 110, 70],
        8,
      );
      break;
    case 'tartarus_lab':
      stoneFloor(
        px, 8, 10,
        [[48, 50, 36], [38, 40, 28], [58, 56, 40], [30, 34, 24]],
        [16, 18, 12],
        [168, 148, 64],
        9,
      );
      break;
    case 'erebus_portal':
      stoneFloor(
        px, 8, 8,
        [[32, 22, 44], [24, 16, 34], [42, 28, 56], [18, 12, 26]],
        [10, 8, 16],
        [150, 70, 190],
        10,
      );
      break;
    case 'chronos_loom':
      plankFloor(
        px,
        [7, 9, 8, 6, 10, 8, 9, 7],
        [[64, 50, 32], [52, 40, 26], [74, 58, 36], [44, 34, 22]],
        [36, 28, 16],
        [150, 120, 54],
        11,
      );
      break;
    case 'void_condenser':
      stoneFloor(
        px, 16, 16,
        [[24, 32, 40], [18, 24, 32], [32, 40, 48], [14, 18, 24]],
        [8, 12, 16],
        [0, 168, 150],
        12,
      );
      break;
    case 'moirai_prism':
      stoneFloor(
        px, 8, 12,
        [[42, 34, 58], [34, 26, 48], [54, 42, 70], [26, 20, 38]],
        [16, 12, 24],
        [190, 150, 230],
        13,
      );
      break;
    case 'fate_forge':
      stoneFloor(
        px, 10, 8,
        [[54, 40, 26], [42, 30, 18], [64, 46, 28], [32, 22, 14]],
        [16, 10, 8],
        [210, 110, 36],
        14,
      );
      break;
    case 'fractal_engine':
      stoneFloor(
        px, 8, 8,
        [[18, 32, 32], [14, 24, 26], [26, 42, 40], [10, 18, 20]],
        [8, 14, 14],
        [32, 140, 128],
        15,
      );
      break;
    case 'oracle_console':
      stoneFloor(
        px, 16, 8,
        [[28, 30, 36], [20, 22, 28], [36, 38, 44], [16, 18, 22]],
        [10, 12, 14],
        [0, 180, 160],
        16,
      );
      break;
    case 'chthonic_idleverse':
      stoneFloor(
        px, 12, 12,
        [[22, 24, 40], [16, 18, 32], [30, 32, 50], [12, 14, 24]],
        [8, 8, 16],
        [207, 167, 89],
        17,
      );
      break;
    case 'cortex_baker':
      stoneFloor(
        px, 8, 8,
        [[72, 54, 40], [60, 44, 34], [84, 62, 46], [48, 36, 28]],
        [42, 24, 52],
        [210, 180, 130],
        18,
      );
      break;
    case 'the_emperor':
      stoneFloor(
        px, 16, 16,
        [[28, 26, 30], [20, 18, 22], [36, 32, 34], [14, 12, 16]],
        [92, 74, 40],
        [232, 204, 140],
        19,
      );
      break;
    default:
      stoneFloor(px, 8, 8, [[32, 32, 36]], [12, 12, 14], [80, 80, 80], 0);
  }
  return px;
}

async function rememberIllustrated() {
  const doc = JSON.parse(await fs.readFile(ILLUSTRATED, 'utf8'));
  const set = new Set(doc.preserveWebp || []);
  for (const id of IDS) set.add(`habitats/backgrounds/${id}`);
  doc.preserveWebp = [...set].sort();
  await fs.writeFile(ILLUSTRATED, `${JSON.stringify(doc, null, 2)}\n`);
}

await fs.mkdir(OUT_DIR, { recursive: true });
for (const id of IDS) {
  await sharp(paint(id), { raw: { width: S, height: S, channels: 4 } })
    .webp({ lossless: true })
    .toFile(path.join(OUT_DIR, `${id}.webp`));
  console.log(id, `${S}x${S}`);
}
await rememberIllustrated();
console.log(`wrote ${IDS.length} floors`);
