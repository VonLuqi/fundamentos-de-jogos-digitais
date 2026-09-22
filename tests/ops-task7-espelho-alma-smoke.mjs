/**
 * Smoke Task 7 — Espelho da Alma (dossier + mutações admin + audit)
 * docs/plano-ops-nav-email-perf-admin.md
 *
 * Uso: node tests/ops-task7-espelho-alma-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from '../api/_lib/admin-audit.js';
import { readProgressSurface } from './_helpers/progress-surface.mjs';

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

const migrate = read('db/migrate-2026-09-22-admin-audit-events.sql');
const setup = read('db/setup.sql');
const auditLib = read('api/_lib/admin-audit.js');
const progress = readProgressSurface(root);
const auth = read('api/auth.js');
const apiJs = read('js/api.js');
const soulsJs = read('js/souls.js');
const soulsHtml = read('pages/souls.html');
const soulsCss = read('css/souls.css');
const pkg = read('package.json');
const plan = read('docs/plano-ops-nav-email-perf-admin.md');

assert(/CREATE TABLE IF NOT EXISTS admin_audit_events/.test(migrate), 'migrate cria admin_audit_events');
assert(/actor_id/.test(migrate) && /target_user_id/.test(migrate), 'migrate tem actor/target');
assert(/payload jsonb/.test(migrate), 'migrate tem payload jsonb');
assert(/admin_audit_events/.test(setup), 'setup.sql inclui admin_audit_events');

assert(auditLib.includes('recordAdminAudit'), 'admin-audit exporta recordAdminAudit');
assert(ADMIN_AUDIT_ACTIONS.adjustXp === 'admin_adjust_xp', 'ação audit XP estável');
assert(ADMIN_AUDIT_ACTIONS.forceTempPassword === 'admin_force_temp_password', 'ação audit senha estável');
assert(ADMIN_AUDIT_ACTIONS.grantAchievement === 'admin_grant_achievement', 'ação audit grant estável');
assert(ADMIN_AUDIT_ACTIONS.revokeAchievement === 'admin_revoke_achievement', 'ação audit revoke estável');

{
  const calls = [];
  const fake = {
    from(table) {
      calls.push(table);
      return {
        insert() {
          return Promise.resolve({ error: null });
        },
      };
    },
  };
  const result = await recordAdminAudit(fake, {
    actorId: 1,
    targetUserId: 2,
    action: ADMIN_AUDIT_ACTIONS.adjustXp,
    payload: { before: 0, after: 10 },
  });
  assert(result.ok === true, 'recordAdminAudit ok com client fake');
  assert(calls[0] === 'admin_audit_events', 'insert na tabela correta');
}

const adminActions = [
  'adminUpdateProfile',
  'adminAdjustXp',
  'adminSetLessonCompleted',
  'adminGrantAchievement',
  'adminRevokeAchievement',
  'adminClearEmailSeal',
  'adminInvalidateSessions',
];

for (const action of adminActions) {
  assert(progress.includes(`action === '${action}'`), `progress expõe ${action}`);
  assert(
    new RegExp(`export async function ${action}\\([\\s\\S]{0,2500}rejectUnlessAdmin`).test(progress),
    `${action} exige rejectUnlessAdmin`,
  );
}

assert(progress.includes('recordAdminAudit'), 'progress grava audit');
assert(progress.includes('hasDespertarState'), 'listUsers marca Estela do Despertar');
assert(auth.includes("action === 'adminForceTempPassword'"), 'auth expõe adminForceTempPassword');
assert(auth.includes('recordAdminAudit'), 'auth grava audit da senha temp');
assert(auth.includes('generateRecoveryCodePlain'), 'senha temp usa gerador do Domínio');

assert(apiJs.includes('export async function adminUpdateProfile'), 'cliente adminUpdateProfile');
assert(apiJs.includes('export async function adminAdjustXp'), 'cliente adminAdjustXp');
assert(apiJs.includes('export async function adminGrantAchievement'), 'cliente adminGrantAchievement');
assert(apiJs.includes('export function adminForceTempPassword'), 'cliente adminForceTempPassword');
assert(apiJs.includes('hasDespertarState'), 'normalizeUser tem hasDespertarState');

assert(soulsHtml.includes('id="soul-espelho"'), 'HTML tem painel Espelho');
assert(soulsHtml.includes('id="espelho-close"'), 'HTML tem fechar Espelho');
assert(soulsHtml.includes('id="espelho-body"'), 'HTML tem corpo do Espelho');
assert(soulsCss.includes('.espelho-panel'), 'CSS do painel Espelho');
assert(soulsCss.includes('.soul-card.is-active'), 'CSS card ativo no Espelho');

assert(soulsJs.includes('function openSoulEspelho'), 'souls abre Espelho');
assert(soulsJs.includes('function closeSoulEspelho'), 'souls fecha Espelho');
assert(soulsJs.includes('function restoreSoulEspelho'), 'souls restaura ?u= no Espelho');
assert(soulsJs.includes('adminAdjustXp'), 'souls chama ajuste de XP');
assert(soulsJs.includes('adminForceTempPassword'), 'souls chama senha temp');
assert(soulsJs.includes('adminGrantAchievement'), 'souls concede conquista');
assert(soulsJs.includes('adminRevokeAchievement'), 'souls revoga conquista');
assert(soulsJs.includes('window.confirm'), 'mutações pedem confirmação');
assert(soulsJs.includes("tab: 'users'") && soulsJs.includes('selectedEspelhoUsername'), 'deep link ?tab=users&u=');
assert(/openSoulEspelho\(user\)/.test(soulsJs), 'card de alma abre o Espelho');

assert(pkg.includes('ops-task7-espelho-alma-smoke.mjs'), 'package.json check inclui smoke Task 7');
assert(pkg.includes('api/_lib/admin-audit.js'), 'package.json check inclui admin-audit.js');
assert(/Task 7.*feita|feita.*Task 7/i.test(plan) || /Task 0–7 feitas|Task 0-7 feitas/i.test(plan), 'plano marca Task 7');

if (errors.length) {
  console.error('ops-task7-espelho-alma-smoke FALHOU:');
  errors.forEach((msg) => console.error(`  - ${msg}`));
  process.exit(1);
}

console.log('ops-task7-espelho-alma-smoke OK');
