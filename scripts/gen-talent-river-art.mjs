#!/usr/bin/env node
/**
 * Ícones do Rio do Lethe (talents/) — motivos por efeito + cor da vertente.
 * Uso: node scripts/gen-talent-river-art.mjs
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { TALENTS } from '../js/hades-despertar/config/talents.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'assets', 'despertar', 'sprites', 'talents');
const MANIFEST = path.join(root, 'assets', 'despertar', 'sprites', 'manifest.json');
const SIZE = 128;
const QUALITY = 84;

const BRANCH_ACCENT = {
  margem: '#7ec8e3',
  imperio: '#d4a24a',
  memoria: '#9b8cff',
};

function svgShell(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" fill="none">
${inner}
</svg>
`;
}

function frame(accent, ring) {
  const rOuter = Math.max(40, 54 - Math.min(ring, 6) * 1.5);
  return `<circle cx="64" cy="64" r="${rOuter}" fill="#0c1218" fill-opacity="0.92" stroke="${accent}" stroke-width="3" stroke-opacity="0.88"/>
  <circle cx="64" cy="64" r="30" fill="${accent}" fill-opacity="0.12"/>`;
}

function soulsMotif(accent) {
  return `<ellipse cx="64" cy="70" rx="22" ry="28" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="2.5"/>
    <path d="M64 38 C52 52 50 68 64 96 C78 68 76 52 64 38Z" fill="${accent}" fill-opacity="0.75"/>
    <circle cx="58" cy="58" r="4" fill="#e8f4fa" fill-opacity="0.7"/>`;
}

function scytheMotif(accent) {
  return `<path d="M40 96 L52 40" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
    <path d="M52 40 Q80 30 98 52 Q78 46 58 52 Z" fill="${accent}" fill-opacity="0.88" stroke="${accent}" stroke-width="2"/>
    <circle cx="48" cy="94" r="6" fill="${accent}" fill-opacity="0.45"/>`;
}

function generatorMotif(accent, qty = 1) {
  const n = Math.min(5, Math.max(1, Math.round(Math.log10(Math.max(1, qty)) + 1)));
  let dots = '';
  for (let i = 0; i < n; i += 1) {
    const a = (-90 + (i * 360) / n) * (Math.PI / 180);
    const x = 64 + Math.cos(a) * 18;
    const y = 64 + Math.sin(a) * 18;
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${accent}" fill-opacity="0.55" stroke="${accent}" stroke-width="1.5"/>`;
  }
  return `${dots}
    <circle cx="64" cy="64" r="12" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2.5"/>`;
}

function costMultMotif(accent) {
  return `<path d="M40 72 Q64 36 88 72" fill="none" stroke="${accent}" stroke-width="4"/>
    <path d="M48 58 L34 48 L44 66 Z M80 58 L94 48 L84 66 Z" fill="${accent}"/>
    <circle cx="64" cy="84" r="12" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="2.5"/>
    <path d="M58 84 H70 M64 78 V90" stroke="#e8d4a8" stroke-width="2.5" stroke-linecap="round"/>`;
}

function mnemosyneMotif(accent) {
  return `<circle cx="64" cy="64" r="26" fill="none" stroke="${accent}" stroke-width="3" stroke-dasharray="4 5"/>
    <circle cx="64" cy="64" r="14" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2"/>
    <path d="M64 42 L68 58 L84 58 L72 68 L76 84 L64 74 L52 84 L56 68 L44 58 L60 58 Z" fill="#e8d4a8" fill-opacity="0.85"/>`;
}

function offlineMotif(accent) {
  return `<path d="M36 78 Q48 40 64 48 Q80 40 92 78" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="3"/>
    <circle cx="52" cy="64" r="6" fill="${accent}" fill-opacity="0.6"/>
    <circle cx="76" cy="64" r="6" fill="${accent}" fill-opacity="0.6"/>
    <path d="M48 88 H80" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`;
}

function styxMotif(accent) {
  return `<path d="M40 88 C36 56 52 32 64 24 C76 32 92 56 88 88 C76 104 52 104 40 88 Z" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="3"/>
    <path d="M50 70 Q64 50 78 70" fill="none" stroke="#e8d4a8" stroke-width="2.5"/>
    <circle cx="64" cy="78" r="5" fill="#e8d4a8"/>`;
}

function dragonMotif(accent) {
  return `<ellipse cx="64" cy="68" rx="28" ry="18" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2.5"/>
    <path d="M40 60 Q52 36 64 48 Q76 36 88 60" fill="none" stroke="${accent}" stroke-width="3"/>
    <circle cx="52" cy="62" r="4" fill="#0c1218"/><circle cx="76" cy="62" r="4" fill="#0c1218"/>
    <path d="M58 74 Q64 80 70 74" fill="none" stroke="#e8d4a8" stroke-width="2"/>`;
}

function nectarMotif(accent) {
  return `<path d="M48 40 H80 L76 72 Q64 96 52 72 Z" fill="${accent}" fill-opacity="0.4" stroke="${accent}" stroke-width="3"/>
    <ellipse cx="64" cy="40" rx="18" ry="6" fill="${accent}" fill-opacity="0.55" stroke="${accent}" stroke-width="2"/>
    <circle cx="64" cy="66" r="8" fill="#e8d4a8" fill-opacity="0.7"/>`;
}

function seasonMotif(accent) {
  return `<polygon points="64,28 74,54 102,54 80,70 88,96 64,80 40,96 48,70 26,54 54,54" fill="${accent}" fill-opacity="0.4" stroke="${accent}" stroke-width="2.5"/>
    <circle cx="64" cy="64" r="8" fill="#e8d4a8"/>`;
}

function synergyMotif(accent) {
  return `<circle cx="48" cy="64" r="18" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="2.5"/>
    <circle cx="80" cy="64" r="18" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="2.5"/>
    <path d="M58 56 L70 72 M70 56 L58 72" stroke="#e8d4a8" stroke-width="3"/>`;
}

function eyeMotif(accent) {
  return `<ellipse cx="64" cy="64" rx="30" ry="18" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="3"/>
    <circle cx="64" cy="64" r="10" fill="${accent}" fill-opacity="0.7" stroke="#e8d4a8" stroke-width="2"/>
    <circle cx="64" cy="64" r="4" fill="#0c1218"/>`;
}

function bonusGenMotif(accent) {
  return `<rect x="40" y="44" width="48" height="40" rx="6" fill="${accent}" fill-opacity="0.3" stroke="${accent}" stroke-width="2.5"/>
    <path d="M48 64 H80 M64 52 V76" stroke="#e8d4a8" stroke-width="3" stroke-linecap="round"/>
    <circle cx="52" cy="56" r="4" fill="${accent}"/><circle cx="76" cy="56" r="4" fill="${accent}"/>
    <circle cx="52" cy="72" r="4" fill="${accent}"/><circle cx="76" cy="72" r="4" fill="${accent}"/>`;
}

function effectMotif(effects, accent) {
  const fx = effects || {};
  if (fx.kSps != null) return scytheMotif(accent);
  if (fx.startingSouls != null) return soulsMotif(accent);
  if (fx.startingGeneratorId != null || fx.startingGeneratorQty != null) {
    return generatorMotif(accent, Number(fx.startingGeneratorQty) || 1);
  }
  if (fx.startingGeneratorBonus) return bonusGenMotif(accent);
  if (fx.generatorCostMult != null) return costMultMotif(accent);
  if (fx.mnemosyneMult != null || fx.mnemosyneGainMult != null) return mnemosyneMotif(accent);
  if (fx.offlineHours != null || fx.offlineExtraHours != null || fx.offlineEfficiency != null) {
    return offlineMotif(accent);
  }
  if (fx.softPrestigeStyx || fx.softPrestigeStyxCount != null) return styxMotif(accent);
  if (fx.dragonUnlock) return dragonMotif(accent);
  if (fx.nectarReserveBonus || fx.nectarFrenzyUnlock) return nectarMotif(accent);
  if (fx.seasonSwitcherUnlock) return seasonMotif(accent);
  if (fx.synergyVolUnlock != null) return synergyMotif(accent);
  if (fx.richAmort) return eyeMotif(accent);
  // Fallback mínimo: gota (sem letra como elemento principal)
  return `<path d="M64 34 C48 54 46 78 64 98 C82 78 80 54 64 34Z" fill="${accent}" fill-opacity="0.65" stroke="${accent}" stroke-width="2"/>`;
}

function talentSvg(talent) {
  const accent = BRANCH_ACCENT[talent.branch] || '#a8c0d0';
  const ring = Math.max(0, Number(talent.ring) || 0);
  return svgShell(`
  ${frame(accent, ring)}
  ${effectMotif(talent.effects, accent)}
`);
}

async function writeIcon(talent) {
  const svg = talentSvg(talent);
  const base = path.join(OUT, talent.id);
  await fs.writeFile(`${base}.svg`, svg, 'utf8');
  await sharp(Buffer.from(svg)).webp({ quality: QUALITY }).toFile(`${base}.webp`);
  return {
    webp: `talents/${talent.id}.webp`,
    svg: `talents/${talent.id}.svg`,
  };
}

async function patchManifest(entries) {
  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  } catch {
    manifest = {};
  }
  if (!manifest.talents || typeof manifest.talents !== 'object') {
    manifest.talents = {};
  }
  for (const [id, paths] of Object.entries(entries)) {
    manifest.talents[id] = {
      webp: paths.webp,
      svg: paths.svg,
    };
  }
  await fs.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const entries = {};
  for (const talent of TALENTS) {
    entries[talent.id] = await writeIcon(talent);
  }
  await patchManifest(entries);
  console.log(`OK — ${TALENTS.length} talent icons → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
