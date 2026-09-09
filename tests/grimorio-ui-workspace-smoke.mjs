/**
 * Smoke — Grimório UI workspace Hades
 * (docs/plano-grimorio-ui-workspace.md).
 *
 * Uso: node tests/grimorio-ui-workspace-smoke.mjs
 */

import { spawnSync } from 'node:child_process';
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
  'docs/plano-grimorio-ui-workspace.md',
  'pages/grimorio.html',
  'js/grimorio.js',
  'js/grimorio-reading.js',
  'css/grimorio.css',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const html = read('pages/grimorio.html');
assert(html.includes('grimorio-workspace__filters'), 'região filtros');
assert(html.includes('grimorio-workspace__list'), 'região lista');
assert(html.includes('grimorio-workspace__reading'), 'região leitura');
assert(html.includes('id="grimorio-collections"'), 'rail coleções');
assert(html.includes('id="grimorio-list"'), 'lista feed');
assert(html.includes('id="note-view"'), 'painel note-view');
assert(html.includes('note-edit-link'), 'ação editar no canvas');
assert(html.includes('note-shared-panel') || html.includes('note-clone'), 'ações revelada no canvas');
assert(html.includes('note-canvas__toolbar'), 'toolbar estilo referência');
assert(html.includes('data-icon="trilha"'), 'slot ícone trilha');
assert(html.includes('note-clone'), 'CTA clonar');
assert(html.includes('note-refuse'), 'CTA recusar');
assert(!html.includes('note-copy-link') && !html.includes('data-icon="copiar"'), 'sem copiar link');
assert(html.includes('grimorio-reading-empty'), 'empty state leitura');
assert(!/Inter|Roboto|#4[Aa]90[Ee][Dd]|background:\s*#fff/i.test(html), 'HTML sem UI light/azul genérica');

const js = read('js/grimorio.js');
assert(js.includes('activeColecao'), 'estado de coleção');
assert(js.includes('excerptBody') || js.includes('EXCERPT_MAX'), 'excerpt na lista');
assert(js.includes('replaceState'), 'URL sync replaceState');
assert(js.includes('data-mobile-view') || js.includes('setMobileView'), 'mobile lista/leitura');
assert(js.includes("colecao"), 'query colecao');
assert(js.includes('loadGrimorioReading'), 'liga painel leitura');

const reading = read('js/grimorio-reading.js');
assert(reading.includes('canClone') && reading.includes('canEdit'), 'papéis clone/dono');
assert(reading.includes('display') || reading.includes('hidden'), 'painéis hidden por papel');

const css = read('css/grimorio.css');
assert(css.includes('.grimorio-workspace'), 'CSS grid workspace');
assert(css.includes('minmax') || css.includes('grid-template-columns'), 'colunas desktop');
assert(css.includes('data-mobile-view'), 'CSS mobile view');
assert(css.includes('.grimorio-feed__excerpt'), 'excerpt CSS');
assert(css.includes('--hades-'), 'tokens Hades');
assert(!css.includes('#4A90E2') && !css.includes('Inter,'), 'CSS sem look SaaS azul');

const api = read('js/api.js');
const routeMatch = api.match(/grimorioNota:\s*\(id\)\s*=>\s*\{([\s\S]*?)\},/);
assert(routeMatch && routeMatch[1].includes('grimorio.html'), 'grimorioNota → grimorio.html');

const notaHtml = read('pages/grimorio-nota.html');
assert(
  notaHtml.includes('grimorio.html') && (notaHtml.includes('replace') || notaHtml.includes('refresh')),
  'deep link legado redireciona'
);

const editJs = read('js/grimorio-editar.js');
assert(editJs.includes('ROUTES.grimorioNota'), 'Guardar retorna via grimorioNota (workspace)');

[
  'js/grimorio.js',
  'js/grimorio-reading.js',
  'js/grimorio-nota.js',
  'js/grimorio-editar.js',
].forEach((rel) => {
  const result = spawnSync(process.execPath, ['--check', path.join(root, rel)], {
    encoding: 'utf8',
  });
  assert(result.status === 0, `node --check ${rel} falhou: ${result.stderr || result.stdout}`);
});

if (errors.length) {
  console.error(`FALHOU (${errors.length}):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('OK — smoke Grimório UI workspace');
