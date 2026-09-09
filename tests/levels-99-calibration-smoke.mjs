/**
 * Smoke — Fase 6: curva 1–99, overflow, Soberano perto do teto, UI cap
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACHIEVEMENTS,
  MAX_LEVEL,
  describeLevelProgress,
  getAchievementXp,
  levelForXp,
  rankForLevel,
  xpQuotaForXp,
  xpRequiredForLevel,
  xpToReachLevel,
  xpWithinLevel,
} from '../js/game-catalog.js';
import {
  describeLevelProgress as describeFromApi,
  levelForXp as levelFromApi,
  MAX_LEVEL as maxFromApi,
} from '../js/api.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(fs.readFileSync(path.join(root, 'data/game-catalog.json'), 'utf8'));

assert.equal(MAX_LEVEL, 99);
assert.equal(maxFromApi, 99);
assert.equal(raw.levels.maxLevel, 99);

const bands = raw.levels.bands;
assert.ok(bands[0].fromLevel === 1);
assert.ok(bands[bands.length - 1].toLevel === 99);
let cursor = 1;
for (const band of bands) {
  assert.equal(band.fromLevel, cursor, `banda contínua em ${band.fromLevel}`);
  assert.ok(band.toLevel >= band.fromLevel);
  assert.ok(band.xpPerLevel > 0);
  cursor = band.toLevel + 1;
}
assert.equal(cursor, 100, 'bands cobrem até 99');

const samples = [
  [0, 1],
  [99, 1],
  [100, 2],
  [xpToReachLevel(10), 10],
  [xpToReachLevel(50), 50],
  [xpToReachLevel(98), 98],
  [xpToReachLevel(99), 99],
  [xpToReachLevel(99) + 50_000, 99],
];
for (const [xp, expected] of samples) {
  assert.equal(levelForXp(xp), expected, `levelForXp(${xp}) → ${expected}`);
  assert.equal(levelFromApi(xp), expected, `paridade api ${xp}`);
}

assert.equal(xpRequiredForLevel(1), 100);
assert.equal(xpRequiredForLevel(11), 130);
assert.equal(xpRequiredForLevel(31), 180);
assert.equal(xpRequiredForLevel(61), 240);
assert.equal(xpRequiredForLevel(91), 300);

const careerXp = xpToReachLevel(99);
assert.ok(careerXp >= 15_000 && careerXp <= 22_000, `carreira ~15–20k (got ${careerXp})`);

const soberanoXp = getAchievementXp('soberano_do_submundo');
assert.equal(soberanoXp, 1500);

function levelsGained(fromXp, gain) {
  return levelForXp(fromXp + gain) - levelForXp(fromXp);
}

assert.ok(levelsGained(0, soberanoXp) >= 8 && levelsGained(0, soberanoXp) <= 20, 'Soberano = salto marcante cedo');
assert.ok(levelsGained(xpToReachLevel(40), soberanoXp) < 15, 'Soberano mid não teleporta');
assert.equal(levelForXp(xpToReachLevel(98) + soberanoXp), 99, 'redeem perto do teto cap 99');
assert.equal(levelForXp(xpToReachLevel(99) + soberanoXp), 99, 'já no 99 + Soberano permanece 99');

const atMax = describeLevelProgress(xpToReachLevel(99) + 10);
assert.equal(atMax.atMax, true);
assert.equal(atMax.barPercent, 100);
assert.match(atMax.barLabel, /máximo do Domínio/);
assert.equal(atMax.shortLevelLabel, '99 · máx.');
assert.equal(describeFromApi(0).level, 1);

assert.equal(rankForLevel(50), 'Vigia dos Campos');
assert.equal(rankForLevel(92), 'Sombra Ascendente');
assert.equal(rankForLevel(99), 'Sombra do Olimpo');

const catalogXp = ACHIEVEMENTS.reduce((sum, entry) => sum + (Number(entry.xp) || 0), 0);
assert.ok(levelForXp(catalogXp) < 99, 'soma do catálogo sozinha não estoura 99');
assert.ok(levelForXp(catalogXp) < 30, 'catálogo atual fica no early/mid (espaço p/ aulas)');

const progressSrc = fs.readFileSync(path.join(root, 'api/progress.js'), 'utf8');
assert.ok(progressSrc.includes('levelForXp'), 'API usa levelForXp do catálogo');
assert.ok(!progressSrc.includes('LEVEL_XP_BASE = 100'), 'API sem curva linear hardcode');

assert.ok(
  fs.readFileSync(path.join(root, 'js/dashboard.js'), 'utf8').includes('describeLevelProgress'),
  'dashboard usa helper'
);
assert.ok(
  fs.readFileSync(path.join(root, 'js/companheiro.js'), 'utf8').includes('describeLevelProgress'),
  'espelho usa helper'
);
assert.ok(
  fs.readFileSync(path.join(root, 'js/turma-ui.js'), 'utf8').includes('describeLevelProgress'),
  'salão turma usa helper'
);
assert.ok(
  fs.readFileSync(path.join(root, 'pages/companheiro.html'), 'utf8').includes('mirror-xp-bar'),
  'barra no Espelho'
);

assert.equal(xpWithinLevel(xpToReachLevel(99)), xpQuotaForXp(xpToReachLevel(99)));

console.log('OK — smoke níveis 1–99 / calibração (Fase 6)');
