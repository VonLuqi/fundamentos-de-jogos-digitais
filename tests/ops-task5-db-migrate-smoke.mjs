/**
 * Smoke Task 5 — Script db:migrate
 * docs/plano-ops-nav-email-perf-admin.md
 *
 * Uso: node tests/ops-task5-db-migrate-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

const script = read('scripts/apply-migrations.mjs');
const pkg = read('package.json');
const readme = read('README.md');
const plan = read('docs/plano-ops-nav-email-perf-admin.md');
const gitignore = read('.gitignore');

assert(script.includes('_schema_migrations'), 'script cria ledger _schema_migrations');
assert(script.includes('--dry-run'), 'script aceita --dry-run');
assert(script.includes('--bootstrap'), 'script aceita --bootstrap');
assert(script.includes('--mark-applied'), 'script aceita --mark-applied (baseline)');
assert(script.includes('DATABASE_URL'), 'script lê DATABASE_URL');
assert(script.includes('.env.local'), 'script carrega .env.local');
assert(script.includes('migrate-'), 'script lista migrate-*.sql');
assert(script.includes('BEGIN') && script.includes('COMMIT'), '1 transação por arquivo');
assert(script.includes('redact') || /:\*\*\*/.test(script), 'redige senha em erros');
assert(!/postgresql:\/\/[^:]+:[^@]+@/.test(script), 'script não embute connection string');
assert(/console\.log\([^)]*APPLY/.test(script) || script.includes('APPLY'), 'log APPLY');
assert(script.includes('SKIP'), 'log SKIP');
assert(script.includes('FAIL'), 'log FAIL');

assert(pkg.includes('"db:migrate"'), 'package.json tem script db:migrate');
assert(pkg.includes('apply-migrations.mjs'), 'db:migrate aponta para o script');
assert(/"pg"\s*:/.test(pkg), 'dependency pg declarada');
assert(pkg.includes('ops-task5-db-migrate-smoke.mjs'), 'npm check inclui este smoke');

assert(readme.includes('DATABASE_URL'), 'README documenta DATABASE_URL');
assert(readme.includes('db:migrate'), 'README documenta npm run db:migrate');
assert(readme.includes('--dry-run'), 'README documenta dry-run');
assert(/Pooler|Direct|connection string|URI/i.test(readme), 'README explica origem da URI');

assert(gitignore.includes('.env.local') || gitignore.includes('.env*'), '.gitignore cobre .env');
assert(/Task 5/.test(plan), 'plano documenta Task 5');

const help = spawnSync(
  process.execPath,
  ['scripts/apply-migrations.mjs', '--help'],
  { cwd: root, encoding: 'utf8' },
);
assert(help.status === 0, '--help exit 0');
assert(/DATABASE_URL/i.test(help.stdout || ''), '--help menciona DATABASE_URL');
assert(!/postgres(ql)?:\/\/[^:\s]+:[^@\s]+@/i.test(help.stdout + help.stderr), '--help sem URI secreta');

const missingUrl = spawnSync(
  process.execPath,
  ['scripts/apply-migrations.mjs', '--dry-run'],
  {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: '' },
  },
);
assert(missingUrl.status !== 0, 'sem DATABASE_URL → exit ≠ 0');
assert(/DATABASE_URL/i.test(missingUrl.stderr || missingUrl.stdout || ''), 'mensagem pede DATABASE_URL');

if (errors.length) {
  console.error('ops-task5-db-migrate-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('ops-task5-db-migrate-smoke OK');
console.log('  · apply-migrations.mjs (dry-run / bootstrap / mark-applied)');
console.log('  · ledger _schema_migrations');
console.log('  · package.json db:migrate + pg');
console.log('  · README DATABASE_URL');
