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
assert(html.includes('Juramentos do Styx'), 'faixa Juramentos do Styx');
assert(html.includes('id="tab-lethe"') && html.includes('>Lethe<'), 'aba Lethe');
assert(html.includes('id="tab-stele"') && html.includes('>Estela<'), 'aba Estela');
assert(html.includes('id="tab-codex"') && html.includes('>Códice<'), 'aba Códice');
assert(html.includes('id="tab-mundo"'), 'aba Mundo (Cookie center)');
assert(html.includes('despertar-layout'), 'grid Cookie 3 colunas');
assert(html.includes('despertar-market-list--store'), 'store densa à direita');
assert(!/\/submundo\//.test(html), 'não vive em /submundo');
assert(!html.includes('Almas Registradas') || html.includes('data-admin-only'), 'Almas Registradas só no item admin');
assert(!html.includes('Minigame em breve'), 'esta página já substitui o Minigame');
assert(!html.includes('data-nav-item="minigame"'), 'sem Minigame legado');
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
assert(css.includes('scrollbar-width: none'), 'rolagem interna sem barra (Cookie canvas)');
assert(css.includes('100dvh') || css.includes('height: 100vh'), 'canvas fixo no viewport desktop');

assert(boot.includes('requireSession'), 'index.js exige sessão');
assert(boot.includes("route: 'despertar'") || boot.includes('route: "despertar"'), 'initAppShell route despertar');
assert(boot.includes('logout'), 'logout ligado');
assert(boot.includes('fetchDespertarPublished'), 'bootstrap checa gate do Acheron');
assert(boot.includes('showSealedState'), 'empty state quando selado');

assert(shell.includes("route === 'despertar'"), 'app-shell mapeia rota despertar');
assert(shell.includes('applyDespertarNavState'), 'shell sincroniza nav do Despertar');
assert(pkg.includes('js/hades-despertar/index.js'), 'npm run check cobre o bootstrap');
assert(pkg.includes('despertar-pages-smoke.mjs'), 'npm run check inclui este smoke');
assert(pkg.includes('api/_lib/despertar-gate.js'), 'npm run check cobre despertar-gate');

/* —— Task 11: shell pages + preview no Painel —— */
const shellPages = [
  'pages/dashboard.html',
  'pages/aulas.html',
  'pages/conquistas.html',
  'pages/salao-espiritual.html',
  'pages/companheiro.html',
  'pages/grimorio.html',
  'pages/grimorio-editar.html',
  'pages/aula1.html',
  'pages/aula2.html',
  'pages/aula3.html',
  'pages/despertar.html',
];

shellPages.forEach((rel) => {
  const page = read(rel);
  assert(!page.includes('data-nav-item="minigame"'), `${rel}: sem Minigame legado`);
  assert(!page.includes('Minigame em breve'), `${rel}: sem copy Minigame em breve`);
  assert(page.includes('data-nav-item="despertar"'), `${rel}: tem O Despertar na nav`);
  assert(page.includes('href="./despertar.html"') || page.includes("href='./despertar.html'"), `${rel}: href despertar`);
});

const dashboardHtml = read('pages/dashboard.html');
const dashboardJs = read('js/dashboard.js');
assert(dashboardHtml.includes('id="despertar-preview"'), 'Painel tem preview O Despertar');
assert(dashboardHtml.includes('Descer ao Acheron'), 'CTA Descer ao Acheron');
assert(dashboardHtml.includes('id="despertar-preview-souls"'), 'preview mostra Almas');
assert(dashboardHtml.includes('id="despertar-preview-sps"'), 'preview mostra Almas/s');
assert(dashboardJs.includes('renderDespertarPreview'), 'dashboard renderiza preview');
assert(dashboardJs.includes('despertarStateGet'), 'preview chama stateGet');

if (errors.length) {
  console.error('despertar-pages-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('despertar-pages-smoke: ok');
