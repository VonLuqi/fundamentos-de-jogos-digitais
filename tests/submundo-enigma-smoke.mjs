/**
 * Smoke — Submundo ARG (8 fases) + Única + trailhead
 */

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
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
assert(/8 provações|Hécate|Cócito|Perséfone|Observatório/i.test(soberano.desc || ''), 'desc cobre 8 fases');

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

const roomFiles = [
  'pages/submundo/tartaro-oculto.html',
  'pages/submundo/asfodelos-sussurros.html',
  'pages/submundo/hecate-encruzilhada.html',
  'pages/submundo/elisios-julgamento.html',
  'pages/submundo/persefone-jardim.html',
  'pages/submundo/observatorio-sombras.html',
  'pages/submundo/cocito-espelho.html',
  'pages/submundo/estige-obolo.html',
  'css/submundo.css',
  'js/submundo/tartaro.js',
  'js/submundo/asfodelos.js',
  'js/submundo/hecate.js',
  'js/submundo/elisios.js',
  'js/submundo/persefone.js',
  'js/submundo/observatorio.js',
  'js/submundo/cocito.js',
  'js/submundo/estige.js',
  'assets/submundo/asfodelos_echo.wav',
  'assets/submundo/hecate_relic.png',
  'assets/submundo/soberano_aura.mp3',
];
roomFiles.forEach((rel) => assert(fs.existsSync(path.join(root, rel)), `arquivo ${rel}`));

assert(read('js/submundo/asfodelos.js').includes('/submundo/hecate-encruzilhada'), 'Asfódelos → Hécate');
assert(read('js/submundo/hecate.js').includes('/submundo/elisios-julgamento'), 'Hécate → Elísios');
assert(read('js/submundo/elisios.js').includes('/submundo/persefone-jardim'), 'Elísios → Perséfone');
assert(read('js/submundo/persefone.js').includes('/submundo/observatorio-sombras'), 'Perséfone → Observatório');
assert(read('js/submundo/observatorio.js').includes('/submundo/cocito-espelho'), 'Observatório → Cócito');
assert(read('js/submundo/cocito.js').includes('/submundo/estige-obolo'), 'Cócito → Estige');

assert(read('js/submundo/hecate.js').includes('HECATE_TORCH_KEY_777'), 'chave Hécate');
assert(read('js/submundo/persefone.js').includes('POMEGRANATE_6_SEEDS'), 'chave Perséfone');
assert(read('js/submundo/persefone.js').includes('queen_consort'), 'role Perséfone');
assert(read('js/submundo/cocito.js').includes('COCYTUS_REFLECTION_404'), 'chave Cócito');
assert(read('js/submundo/observatorio.js').includes('CAPE_MATAPAN_GATE'), 'token Observatório');

const tartaro = read('pages/submundo/tartaro-oculto.html');
assert(tartaro.includes('hidden-rune') && tartaro.includes('noindex'), 'Tártaro rune + noindex');
assert(read('css/submundo.css').includes('--shadow-color'), 'CSS shadow-color');
assert(read('css/submundo.css').includes('submundo--hecate'), 'tema Hécate');
assert(read('css/submundo.css').includes('submundo--persefone'), 'tema Perséfone');
assert(read('css/submundo.css').includes('submundo--observatorio'), 'tema Observatório');
assert(read('css/submundo.css').includes('submundo--cocito'), 'tema Cócito');

const vercel = read('vercel.json');
assert(vercel.includes('/submundo/hecate-encruzilhada'), 'rewrite hecate');
assert(vercel.includes('/submundo/persefone-jardim'), 'rewrite persefone');
assert(vercel.includes('/submundo/observatorio-sombras'), 'rewrite observatorio');
assert(vercel.includes('/submundo/cocito-espelho'), 'rewrite cocito');
assert(vercel.includes('/submundo/estige-obolo'), 'rewrite estige');

const local = read('local-server.mjs');
assert(local.includes('/submundo/hecate-encruzilhada'), 'rewrite local hecate');
assert(local.includes('/submundo/cocito-espelho'), 'rewrite local cocito');

const progress = read('api/progress.js');
assert(progress.includes("action === 'underworldJudgment'"), 'underworldJudgment');
assert(progress.includes("action === 'underworldRedeem'"), 'underworldRedeem');
assert(progress.includes('18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c'), 'hash server-side');
assert(!progress.includes("encoding: 'Base64'"), 'judgment sem encoding spoiler');
assert(!/hint:\s*'Use atob/.test(progress), 'judgment sem hint atob');
assert(progress.includes('Tributo insuficiente'), 'soft fail Estige');

const estigeJs = read('js/submundo/estige.js');
assert(estigeJs.includes('ESTIGE_OBOLO_2026'), 'console revela string sagrada');
assert(!estigeJs.includes('crypto.subtle.digest'), 'console sem spoiler da API');

const estigeHtml = read('pages/submundo/estige-obolo.html');
assert(!/SHA-256|crypto\.subtle/i.test(estigeHtml), 'riddle Estige sem spoiler de algoritmo');

const hash = crypto.createHash('sha256').update('ESTIGE_OBOLO_2026').digest('hex');
assert(hash === '18fec91c717e94c6b979a9c288ac1e041fd57101a2a2379b346e3b4fce39083c', 'hash SHA-256 confere');

/** Extrai payload LSB (R bit0) do PNG Hécate */
function extractHecateLsb(pngPath) {
  const buf = fs.readFileSync(pngPath);
  let offset = 8;
  const idats = [];
  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 'IDAT') idats.push(data);
    if (type === 'IEND') break;
    offset += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const width = 256;
  const height = 256;
  const rowBytes = 1 + width * 4;
  const bits = [];
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowBytes;
    for (let x = 0; x < width; x += 1) {
      const r = raw[rowStart + 1 + x * 4];
      bits.push(r & 1);
    }
  }
  const chars = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let code = 0;
    for (let b = 0; b < 8; b += 1) code = (code << 1) | bits[i + b];
    if (code === 0) break;
    chars.push(String.fromCharCode(code));
  }
  return chars.join('');
}

const hecatePng = path.join(root, 'assets/submundo/hecate_relic.png');
assert(extractHecateLsb(hecatePng) === 'HECATE_TORCH_KEY_777', 'LSB Hécate decodifica a chave');
const hecateBin = fs.readFileSync(hecatePng);
assert(hecateBin.includes(Buffer.from('Comment')), 'PNG tem chunk tEXt Comment');
assert(hecateBin.includes(Buffer.from('vermelho mais fraco')), 'Comment enigmático presente');
assert(!hecateBin.includes(Buffer.from('LSB Channel')), 'Comment sem spoiler técnico');

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
assert(isArgLocation('/submundo/hecate-encruzilhada'), 'Hécate é ARG');
assert(isArgLocation('/pages/submundo/estige-obolo.html'), 'arquivo direto do ARG fica livre');
assert(!isArgLocation('/pages/conquistas.html'), 'álbum não é sala ARG');
assert(!isArgLocation('/pages/dashboard.html'), 'painel não é sala ARG');
assert(isDevtoolsShortcut({ key: 'F12' }), 'F12 é atalho de DevTools');
assert(isDevtoolsShortcut({ key: 'I', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+I é atalho');
assert(isDevtoolsShortcut({ key: 'u', ctrlKey: true }), 'Ctrl+U (ver fonte) é atalho velado');
assert(isDevtoolsShortcut({ key: 'U', metaKey: true }), 'Cmd+U é atalho velado');
assert(!isDevtoolsShortcut({ key: 'F5' }), 'F5 não é DevTools');
assert(!isDevtoolsShortcut({ key: 'u', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+U não é o véu de fonte');
assert(read('js/devtools-guard.boot.js').includes('__fjdDevtoolsGuardBound'), 'boot síncrono no head');
assert(read('js/devtools-guard.boot.js').includes('contextmenu'), 'boot vela botão direito');
assert(read('js/devtools-guard.js').includes('contextmenu'), 'módulo vela botão direito');
assert(!read('js/devtools-guard.boot.js').includes('location.replace'), 'boot não redireciona por heurística');
assert(!read('js/devtools-guard.js').includes('location.replace'), 'módulo não redireciona por heurística');
assert(!read('js/devtools-guard.boot.js').includes('new Worker'), 'boot sem Worker/debugger');
assert(!read('js/devtools-guard.js').includes('new Worker'), 'módulo sem Worker/debugger');
assert(read('pages/dashboard.html').includes('devtools-guard.boot.js'), 'dashboard carrega o boot cedo');
assert(read('index.html').includes('devtools-guard.boot.js'), 'index carrega o boot cedo');
assert(!read('pages/submundo/tartaro-oculto.html').includes('devtools-guard.boot.js'), 'Tártaro sem boot do véu');
assert(!read('js/submundo/tartaro.js').includes('devtools-guard'), 'Tártaro não importa o véu');
assert(!read('js/submundo/asfodelos.js').includes('devtools-guard'), 'Asfódelos não importa o véu');
assert(
  spawnSync(process.execPath, ['--check', path.join(root, 'js/devtools-guard.boot.js')], { encoding: 'utf8' }).status === 0,
  'node --check devtools-guard.boot.js'
);

const gateJs = read('js/underworld-gate.js');
assert(gateJs.includes('initUnderworldGate') && gateJs.includes('TARTARO'), 'portão do Salão');
assert(gateJs.includes('/submundo/tartaro-oculto'), 'portão redireciona ao Tártaro');
assert(read('pages/dashboard.html').includes('underworld-gate'), 'markup do portão no hub');
assert(read('css/dashboard.css').includes('.underworld-gate'), 'CSS juicy do portão');
assert(read('js/dashboard.js').includes('initUnderworldGate'), 'dashboard inicia o portão');
assert(read('js/submundo/tartaro.js').includes('consumeUnderworldGateEcho'), 'eco do portão no Tártaro');
assert(
  spawnSync(process.execPath, ['--check', path.join(root, 'js/underworld-gate.js')], { encoding: 'utf8' }).status === 0,
  'node --check underworld-gate.js'
);

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

[
  'js/devtools-guard.js',
  'js/submundo/tartaro.js',
  'js/submundo/asfodelos.js',
  'js/submundo/hecate.js',
  'js/submundo/elisios.js',
  'js/submundo/persefone.js',
  'js/submundo/observatorio.js',
  'js/submundo/cocito.js',
  'js/submundo/estige.js',
  'js/achievements-ui.js',
  'js/conquistas.js',
  'api/progress.js',
  'scripts/generate-hecate-relic.mjs',
].forEach((rel) => {
  const result = spawnSync(process.execPath, ['--check', path.join(root, rel)], { encoding: 'utf8' });
  assert(result.status === 0, `node --check ${rel}`);
});

if (errors.length) {
  console.error(`FALHOU (${errors.length}):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('OK — smoke Submundo / Única / trailhead (8 fases)');
