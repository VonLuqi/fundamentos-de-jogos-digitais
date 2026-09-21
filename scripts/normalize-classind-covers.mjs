#!/usr/bin/env node
/**
 * Padroniza capas do ClassInd-dle → WebP 600×800, slug canônico.
 * Escreve em staging e substitui a pasta (evita EPERM no Windows).
 *
 * Uso: node scripts/normalize-classind-covers.mjs
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COVERS_DIR = path.join(root, 'assets', 'classind-dle', 'covers');
const STAGING_DIR = path.join(root, 'assets', 'classind-dle', '_covers-staging');
const WIDTH = 600;
const HEIGHT = 800;
const QUALITY = 82;

const RENAME_MAP = {
  'blasphomeus-2.webp': 'blasphemous.webp',
  'blasphomeus.jpg': 'blasphemous.webp',
  'blasphemous.webp': 'blasphemous.webp',
  'call-of-duty---black-ops---cover-.jpg': 'call-of-duty-black-ops.webp',
  'call-of-duty-black-ops.webp': 'call-of-duty-black-ops.webp',
  'crimson-desert.png': 'crimson-desert.webp',
  'crimson-desert.webp': 'crimson-desert.webp',
  'cuphead_capa.png': 'cuphead.webp',
  'cuphead.webp': 'cuphead.webp',
  'doom-eternal.webp': 'doom-eternal.webp',
  'five-nights-at-freddys.jpg': 'five-nights-at-freddys.webp',
  'five-nights-at-freddys.webp': 'five-nights-at-freddys.webp',
  'god_of_war_2005_capa.png': 'god-of-war-2005.webp',
  'god-of-war-2005.webp': 'god-of-war-2005.webp',
  'god_of_war_2_capa.png': 'god-of-war-2.webp',
  'god-of-war-2.webp': 'god-of-war-2.webp',
  'god_of_war_3_capa.jpg': 'god-of-war-3.webp',
  'god-of-war-3.webp': 'god-of-war-3.webp',
  'god_of_war_ragnarök_capa.jpg': 'god-of-war-ragnarok.webp',
  'god_of_war_ragnarok_capa.jpg': 'god-of-war-ragnarok.webp',
  'god-of-war-ragnarok.webp': 'god-of-war-ragnarok.webp',
  'grand_theft_auto_san_andreas_capa.png': 'gta-san-andreas.webp',
  'gta-san-andreas.webp': 'gta-san-andreas.webp',
  'gta-6.webp': 'gta-6.webp',
  'hollow-knight.jpg': 'hollow-knight.webp',
  'hollow-knight.webp': 'hollow-knight.webp',
  'marvel-rivals.jpg': 'marvel-rivals.webp',
  'marvel-rivals.webp': 'marvel-rivals.webp',
  'nova_capa_de_the_sims_4.png': 'the-sims-4.webp',
  'the-sims-4.webp': 'the-sims-4.webp',
  'resident_evil_village.png': 'resident-evil-village.webp',
  'resident-evil-village.webp': 'resident-evil-village.webp',
  'silent_hill_2_2024_capa.png': 'silent-hill-2-2024.webp',
  'silent-hill-2-2024.webp': 'silent-hill-2-2024.webp',
  'supermarket_simulator.jpg': 'supermarket-simulator.webp',
  'supermarket-simulator.webp': 'supermarket-simulator.webp',
  'the_simpsons_hit_and_run_cover.png': 'the-simpsons-hit-and-run.webp',
  'the-simpsons-hit-and-run.webp': 'the-simpsons-hit-and-run.webp',
  'vampire-survivors.jpg': 'vampire-survivors.webp',
  'vampire-survivors.webp': 'vampire-survivors.webp',
  'wuthering_waves.jpg': 'wuthering-waves.webp',
  'wuthering-waves.webp': 'wuthering-waves.webp',
  // Capas novas (2026-09-21)
  'mortal-kombat-11.jpg': 'mortal-kombat-11.webp',
  'mortal-kombat-11.webp': 'mortal-kombat-11.webp',
  'street_fighter_6_capajpg.jpg': 'street-fighter-6.webp',
  'street-fighter-6-capajpg.webp': 'street-fighter-6.webp',
  'street-fighter-6.webp': 'street-fighter-6.webp',
  'hotline_miami_cover.png': 'hotline-miami.webp',
  'hotline-miami-cover.webp': 'hotline-miami.webp',
  'hotline-miami.webp': 'hotline-miami.webp',
  'celeste_capa.png': 'celeste.webp',
  'celeste-capa.webp': 'celeste.webp',
  'celeste.webp': 'celeste.webp',
  'animal_crossing_new_horizons_capa.png': 'animal-crossing-new-horizons.webp',
  'animal-crossing-new-horizons-capa.webp': 'animal-crossing-new-horizons.webp',
  'animal-crossing-new-horizons.webp': 'animal-crossing-new-horizons.webp',
  'undertale-capa.png': 'undertale.webp',
  'undertale.webp': 'undertale.webp',
};

const KEEP_FILES = new Set(['README.md', 'INVENTARIO.md']);

function normalizeKey(name) {
  return name.normalize('NFC').toLowerCase();
}

function slugifyFallback(name) {
  const base = path.parse(name).name;
  return `${base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')}.webp`;
}

async function main() {
  // undertale veio sem extensão — renomear antes do filtro
  const undertaleBare = (await fs.readdir(COVERS_DIR)).find(
    (n) => /^undertale-capa/i.test(n) && !/\.(jpe?g|png|webp|gif|avif)$/i.test(n)
  );
  if (undertaleBare) {
    await fs.rename(
      path.join(COVERS_DIR, undertaleBare),
      path.join(COVERS_DIR, 'undertale-capa.png')
    );
    console.log(`FIX ${undertaleBare} → undertale-capa.png`);
  }

  const entries = await fs.readdir(COVERS_DIR);
  const images = entries.filter(
    (n) => !n.startsWith('.')
      && !KEEP_FILES.has(n)
      && /\.(jpe?g|png|webp|gif|avif)$/i.test(n)
  );

  const planned = new Map();
  for (const name of images) {
    const target = RENAME_MAP[normalizeKey(name)] || slugifyFallback(name);
    const isSlug = name.toLowerCase() === target;
    const isWebp = /\.webp$/i.test(name);
    const prev = planned.get(target);
    if (!prev) {
      planned.set(target, { name, isWebp, isSlug });
      continue;
    }
    // Preferir original “bagunçado” como fonte (melhor qualidade / não parcialmente reencodado)
    if (prev.isSlug && !isSlug) {
      planned.set(target, { name, isWebp, isSlug });
    } else if (!prev.isWebp && isWebp && !isSlug) {
      planned.set(target, { name, isWebp, isSlug });
    }
  }

  await fs.rm(STAGING_DIR, { recursive: true, force: true });
  await fs.mkdir(STAGING_DIR, { recursive: true });

  const keepContents = {};
  for (const keep of KEEP_FILES) {
    keepContents[keep] = await fs.readFile(path.join(COVERS_DIR, keep), 'utf8').catch(() => null);
  }

  for (const [slug, meta] of planned) {
    const src = path.join(COVERS_DIR, meta.name);
    const dest = path.join(STAGING_DIR, slug);
    await sharp(src)
      .rotate()
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
      .webp({ quality: QUALITY })
      .toFile(dest);
    console.log(`OK  ${meta.name} → ${slug}`);
  }

  for (const name of await fs.readdir(COVERS_DIR)) {
    if (KEEP_FILES.has(name)) continue;
    await fs.unlink(path.join(COVERS_DIR, name)).catch(() => {});
  }

  for (const name of await fs.readdir(STAGING_DIR)) {
    await fs.copyFile(path.join(STAGING_DIR, name), path.join(COVERS_DIR, name));
  }

  for (const [keep, content] of Object.entries(keepContents)) {
    if (content != null) {
      await fs.writeFile(path.join(COVERS_DIR, keep), content);
    }
  }

  await fs.rm(STAGING_DIR, { recursive: true, force: true });
  console.log(`\n${planned.size} capas canônicas em ${COVERS_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
