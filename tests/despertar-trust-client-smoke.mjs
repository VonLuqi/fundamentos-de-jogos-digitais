/**
 * Smoke — sync Despertar confia no cliente (sem rejeição dos Juízes por ganho).
 * Uso: node tests/despertar-trust-client-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const validateSrc = read('backend/src/Services/Despertar/DespertarService.php');
const indexSrc = read('js/hades-despertar/index.js');
const constantsSrc = read('js/hades-despertar/config/constants.js');

assert.ok(validateSrc.includes('function validateSync'), 'validateSync existe');
assert.ok(
  validateSrc.includes('confia no cliente') || validateSrc.includes('Cookie Clicker'),
  'docblock documenta trust client'
);

// Não deve mais rejeitar por excesso de ganho / piso absurdo
assert.ok(
  !validateSrc.includes('SYNC_ABSURD_GAIN_FLOOR'),
  'validateSync não usa SYNC_ABSURD_GAIN_FLOOR'
);
assert.ok(
  !validateSrc.includes('theoreticalMaxGain'),
  'validateSync não calcula maxGain para reject'
);
assert.ok(
  !/Estela do servidor é mais recente/.test(validateSrc),
  'validateSync sem 409 Estela punitivo'
);
const syncFn = validateSrc.slice(
  validateSrc.indexOf('function validateSync'),
  validateSrc.indexOf('function applyPrestige')
);
assert.ok(syncFn.length > 100, 'recorte validateSync ok');
assert.ok(!syncFn.includes('JUDGES_REFUSED_MESSAGE'), 'validateSync não devolve JUDGES_REFUSED_MESSAGE');
assert.ok(!syncFn.includes('status\' => 409') && !syncFn.includes("status' => 409"), 'validateSync sem 409');

// Soft sanitize
assert.ok(validateSrc.includes('normalizeGoldCounts') && validateSrc.includes(', true)'), 'gold soft');
assert.ok(/normalizeShinyCounts\([\s\S]*?true\)/.test(validateSrc), 'shiny soft');

// Cliente suprime toast dos Juízes no onRejected
assert.ok(indexSrc.includes('JUDGES_REFUSED_MESSAGE'), 'cliente ainda conhece a constante');
assert.ok(
  /msg === JUDGES_REFUSED_MESSAGE[\s\S]*?return;/.test(indexSrc)
    || /Estela do servidor[\s\S]*?return;/.test(indexSrc),
  'onRejected silencia Juízes/Estela'
);
assert.ok(
  !/showApiWarning\(JUDGES_REFUSED_MESSAGE\);\s*\n\s*pushJudgesTickerHint/.test(indexSrc),
  'não dispara toast+ticker Juízes no reject genérico'
);

assert.ok(constantsSrc.includes('confia no cliente') || constantsSrc.includes('Legado'), 'constantes marcadas legado');

console.log('OK despertar-trust-client-smoke');
