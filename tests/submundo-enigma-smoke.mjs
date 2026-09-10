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
import { isArgLocation, isDevtoolsShortcut } from '../js/devtools-guard.js';

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

const catalogJs = read('js/game-catalog.js');
assert(catalogJs.includes("dataset.pathPrefix = '/submundo'"), 'pista Elements data-path-prefix');

const robots = read('robots.txt');
assert(robots.includes('Disallow: /submundo/'), 'robots.txt aponta o abismo');

assert(read('pages/conquistas.html').includes('/submundo'), 'comentário/pista no álbum HTML');
assert(read('pages/dashboard.html').includes('/submundo'), 'comentário/pista no dashboard HTML');
assert(read('css/conquistas.css').includes('/submundo'), 'comentário CSS conquistas');
assert(read('pages/conquistas.html').includes('nem sempre começa na raiz'), 'copy sutil da pasta');

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
  'assets/submundo/soberano_aura.mp3',
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
assert(apiJs.includes('submundo'), 'rootPath conhece /submundo');
assert(apiJs.includes("from './devtools-guard.js'"), 'api.js instala o véu de F12');
assert(apiJs.includes('installDevtoolsGuard()'), 'véu de F12 arma no load do cliente');

const guard = read('js/devtools-guard.js');
assert(guard.includes('F12'), 'guard cobre F12');
assert(guard.includes('isArgLocation'), 'guard reconhece o ARG');
assert(guard.includes('submundo'), 'ARG = salas /submundo');
assert(isArgLocation('/submundo/tartaro-oculto'), 'URL limpa do ARG fica livre');
assert(isArgLocation('/pages/submundo/estige-obolo.html'), 'arquivo direto do ARG fica livre');
assert(!isArgLocation('/pages/conquistas.html'), 'álbum não é sala ARG');
assert(!isArgLocation('/pages/dashboard.html'), 'painel não é sala ARG');
assert(isDevtoolsShortcut({ key: 'F12' }), 'F12 é atalho de DevTools');
assert(isDevtoolsShortcut({ key: 'I', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+I é atalho');
assert(!isDevtoolsShortcut({ key: 'F5' }), 'F5 não é DevTools');
assert(!read('js/submundo/tartaro.js').includes('devtools-guard'), 'Tártaro não importa o véu');
assert(!read('js/submundo/asfodelos.js').includes('devtools-guard'), 'Asfódelos não importa o véu');

const ui = read('js/achievements-ui.js');
assert(ui.includes('fillAchievementDescription') && ui.includes('fillTrailheadField'), 'cipher UI');
assert(ui.includes('is-soberano-featured') && ui.includes('shouldFeatureSoberano'), 'destaque Soberano');
assert(
  !/featured = model\.kind === 'unlocked' && shouldFeatureSoberano/.test(ui),
  'Soberano destaca mesmo velado'
);

assert(read('css/conquistas.css').includes("data-rarity='unique'"), 'CSS unique álbum');
assert(read('css/dashboard.css').includes("data-rarity='unique'"), 'CSS unique cards');
assert(read('css/conquistas.css').includes('trailhead-rune') || read('css/dashboard.css').includes('trailhead-rune'), 'CSS trailhead');

const local = read('local-server.mjs');
assert(local.includes('/submundo/tartaro-oculto'), 'rewrite local-server');

[
  'js/devtools-guard.js',
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
