/**
 * Smoke Task 2 — Perf/segurança (batch gates, rate limit, TTL, prereqs)
 * docs/plano-ops-nav-email-perf-admin.md
 *
 * Uso: node tests/ops-task2-perf-security-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUTH_RATE_LIMITS,
  AUTH_RATE_LIMIT_MESSAGE,
  hashIp,
  hashUsername,
} from '../api/_lib/auth-rate.js';
import {
  SESSION_RENEW_WINDOW_MS,
  SESSION_TTL_MS,
  sessionExpiresAt,
} from '../api/_lib/sessions.js';
import { hasUnlockedLesson, LESSON_PREREQUISITES } from '../api/_lib/store.js';
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

const migrate = read('db/migrate-2026-09-21-sessions-ttl-auth-rate.sql');
const setup = read('db/setup.sql');
const progress = readProgressSurface(root);
const auth = read('api/auth.js');
const apiJs = read('js/api.js');
const sessionsLib = read('api/_lib/sessions.js');
const rateLib = read('api/_lib/auth-rate.js');
const pkg = read('package.json');

assert(/expires_at/.test(migrate), 'migration adiciona sessions.expires_at');
assert(/auth_rate_events/.test(migrate), 'migration cria auth_rate_events');
assert(/expires_at/.test(setup), 'setup.sql espelha expires_at');
assert(/auth_rate_events/.test(setup), 'setup.sql espelha auth_rate_events');

assert(progress.includes("action === 'lessonGatesBatch'"), 'progress tem lessonGatesBatch');
assert(apiJs.includes("action: 'lessonGatesBatch'"), 'cliente usa lessonGatesBatch');
assert(apiJs.includes('fetchLessonsPublishMap'), 'fetchLessonsPublishMap existe');

assert(auth.includes('isAuthActionRateLimited'), 'auth aplica rate limit');
assert(auth.includes('createSessionRow'), 'auth cria sessão com TTL');
assert(auth.includes('loadValidSession'), 'auth valida TTL');
assert(auth.includes('429'), 'auth responde 429');
assert(sessionsLib.includes('SESSION_TTL_MS'), 'sessions.js exporta TTL');
assert(rateLib.includes('AUTH_RATE_LIMITS'), 'auth-rate.js exporta limites');

assert(progress.includes('hasUnlockedLesson'), 'redeem importa hasUnlockedLesson');
assert(progress.includes('LESSON_PREREQUISITES'), 'redeem conhece prerequisites');
assert(LESSON_PREREQUISITES.aula5 === 'aula4', 'aula5 exige aula4');
assert(hasUnlockedLesson({ completed_lessons: [] }, 'aula1') === true, 'aula1 sem prereq');
assert(hasUnlockedLesson({ completed_lessons: [] }, 'aula2') === false, 'aula2 bloqueada sem aula1');
assert(hasUnlockedLesson({ completed_lessons: ['aula1'] }, 'aula2') === true, 'aula2 ok após aula1');
assert(hasUnlockedLesson({ completedLessons: ['aula4'] }, 'aula5') === true, 'camelCase também funciona');

assert(SESSION_TTL_MS === 14 * 24 * 60 * 60 * 1000, 'TTL 14 dias');
assert(SESSION_RENEW_WINDOW_MS === 7 * 24 * 60 * 60 * 1000, 'renew window 7 dias');
assert(typeof sessionExpiresAt() === 'string', 'sessionExpiresAt ISO');
assert(AUTH_RATE_LIMITS.login_ip.max === Infinity, 'login sem teto de tentativas');
assert(AUTH_RATE_LIMITS.register_ip.max === 5, 'register 5/IP/hora');
assert(hashIp('1.2.3.4') !== hashIp('5.6.7.8'), 'ip hash distinto');
assert(hashUsername('Alice') === hashUsername('alice'), 'username hash normalizado');
assert(/paciência|paciencia/i.test(AUTH_RATE_LIMIT_MESSAGE), 'copy 429 do Domínio');

assert(pkg.includes('ops-task2-perf-security-smoke.mjs'), 'npm check inclui este smoke');
assert(pkg.includes('api/_lib/sessions.js'), 'npm check cobre sessions.js');
assert(pkg.includes('api/_lib/auth-rate.js'), 'npm check cobre auth-rate.js');

if (errors.length) {
  console.error('ops-task2-perf-security-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('ops-task2-perf-security-smoke OK');
console.log('  · batch lessonGates');
console.log('  · rate limit login/register');
console.log('  · session TTL 14d + renew 7d');
console.log('  · redeem prerequisites');
