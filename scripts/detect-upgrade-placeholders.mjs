#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets', 'despertar', 'sprites', 'upgrades');

const diamond = [];
const simpleFoice = [];
const tiny = [];
const finalArtSvg = []; // gen-upgrade-final-art style (grain + motif) — still not painted

for (const u of UPGRADES) {
  const svgPath = path.join(DIR, `${u.id}.svg`);
  const webpPath = path.join(DIR, `${u.id}.webp`);
  let svg = '';
  try {
    svg = fs.readFileSync(svgPath, 'utf8');
  } catch {
    /* missing */
  }
  let bytes = 0;
  try {
    bytes = fs.statSync(webpPath).size;
  } catch {
    /* missing */
  }

  const isDiamond = svg.includes('M64 36 L72 58 L64 70 L56 58 Z') && svg.includes('font-size="22"');
  const isSimpleFoice = /wave:[A-F] kind:clickMult/.test(svg)
    || (svg.includes('M40 92 L52 36') && svg.includes('<!-- wave:') && bytes < 4500);
  const isFinalSvg = svg.includes('Grão ctoniano') || (svg.includes('<!-- wave:') && !isDiamond && !isSimpleFoice && bytes < 6000);
  const isTiny = bytes > 0 && bytes < 1800;

  if (isDiamond) diamond.push({ id: u.id, name: u.name, kind: u.kind, bytes });
  else if (isSimpleFoice) simpleFoice.push({ id: u.id, name: u.name, kind: u.kind, bytes });
  else if (isTiny) tiny.push({ id: u.id, name: u.name, kind: u.kind, bytes });
  else if (isFinalSvg && bytes < 3500) finalArtSvg.push({ id: u.id, name: u.name, kind: u.kind, bytes });
}

const all = [...diamond, ...simpleFoice, ...tiny];
const uniq = new Map(all.map((r) => [r.id, r]));
console.log(JSON.stringify({
  diamond: diamond.length,
  simpleFoice: simpleFoice.length,
  tiny: tiny.length,
  finalArtSvgLight: finalArtSvg.length,
  totalUnique: uniq.size,
  ids: [...uniq.keys()],
  rows: [...uniq.values()],
}, null, 2));
