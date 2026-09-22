/**
 * Smoke — aside retrátil desktop (Task S.1 / Q18).
 * docs/plano-despertar-aureolas-letreiro-shiny-hud-juizo.md Fase S
 *
 * Uso: node tests/shell-nav-collapse-smoke.mjs
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

const STORAGE_KEY = 'hades-shell-nav-collapsed';
const appShellJs = read('js/app-shell.js');
const appShellCss = read('css/app-shell.css');

assert(
  appShellJs.includes('NAV_COLLAPSED_STORAGE_KEY'),
  'app-shell.js exporta NAV_COLLAPSED_STORAGE_KEY',
);
assert(
  appShellJs.includes(`'${STORAGE_KEY}'`) || appShellJs.includes(`"${STORAGE_KEY}"`),
  `chave localStorage ${STORAGE_KEY}`,
);
assert(appShellJs.includes('is-nav-collapsed'), 'classe is-nav-collapsed no JS');
assert(appShellJs.includes('is-shell-nav-collapsed'), 'body class is-shell-nav-collapsed');
assert(appShellJs.includes('export function applyNavCollapsed'), 'applyNavCollapsed exportada');
assert(appShellJs.includes('export function writeNavCollapsedPref'), 'writeNavCollapsedPref exportada');
assert(appShellJs.includes('export function readNavCollapsedPref'), 'readNavCollapsedPref exportada');
assert(appShellJs.includes('Recolher navegação'), 'aria-label desktop expandido');
assert(appShellJs.includes('collapseNav'), 'API collapseNav no retorno');
assert(appShellJs.includes('willCollapse'), 'toggle desktop usa willCollapse');
assert(appShellJs.includes("setAttribute('inert'"), 'sidebar inert quando colapsada/fechada');

assert(appShellCss.includes('.app-shell.is-nav-collapsed'), 'CSS is-nav-collapsed');
assert(
  /grid-template-columns:\s*0\s+minmax\(0,\s*1fr\)/.test(appShellCss),
  'grid colapsado = 0 + 1fr (sidebar não cai na 2ª linha)',
);
assert(
  /^\.app-shell__menu-toggle\s*\{[^}]*display:\s*inline-grid/m.test(appShellCss)
    || /\.app-shell__menu-toggle\s*\{[\s\S]*?display:\s*inline-grid/.test(appShellCss),
  'menu-toggle display:inline-grid no CSS base (visível no desktop)',
);
assert(
  !/\.app-shell__menu-toggle\s*\{[^}]*display:\s*none/.test(appShellCss.split('@media')[0]),
  'menu-toggle não é display:none fora do mobile',
);
assert(
  appShellCss.includes('prefers-reduced-motion'),
  'reduced-motion desliga transição do colapso',
);

/* Pref helpers espelhados (sem importar app-shell — window.matchMedia no top-level). */
function readPref(storage) {
  try {
    return storage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
function writePref(collapsed, storage) {
  try {
    storage?.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

const mem = new Map();
const fakeStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
};

assert(readPref(fakeStorage) === false, 'pref default false');
writePref(true, fakeStorage);
assert(readPref(fakeStorage) === true, 'pref true após write');
writePref(false, fakeStorage);
assert(readPref(fakeStorage) === false, 'pref false após write');
assert(mem.get(STORAGE_KEY) === '0', 'storage grava 0/1');

const samplePages = [
  'pages/dashboard.html',
  'pages/despertar.html',
  'pages/grimorio.html',
  'pages/aulas.html',
  'pages/conquistas.html',
  'pages/souls.html',
];
for (const rel of samplePages) {
  const html = read(rel);
  assert(html.includes('data-shell-toggle'), `${rel}: data-shell-toggle`);
  assert(html.includes('aria-controls="app-shell-sidebar"'), `${rel}: aria-controls sidebar`);
  assert(html.includes('data-shell-sidebar'), `${rel}: data-shell-sidebar`);
}

assert(appShellJs.includes("classList.contains('is-open')"), 'drawer is-open permanece');
assert(appShellCss.includes('max-width: 980px'), 'breakpoint mobile permanece');
assert(
  appShellCss.includes('.app-shell.is-open .app-shell__overlay')
    || appShellCss.includes('.app-shell.is-open .app-shell__sidebar'),
  'estilos drawer mobile permanecem',
);

assert(
  !/\.despertar-shell\s+\.despertar-chrome-header\s*\{[^}]*display:\s*none/.test(
    read('css/despertar.css'),
  ),
  'despertar desktop não esconde o chrome-header (toggle S.1 precisa ficar visível)',
);
assert(
  /despertar-chrome-header[\s\S]*?position:\s*absolute/.test(read('css/despertar.css'))
    || read('css/despertar.css').includes('toggle flutuante'),
  'despertar desktop: header/toggle flutuante para colapso',
);

if (errors.length) {
  console.error('FAIL shell-nav-collapse-smoke\n');
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(1);
}

console.log('OK shell-nav-collapse-smoke');
console.log(` - chave ${STORAGE_KEY}`);
console.log(' - JS/CSS colapso desktop + pref localStorage');
console.log(' - toggle presente nas páginas amostradas');
console.log(' - drawer mobile markers intactos');
