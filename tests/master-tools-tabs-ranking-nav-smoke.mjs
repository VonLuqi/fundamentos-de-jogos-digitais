/**
 * Smoke — abas Ferramentas do Mestre + Placar na nav.
 * Uso: node tests/master-tools-tabs-ranking-nav-smoke.mjs
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

const dash = read('pages/dashboard.html');
const dashJs = read('js/dashboard.js');
const dashCss = read('css/dashboard.css');
const shell = read('js/app-shell.js');

assert(dash.includes('master-tools__tabs'), 'dashboard tem tablist do Mestre');
assert(dash.includes('data-master-tab="codigos"'), 'aba Códigos');
assert(dash.includes('data-master-tab="despertar"'), 'aba Despertar');
assert(dash.includes('data-master-tab="aulas"'), 'aba Aulas e Prova');
assert(dash.includes('data-master-tab="relatorios"'), 'aba Relatórios');
assert(dash.includes('data-master-tab="sistema"'), 'aba Sistema');
assert(dash.includes('id="btn-generate-codes"'), 'id códigos preservado');
assert(dash.includes('id="btn-toggle-acheron"'), 'id acheron preservado');
assert(dash.includes('id="master-despertar-pause"'), 'Véu preservado');
assert(dash.includes('id="btn-prova-modulo1"'), 'id prova preservado');
assert(dash.includes('data-nav-item="ranking"'), 'dashboard nav Placar');
assert(dash.includes('Placar do Domínio'), 'label Placar UTF-8');

assert(dashJs.includes('initMasterToolsTabs'), 'JS initMasterToolsTabs');
assert(dashJs.includes('masterTab'), 'JS deep-link masterTab');
assert(dashCss.includes('.master-tools__tab'), 'CSS tabs');
assert(dashCss.includes('.master-tools__panel'), 'CSS panels');
assert(/route === 'ranking'/.test(shell), 'mapRouteToNavItem ranking');

for (const rel of ['pages/dashboard.html', 'pages/ranking.html', 'pages/aulas.html', 'pages/aula1.html']) {
  const html = read(rel);
  assert(
    html.includes('data-nav-item="ranking"') && html.includes('href="./ranking.html"'),
    `${rel}: link Placar na sidebar`,
  );
}

if (errors.length) {
  console.error('master-tools-tabs-ranking-nav-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('master-tools-tabs-ranking-nav-smoke OK');
console.log('  · master tabs + painéis');
console.log('  · Placar na nav');
