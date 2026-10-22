/**
 * Smoke — URLs limpas da app (sem /pages/ e sem .html na URL pública).
 * Uso: node tests/clean-urls-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const htaccess = read('.htaccess');
assert.ok(
  htaccess.includes('pages/$1.html') && htaccess.includes('despertar'),
  '.htaccess reescreve slugs limpos para pages/*.html'
);
assert.ok(
  htaccess.includes('%{THE_REQUEST}') && /pages\/\$1\.html\s*\[L,END\]/.test(htaccess),
  '.htaccess 301 só no request original (THE_REQUEST) + [END] no rewrite interno'
);
assert.ok(
  htaccess.includes('%1/%2/') && !/RewriteRule \^pages\/.*\$ \$1\//.test(htaccess),
  '.htaccess 301 usa Location absoluta (%1/%2/) sem redirect relativo'
);
assert.ok(
  /pages\/\(auth\|dashboard/.test(htaccess) || htaccess.includes('pages/(auth|dashboard'),
  '.htaccess 301 de pages/*.html legado'
);

const api = read('js/api.js');
assert.ok(api.includes("appRoute('despertar')") || api.includes('/despertar/'), 'ROUTES.despertar limpa');
assert.ok(api.includes('APP_PAGE_SLUGS'), 'lista de slugs da app');
assert.ok(!/dashboard:\s*\(\)\s*=>\s*`\$\{rootPath\(\)\}\/pages\/dashboard\.html`/.test(api), 'ROUTES sem pages/dashboard.html');

const indexHtml = read('index.html');
assert.ok(indexHtml.includes('./dashboard/') && indexHtml.includes('./auth/'), 'index redireciona para URLs limpas');

const dash = read('pages/dashboard.html');
assert.ok(dash.includes('href="../despertar/"'), 'nav dashboard usa ../despertar/');
assert.ok(!dash.includes('href="./despertar.html"'), 'nav sem .html relativo antigo');

const vercel = read('vercel.json');
assert.ok(vercel.includes('"/despertar/"') && vercel.includes('/pages/despertar.html'), 'vercel rewrite despertar');

const devServer = read('scripts/dev-server.mjs');
assert.ok(devServer.includes('APP_PAGE_SLUGS'), 'dev-server conhece slugs');
assert.ok(devServer.includes('/dashboard/'), 'dev-server log URLs limpas');

// —— Integração rápida com dev-server ——
const PORT = 3457;
const child = spawn(process.execPath, ['scripts/dev-server.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

function fetchPath(p) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PORT}${p}`, { timeout: 5000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          location: res.headers.location || '',
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

function waitReady() {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('dev-server não subiu')), 8000);
    child.stdout.on('data', (buf) => {
      if (String(buf).includes('Servidor Local Ativo')) {
        clearTimeout(t);
        resolve();
      }
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      clearTimeout(t);
      reject(new Error(`dev-server saiu cedo: ${code}`));
    });
  });
}

try {
  await waitReady();

  const clean = await fetchPath('/despertar/');
  assert.equal(clean.status, 200, '/despertar/ → 200');
  assert.ok(clean.body.includes('O Despertar') || clean.body.includes('despertar'), 'HTML do Despertar');

  const noSlash = await fetchPath('/despertar');
  assert.equal(noSlash.status, 301, '/despertar → 301');
  assert.ok(String(noSlash.location).endsWith('/despertar/'), 'Location com barra final');

  const legacy = await fetchPath('/pages/despertar.html');
  assert.equal(legacy.status, 301, '/pages/despertar.html → 301');
  assert.ok(String(legacy.location).includes('/despertar/'), 'legado aponta para URL limpa');

  const dashPage = await fetchPath('/dashboard/');
  assert.equal(dashPage.status, 200, '/dashboard/ → 200');

  console.log('OK clean-urls-smoke');
} finally {
  child.kill('SIGTERM');
}
