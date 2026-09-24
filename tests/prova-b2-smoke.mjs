/**
 * Smoke Task B2 — render/navegação/autosave da Prova
 * Uso: node tests/prova-b2-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatPromptHtml,
  isAnswerFilled,
  syncProgressDots,
} from '../js/prova/questions-ui.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

['js/prova.js', 'js/prova/questions-ui.js', 'pages/prova.html'].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const js = read('js/prova.js');
const ui = read('js/prova/questions-ui.js');

assert(js.includes('provaStartAttempt'), 'prova.js sem provaStartAttempt');
assert(js.includes('provaSaveAnswer'), 'prova.js sem provaSaveAnswer');
assert(js.includes('provaGetAttempt'), 'prova.js sem provaGetAttempt');
assert(js.includes('provaSubmitAttempt'), 'prova.js sem provaSubmitAttempt');
assert(js.includes('AUTOSAVE_MS'), 'prova.js sem AUTOSAVE_MS');
assert(js.includes('800') || js.includes('AUTOSAVE_MS = 800'), 'autosave ~800ms');
assert(js.includes('flushSave'), 'prova.js sem flushSave');
assert(js.includes('goToQuestion'), 'prova.js sem goToQuestion');
assert(js.includes('from \'./prova/questions-ui.js\'') || js.includes('from "./prova/questions-ui.js"'), 'import questions-ui');
assert(!js.includes('Pré-visualização do layout'), 'B1 preview hack ainda presente');
assert(!js.includes('paintLayoutPlaceholder'), 'placeholder B1 ainda presente');

assert(ui.includes('renderQuestion'), 'questions-ui sem renderQuestion');
assert(ui.includes('readAnswerFromDom'), 'questions-ui sem readAnswerFromDom');
assert(ui.includes('isAnswerFilled'), 'questions-ui sem isAnswerFilled');

assert(isAnswerFilled({ choice: 'B' }, 'mc'), 'MC com escolha deveria estar filled');
assert(!isAnswerFilled({ choice: null }, 'mc'), 'MC vazia não filled');
assert(isAnswerFilled({ textAnswer: 'oi' }, 'discursive'), 'discursive filled');
assert(!isAnswerFilled({ textAnswer: '  ' }, 'discursive'), 'discursive whitespace não filled');

const htmlPrompt = formatPromptHtml('Linha 1\n\nLinha 2');
assert(htmlPrompt.includes('<p>'), 'formatPromptHtml deve gerar <p>');
assert(!htmlPrompt.includes('<script>'), 'formatPromptHtml sem script');

// syncProgressDots smoke com DOM mínimo
const progress = {
  nodes: [],
  querySelectorAll() {
    return this.nodes;
  },
};
progress.nodes = [0, 1].map((i) => {
  const classes = new Set();
  return {
    dataset: { index: String(i) },
    disabled: true,
    classList: {
      toggle(name, on) {
        if (on) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
  };
});
syncProgressDots(
  progress,
  1,
  [
    { id: 'q01', type: 'mc' },
    { id: 'q02', type: 'mc' },
  ],
  { q01: { choice: 'A' }, q02: {} },
);
assert(progress.nodes[0].classList.contains('is-answered'), 'dot 0 answered');
assert(progress.nodes[1].classList.contains('is-current'), 'dot 1 current');
assert(progress.nodes[0].disabled === false, 'dots habilitados');

console.log(
  errors.length
    ? `prova-b2-smoke FAIL (${errors.length})\n - ${errors.join('\n - ')}`
    : 'prova-b2-smoke OK',
);
process.exit(errors.length ? 1 : 0);
