/**
 * Smoke Task E2 — Acessibilidade e mobile da Prova
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-e2-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROVA_COPY,
  formatSubmitUnansweredSummary,
} from '../js/prova/copy.js';

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

[
  'pages/prova.html',
  'pages/prova-admin.html',
  'css/prova.css',
  'css/prova-admin.css',
  'js/prova.js',
  'js/prova-admin.js',
  'js/prova/copy.js',
  'js/prova/questions-ui.js',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const html = read('pages/prova.html');
const adminHtml = read('pages/prova-admin.html');
const css = read('css/prova.css');
const adminCss = read('css/prova-admin.css');
const js = read('js/prova.js');
const adminJs = read('js/prova-admin.js');
const questionsUi = read('js/prova/questions-ui.js');
const pkg = read('package.json');

// Viewport: zoom permitido
assert(/name="viewport"[^>]*width=device-width/i.test(html), 'viewport device-width');
assert(!/maximum-scale\s*=\s*1/i.test(html), 'sem maximum-scale=1');
assert(!/user-scalable\s*=\s*no/i.test(html), 'sem user-scalable=no');

// Radios / textarea touch
assert(css.includes('min-height: 2.75rem') || css.includes('min-height: 3rem'), 'touch target choices/btns');
assert(css.includes('touch-action: manipulation'), 'touch-action em controles');
assert(/font-size:\s*max\(1rem,\s*16px\)/.test(css), 'textarea ≥16px (sem zoom iOS)');
assert(html.includes('id="prova-textarea"'), 'textarea presente');
assert(html.includes('autocomplete="off"'), 'textarea autocomplete off');
assert(questionsUi.includes('prova-choice-${letter}') || questionsUi.includes('prova-choice-'), 'radios com id');
assert(questionsUi.includes('aria-label'), 'radios com aria-label');

// Timer legível
assert(/prova-topbar__timer-value[\s\S]{0,120}clamp\(1\.2rem/.test(css)
  || css.includes('font-size: 1.4rem'), 'timer grande no mobile');
assert(css.includes('font-variant-numeric: tabular-nums'), 'timer tabular-nums');
assert(/@media \(max-width: 640px\)[\s\S]*prova-topbar__timer/.test(css), 'timer no breakpoint mobile');

// Confirm Enviar
assert(html.includes('prova-dialog-submit-summary'), 'resumo no dialog de envio');
assert(js.includes('formatSubmitUnansweredSummary'), 'JS monta resumo de em branco');
assert(js.includes('countUnansweredQuestions'), 'conta questões em branco');
assert(formatSubmitUnansweredSummary(0) === PROVA_COPY.submitAllAnswered, 'resumo 0 em branco');
assert(/1 questão/.test(formatSubmitUnansweredSummary(1)), 'resumo 1 em branco');
assert(/3 questões/.test(formatSubmitUnansweredSummary(3)), 'resumo N em branco');
assert(/vale 0/.test(formatSubmitUnansweredSummary(2)), 'em branco vale 0');

// Confirm Fechar nota (admin)
assert(adminHtml.includes('prova-admin-dialog-finalize'), 'dialog Fechar nota');
assert(adminJs.includes('prova-admin-dialog-finalize'), 'admin abre dialog finalize');
assert(adminJs.includes('Fechar com zeros') || adminJs.includes('allowPartial'), 'warn parcial');
assert(adminCss.includes('.prova-admin-dialog'), 'CSS dialog admin');
assert(!/window\.confirm\(\s*`Ainda faltam/.test(adminJs)
  || adminJs.includes('showModal'), 'prefer dialog sobre confirm nativo');

assert(pkg.includes('prova-e2-smoke.mjs'), 'npm check inclui prova-e2-smoke');

if (errors.length) {
  console.error('FALHAS prova-e2-smoke:');
  for (const e of errors) console.error(`  · ${e}`);
  process.exit(1);
}

console.log('OK prova-e2-smoke');
console.log('  · radios/textarea/timer mobile + zoom livre');
console.log('  · confirm Enviar com resumo de em branco');
console.log('  · confirm Fechar nota via dialog');
