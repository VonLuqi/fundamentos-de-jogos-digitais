/**
 * Smoke Task 3 — Código de Recuperação da Alma
 * docs/plano-email-opcional-recuperacao-admin.md
 *
 * Estático: schema + actions + UI. Não chama o banco.
 *
 * Uso: node tests/ops-task3-soul-recovery-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SOUL_RECOVERY_GENERIC_ERROR,
  SOUL_RECOVERY_TABLE,
  SOUL_RECOVERY_TTL_MS,
  hashSoulRecoveryCode,
} from '../api/_lib/soul-recovery-code.js';
import {
  generateRecoveryCodePlain,
  normalizeRecoveryCodeInput,
} from '../api/_lib/recovery-code.js';
import { AUTH_RATE_LIMITS } from '../api/_lib/auth-rate.js';
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

const migrate = read('db/migrate-2026-09-22-soul-recovery-codes.sql');
const lib = read('api/_lib/soul-recovery-code.js');
const authApi = read('api/auth.js');
const apiJs = read('js/api.js');
const authHtml = read('pages/auth.html');
const authJs = read('js/auth.js');
const soulsJs = read('js/souls.js');
const pkg = read('package.json');
const readme = read('README.md');

assert(migrate.includes('CREATE TABLE IF NOT EXISTS soul_recovery_codes'), 'migration cria soul_recovery_codes');
assert(migrate.includes('soul_recovery_issue'), 'migration estende rate actions');
assert(migrate.includes('soul_recovery_consume'), 'migration rate consume');
assert(SOUL_RECOVERY_TABLE === 'soul_recovery_codes', 'nome da tabela estável');
assert(SOUL_RECOVERY_TTL_MS === 24 * 60 * 60 * 1000, 'TTL 24h');
assert(/Código inválido ou expirado/i.test(SOUL_RECOVERY_GENERIC_ERROR), 'erro genérico');

const plain = generateRecoveryCodePlain();
assert(plain.length === 10, 'código tem 10 chars');
assert(normalizeRecoveryCodeInput(' ab-cd ') === 'ABCD', 'normalize strip');
const h1 = hashSoulRecoveryCode(plain);
const h2 = hashSoulRecoveryCode(plain.toLowerCase());
assert(h1 === h2 && h1.length === 64, 'hash estável / case-insensitive');
assert(h1 !== hashSoulRecoveryCode(`${plain}X`), 'hash difere com código diferente');

assert(lib.includes('issueSoulRecoveryCode'), 'lib issue');
assert(lib.includes('findActiveSoulRecovery'), 'lib find');
assert(lib.includes('markSoulRecoveryUsed'), 'lib mark used');
assert(lib.includes('soul:'), 'hash prefix soul: distinto do Caronte');

assert(AUTH_RATE_LIMITS.soul_recovery_issue_user.max === 10, 'rate issue 10/h');
assert(AUTH_RATE_LIMITS.soul_recovery_consume_ip.max === 5, 'rate consume 5/15min');
assert(ADMIN_AUDIT_ACTIONS.issueSoulRecoveryCode === 'admin_issue_soul_recovery_code', 'audit issue');
assert(ADMIN_AUDIT_ACTIONS.consumeSoulRecoveryCode === 'consume_soul_recovery_code', 'audit consume');

assert(authApi.includes("action === 'adminIssueSoulRecoveryCode'"), 'API issue');
assert(authApi.includes("action === 'consumeSoulRecoveryCode'"), 'API consume');
assert(authApi.includes('SOUL_RECOVERY_GENERIC_ERROR'), 'API usa erro genérico');
assert(authApi.includes('issueSoulRecoveryCode'), 'auth importa issue');

assert(apiJs.includes("action: 'adminIssueSoulRecoveryCode'"), 'cliente issue');
assert(apiJs.includes("action: 'consumeSoulRecoveryCode'"), 'cliente consume');

assert(authHtml.includes('id="form-master-code"'), 'auth.html form master');
assert(authHtml.includes('O Mestre me deu um código'), 'link master no Pacto');
assert(authHtml.includes('id="open-master-code"'), 'botão open-master-code');
assert(authJs.includes('consumeSoulRecoveryCode'), 'auth.js consome');
assert(authJs.includes("activateMode('master')"), 'modo master');
assert(authJs.includes('Palavra renovada'), 'flash sucesso');

assert(soulsJs.includes('adminIssueSoulRecoveryCode'), 'Espelho chama issue');
assert(soulsJs.includes('Emitir Código de Recuperação'), 'botão Espelho');
assert(soulsJs.includes('Palavra temporária'), 'mantém Palavra temporária');

assert(pkg.includes('ops-task3-soul-recovery-smoke.mjs'), 'npm check inclui smoke');
assert(pkg.includes('api/_lib/soul-recovery-code.js'), 'npm check cobre lib');
assert(
  /Código de Recuperação|O Mestre me deu um código/i.test(readme),
  'README menciona recuperação pelo Mestre',
);

if (errors.length) {
  console.error('ops-task3-soul-recovery-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('ops-task3-soul-recovery-smoke OK');
console.log(`  · sample code ${plain} hash=${h1.slice(0, 8)}…`);
console.log('  · schema + API + Pacto + Espelho');
