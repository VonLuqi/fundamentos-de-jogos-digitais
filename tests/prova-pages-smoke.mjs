/**
 * Smoke Task B1 — página/layout da Prova Módulo 1
 * Uso: node tests/prova-pages-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

['pages/prova.html', 'css/prova.css', 'js/prova.js'].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const html = read('pages/prova.html');
const css = read('css/prova.css');
const js = read('js/prova.js');

for (const id of [
  'prova-warn',
  'prova-counter',
  'prova-timer',
  'prova-intro',
  'prova-exam',
  'prova-progress',
  'prova-prompt',
  'prova-choices',
  'prova-textarea',
  'prova-btn-prev',
  'prova-btn-next',
  'prova-btn-submit',
  'prova-dialog-submit',
]) {
  assert(html.includes(`id="${id}"`), `HTML sem #${id}`);
}
assert(!html.includes('prova-btn-leave-exam'), 'sem botão Sair no rodapé da prova');
assert(!html.includes('prova-dialog-leave'), 'sem dialog de saída da prova');


assert(html.includes('prova.css'), 'HTML não inclui prova.css');
assert(html.includes('js/prova.js'), 'HTML não inclui js/prova.js');
assert(!html.includes('app-shell__sidebar'), 'B1: não deve ter sidebar fácil (shell completo)');
assert(html.includes('Não saia desta página'), 'Falta aviso de não sair');
assert(html.includes('tempo'), 'Falta menção ao tempo no aviso/regras');

assert(css.includes('.prova-card'), 'CSS sem .prova-card');
assert(css.includes('.prova-warn'), 'CSS sem .prova-warn sticky');
assert(css.includes('.prova-progress'), 'CSS sem .prova-progress');
assert(css.includes('.prova-nav'), 'CSS sem .prova-nav');
assert(css.includes('position: sticky'), 'Aviso deve ser sticky');

assert(js.includes('QUESTION_COUNT'), 'JS sem QUESTION_COUNT');
assert(js.includes('provaGetExamStatus'), 'JS sem provaGetExamStatus');
assert(js.includes('buildProgressDots'), 'JS sem buildProgressDots');
assert(!js.includes('prova-btn-leave-exam'), 'JS sem botão Sair do exame');

const apiJs = read('js/api.js');
assert(apiJs.includes("prova: ()"), 'ROUTES.prova ausente');

console.log(
  errors.length
    ? `prova-pages-smoke FAIL (${errors.length})\n - ${errors.join('\n - ')}`
    : 'prova-pages-smoke OK',
);
process.exit(errors.length ? 1 : 0);
