#!/usr/bin/env node
/**
 * Gate do Despertar: roda todos os tests/despertar-*.mjs (descoberta automática)
 * e imprime um resumo. Não para na primeira falha.
 *
 * Uso:
 *   npm run test:despertar
 *   node scripts/run-despertar-tests.mjs perf foice   # só arquivos que contêm "perf" ou "foice"
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS_DIR = path.join(ROOT, 'tests');
const TIMEOUT_MS = 180_000;

const filters = process.argv.slice(2);
const files = fs.readdirSync(TESTS_DIR)
  .filter((f) => /^despertar-.*\.mjs$/.test(f))
  .filter((f) => filters.length === 0 || filters.some((q) => f.includes(q)))
  .sort();

if (files.length === 0) {
  console.error('Nenhum teste encontrado.');
  process.exit(1);
}

const failures = [];
const started = Date.now();

for (const file of files) {
  const t0 = Date.now();
  const res = spawnSync(process.execPath, [path.join('tests', file)], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });
  const ms = Date.now() - t0;
  const ok = res.status === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${file}  (${ms} ms)`);
  if (!ok) failures.push({ file, out: `${res.stdout || ''}${res.stderr || ''}${res.error ? String(res.error) : ''}` });
}

for (const { file, out } of failures) {
  console.log(`\n──────── ${file} ────────`);
  console.log(out.split('\n').slice(-40).join('\n'));
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${files.length - failures.length}/${files.length} passaram em ${secs}s`);
process.exit(failures.length > 0 ? 1 : 0);
