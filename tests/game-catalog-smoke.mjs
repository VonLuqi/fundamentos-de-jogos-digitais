import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_RARITY_LABELS,
  GAME_CATALOG,
  MAX_LEVEL,
  getAchievementXp,
  levelForXp,
  rankForLevel,
  rankForXp,
  xpQuotaForXp,
  xpRequiredForLevel,
  xpToReachLevel,
  xpWithinLevel,
} from '../js/game-catalog.js';
import {
  levelForXp as levelForXpFromApi,
  ACHIEVEMENTS as achievementsFromApi,
  MAX_LEVEL as maxLevelFromApi,
} from '../js/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function assertOk(cond, message) {
  assert.ok(cond, message);
}

const raw = JSON.parse(readFileSync(join(root, 'data/game-catalog.json'), 'utf8'));
assertOk(raw.version >= 1, 'catalog version');
assertOk(Array.isArray(raw.achievements) && raw.achievements.length > 0, 'achievements array');
assertOk(raw.levels?.maxLevel === 99, 'maxLevel 99 no JSON');
assertOk(MAX_LEVEL === 99, 'MAX_LEVEL exportado');
assertOk(maxLevelFromApi === 99, 'MAX_LEVEL via api.js');

const ids = ACHIEVEMENTS.map((a) => a.id);
assertOk(ids.length === new Set(ids).size, 'ids de conquistas únicos');
assertOk(achievementsFromApi.length === ACHIEVEMENTS.length, 'ACHIEVEMENTS espelhado em api.js');

for (const entry of ACHIEVEMENTS) {
  assertOk(entry.id && entry.name && entry.desc, `conquista ${entry.id} tem id/name/desc`);
  assertOk(ACHIEVEMENT_RARITY_LABELS[entry.rarity], `raridade válida: ${entry.id} → ${entry.rarity}`);
  assertOk(Number.isFinite(entry.xp), `xp numérico: ${entry.id}`);
}

assertOk(getAchievementXp('gdd_integracao_documental') === 20, 'xp GDD do catálogo');
assertOk(getAchievementXp('segredo_juramento_do_circulo') === 25, 'xp Juramento do catálogo');

const soberano = ACHIEVEMENTS.find((a) => a.id === 'soberano_do_submundo');
assertOk(soberano?.veiledDesc, 'Soberano tem veiledDesc');
assertOk(soberano?.veiledScramble?.scrambleMs >= 60_000, 'scramble dura minutos');
assertOk(soberano?.veiledScramble?.readableMs >= 15_000, 'janela legível para print');
assertOk(soberano?.veiledScramble?.startWith === 'readable', 'abre legível para leitura/print');
assertOk(!/CERBERUS|PERSEPHONE|ESTIGE_OBOLO|tartaro-oculto|payload|robots|indexador/i.test(soberano.veiledDesc), 'veiledDesc sem spoiler de chave');
assertOk(!/18fec91c/i.test(soberano.veiledDesc), 'veiledDesc sem hash');

assert.equal(levelForXp(0), 1);
assert.equal(levelForXp(99), 1);
assert.equal(levelForXp(100), 2);
assert.equal(levelForXp(200), 3);
assert.equal(levelForXpFromApi(100), 2, 'paridade levelForXp api.js');

const xpAt11Start = xpToReachLevel(11);
assert.equal(levelForXp(xpAt11Start), 11, 'início do nível 11');
assert.equal(xpRequiredForLevel(11), 130, 'banda 11–30 = 130');
assert.equal(xpWithinLevel(xpAt11Start), 0);
assert.equal(xpQuotaForXp(xpAt11Start), 130);

const xpNearCap = xpToReachLevel(99);
assert.equal(levelForXp(xpNearCap), 99, 'cap 99');
assert.equal(levelForXp(xpNearCap + 50_000), 99, 'overflow não passa de 99');

assert.equal(rankForLevel(1), 'Alma Novata');
assert.equal(rankForLevel(15), 'Campeão Érebo');
assert.equal(rankForLevel(50), 'Vigia dos Campos');
assert.equal(rankForLevel(99), 'Sombra do Olimpo');
assert.equal(rankForXp(0), rankForLevel(1));

assertOk(GAME_CATALOG.achievements.length === ACHIEVEMENTS.length, 'GAME_CATALOG alinhado');

const bands = raw.levels.bands;
assertOk(bands[0].fromLevel === 1 && bands[bands.length - 1].toLevel === 99, 'bands cobrem 1–99');

console.log('game-catalog-smoke: OK');
