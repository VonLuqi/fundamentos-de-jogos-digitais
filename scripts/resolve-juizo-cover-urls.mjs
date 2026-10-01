#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'docs', 'load-results', 'juizo-cover-url-overrides.json');

const wiki = {
  'death-stranding-2': ['Death Stranding 2', 'Death Stranding 2: On the Beach'],
  'fire-emblem-three-houses': ['Fire Emblem: Three Houses'],
  'xenoblade-chronicles-3': ['Xenoblade Chronicles 3'],
  'mario-kart-8-deluxe': ['Mario Kart 8 Deluxe', 'Mario Kart 8'],
  'pikmin-4': ['Pikmin 4'],
  'metroid-dread': ['Metroid Dread'],
  'metroid-prime-remastered': ['Metroid Prime Remastered', 'Metroid Prime'],
  'gran-turismo-7': ['Gran Turismo 7'],
  'warioware-move-it': ['WarioWare: Move It!', 'WarioWare'],
  'rhythm-heaven-megamix': ['Rhythm Heaven Megamix', 'Rhythm Heaven'],
  'jet-set-radio': ['Jet Set Radio'],
  'tetris-99': ['Tetris 99', 'Tetris'],
  'diablo-ii-resurrected': ['Diablo II: Resurrected', 'Diablo II'],
  'warcraft-iii-reforged': ['Warcraft III: Reforged', 'Warcraft III'],
  'starcraft-remastered': ['StarCraft: Remastered', 'StarCraft'],
  'starcraft-ii': ['StarCraft II', 'StarCraft II: Wings of Liberty'],
  'demon-s-souls': ["Demon's Souls", "Demon's Souls (2020)"],
  'castlevania-symphony-of-the-night': ['Castlevania: Symphony of the Night'],
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pageImage(lang, title) {
  const api = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=1200&origin=*`;
  const res = await fetch(api, { headers: { 'User-Agent': 'Mozilla/5.0 EducJuizoCover/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const page = Object.values(json.query?.pages || {})[0];
  return page?.thumbnail?.source ? String(page.thumbnail.source).split('?')[0] : null;
}

const overrides = {};
for (const [id, titles] of Object.entries(wiki)) {
  let found = null;
  for (const title of titles) {
    for (const lang of ['pt', 'en']) {
      await sleep(1500);
      try {
        const src = await pageImage(lang, title);
        if (src) {
          found = src;
          console.log(`OK  ${id} ← ${lang}:${title}`);
          break;
        }
        console.log(`MISS ${id} ${lang}:${title}`);
      } catch (error) {
        console.log(`ERR  ${id} ${lang}:${title} ${error.message}`);
      }
    }
    if (found) break;
  }
  if (found) overrides[id] = found;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(overrides, null, 2));
console.log(`saved ${Object.keys(overrides).length} → ${outPath}`);
