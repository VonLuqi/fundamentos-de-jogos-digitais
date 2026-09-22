/**
 * Smoke Task 4 — Recuperação legada + Senha do Caronte
 * docs/plano-ops-nav-email-perf-admin.md
 *
 * Uso: node tests/ops-task4-caronte-recovery-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PURPOSE } from '../api/_lib/auth-email.js';
import { AUTH_RATE_LIMITS } from '../api/_lib/auth-rate.js';
import {
  RECOVERY_CODE_CHARSET,
  RECOVERY_CODE_LENGTH,
  RECOVERY_SETTING_KEY,
  generateRecoveryCodePlain,
  hashRecoveryCode,
  normalizeRecoveryCodeInput,
} from '../api/_lib/recovery-code.js';

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

const migrate = read('db/migrate-2026-09-22-caronte-recovery.sql');
const setup = read('db/setup.sql');
const authApi = read('api/auth.js');
const authEmail = read('api/_lib/auth-email.js');
const recoveryLib = read('api/_lib/recovery-code.js');
const rateLib = read('api/_lib/auth-rate.js');
const apiJs = read('js/api.js');
const authJs = read('js/auth.js');
const authHtml = read('pages/auth.html');
const dashboardHtml = read('pages/dashboard.html');
const dashboardJs = read('js/dashboard.js');
const pkg = read('package.json');
const plan = read('docs/plano-ops-nav-email-perf-admin.md');

assert(/site_settings/.test(migrate), 'migration cria site_settings');
assert(/legacy_reset/.test(migrate), 'migration libera purpose legacy_reset');
assert(/legacy_bind/.test(migrate), 'migration libera action legacy_bind');
assert(/site_settings/.test(setup), 'setup.sql espelha site_settings');
assert(/legacy_reset/.test(setup), 'setup.sql espelha legacy_reset');
assert(/legacy_bind/.test(setup), 'setup.sql espelha legacy_bind');

assert(PURPOSE.legacyReset === 'legacy_reset', 'PURPOSE.legacyReset');
assert(authEmail.includes('dispatchLegacyReset'), 'auth-email tem dispatchLegacyReset');
assert(authEmail.includes('legacyResetEmailCopy'), 'auth-email tem copy do e-mail legado');

assert(AUTH_RATE_LIMITS.legacy_bind_ip?.max === 10, 'legacy_bind 10/IP/15min');
assert(AUTH_RATE_LIMITS.legacy_bind_user?.max === 5, 'legacy_bind 5/username/15min');
assert(rateLib.includes("action === 'legacy_bind'"), 'auth-rate trata legacy_bind');

assert(RECOVERY_SETTING_KEY === 'caronte_recovery_code', 'chave site_settings');
assert(RECOVERY_CODE_LENGTH === 10, 'código tem 10 chars');
assert(!/[01ILO]/.test(RECOVERY_CODE_CHARSET), 'charset sem ambiguidade 0/1/I/L/O');
const plain = generateRecoveryCodePlain();
assert(plain.length === 10, 'generateRecoveryCodePlain length');
assert([...plain].every((ch) => RECOVERY_CODE_CHARSET.includes(ch)), 'chars no charset');
assert(hashRecoveryCode(plain) === hashRecoveryCode(plain.toLowerCase()), 'hash case-insensitive');
assert(hashRecoveryCode(plain) !== plain, 'banco guarda hash');
assert(normalizeRecoveryCodeInput(' ab-cd ') === 'ABCD', 'normalize remove lixo');
assert(recoveryLib.includes('timingSafeEqual'), 'verify usa timing-safe');

assert(authApi.includes("action === 'requestLegacyEmailBind'"), 'API requestLegacyEmailBind');
assert(authApi.includes("action === 'rotateRecoveryCode'"), 'API rotateRecoveryCode');
assert(authApi.includes('dispatchLegacyReset'), 'API dispara legacy reset');
assert(authApi.includes('PURPOSE.legacyReset'), 'confirm aceita legacy_reset');
assert(authApi.includes('email_verified_at') && authApi.includes('isLegacy'), 'legacy confirma selo no reset');
assert(authApi.includes('hasNoEmail'), 'legado só sem e-mail (C4)');

assert(apiJs.includes("action: 'requestLegacyEmailBind'"), 'cliente requestLegacyEmailBind');
assert(apiJs.includes("action: 'rotateRecoveryCode'"), 'cliente rotateRecoveryCode');
assert(authHtml.includes('id="form-legacy"'), 'auth.html form legado');
assert(authHtml.includes('Senha do Caronte'), 'auth.html campo Caronte');
assert(authHtml.includes('open-legacy'), 'auth.html link legado');
assert(authJs.includes('requestLegacyEmailBind'), 'auth.js chama legado');
assert(authJs.includes("activateMode('legacy')"), 'auth.js modo legacy');
assert(authJs.includes('LEGACY_SUCCESS_COPY'), 'auth.js copy genérica legado');

assert(dashboardHtml.includes('btn-rotate-caronte'), 'Painel tem Senha do Caronte (legado)');
assert(authHtml.includes('Alma antiga') || authHtml.includes('open-legacy'), 'atalho legado rotulado Alma antiga');
assert(dashboardJs.includes('rotateRecoveryCode'), 'dashboard chama rotateRecoveryCode');

assert(pkg.includes('ops-task4-caronte-recovery-smoke.mjs'), 'npm check inclui este smoke');
assert(pkg.includes('api/_lib/recovery-code.js'), 'npm check cobre recovery-code.js');
assert(/Task 4/.test(plan), 'plano documenta Task 4');

if (errors.length) {
  console.error('ops-task4-caronte-recovery-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('ops-task4-caronte-recovery-smoke OK');
console.log('  · site_settings + legacy_reset + legacy_bind');
console.log('  · Senha do Caronte (hash / charset)');
console.log('  · requestLegacyEmailBind + confirm selo');
console.log('  · UI Pact + Painel Mestre');
