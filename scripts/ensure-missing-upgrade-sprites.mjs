#!/usr/bin/env node
/** Garante stubs SVG+WebP + entradas de manifest para upgrades/talentos sem arte. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { TALENTS } from '../js/hades-despertar/config/talents.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'assets/despertar/sprites/manifest.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
manifest.upgrades ||= {};
manifest.talents ||= {};
const SIZE = 128;

function svgFor(id, label, hue) {
  const safe = String(label).replace(/[<&]/g, '').slice(0, 12);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" fill="none">
  <rect width="${SIZE}" height="${SIZE}" rx="16" fill="hsl(${hue} 35% 18%)"/>
  <circle cx="64" cy="56" r="28" fill="none" stroke="hsl(${hue} 55% 58%)" stroke-width="6"/>
  <path d="M40 88 Q64 72 88 88" fill="none" stroke="hsl(${hue} 50% 65%)" stroke-width="4"/>
  <text x="64" y="116" text-anchor="middle" font-size="10" fill="#cfa759">${safe}</text>
</svg>`;
}

async function writePair(dir, id, svg) {
  await fs.mkdir(dir, { recursive: true });
  const svgPath = path.join(dir, `${id}.svg`);
  const webpPath = path.join(dir, `${id}.webp`);
  await fs.writeFile(svgPath, svg);
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(webpPath);
}

async function ensureUpgrade(def, i) {
  const entry = manifest.upgrades[def.id] || {};
  const dir = path.join(root, 'assets/despertar/sprites/upgrades');
  const webpAbs = path.join(dir, `${def.id}.webp`);
  const svgAbs = path.join(dir, `${def.id}.svg`);
  const needs = !(await exists(webpAbs)) || !(await exists(svgAbs));
  if (needs) {
    await writePair(dir, def.id, svgFor(def.id, def.name, (i * 17) % 360));
  }
  const before = JSON.stringify(entry);
  manifest.upgrades[def.id] = {
    name: def.name,
    kind: def.kind,
    webp: `upgrades/${def.id}.webp`,
    svg: `upgrades/${def.id}.svg`,
    size: SIZE,
  };
  return needs || before !== JSON.stringify(manifest.upgrades[def.id]);
}

async function ensureTalent(def, i) {
  const entry = manifest.talents?.[def.id] || {};
  const dir = path.join(root, 'assets/despertar/sprites/talents');
  const webpAbs = path.join(dir, `${def.id}.webp`);
  const svgAbs = path.join(dir, `${def.id}.svg`);
  const needs = !(await exists(webpAbs)) || !(await exists(svgAbs));
  if (needs) {
    await writePair(dir, def.id, svgFor(def.id, def.name, 200 + ((i * 11) % 80)));
  }
  manifest.talents[def.id] = {
    name: def.name,
    branch: def.branch,
    webp: `talents/${def.id}.webp`,
    svg: `talents/${def.id}.svg`,
    size: SIZE,
  };
  return needs || !entry.webp;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

let n = 0;
for (let i = 0; i < UPGRADES.length; i += 1) {
  if (await ensureUpgrade(UPGRADES[i], i)) n += 1;
}
for (let i = 0; i < TALENTS.length; i += 1) {
  if (await ensureTalent(TALENTS[i], i)) n += 1;
}
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`ensure-missing-upgrade-sprites: updated ${n}`);
