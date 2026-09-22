/**
 * Smoke — Selo do Mensageiro soft (Task 2)
 * docs/plano-email-opcional-recuperacao-admin.md
 * (substitui expectativas do hard-gate ops-task3)
 *
 * Uso: node tests/ops-task3-messenger-seal-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MESSENGER_SEAL_MESSAGE,
  MESSENGER_SEAL_REQUIRED,
  needsMessengerSeal,
  rejectUnlessMessengerSeal,
} from '../api/_lib/messenger-seal.js';

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

const sealLib = read('api/_lib/messenger-seal.js');
const apiJs = read('js/api.js');
const dashboardJs = read('js/dashboard.js');
const dashboardCss = read('css/dashboard.css');
const authHtml = read('pages/auth.html');
const authJs = read('js/auth.js');
const authApi = read('api/auth.js');
const progress = read('api/progress.js');
const despertar = read('api/despertar.js');
const classind = read('api/classind.js');
const pkg = read('package.json');

assert(sealLib.includes('needsMessengerSeal'), 'messenger-seal.js exporta needsMessengerSeal');
assert(sealLib.includes('rejectUnlessMessengerSeal'), 'messenger-seal.js exporta rejectUnlessMessengerSeal');
assert(sealLib.includes('soft-nudge') || sealLib.includes('Hard-gate desligado'), 'doc soft-nudge / hard off');
assert(MESSENGER_SEAL_REQUIRED === 'messenger_seal_required', 'código de erro estável');
assert(/opcional/i.test(MESSENGER_SEAL_MESSAGE), 'copy menciona opcional');

assert(needsMessengerSeal(null) === false, 'null não precisa selo');
assert(needsMessengerSeal({ role: 'admin' }) === false, 'admin isento');
assert(needsMessengerSeal({ role: 'admin', email_verified_at: null }) === false, 'admin sem e-mail isento');
assert(needsMessengerSeal({ role: 'student', email_verified_at: null }) === true, 'student empty = nudge');
assert(needsMessengerSeal({ role: 'student', emailVerifiedAt: null }) === true, 'camelCase empty = nudge');
assert(needsMessengerSeal({ role: 'student', email_verified_at: '2026-01-01' }) === false, 'student confirmed livre');
assert(needsMessengerSeal({ role: 'student', emailVerifiedAt: '2026-01-01' }) === false, 'camelCase confirmed livre');

{
  const sent = [];
  const fakeRes = {
    status(code) {
      sent.push(code);
      return {
        json(body) {
          sent.push(body);
        },
      };
    },
  };
  assert(rejectUnlessMessengerSeal({ role: 'admin' }, fakeRes) === false, 'reject admin = false');
  assert(rejectUnlessMessengerSeal({ role: 'student' }, fakeRes) === false, 'reject student = false (hard off)');
  assert(sent.length === 0, 'reject nunca escreve resposta');
}

assert(apiJs.includes('export function needsMessengerSeal'), 'cliente exporta needsMessengerSeal');
assert(apiJs.includes('messengerSealDashboardUrl'), 'cliente mantém URL ?selo=1 (deep link soft)');
assert(
  !/needsMessengerSeal\(user\)\s*&&\s*!allowUnsealed/.test(apiJs)
    && !/replace\(messengerSealDashboardUrl\(\)\)/.test(apiJs),
  'requireSession NÃO redireciona sem selo',
);

assert(dashboardJs.includes('applyMessengerSoftNudge'), 'dashboard aplica soft-nudge');
assert(!dashboardJs.includes('applyMessengerHardGate'), 'hard-gate JS removido');
assert(dashboardJs.includes('messenger-seal--nudge') || dashboardCss.includes('messenger-seal--nudge'), 'classe nudge');
assert(dashboardJs.includes('O Mensageiro é opcional') || dashboardJs.includes('opcional'), 'copy soft no Painel');
assert(
  /renderRailPreviews\(currentToken\)/.test(dashboardJs)
    && !/if\s*\(\s*!needsMessengerSeal\(currentUser\)\s*\)\s*\{\s*renderRailPreviews/.test(dashboardJs),
  'previews do trilho não esperam selo',
);

assert(progress.includes('rejectUnlessMessengerSeal'), 'progress ainda chama helper (no-op)');
assert(despertar.includes('rejectUnlessMessengerSeal'), 'despertar ainda chama helper (no-op)');
assert(!classind.includes('needsMessengerSeal'), 'classind não bloqueia por selo');
assert(!classind.includes('MESSENGER_SEAL_REQUIRED'), 'classind sem 403 de selo');

assert(authApi.includes('hasEmail'), 'register trata e-mail opcional');
assert(
  /hasEmail\s*&&\s*!isValidEmail|!isValidEmail\(normalizedEmail\)\s*\)\s*errors\.push/.test(authApi)
    || authApi.includes('hasEmail && !isValidEmail'),
  'só valida e-mail se preenchido',
);
assert(authApi.includes('hasEmail ? normalizedEmail : null') || authApi.includes('hasEmail ? normalizedEmail : null'), 'grava null sem e-mail');
assert(/if\s*\(hasEmail\)\s*\{[\s\S]*dispatchEmailVerification/.test(authApi), 'só dispara Mensageiro com e-mail');

assert(authHtml.includes('(opcional)'), 'auth.html marca e-mail opcional');
assert(authHtml.includes('Sem e-mail: o Mestre recupera'), 'hint cadastro sem e-mail');
{
  const after = authHtml.split('id="register-email"')[1] || '';
  const field = after.slice(0, after.indexOf('</div>') === -1 ? 400 : after.indexOf('</div>'));
  assert(!/\srequired(\s|>)/.test(field), 'register-email sem required');
}
assert(authHtml.includes('Peça ao Mestre') || authHtml.includes('open-master-code') || authHtml.includes('open-legacy'), 'forgot aponta ao Mestre / legado');
assert(authJs.includes('handleRegisterSubmit'), 'auth.js registra cadastro');

assert(pkg.includes('ops-task3-messenger-seal-smoke.mjs'), 'npm check inclui este smoke');
assert(pkg.includes('api/_lib/messenger-seal.js'), 'npm check cobre messenger-seal.js');

if (errors.length) {
  console.error('ops-task3-messenger-seal-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('ops-task3-messenger-seal-smoke OK (soft-nudge Task 2)');
console.log('  · needsMessengerSeal = nudge only');
console.log('  · rejectUnlessMessengerSeal = no-op');
console.log('  · register e-mail opcional');
console.log('  · sem redirect ?selo=1 / sem 403 classind');
