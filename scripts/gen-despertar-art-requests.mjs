#!/usr/bin/env node
/**
 * Atualiza a lista P2 (capas Juízo sem arquivo) em art-requests.json — Task B4.
 * Uso: npm run despertar:art-requests
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestsPath = path.join(root, 'assets', 'despertar', 'art-requests.json');
const stubPath = path.join(root, 'data', 'despertar-juizo-pool.stub.json');
const coverDirs = [
  path.join(root, 'assets', 'classind-dle', 'covers'),
  path.join(root, 'assets', 'despertar-juizo', 'covers'),
];

async function listExisting() {
  const set = new Set();
  for (const dir of coverDirs) {
    try {
      const files = await fs.readdir(dir);
      files.forEach((f) => set.add(f.toLowerCase()));
    } catch {
      /* pasta opcional */
    }
  }
  return set;
}

async function main() {
  const raw = await fs.readFile(requestsPath, 'utf8');
  const doc = JSON.parse(raw);
  const stub = JSON.parse(await fs.readFile(stubPath, 'utf8'));
  const existing = await listExisting();

  const fileMissing = [];
  let nullCover = 0;
  for (const game of stub.games || []) {
    if (!game.cover) {
      nullCover += 1;
      continue;
    }
    if (!existing.has(String(game.cover).toLowerCase())) {
      fileMissing.push(String(game.cover));
    }
  }
  fileMissing.sort();

  const target = (doc.requests || []).find((r) => r.id === 'art_juizo_covers');
  if (!target) {
    throw new Error('Pedido art_juizo_covers ausente em art-requests.json');
  }
  target.fileMissing = fileMissing;
  target.nullCoverCount = nullCover;
  target.notes = `Há ~${nullCover} entradas com cover:null no stub — editorial. `
    + 'Esta lista P2 é só arquivo ausente com nome já declarado '
    + '(npm run despertar:art-requests regenera).';

  doc.updated = new Date().toISOString().slice(0, 10);
  await fs.writeFile(requestsPath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  console.log(`P2 fileMissing=${fileMissing.length} nullCover≈${nullCover}`);
  fileMissing.forEach((f) => console.log(` - ${f}`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
