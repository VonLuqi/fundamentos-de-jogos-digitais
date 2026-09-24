/**
 * Smoke Task E3 — script opcional + checklist manual
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-e3-smoke.mjs
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

[
  'scripts/smoke-prova.mjs',
  'docs/checklist-prova-qa-manual.md',
  'docs/plano-prova-modulo1-online.md',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const script = read('scripts/smoke-prova.mjs');
const checklist = read('docs/checklist-prova-qa-manual.md');
const plano = read('docs/plano-prova-modulo1-online.md');
const pkg = read('package.json');

assert(script.includes('startAttempt'), 'smoke: startAttempt');
assert(script.includes('saveAnswer'), 'smoke: saveAnswer');
assert(script.includes('submitAttempt'), 'smoke: submitAttempt');
assert(script.includes('adminScoreDiscursive'), 'smoke: score');
assert(script.includes('adminFinalizeGrade'), 'smoke: finalize');
assert(script.includes('SKIP smoke-prova'), 'smoke: SKIP sem credenciais');
assert(script.includes('--reset'), 'smoke: --reset');
assert(script.includes('--duration'), 'smoke: --duration (staging 2 min)');
assert(script.includes('MC_ANSWER_KEY'), 'smoke: usa gabarito server-only');
assert(script.includes('correctChoice|MC_ANSWER_KEY'), 'smoke: checa leak no aluno');

assert(checklist.includes('TCG01'), 'checklist: turma TCG01');
assert(checklist.includes('TCG02'), 'checklist: turma TCG02');
assert(/blur|tab_blur/i.test(checklist), 'checklist: blur');
assert(/F5|refresh/i.test(checklist), 'checklist: F5');
assert(/duration_minutes\s*=\s*2|2 min/i.test(checklist), 'checklist: expiração 2 min');
assert(checklist.includes('smoke-prova'), 'checklist aponta smoke');

assert(/Task E3[\s\S]*?smoke-prova[\s\S]*?\[x\]|Task E3[\s\S]*?\[x\][\s\S]*?smoke-prova/i.test(plano)
  || /#### Task E3[\s\S]*?- \[x\] Script smoke/i.test(plano), 'plano E3 script marcado');
assert(/#### Task E3[\s\S]*?- \[x\] Checklist humano/i.test(plano), 'plano E3 checklist marcado');

assert(pkg.includes('smoke:prova') || pkg.includes('smoke-prova.mjs'), 'npm script smoke:prova');
assert(pkg.includes('prova-e3-smoke.mjs'), 'npm check inclui prova-e3-smoke');

if (errors.length) {
  console.error('FALHAS prova-e3-smoke:');
  for (const e of errors) console.error(`  · ${e}`);
  process.exit(1);
}

console.log('OK prova-e3-smoke');
console.log('  · scripts/smoke-prova.mjs (start→save→submit→grade)');
console.log('  · docs/checklist-prova-qa-manual.md');
