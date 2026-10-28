#!/usr/bin/env node
/**
 * Lista upgrades cujo WebP ainda é placeholder (tamanho < limiar) e imprime a próxima onda.
 *
 * Uso:
 *   node scripts/list-upgrade-art-queue.mjs
 *   node scripts/list-upgrade-art-queue.mjs --wave A|B|C|D|E|F|all
 *   node scripts/list-upgrade-art-queue.mjs --json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPGRADES } from '../js/hades-despertar/config/upgrades.js';
import { GENERATORS } from '../js/hades-despertar/config/generators.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UP_DIR = path.join(ROOT, 'assets', 'despertar', 'sprites', 'upgrades');
const ART_REQ = path.join(ROOT, 'assets', 'despertar', 'art-requests.json');
const PLACEHOLDER_MAX_BYTES = 1800;
const ILLUSTRATED = path.join(ROOT, 'assets', 'despertar', 'sprites', 'illustrated.json');

const GEN_BY_TIER = Object.fromEntries(GENERATORS.map((g) => [g.id, g.tier]));

function parseArgs(argv) {
  const waveFlag = argv.indexOf('--wave');
  const wave = waveFlag >= 0 ? String(argv[waveFlag + 1] || 'all').toUpperCase() : 'ALL';
  return { wave, json: argv.includes('--json') };
}

async function loadPriorityIds() {
  try {
    const doc = JSON.parse(await fs.readFile(ART_REQ, 'utf8'));
    const req = (doc.requests || []).find((r) => r.id === 'art_upgrades');
    return new Set(req?.upgradeIdsPriority || []);
  } catch {
    return new Set();
  }
}

function classify(def, priority) {
  if (priority.has(def.id)) return 'A';
  if (def.kind === 'clickMult' || def.kind === 'clickKSps') return 'B';
  if (def.kind === 'thousandBlades' || def.kind === 'thousandBladesMult') return 'B';
  const genId = def.generatorId || def.requires?.generatorId;
  const tier = genId ? GEN_BY_TIER[genId] : null;
  if (def.kind === 'synergyMult') {
    const a = GEN_BY_TIER[def.synergy?.a] || 0;
    const b = GEN_BY_TIER[def.synergy?.b] || 0;
    const maxT = Math.max(a, b);
    if (maxT <= 6) return 'C';
    if (maxT <= 12) return 'D';
    return 'E';
  }
  if (def.kind === 'generatorMult' || def.kind === 'grandmaType') {
    if (tier >= 1 && tier <= 6) return 'C';
    if (tier >= 7 && tier <= 12) return 'D';
    if (tier >= 13) return 'E';
  }
  return 'F';
}

async function loadPreserved() {
  try {
    const doc = JSON.parse(await fs.readFile(ILLUSTRATED, 'utf8'));
    return new Set(doc.preserveWebp || []);
  } catch {
    return new Set();
  }
}

async function main() {
  const { wave, json } = parseArgs(process.argv.slice(2));
  const priority = await loadPriorityIds();
  const preserved = await loadPreserved();

  const rows = [];
  for (const def of UPGRADES) {
    const file = path.join(UP_DIR, `${def.id}.webp`);
    let size = 0;
    let exists = false;
    try {
      const st = await fs.stat(file);
      size = st.size;
      exists = true;
    } catch {
      /* missing */
    }
    const waveId = classify(def, priority);
    const inIllustrated = preserved.has(`upgrades/${def.id}`);
    // Feito = protegido em illustrated E ficheiro presente com peso acima do limiar de letra vazia.
    const placeholder = !exists || (!inIllustrated && size < PLACEHOLDER_MAX_BYTES);
    rows.push({
      id: def.id,
      wave: waveId,
      kind: def.kind,
      bytes: size,
      placeholder,
      illustrated: inIllustrated,
    });
  }

  const filtered = rows.filter((r) => (wave === 'ALL' ? true : r.wave === wave));
  const pending = filtered.filter((r) => r.placeholder);
  const done = filtered.filter((r) => !r.placeholder);

  if (json) {
    console.log(JSON.stringify({
      wave,
      total: filtered.length,
      pending: pending.length,
      done: done.length,
      ids: pending.map((r) => r.id),
    }, null, 2));
    return;
  }

  console.log(`wave=${wave} catalog=${filtered.length} done=${done.length} pending=${pending.length} (limiar <${PLACEHOLDER_MAX_BYTES} B)`);
  const byWave = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  for (const r of rows.filter((x) => x.placeholder)) byWave[r.wave] += 1;
  console.log('pending por onda:', byWave);
  if (pending.length) {
    console.log('próximos (até 40):');
    for (const r of pending.slice(0, 40)) {
      console.log(`  ${r.wave}  ${r.id}  ${r.bytes}B  ${r.kind}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
