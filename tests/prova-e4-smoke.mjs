/**
 * Smoke Task E4 — Docs e liberação
 * docs/plano-prova-modulo1-online.md
 *
 * Uso: node tests/prova-e4-smoke.mjs
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
  'docs/plano-prova-modulo1-online.md',
  'docs/playbook-liberar-prova-modulo1.md',
  'docs/conteudo-modulo1-fundacoes-cultura-interface.md',
  'docs/avaliacao-modulo1-provacao-circulo-magico.md',
  'docs/checklist-prova-qa-manual.md',
  'pages/dashboard.html',
  'pages/prova.html',
  'pages/prova-admin.html',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const plano = read('docs/plano-prova-modulo1-online.md');
const playbook = read('docs/playbook-liberar-prova-modulo1.md');
const conteudo = read('docs/conteudo-modulo1-fundacoes-cultura-interface.md');
const avaliacao = read('docs/avaliacao-modulo1-provacao-circulo-magico.md');
const dash = read('pages/dashboard.html');
const pkg = read('package.json');

assert(/\*\*Status:\*\*.*feito/i.test(plano), 'plano status = feito');
assert(/#### Task E4[\s\S]*?- \[x\] Atualizar este plano/i.test(plano), 'E4 plano marcado');
assert(/#### Task E4[\s\S]*?- \[x\] Playbook curto/i.test(plano), 'E4 playbook marcado');
assert(/#### Task E4[\s\S]*?- \[x\] Link no conteúdo/i.test(plano), 'E4 links marcados');
assert(/Aceite E:/.test(plano) && /✅/.test(plano), 'Aceite E no plano');
assert(/## 11\. Critérios de pronto[\s\S]*?- \[x\] Prova aberta/i.test(plano), 'DoD marcado');

assert(playbook.includes('fechada'), 'playbook: nasce fechada');
assert(/TCG01/.test(playbook) && /TCG02/.test(playbook), 'playbook: turmas');
assert(/1×|1 vez|uma vez/i.test(playbook), 'playbook: 1 tentativa');
assert(/Fechar nota|fechar notas/i.test(playbook), 'playbook: fechar notas');
assert(playbook.includes('prova-admin.html'), 'playbook: hub');
assert(playbook.includes('prova.html'), 'playbook: aluno');

assert(/Provação do Círculo Mágico/.test(conteudo), 'conteúdo menciona Provação');
assert(conteudo.includes('prova.html') || conteudo.includes('pages/prova.html'), 'conteúdo link prova');
assert(conteudo.includes('playbook-liberar-prova-modulo1'), 'conteúdo link playbook');

assert(avaliacao.includes('prova.html') || avaliacao.includes('playbook-liberar-prova'), 'avaliação aponta online');

assert(!dash.includes('id="prova-preview"'), 'sem card prova no trilho do painel');
assert(dash.includes('btn-prova-modulo1') || dash.includes('prova-admin'), 'dashboard master tools / admin');
assert(
  conteudo.includes('Aulas') || conteudo.includes('prova.html'),
  'conteúdo aponta Aulas / prova',
);

assert(pkg.includes('prova-e4-smoke.mjs'), 'npm check inclui prova-e4-smoke');

if (errors.length) {
  console.error('FALHAS prova-e4-smoke:');
  for (const e of errors) console.error(`  · ${e}`);
  process.exit(1);
}

console.log('OK prova-e4-smoke');
console.log('  · plano marcado feito (A–E)');
console.log('  · playbook-liberar-prova-modulo1.md');
console.log('  · links conteúdo + Aulas (sem card no Painel)');
