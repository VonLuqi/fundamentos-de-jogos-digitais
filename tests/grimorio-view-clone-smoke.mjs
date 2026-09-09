/**
 * Smoke — Grimório visão/edição, tags, clone e recusa
 * (docs/plano-grimorio-visao-clone-tags.md + workspace).
 *
 * Uso: node tests/grimorio-view-clone-smoke.mjs
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
  'docs/plano-grimorio-visao-clone-tags.md',
  'pages/grimorio-nota.html',
  'pages/grimorio-editar.html',
  'pages/grimorio.html',
  'js/grimorio-nota.js',
  'js/grimorio-editar.js',
  'js/grimorio-reading.js',
  'js/grimorio-tags.js',
  'js/grimorio-from-note.js',
  'db/migrate-2026-09-08-note-clone-events.sql',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const api = read('js/api.js');
assert(api.includes('grimorioEditar'), 'ROUTES.grimorioEditar deve existir');
assert(api.includes("grimorio.html"), 'ROUTES.grimorioNota aponta ao workspace');
assert(api.includes("action: 'noteClone'"), 'cloneNote deve chamar noteClone');
assert(api.includes("action: 'noteRefuseShare'"), 'refuseNoteShare deve existir');
assert(api.includes("action: 'noteEventsAck'"), 'ackNoteEvents deve existir');

const progress = read('api/progress.js');
assert(progress.includes("action === 'noteClone'"), 'API noteClone');
assert(progress.includes("action === 'noteRefuseShare'"), 'API noteRefuseShare');
assert(progress.includes('user_note_events') || progress.includes('NOTE_EVENTS_TABLE'), 'eventos de nota');
assert(progress.includes('cloned_from_note_id'), 'cloned_from_note_id no backend');

const migrate = read('db/migrate-2026-09-08-note-clone-events.sql');
assert(migrate.includes('cloned_from_note_id'), 'migração com cloned_from');
assert(migrate.includes('user_note_events'), 'migração com user_note_events');

const setup = read('db/setup.sql');
assert(setup.includes('cloned_from_note_id'), 'setup.sql com cloned_from');
assert(setup.includes('user_note_events'), 'setup.sql com events');

const listHtml = read('pages/grimorio.html');
assert(listHtml.includes('grimorio-editar.html'), 'Nova inscrição → editar');
assert(listHtml.includes('grimorio-workspace'), 'workspace markup');
assert(listHtml.includes('id="note-view"'), 'painel leitura no workspace');
assert(listHtml.includes('note-clone'), 'CTA clonar no painel');
assert(listHtml.includes('note-refuse'), 'CTA recusar no painel');
assert(listHtml.includes('note-canvas') || listHtml.includes('note-view'), 'canvas de leitura');
assert(listHtml.includes('note-edit-link'), 'editar no canvas');

const viewHtml = read('pages/grimorio-nota.html');
assert(
  viewHtml.includes('location.replace') || viewHtml.includes('grimorio.html'),
  'grimorio-nota redireciona ao workspace'
);

const editHtml = read('pages/grimorio-editar.html');
assert(editHtml.includes('id="note-form"'), 'editar tem form');
assert(editHtml.includes('note-tags-input'), 'chips de marcas no editor');
assert(editHtml.includes('note-title'), 'título no editor');

const readingJs = read('js/grimorio-reading.js');
assert(readingJs.includes('grimorioEditar'), 'leitura linka para editar');
assert(readingJs.includes('cloneNote'), 'leitura clona');
assert(readingJs.includes('refuseNoteShare'), 'leitura recusa');
assert(readingJs.includes('fromNote'), 'atalho aula com fromNote');

const editJs = read('js/grimorio-editar.js');
assert(editJs.includes('bindTagChipEditor'), 'editor usa chips');
assert(editJs.includes('grimorioNota'), 'guardar vai para visão/workspace');

const listJs = read('js/grimorio.js');
assert(listJs.includes('loadGrimorioReading'), 'workspace carrega painel leitura');
assert(listJs.includes('grimorioEditar'), 'nova inscrição via editar');
assert(listJs.includes('colecao') || listJs.includes('activeColecao'), 'coleções no workspace');

const tagsJs = read('js/grimorio-tags.js');
assert(tagsJs.includes('Enter'), 'Enter cria tag');
assert(tagsJs.includes('note-tag-chip'), 'classe de chip');

const css = read('css/grimorio.css');
assert(css.includes('.note-tag-chip'), 'CSS chips');
assert(css.includes('.note-view'), 'CSS visão');
assert(css.includes('.grimorio-from-note'), 'CSS fromNote');
assert(css.includes('.grimorio-workspace'), 'CSS workspace');

const aula1 = read('js/aula1.js');
assert(aula1.includes('grimorio-from-note'), 'aula1 fromNote');
assert(read('js/aula2.js').includes('grimorio-from-note'), 'aula2 fromNote');
assert(read('js/aula3.js').includes('grimorio-from-note'), 'aula3 fromNote');

[
  'js/grimorio-nota.js',
  'js/grimorio-editar.js',
  'js/grimorio-reading.js',
  'js/grimorio.js',
  'js/grimorio-tags.js',
  'js/grimorio-from-note.js',
  'js/api.js',
  'api/progress.js',
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

console.log('OK — smoke Grimório visão/clone/tags');
