/**
 * Smoke Task 3 — E-mail hard-gate (Selo do Mensageiro)
 * docs/plano-ops-nav-email-perf-admin.md
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
const progress = read('api/progress.js');
const despertar = read('api/despertar.js');
const classind = read('api/classind.js');
const auth = read('api/auth.js');
const pkg = read('package.json');

assert(sealLib.includes('needsMessengerSeal'), 'messenger-seal.js exporta needsMessengerSeal');
assert(sealLib.includes('rejectUnlessMessengerSeal'), 'messenger-seal.js exporta rejectUnlessMessengerSeal');
assert(MESSENGER_SEAL_REQUIRED === 'messenger_seal_required', 'código de erro estável');
assert(/selo de mensageiro/i.test(MESSENGER_SEAL_MESSAGE), 'copy do Domínio no helper');

assert(needsMessengerSeal(null) === false, 'null não precisa selo');
assert(needsMessengerSeal({ role: 'admin' }) === false, 'admin isento');
assert(needsMessengerSeal({ role: 'admin', email_verified_at: null }) === false, 'admin sem e-mail isento');
assert(needsMessengerSeal({ role: 'student', email_verified_at: null }) === true, 'student empty bloqueado');
assert(needsMessengerSeal({ role: 'student', emailVerifiedAt: null }) === true, 'camelCase empty bloqueado');
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
  assert(sent.length === 0, 'admin não escreve resposta');
  assert(rejectUnlessMessengerSeal({ role: 'student' }, fakeRes) === true, 'reject student = true');
  assert(sent[0] === 403, 'student recebe 403');
  assert(sent[1]?.error === MESSENGER_SEAL_REQUIRED, 'body.error messenger_seal_required');
}

assert(apiJs.includes('export function needsMessengerSeal'), 'cliente exporta needsMessengerSeal');
assert(apiJs.includes('messengerSealDashboardUrl'), 'cliente tem URL ?selo=1');
assert(apiJs.includes("?selo=1"), 'redirect usa ?selo=1');
assert(apiJs.includes('allowUnsealed') || apiJs.includes('isDashboardPath'), 'Painel isento no requireSession');
assert(/needsMessengerSeal\(user\).*replace|replace.*selo=1/s.test(apiJs)
  || (apiJs.includes('needsMessengerSeal(user)') && apiJs.includes('messengerSealDashboardUrl()')),
  'requireSession redireciona sem selo');

assert(dashboardJs.includes('applyMessengerHardGate'), 'dashboard aplica hard-gate');
assert(dashboardJs.includes('is-messenger-gate') || dashboardCss.includes('is-messenger-gate'), 'classe de gate no CSS');
assert(dashboardCss.includes('is-messenger-gate'), 'CSS hard-gate presente');
assert(dashboardCss.includes('messenger-seal--gate'), 'CSS messenger-seal--gate');
assert(dashboardJs.includes('messenger-seal--gate'), 'JS marca messenger-seal--gate');

assert(progress.includes('rejectUnlessMessengerSeal'), 'progress bloqueia sem selo');
assert(progress.includes('MESSENGER_SEAL_EXEMPT_ACTIONS'), 'progress tem isenções de leitura');
assert(progress.includes("'lessonGates'") && progress.includes("'lessonGatesBatch'"), 'gates isentos no Painel');
assert(despertar.includes('rejectUnlessMessengerSeal'), 'despertar bloqueia sem selo');
assert(classind.includes('needsMessengerSeal') || classind.includes('rejectUnlessMessengerSeal'), 'classind bloqueia sem selo');
assert(classind.includes('MESSENGER_SEAL_REQUIRED'), 'classind usa código de erro');

assert(auth.includes("action === 'bindEmail'"), 'auth mantém bindEmail');
assert(auth.includes("action === 'requestEmailVerification'"), 'auth mantém reenvio');
assert(auth.includes("action === 'confirmEmail'"), 'auth mantém confirmEmail');
assert(!auth.includes('rejectUnlessMessengerSeal'), 'auth de selo não usa o reject do Domínio');

assert(pkg.includes('ops-task3-messenger-seal-smoke.mjs'), 'npm check inclui este smoke');
assert(pkg.includes('api/_lib/messenger-seal.js'), 'npm check cobre messenger-seal.js');

if (errors.length) {
  console.error('ops-task3-messenger-seal-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('ops-task3-messenger-seal-smoke OK');
console.log('  · needsMessengerSeal (admin / empty / confirmed)');
console.log('  · rejectUnlessMessengerSeal → 403');
console.log('  · client redirect ?selo=1');
console.log('  · progress / despertar / classind gated');
