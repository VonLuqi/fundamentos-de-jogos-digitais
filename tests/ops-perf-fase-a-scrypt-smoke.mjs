/**
 * Smoke Fase A / Task A4 — scrypt async no auth (formato on-disk preservado).
 * docs/otimizacoes/01-tasks-fase-a-contencao.md
 *
 * Uso: node tests/ops-perf-fase-a-scrypt-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { hashPassword, verifyPassword } from '../api/auth.js';

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

const authSrc = read('api/auth.js');
const pkg = read('package.json');
const taskDoc = read('docs/otimizacoes/01-tasks-fase-a-contencao.md');

assert(!authSrc.includes('scryptSync'), 'api/auth.js sem scryptSync');
assert(!authSrc.includes('compareSync'), 'api/auth.js sem bcrypt.compareSync');
assert(authSrc.includes('promisify'), 'usa util.promisify');
assert(authSrc.includes('scryptAsync'), 'usa scryptAsync');
assert(authSrc.includes('export async function hashPassword'), 'hashPassword async exportado');
assert(authSrc.includes('export async function verifyPassword'), 'verifyPassword async exportado');
assert(authSrc.includes('await hashPassword'), 'call sites await hashPassword');
assert(authSrc.includes('await verifyPassword'), 'call sites await verifyPassword');
assert(authSrc.includes('bcrypt.compare'), 'bcrypt async compare');
assert(authSrc.includes('migrated bcrypt password') || authSrc.includes('bcrypt→scrypt'), 'migrate bcrypt on-success');
assert(authSrc.includes('AUTH_LOG_SCRYPT') || authSrc.includes('scrypt_ms'), 'log opcional scrypt_ms');
assert(pkg.includes('ops-perf-fase-a-scrypt-smoke.mjs'), 'npm check inclui este smoke');
assert(/Task A4|scrypt/i.test(taskDoc), 'doc Fase A cobre A4');

const password = 'Palavra-Teste-A4!';
const stored = await hashPassword(password);
assert(typeof stored === 'string' && stored.includes(':'), 'formato salt:hex');
const [salt, derived] = stored.split(':');
assert(salt.length === 24, 'salt 12 bytes hex (24 chars)');
assert(derived.length === 128, 'keylen 64 → 128 hex chars');
assert(await verifyPassword(password, stored) === true, 'verify ok mesma senha');
assert(await verifyPassword('errada', stored) === false, 'verify rejeita senha errada');

const sameSalt = await hashPassword(password, salt);
assert(sameSalt === stored, 'mesmo salt reproduz hash (compatível com hashes existentes)');

const bcryptHash = await bcrypt.hash(password, 4);
assert(await verifyPassword(password, bcryptHash) === true, 'verify aceita bcrypt legado');
assert(await verifyPassword('errada', bcryptHash) === false, 'bcrypt rejeita senha errada');

if (errors.length) {
  console.error('ops-perf-fase-a-scrypt-smoke FAILED:');
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}

console.log('ops-perf-fase-a-scrypt-smoke OK');
console.log(`  roundtrip scrypt + bcrypt legado; salt=${salt.slice(0, 6)}…`);
