/**
 * Smoke estático — frontend da recuperação FJD (contrato T245-T247).
 * Uso: node tests/recuperacao-frontend-smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const errors = [];
const check = (cond, msg) => { if (!cond) errors.push(msg); };

const prova = read('js/prova.js');
check(prova.includes("'recuperacao-prova'") && /questions: 30/.test(prova), 'prova.js: exame recuperacao-prova (30 questões)');
check(prova.includes('aiFeedback') && prova.includes('Aguardando correção do professor'), 'prova.js: feedback IA + estado pendente');
check(prova.includes('not_eligible'), 'prova.js: copy not_eligible');

const dash = read('js/dashboard.js');
const dashHtml = read('pages/dashboard.html');
for (const label of ['Aprovado', 'Em recuperação', 'Aprovado na recuperação', 'Reprovado']) {
  check(dash.includes(`'${label}'`), `dashboard.js: selo "${label}"`);
}
check(dash.includes('renderFinalStatus(g)'), 'dashboard.js: renderFinalStatus chamado');
check(dashHtml.includes('id="final-grade-status"') && dashHtml.includes('recuperacao-prova'), 'dashboard.html: selo + CTA');

const notas = read('js/notas-turma.js');
const api = read('js/api.js');
check(notas.includes('closeRecovery') && notas.includes('reopenRecovery'), 'notas-turma.js: fechar/reabrir recuperação');
check(api.includes('adminRecoveryClose') && api.includes('adminRecoveryReopen'), 'api.js: actions de recuperação');
check(read('pages/notas-turma.html').includes('id="notas-rec-close"'), 'notas-turma.html: botão recuperação');

const adm = read('js/prova-admin.js');
check(adm.includes('aiFeedback') && adm.includes('maxPts'), 'prova-admin.js: IA + máximo por questão');
check(read('pages/prova-admin.html').includes('recuperacao-prova'), 'prova-admin.html: opção do exame');

if (errors.length) {
  console.error('FAIL recuperacao-frontend-smoke');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('OK recuperacao-frontend-smoke');
