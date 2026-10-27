/**
 * Smoke estático: bypass admin de pré-visualização sem abrir published.
 * Uso: node tests/despertar-admin-preview-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ADMIN_PREVIEW_STORAGE_KEY,
  isAdminPreviewActive,
  setAdminPreviewActive,
  consumeAdminPreviewQuery,
} from '../js/hades-despertar/config/admin-preview.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexJs = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
const veilJs = fs.readFileSync(path.join(root, 'js/hades-despertar/ui/pauseVeil.js'), 'utf8');
const seasonJs = fs.readFileSync(path.join(root, 'js/hades-despertar/config/season-closed.js'), 'utf8');

assert.match(seasonJs, /ctaPreview/);
assert.match(seasonJs, /ctaExitPreview/);
assert.match(veilJs, /data-season-preview/);
assert.match(veilJs, /onPreview/);
assert.match(indexJs, /consumeAdminPreviewQuery/);
assert.match(indexJs, /mountAdminPreviewBanner/);
assert.match(indexJs, /!adminPreview/);
assert.match(indexJs, /setAdminPreviewActive\(true\)/);
assert.match(indexJs, /\?preview=1/);
assert.match(indexJs, /requireQuery:\s*true/);
assert.match(indexJs, /await seasonOpen\(/);
assert.match(indexJs, /mountSeasonHallFab/);

const mem = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
};

setAdminPreviewActive(false);
assert.equal(isAdminPreviewActive(), false);
setAdminPreviewActive(true);
assert.equal(isAdminPreviewActive(), true);
assert.equal(mem.get(ADMIN_PREVIEW_STORAGE_KEY), '1');

const fakeLoc = { search: '?preview=1', pathname: '/despertar/', hash: '' };
let replaced = '';
const fakeHist = { state: null, replaceState(_s, _t, url) { replaced = url; } };
mem.clear();
assert.equal(consumeAdminPreviewQuery({ isAdmin: false, location: fakeLoc, history: fakeHist }), false);
assert.equal(isAdminPreviewActive(), false);
assert.equal(
  consumeAdminPreviewQuery({ isAdmin: true, location: { ...fakeLoc }, history: fakeHist }),
  true,
);
assert.equal(isAdminPreviewActive(), true);
assert.equal(replaced, '/despertar/');

console.log('despertar-admin-preview-smoke: OK');
