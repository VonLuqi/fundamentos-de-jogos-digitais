/**
 * Smoke — Esqueci a Palavra / selo de e-mail
 * (docs/plano-esqueci-senha-email.md — Fase 6).
 *
 * Estático: parse de HTML/JS/API. Não chama Resend nem o banco.
 *
 * Uso: node tests/password-reset-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPlainToken,
  hashEmailToken,
  isValidEmail,
  normalizeEmail,
  PURPOSE,
} from '../api/_lib/auth-email.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const notes = [];

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

const authHtml = read('pages/auth.html');
const authJs = read('js/auth.js');
const apiJs = read('js/api.js');
const authApi = read('api/auth.js');
const authEmailLib = read('api/_lib/auth-email.js');
const mailer = read('api/_lib/mailer.js');
const progress = read('api/progress.js');
const dashboardHtml = read('pages/dashboard.html');
const dashboardJs = read('js/dashboard.js');
const migrate = read('db/migrate-2026-09-10-password-reset-email.sql');
const envExampleBits = read('README.md');

/* --- Pacto: esqueci + cadastro + reset --- */
assert(authHtml.includes('id="form-forgot"'), 'auth.html precisa de #form-forgot');
assert(authHtml.includes('id="form-reset"'), 'auth.html precisa de #form-reset');
assert(authHtml.includes('A Palavra se perdeu?'), 'auth.html precisa do link A Palavra se perdeu?');
assert(authHtml.includes('Chamar o Mensageiro'), 'auth.html precisa do CTA Chamar o Mensageiro');
assert(authHtml.includes('Selar nova Palavra'), 'auth.html precisa do CTA Selar nova Palavra');
assert(/name="email"/.test(authHtml), 'cadastro precisa de name="email"');
assert(authHtml.includes('autocomplete="email"'), 'campos de e-mail precisam de autocomplete=email');
assert(authHtml.includes('autocomplete="new-password"'), 'nova senha precisa de autocomplete=new-password');
assert(authHtml.includes('id="verify-result"'), 'auth.html precisa de #verify-result para o selo');
notes.push('Pacto: forgot / reset / e-mail no cadastro');

/* --- Cliente --- */
assert(apiJs.includes('action: \'requestPasswordReset\''), 'js/api.js precisa de requestPasswordReset');
assert(apiJs.includes('action: \'confirmPasswordReset\''), 'js/api.js precisa de confirmPasswordReset');
assert(apiJs.includes('action: \'confirmEmail\''), 'js/api.js precisa de confirmEmail');
assert(apiJs.includes('action: \'bindEmail\''), 'js/api.js precisa de bindEmail');
assert(apiJs.includes('action: \'requestEmailVerification\''), 'js/api.js precisa de requestEmailVerification');
assert(authJs.includes('requestPasswordReset') && authJs.includes('FORGOT_SUCCESS_COPY'), 'js/auth.js precisa chamar o Mensageiro com copy genérica');
assert(authJs.includes("activateMode('reset')"), 'js/auth.js deve abrir o painel em ?reset=');
assert(!/triggerScreenShake\(\)/.test(authJs.split('handleForgotSubmit')[1]?.split('handleResetSubmit')[0] || ''), 'pedido de reset não deve dar screen-shake');
notes.push('Cliente: helpers e modos do Pacto');

/* --- API actions (sem I/O) --- */
const actions = [
  'requestPasswordReset',
  'confirmPasswordReset',
  'requestEmailVerification',
  'confirmEmail',
  'bindEmail',
];
for (const action of actions) {
  assert(authApi.includes(`action === '${action}'`), `api/auth.js precisa da action ${action}`);
}
assert(authApi.includes('Este e-mail já firma outro pacto.'), 'register/bind deve 409 com copy de e-mail duplicado');
assert(authApi.includes('.delete()') && authApi.includes("eq('user_id'"), 'confirmPasswordReset deve apagar sessions do user_id');
assert(authEmailLib.includes('RESEND_API_KEY') === false, 'auth-email.js não deve embutir API key');
assert(mailer.includes('RESEND_API_KEY ausente'), 'mailer deve no-op sem RESEND_API_KEY');
assert(!/re_[A-Za-z0-9]{8,}/.test(mailer + authApi + authEmailLib), 'não versionar chave Resend no código');
notes.push('API: actions, 409, sessões, mailer no-op');

/* --- Helpers puros (sem I/O, sem Resend) --- */
if (normalizeEmail('  A@B.COM ') !== 'a@b.com') errors.push('normalizeEmail deve lower+trim');
assert(isValidEmail('alma@dominio.com'), 'e-mail válido deve passar');
assert(!isValidEmail('not-an-email'), 'e-mail inválido deve falhar');
assert(!isValidEmail(''), 'e-mail vazio deve falhar');
const token = createPlainToken();
assert(token.length === 64, 'token em claro deve ter 64 hex chars');
assert(hashEmailToken(token).length === 64, 'hash SHA-256 em hex tem 64 chars');
assert(hashEmailToken(token) !== token, 'banco guarda hash, não o token em claro');
assert(PURPOSE.resetPassword === 'reset_password', 'PURPOSE.resetPassword');
assert(PURPOSE.verifyEmail === 'verify_email', 'PURPOSE.verifyEmail');
notes.push('Helpers: normalize / validação / hash (sem Resend)');

/* --- Schema --- */
assert(migrate.includes('email_verified_at'), 'migration precisa de email_verified_at');
assert(migrate.includes('auth_email_tokens'), 'migration precisa de auth_email_tokens');
assert(migrate.includes('users_email_lower_uidx'), 'migration precisa do índice único lower(email)');
notes.push('Schema de e-mail / tokens');

/* --- DTO público sem e-mail --- */
const friendCard = progress.match(/function toFriendCard\([\s\S]*?\n\}/);
assert(Boolean(friendCard), 'toFriendCard precisa existir');
if (friendCard) {
  assert(!/\bemail\s*:/.test(friendCard[0]), 'toFriendCard não deve devolver email');
  assert(!/email_verified/.test(friendCard[0]), 'toFriendCard não deve devolver email_verified');
}
assert(
  /email:\s*safe\.email/.test(progress),
  'progress.sanitizeUser do próprio usuário deve expor email'
);
assert(
  /emailVerifiedAt:\s*safe\.email_verified_at/.test(progress),
  'progress.sanitizeUser do próprio usuário deve expor emailVerifiedAt'
);
assert(
  !progress.includes('.select(\'id, full_name, username, turma, role, xp, conquistas, completed_lessons, avatar_index, email'),
  'listagens de alunos/amigos não devem selecionar email'
);
assert(dashboardJs.includes('maskEmail'), 'dashboard deve mascarar e-mail no perfil');
assert(dashboardHtml.includes('id="messenger-seal"'), 'dashboard precisa do Selo do Mensageiro');
assert(dashboardJs.includes("user.role === 'admin'") && dashboardJs.includes('messenger-seal'), 'admin não vê o selo');
notes.push('DTO: e-mail só no self; perfil mascara');

/* --- README --- */
assert(envExampleBits.includes('RESEND_API_KEY'), 'README precisa de RESEND_API_KEY');
assert(envExampleBits.includes('APP_BASE_URL'), 'README precisa de APP_BASE_URL');
assert(
  /vincule|vincular e-mail|Painel do Herói/i.test(envExampleBits),
  'README deve avisar alunos antigos a vincularem e-mail no painel'
);
notes.push('README: env + onboarding');

console.log('Smoke esqueci senha / selo de e-mail (Fase 6)\n');
notes.forEach((n) => console.log(`  · ${n}`));

if (errors.length) {
  console.error(`\nFALHOU (${errors.length}):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`\nOK — ${notes.length} blocos cobertos estaticamente. Sem chamada ao Resend.`);
console.log('Manual restante: fluxo de e-mail real com RESEND_API_KEY (ver README).');
