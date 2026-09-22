/**
 * Smoke Task 1 — Mensageiro confiável (status + sonda admin)
 * docs/plano-email-opcional-recuperacao-admin.md
 *
 * Estático: não chama Resend/SMTP nem o banco.
 *
 * Uso: node tests/ops-task1-mailer-probe-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMailerStatus } from '../api/_lib/mailer.js';
import { ADMIN_AUDIT_ACTIONS } from '../api/_lib/admin-audit.js';

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

const mailer = read('api/_lib/mailer.js');
const authApi = read('api/auth.js');
const apiJs = read('js/api.js');
const dashboardJs = read('js/dashboard.js');
const dashboardHtml = read('pages/dashboard.html');
const envExample = read('.env.example');
const readme = read('README.md');
const audit = read('api/_lib/admin-audit.js');

assert(mailer.includes('export function getMailerStatus'), 'mailer exporta getMailerStatus');
assert(mailer.includes('usingTestingFrom'), 'status detecta remetente de teste');
assert(mailer.includes('no_provider'), 'mailer ainda reporta no_provider');

const status = getMailerStatus();
assert(typeof status.ready === 'boolean', 'getMailerStatus().ready é boolean');
assert(['resend', 'smtp', 'none'].includes(status.primary), 'primary válido');
assert(typeof status.hasResend === 'boolean', 'hasResend boolean');
assert(typeof status.hasSmtp === 'boolean', 'hasSmtp boolean');

assert(authApi.includes("action === 'adminProbeMailer'"), 'API adminProbeMailer');
assert(authApi.includes("action === 'adminMailerStatus'"), 'API adminMailerStatus');
assert(authApi.includes('getMailerStatus'), 'auth importa getMailerStatus');
assert(authApi.includes('sendMail'), 'probe chama sendMail');

assert(apiJs.includes("action: 'adminProbeMailer'"), 'cliente adminProbeMailer');
assert(apiJs.includes("action: 'adminMailerStatus'"), 'cliente adminMailerStatus');

assert(dashboardHtml.includes('id="btn-probe-mailer"'), 'dashboard tem botão Testar o Mensageiro');
assert(dashboardHtml.includes('id="master-mailer-status"'), 'dashboard tem status do canal');
assert(dashboardJs.includes('adminProbeMailer'), 'dashboard chama adminProbeMailer');
assert(dashboardJs.includes('MESSENGER_FAILED_COPY'), 'copy honesta de falha no Painel');
assert(dashboardJs.includes('canal de e-mail'), 'hint canal de e-mail na falha');
assert(
  !/catch\s*\{\s*setMessengerStatus\(MESSENGER_RESEND_COPY\)/.test(dashboardJs),
  'reenvio não finge sucesso no catch',
);

assert(ADMIN_AUDIT_ACTIONS.probeMailer === 'admin_probe_mailer', 'audit probeMailer estável');
assert(audit.includes('probeMailer'), 'admin-audit lista probeMailer');

assert(envExample.includes('SMTP_HOST'), '.env.example documenta SMTP');
assert(/resend\.dev|beth\.t@example\.com/i.test(envExample), '.env.example avisa risco resend.dev');
assert(readme.includes('Checklist do Mensageiro'), 'README tem checklist do Mensageiro');
assert(readme.includes('Testar o Mensageiro') || readme.includes('adminProbeMailer'), 'README menciona sonda');
assert(readme.includes('SMTP'), 'README documenta SMTP');

console.log('Smoke Task 1 — Mensageiro (status + sonda)\n');
console.log(`  · getMailerStatus primary=${status.primary} ready=${status.ready}`);

if (errors.length) {
  console.error(`\nFALHOU (${errors.length}):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('\nOK — Task 1 mailer/probe coberta estaticamente. Sem chamada ao provedor.');
