/**
 * Smoke Task F0.1 — copy dos Juízes (sync rejeitado legível)
 * Uso: node tests/despertar-judges-copy-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  API_WARNING_DISMISS_MS,
  JUDGES_REFUSED_MESSAGE,
  JUDGES_REFUSED_TICKER,
} from '../js/hades-despertar/config/constants.js';
import { validateSync } from '../api/_lib/despertar-validate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function staticAssert(condition, message) {
  if (!condition) errors.push(message);
}

const constantsSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/config/constants.js'), 'utf8');
const indexSrc = fs.readFileSync(path.join(root, 'js/hades-despertar/index.js'), 'utf8');
const validateSrc = fs.readFileSync(path.join(root, 'api/_lib/despertar-validate.js'), 'utf8');
const apiSrc = fs.readFileSync(path.join(root, 'api/despertar.js'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

staticAssert(constantsSrc.includes('JUDGES_REFUSED_MESSAGE'), 'constante JUDGES_REFUSED_MESSAGE');
staticAssert(constantsSrc.includes('restaurou o estado verdadeiro'), 'copy explica restore');
staticAssert(constantsSrc.includes('JUDGES_REFUSED_TICKER'), 'ticker rumor');
staticAssert(indexSrc.includes('JUDGES_REFUSED_MESSAGE'), 'cliente usa constante');
staticAssert(indexSrc.includes('pushJudgesTickerHint') || indexSrc.includes('JUDGES_REFUSED_TICKER'), 'ticker no reject');
staticAssert(indexSrc.includes('API_WARNING_DISMISS_MS') || indexSrc.includes('dismissMs'), 'auto-dismiss');
staticAssert(validateSrc.includes('JUDGES_REFUSED_MESSAGE'), 'validate usa constante');
staticAssert(!validateSrc.includes("'Os Juízes recusaram o saldo declarado.'"), 'validate sem string curta antiga');
staticAssert(apiSrc.includes('JUDGES_REFUSED_MESSAGE'), 'API importa constante');
staticAssert(pkg.includes('despertar-judges-copy-smoke.mjs'), 'check inclui este smoke');

if (errors.length) {
  console.error('despertar-judges-copy-smoke (estático):');
  errors.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

let passed = 0;
let failed = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${error.message}`);
    failed += 1;
  }
}

run('mensagem completa e ticker definidos', () => {
  assert.match(JUDGES_REFUSED_MESSAGE, /restaurou o estado verdadeiro/);
  assert.match(JUDGES_REFUSED_TICKER, /servidor/);
  assert.ok(API_WARNING_DISMISS_MS >= 4000);
});

run('validateSync devolve a copy F0', () => {
  const result = validateSync(
    {
      souls: '0',
      lifetime_souls: '0',
      run_souls: '0',
      generators: {},
      upgrades: [],
      talents: [],
      edu_logs_seen: [],
      prestige_count: 0,
      obols: 0,
      mnemosyne_essence: 0,
      total_clicks: 0,
      session_seconds: 0,
      last_sync_at: new Date().toISOString(),
    },
    null,
  );
  assert.equal(result.ok, false);
  assert.equal(result.error, JUDGES_REFUSED_MESSAGE);
});

console.log(`\ndespertar-judges-copy-smoke: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
