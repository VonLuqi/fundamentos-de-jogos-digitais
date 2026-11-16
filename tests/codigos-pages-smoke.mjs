/**
 * Smoke — página dedicada de Códigos (Mestre) + wiring no Painel.
 * Uso: node tests/codigos-pages-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProgressSurface } from './_helpers/progress-surface.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

const required = [
  'pages/codigos.html',
  'js/codigos.js',
  'css/codigos.css',
];

required.forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const html = read('pages/codigos.html');
const js = read('js/codigos.js');
const api = read('js/api.js');
const dashboardHtml = read('pages/dashboard.html');
const dashboardJs = read('js/dashboard.js');

assert(html.includes('data-role-scope="admin"'), 'codigos.html deve ser admin-only');
assert(html.includes('data-route="codigos"'), 'codigos.html data-route=codigos');
assert(html.includes('id="codes-generate-form"'), 'form de gerar código');
assert(html.includes('id="codes-active"'), 'painel de código ativo');
assert(html.includes('id="btn-copy-active"'), 'botão copiar');
assert(html.includes('id="codes-list"'), 'lista de histórico');
assert(html.includes('data-nav-item="codigos"'), 'nav item Códigos');

assert(js.includes('requireAdmin'), 'codigos.js exige admin');
assert(html.includes('id="codes-ttl"'), 'seletor de duração');
assert(html.includes('id="codes-single-use"'), 'checkbox uso único');
assert(js.includes('ttlMinutes'), 'codigos.js envia ttlMinutes');
assert(js.includes('singleUse'), 'codigos.js envia singleUse');
assert(api.includes('CODE_TTL_OPTIONS'), 'api.js exporta CODE_TTL_OPTIONS');
assert(api.includes('singleUse'), 'generateCode cliente envia singleUse');

// Backend atual é PHP (backend/src/{Controllers,Services/Progress}); legado api/_lib/ foi removido.
const progressSurface = readProgressSurface(root);
const redeem = progressSurface;
const shared = progressSurface;
const migrate = read('db/migrate-2026-10-02-redeem-code-ttl-single-use.sql');
const setup = read('db/setup.sql');

assert(migrate.includes('single_use'), 'migração adiciona single_use');
assert(setup.includes('single_use boolean'), 'setup.sql tem single_use');
assert(shared.includes('CODE_TTL_OPTIONS'), 'shared exporta CODE_TTL_OPTIONS');
assert(shared.includes('normalizeTtlMinutes'), 'shared normaliza TTL');
assert(redeem.includes("['single_use']"), 'redeem trata uso único');
assert(redeem.includes("$body['ttlMinutes']"), 'generateCode lê ttlMinutes');
assert(js.includes('generateCode'), 'codigos.js gera código');
assert(js.includes('listCodes'), 'codigos.js lista histórico');
assert(/codigos:\s*\(\)\s*=>/.test(api), 'ROUTES.codigos existe');

assert(
  /id="btn-generate-codes"[^>]*href="(\.\.\/codigos\/|\.\/codigos\.html)"/.test(dashboardHtml.replace(/\s+/g, ' ')),
  'master-tools deve linkar para ./codigos.html',
);
assert(dashboardHtml.includes('Códigos de Acesso'), 'label Códigos de Acesso no Painel');
assert(
  !dashboardJs.includes("openScrollModal('Gerar Código de Acesso'"),
  'dashboard não deve mais abrir modal de gerar códigos',
);
// Trono do Mestre (commit 71a8af5): o Painel cunha códigos no formulário "forja" (master-forge-*), sem modal.
assert(dashboardJs.includes('master-forge-lesson') && dashboardJs.includes('generateCode('), 'dashboard cunha códigos pelo formulário forja');
assert(dashboardJs.includes('toUpperCase'), 'Altar normaliza código em maiúsculas');

const sidebars = [
  'pages/dashboard.html',
  'pages/aulas.html',
  'pages/souls.html',
  'pages/prova-admin.html',
  'pages/codigos.html',
];
sidebars.forEach((rel) => {
  const page = read(rel);
  assert(
    page.includes('data-nav-item="codigos"') && (page.includes('href="../codigos/"') || page.includes('href="./codigos.html"')),
    `${rel}: sidebar deve ter link Códigos`,
  );
});

if (errors.length) {
  console.error('codigos-pages-smoke:');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('codigos-pages-smoke OK');
console.log('  · pages/codigos.html admin');
console.log('  · TTL + uso único');
console.log('  · ROUTES.codigos + master-tools link');
console.log('  · Altar uppercase no dashboard');
