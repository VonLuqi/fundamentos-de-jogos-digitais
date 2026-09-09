/**
 * Smoke — Fase 2: modal Revelar ao Companheiro
 * (docs/plano-grimorio-conquistas-enigma.md).
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const html = read('pages/grimorio.html');
const css = read('css/grimorio.css');
const reading = read('js/grimorio-reading.js');

assert(html.includes('id="note-share-modal"'), 'modal note-share-modal no HTML');
assert(html.includes('id="note-share-open"'), 'gatilho note-share-open');
assert(html.includes('id="note-share-badge"'), 'badge de count');
assert(html.includes('note-share-trigger__label'), 'label Revelar no gatilho');
assert(html.includes('id="note-share"'), 'conteúdo #note-share no modal');
assert(html.includes('aria-controls="note-share-modal"'), 'aria-controls no gatilho');
assert(
  html.indexOf('note-share-modal') < html.indexOf('id="note-view"'),
  'modal fora do canvas de leitura'
);
assert(
  !/<article[^>]*id="note-view"[\s\S]*id="note-share"/i.test(html),
  '#note-share não fica dentro do article note-view'
);

assert(css.includes('.note-share-modal'), 'CSS do modal');
assert(css.includes('.note-share-trigger'), 'CSS do gatilho');
assert(css.includes('prefers-reduced-motion'), 'reduced-motion no CSS');
assert(css.includes('is-note-share-open'), 'body lock ao abrir modal');

assert(reading.includes('openShareModal'), 'JS openShareModal');
assert(reading.includes('closeShareModal'), 'JS closeShareModal');
assert(reading.includes('updateShareBadge'), 'JS badge');
assert(reading.includes("event.key !== 'Escape'") || reading.includes("event.key === 'Escape'"), 'Escape no modal');
assert(reading.includes('setShareTriggerVisible'), 'gatilho por papel (owner)');
assert(reading.includes('canEdit'), 'respeita canEdit');

['js/grimorio-reading.js'].forEach((rel) => {
  const result = spawnSync(process.execPath, ['--check', path.join(root, rel)], {
    encoding: 'utf8',
  });
  assert(result.status === 0, `node --check ${rel}: ${result.stderr || result.stdout}`);
});

if (errors.length) {
  console.error(`FALHOU (${errors.length}):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('OK — smoke Revelar modal (Fase 2)');
