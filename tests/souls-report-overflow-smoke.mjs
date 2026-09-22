/**
 * Smoke Task 1 — Overflow no relatório do Mestre e no Grimório
 * (docs/plano-relatorio-admin-atividades-filtros.md).
 *
 * Uso: node tests/souls-report-overflow-smoke.mjs
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

const soulsCss = read('css/souls.css');
const grimorioCss = read('css/grimorio.css');
const soulsHtml = read('pages/souls.html');
const pkg = read('package.json');

assert(soulsHtml.includes('souls-page'), 'souls.html body precisa da class souls-page');
assert(soulsHtml.includes('data-shell') || soulsHtml.includes('app-shell'), 'souls.html precisa do app-shell');
assert(soulsHtml.includes('Extrair o Véu'), 'souls.html precisa do botão Extrair o Véu');

assert(/html\s*\{[^}]*overflow-x:\s*clip/.test(soulsCss), 'html da página souls precisa de overflow-x: clip');
assert(/body\.souls-page\s*\{[^}]*overflow-x:\s*clip/.test(soulsCss), 'body.souls-page precisa de overflow-x: clip');

assert(
  soulsCss.includes('minmax(min(250px, 100%), 1fr)'),
  'souls-grid não deve usar minmax(250px) rígido (estoura viewport estreita)'
);

assert(
  /grid-template-columns:\s*minmax\(0,\s*320px\)\s+minmax\(0,\s*1fr\)/.test(soulsCss),
  'vigilia-layout precisa de minmax(0, …) nas duas colunas'
);

const overflowBlockIndex = soulsCss.indexOf('/* Overflow — Task 1');
assert(overflowBlockIndex >= 0, 'souls.css precisa do bloco Overflow — Task 1');
const overflowBlock = overflowBlockIndex >= 0 ? soulsCss.slice(overflowBlockIndex) : '';

const wrapSelectors = [
  '.activity-detail__body',
  '.activity-block__text',
  '.activity-card__paragraph',
  '.vigilia-note__title',
  '.vigilia-note__meta',
  '.soul-card__name',
  '.soul-card__username',
];

wrapSelectors.forEach((selector) => {
  assert(overflowBlock.includes(selector), `bloco overflow precisa incluir ${selector}`);
});

assert(overflowBlock.includes('overflow-wrap: anywhere'), 'bloco overflow precisa de overflow-wrap: anywhere');
assert(overflowBlock.includes('word-break: break-word'), 'bloco overflow precisa de word-break: break-word');
assert(overflowBlock.includes('.soul-card') && overflowBlock.includes('min-width: 0'), 'soul-card precisa de min-width: 0');
assert(overflowBlock.includes('.vigilia-detail') && overflowBlock.includes('max-width: 100%'), 'vigilia-detail precisa de max-width: 100%');

assert(
  /note-view__body[\s\S]{0,280}overflow-wrap:\s*anywhere/.test(grimorioCss),
  '.note-view__body precisa de overflow-wrap: anywhere'
);
assert(
  /#note-view-title/.test(grimorioCss) && /note-view__title[\s\S]{0,400}overflow-wrap:\s*anywhere/.test(grimorioCss),
  '#note-view-title precisa entrar nas regras de wrap'
);
assert(
  /#note-view-tags[\s\S]{0,240}overflow-wrap:\s*anywhere/.test(grimorioCss),
  '#note-view-tags precisa de overflow-wrap: anywhere'
);

assert(pkg.includes('souls-report-overflow-smoke.mjs'), 'npm run check deve incluir souls-report-overflow-smoke.mjs');

if (errors.length) {
  console.error('souls-report-overflow-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('OK — smoke overflow relatório admin (Task 1)');
console.log('  · souls: overflow-x clip + wrap em cards/atividades/vigília');
console.log('  · grimorio: wrap em corpo, título e tags da inscrição');
console.log('Manual restante: abrir souls.html com texto LIMITELIMITE e confirmar ausência de scroll-x.');
