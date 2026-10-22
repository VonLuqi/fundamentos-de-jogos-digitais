/**
 * Smoke — PWA instalável + convite pós-login.
 * Uso: node tests/pwa-install-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const manifest = JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.display, 'standalone');
assert.ok(String(manifest.start_url).includes('dashboard'), 'start_url → dashboard');
assert.ok(
  Array.isArray(manifest.icons) && manifest.icons.some((i) => String(i.sizes).includes('192')),
  'ícone 192'
);
assert.ok(
  Array.isArray(manifest.icons) && manifest.icons.some((i) => String(i.sizes).includes('512')),
  'ícone 512'
);

assert.ok(fs.existsSync(path.join(root, 'assets/icons/icon-512.png')), 'icon-512.png existe');
assert.ok(fs.existsSync(path.join(root, 'sw.js')), 'sw.js na raiz');

const sw = read('sw.js');
assert.ok(sw.includes('addEventListener') && sw.includes('fetch'), 'SW mínimo com fetch');

const pwa = read('js/pwa-install.js');
assert.ok(pwa.includes('beforeinstallprompt'), 'captura beforeinstallprompt');
assert.ok(pwa.includes('export function maybeOfferInstall'), 'export maybeOfferInstall');
assert.ok(pwa.includes('Instalar o app'), 'copy do título');
assert.ok(pwa.includes('needsMessengerSeal'), 'gate usa needsMessengerSeal');
assert.ok(pwa.includes('bindEmail') && pwa.includes('requestEmailVerification'), 'popup bind/reenviar');
assert.ok(pwa.includes('handleInstallIntent') || pwa.includes('openEmailGate'), 'gate no clique Instalar');
assert.ok(pwa.includes('data-pwa-action="continue"') || pwa.includes("action=\"continue\""), 'iOS Continuar');
assert.ok(pwa.includes('pwa-install-gate'), 'markup do popup de e-mail');

const api = read('js/api.js');
assert.ok(api.includes('export function needsMessengerSeal'), 'needsMessengerSeal exportado');

const shell = read('js/app-shell.js');
assert.ok(shell.includes("from './pwa-install.js'"), 'app-shell importa pwa-install');
assert.ok(shell.includes('maybeOfferInstall()'), 'initAppShell chama maybeOfferInstall');

const htaccess = read('.htaccess');
assert.ok(
  htaccess.includes('application/manifest+json') && htaccess.includes('.webmanifest'),
  'MIME .webmanifest no .htaccess'
);

const css = read('css/app-shell.css');
assert.ok(css.includes('.pwa-install'), 'estilos do banner PWA');
assert.ok(css.includes('.pwa-install-gate'), 'estilos do popup de e-mail');

console.log('OK pwa-install-smoke');
