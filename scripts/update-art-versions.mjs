#!/usr/bin/env node
/**
 * Versão de cache por pasta de sprite = hash do conteúdo dos WebP da pasta.
 * WebP tem Cache-Control de 7 dias (.htaccess): sem trocar a URL, arte nova não aparece.
 * Escreve js/hades-despertar/config/art-versions.js e a versão desse módulo no importmap
 * de pages/despertar.html. Roda sozinho no fim de `npm run despertar:art`.
 *
 * Uso: npm run despertar:art-versions
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = path.join(ROOT, 'assets', 'despertar', 'sprites');
const OUT = path.join(ROOT, 'js', 'hades-despertar', 'config', 'art-versions.js');
const PAGE = path.join(ROOT, 'pages', 'despertar.html');
const IMPORT_KEY = '../js/hades-despertar/config/art-versions.js';

export const ART_VERSION_FOLDERS = [
  'foice', 'generators', 'habitats', 'habitats/variants', 'habitats/backgrounds', 'hud',
  'shimmers', 'upgrades', 'talents', 'minigames', 'veil', 'catabase', 'seasons',
];

/** Hash curto (8 hex) do nome + conteúdo de cada .webp/.svg da pasta, em ordem. */
export function folderVersion(folder) {
  const dir = path.join(SPRITES, folder);
  if (!fs.existsSync(dir)) return '0';
  const hash = crypto.createHash('sha1');
  // .glb = modelo 3D da Foice; *_3d.glb é a fonte bruta (não vai para o jogo).
  const files = fs.readdirSync(dir).filter((f) => /\.(webp|svg|glb)$/.test(f) && !f.endsWith('_3d.glb')).sort();
  for (const file of files) {
    hash.update(file);
    hash.update(fs.readFileSync(path.join(dir, file)));
  }
  return hash.digest('hex').slice(0, 8);
}

export function computeArtVersions() {
  return Object.fromEntries(ART_VERSION_FOLDERS.map((folder) => [folder, folderVersion(folder)]));
}

export function renderArtVersionsModule(versions) {
  const lines = Object.entries(versions).map(([folder, v]) => `  '${folder}': '${v}',`);
  return [
    '/**',
    ' * Versão de cache de cada pasta de sprites (hash do conteúdo).',
    ' * GERADO por `npm run despertar:art-versions` (também roda em `npm run despertar:art`). Não editar.',
    ' */',
    '',
    'export const ART_VERSIONS = Object.freeze({',
    ...lines,
    '});',
    '',
  ].join('\n');
}

/** Grava art-versions.js e a versão do módulo no importmap. Devolve as versões. */
export function writeArtVersions() {
  const versions = computeArtVersions();
  fs.writeFileSync(OUT, renderArtVersionsModule(versions));

  // O próprio módulo também é cacheado pelo navegador/CDN: versão no importmap = hash do módulo.
  const moduleVer = crypto.createHash('sha1').update(JSON.stringify(versions)).digest('hex').slice(0, 8);
  const page = fs.readFileSync(PAGE, 'utf8');
  const nl = page.includes('\r\n') ? '\r\n' : '\n';
  const entry = `      "${IMPORT_KEY}": "${IMPORT_KEY}?v=${moduleVer}",`;
  const re = new RegExp(`^ {6}"${IMPORT_KEY.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}": "[^"]*",\\r?$`, 'm');
  let next;
  if (re.test(page)) {
    next = page.replace(re, (line) => (line.endsWith('\r') ? `${entry}\r` : entry));
  } else {
    const anchor = /^ {6}"\.\.\/js\/hades-despertar\/ui\/world\/SpriteAtlas\.js": "[^"]*",\r?$/m;
    if (!anchor.test(page)) throw new Error('importmap: entrada de SpriteAtlas.js não encontrada em pages/despertar.html');
    next = page.replace(anchor, (line) => `${entry}${nl}${line}`);
  }
  if (next !== page) fs.writeFileSync(PAGE, next);
  console.log(`art-versions: ${Object.entries(versions).map(([f, v]) => `${f}=${v}`).join(' ')} · módulo v=${moduleVer}`);
  return versions;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeArtVersions();
}
