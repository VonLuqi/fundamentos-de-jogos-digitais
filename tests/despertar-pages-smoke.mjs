/**
 * Smoke Task 6 — Página shell de O Despertar
 * (docs/plano-hades-despertar.md).
 *
 * Uso: node tests/despertar-pages-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

[
  'pages/despertar.html',
  'css/despertar.css',
  'js/hades-despertar/index.js',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const html = read('pages/despertar.html');
const css = read('css/despertar.css');
const boot = read('js/hades-despertar/index.js');
const shell = read('js/app-shell.js');
const pkg = read('package.json');

assert(html.includes('data-route="despertar"'), 'data-route=despertar');
assert(html.includes('hades-tokens.css'), 'inclui hades-tokens.css');
assert(html.includes('app-shell.css'), 'inclui app-shell.css');
assert(html.includes('despertar.css'), 'inclui despertar.css');
assert(html.includes('id="acheron-altar"'), 'região #acheron-altar');
assert(html.includes('id="river-market"'), 'região #river-market');
assert(html.includes('id="despertar-tabs"'), 'região #despertar-tabs');
assert(/JetBrains\+Mono|JetBrains Mono/.test(html), 'fonte mono só nesta página');
assert(html.includes('class="despertar-num"') || html.includes("class='despertar-num'"), 'números .despertar-num');
assert(html.includes('requireSession') === false, 'HTML não chama requireSession inline');
assert(html.includes('../js/hades-despertar/index.js'), 'bootstrap ES module');
assert(html.includes('data-nav-item="despertar"'), 'nav O Despertar');
assert(html.includes('O Despertar'), 'copy da nav');
assert(html.includes('O trabalho eterno do Submundo'), 'eyebrow congelado');
assert(html.includes('HADES: O DESPERTAR DO'), 'título longo');
assert(html.includes('Ceifar'), 'botão Ceifar');
assert(html.includes('Juramentos do Styx'), 'aba Styx');
assert(html.includes('Rio Lethe'), 'aba Lethe');
assert(html.includes('Estela de Memória'), 'aba Estela');
assert(html.includes('Códice do Loop'), 'aba Códice');
assert(!/\/submundo\//.test(html), 'não vive em /submundo');
assert(!html.includes('Almas Registradas') || html.includes('data-admin-only'), 'Almas Registradas só no item admin');
assert(!html.includes('Minigame em breve'), 'esta página já substitui o Minigame');
assert(html.includes('data-shell-logout'), 'logout no shell');
assert(/<(button)[^>]*id="despertar-reap"/.test(html) || html.includes('id="despertar-reap"'), 'altar é botão');

assert(css.includes('--despertar-bg: #0a0a0f'), 'token bg');
assert(css.includes('--despertar-bg-2: #12121a'), 'token bg-2');
assert(css.includes('--despertar-card: #1a1a26'), 'token card');
assert(css.includes('--despertar-styx: #00a896'), 'token styx');
assert(css.includes('--despertar-fire: #d90429'), 'token fire');
assert(css.includes('--despertar-purple: #7209b7'), 'token purple');
assert(css.includes('.despertar-num'), 'mono só em .despertar-num');
assert(css.includes('grid-template-columns'), 'grid desktop');
assert(/@media \(max-width:\s*980px\)/.test(css), '1 coluna abaixo de 980px');
assert(css.includes('overflow-x: clip') || css.includes('overflow-x: hidden'), 'evita estouro horizontal');

assert(boot.includes('requireSession'), 'index.js exige sessão');
assert(boot.includes("route: 'despertar'") || boot.includes('route: "despertar"'), 'initAppShell route despertar');
assert(boot.includes('logout'), 'logout ligado');

assert(shell.includes("route === 'despertar'"), 'app-shell mapeia rota despertar');
assert(pkg.includes('js/hades-despertar/index.js'), 'npm run check cobre o bootstrap');
assert(pkg.includes('despertar-pages-smoke.mjs'), 'npm run check inclui este smoke');

if (errors.length) {
  console.error('despertar-pages-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('despertar-pages-smoke: ok');
