/**
 * Smoke — Fase 3: trailhead, Única, Submundo ARG
 */

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_RARITY_LABELS,
  getAchievementById,
  getAchievementXp,
} from '../js/game-catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const soberano = getAchievementById('soberano_do_submundo');
assert(soberano, 'soberano_do_submundo no catálogo');
assert(soberano?.rarity === 'unique', 'raridade unique');
assert(soberano?.hidden === true, 'soberano hidden');
assert(getAchievementXp('soberano_do_submundo') === 1500, 'xp 1500');
assert(ACHIEVEMENT_RARITY_LABELS.unique === 'Única', 'label Única');

const publics = ACHIEVEMENTS.filter((a) => !a.hidden);
const letters = [];
for (const ach of publics) {
  for (const i of ach.trailhead?.nameIndexes || []) letters.push(ach.name[i]);
  for (const i of ach.trailhead?.descIndexes || []) letters.push(ach.desc[i]);
}
const sorted = [...letters].sort().join('');
const expected = [...'TARTAROOCULTO'].sort().join('');
assert(sorted === expected, `trailhead letters ${letters.join('')} → anagrama TARTARO OCULTO`);

[
  'pages/submundo/tartaro-oculto.html',
  'pages/submundo/asfodelos-sussurros.html',
  'pages/submundo/elisios-julgamento.html',
  'pages/submundo/estige-obolo.html',
  'css/submundo.css',
  'js/submundo/tartaro.js',
  'js/submundo/asfodelos.js',
  'js/submundo/elisios.js',
  'js/submundo/estige.js',
  'assets/submundo/asfodelos_echo.wav',
].forEach((rel) => assert(fs.existsSync(path.join(root, rel)), `arquivo ${rel}`));

const tartaro = read('pages/submundo/tartaro-oculto.html');
assert(tartaro.includes('hidden-rune') && tartaro.includes('noindex'), 'Tártaro rune + noindex');
assert(read('css/submundo.css').includes('--shadow-color'), 'CSS shadow-color');

const vercel = read('vercel.json');
assert(vercel.includes('/submundo/tartaro-oculto'), 'rewrite tartaro');
assert(vercel.includes('/submundo/estige-obolo'), 'rewrite estige');

const progress = read('api/progress.js');
assert(progress.includes("action === 'underworldJudgment'"), 'underworldJudgment');
assert(progress.includes("action === 'underworldRedeem'"), 'underworldRedeem');
assert(progress.includes('18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c'), 'hash server-side');

const hash = crypto.createHash('sha256').update('ESTIGE_OBOLO_2026').digest('hex');
assert(hash === '18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c', 'hash SHA-256 confere');

const apiJs = read('js/api.js');
assert(apiJs.includes('underworldJudgment') && apiJs.includes('underworldRedeem'), 'helpers API front');

const ui = read('js/achievements-ui.js');
assert(ui.includes('fillAchievementDescription') && ui.includes('fillTrailheadField'), 'cipher UI');

assert(read('css/conquistas.css').includes("data-rarity='unique'"), 'CSS unique álbum');
assert(read('css/dashboard.css').includes("data-rarity='unique'"), 'CSS unique cards');
assert(read('css/conquistas.css').includes('trailhead-rune') || read('css/dashboard.css').includes('trailhead-rune'), 'CSS trailhead');

const local = read('local-server.mjs');
assert(local.includes('/submundo/tartaro-oculto'), 'rewrite local-server');

[
  'js/submundo/tartaro.js',
  'js/submundo/asfodelos.js',
  'js/submundo/elisios.js',
  'js/submundo/estige.js',
  'js/achievements-ui.js',
  'js/conquistas.js',
  'api/progress.js',
].forEach((rel) => {
  const result = spawnSync(process.execPath, ['--check', path.join(root, rel)], { encoding: 'utf8' });
  assert(result.status === 0, `node --check ${rel}`);
});

if (errors.length) {
  console.error(`FALHOU (${errors.length}):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('OK — smoke Submundo / Única / trailhead (Fase 3)');
