/**
 * Smoke Fase C / Task C6 — cache de assets estáticos + no-store em /api.
 * docs/otimizacoes/03-tasks-fase-c-escala-obs.md
 *
 * Uso: node tests/ops-perf-fase-c-assets-cache-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const vercel = read('vercel.json');
const readme = read('README.md');
const doc03 = read('docs/otimizacoes/03-tasks-fase-c-escala-obs.md');
const pkg = read('package.json');

let parsed;
try {
  parsed = JSON.parse(vercel);
} catch (error) {
  errors.push(`vercel.json inválido: ${error.message}`);
  parsed = { headers: [] };
}

const headers = Array.isArray(parsed.headers) ? parsed.headers : [];

function findHeader(sourceNeedle) {
  return headers.find((h) => String(h.source || '').includes(sourceNeedle));
}

function cacheValue(block) {
  const list = block?.headers || [];
  const row = list.find((h) => String(h.key || '').toLowerCase() === 'cache-control');
  return row ? String(row.value || '') : '';
}

const apiBlock = findHeader('/api/');
const assetsBlock = findHeader('/assets/');
const dataBlock = findHeader('/data/');

assert(apiBlock, 'vercel.json tem header /api/');
assert(/no-store/i.test(cacheValue(apiBlock)), '/api/ permanece no-store');
assert(!/max-age=[1-9]/i.test(cacheValue(apiBlock).replace(/max-age=0/, '')), '/api/ sem max-age longo');

assert(assetsBlock, 'vercel.json tem header /assets/');
const assetsCc = cacheValue(assetsBlock);
assert(/public/i.test(assetsCc), '/assets/ Cache-Control public');
assert(/max-age=(\d+)/i.test(assetsCc), '/assets/ tem max-age');
{
  const m = assetsCc.match(/max-age=(\d+)/i);
  const sec = m ? Number(m[1]) : 0;
  assert(sec >= 86400, '/assets/ max-age ≥ 1 dia');
}

assert(dataBlock, 'vercel.json tem header /data/');
const dataCc = cacheValue(dataBlock);
assert(/public/i.test(dataCc), '/data/ Cache-Control public');
{
  const m = dataCc.match(/max-age=(\d+)/i);
  const sec = m ? Number(m[1]) : 999999;
  assert(sec > 0 && sec <= 300, '/data/ TTL curto (≤300 s) — JSON mutável sem hash');
}

// Ordem: garantir que não há header /api com public
for (const block of headers) {
  if (String(block.source || '').includes('/api/')) {
    assert(/no-store/i.test(cacheValue(block)), `bloco ${block.source} api no-store`);
  }
}

assert(/cache bust|Cache-Control|\/assets\//i.test(readme), 'README menciona cache de assets');
assert(/no-store/i.test(readme) || /API.*no-store|autenticad/i.test(readme), 'README nota API no-store');
assert(/Task C6[\s\S]*?\[[xX]\]|C6[\s\S]*feita/i.test(doc03), 'doc 03 marca C6');
assert(pkg.includes('ops-perf-fase-c-assets-cache-smoke.mjs'), 'npm check inclui smoke');

assert(fs.existsSync(path.join(root, 'data', 'game-catalog.json')), 'data/game-catalog.json existe');
assert(fs.existsSync(path.join(root, 'assets')), 'pasta assets existe');

if (errors.length) {
  console.error('ops-perf-fase-c-assets-cache-smoke FAIL:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

console.log('ops-perf-fase-c-assets-cache-smoke OK');
console.log('  · /assets long cache · /data TTL curto · /api no-store');
