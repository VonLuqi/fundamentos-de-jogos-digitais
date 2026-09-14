/**
 * Smoke — secretas Aula 03 voláteis (Homo Ludens + pixel + identidade BR)
 */

import assert from 'node:assert/strict';
import {
  allLessonSecretIds,
  evaluateSecretAchievements,
  listLessonSecretIds,
  matchesArtesaoDoPixel,
  matchesHomoLudens,
  matchesIdentidadeLudica,
  normalizeForSecretCheck,
} from '../api/_lib/lesson-secret-achievements.js';
import { getAchievementById } from '../js/game-catalog.js';

function idsOf(text, unlocked = []) {
  return evaluateSecretAchievements('aula3', text, unlocked).map((entry) => entry.id).sort();
}

const AULA3_IDS = [
  'segredo_homo_ludens',
  'segredo_artesao_do_pixel',
  'segredo_identidade_ludica',
];

assert.deepEqual(listLessonSecretIds('aula3').sort(), [...AULA3_IDS].sort());
for (const id of AULA3_IDS) {
  assert.ok(allLessonSecretIds().includes(id), `allLessonSecretIds inclui ${id}`);
}

// —— Homo Ludens (≥2/3) ——
const homoBom = `
Homo Ludens: Huizinga diz que a cultura surge como jogo.
`;
const homoAcento = `
Em Homo Ludens, a cultura se desenvolve como jogo no jogo e pelo jogo.
`;
const homoFraco = 'Gostei da aula de pixel art.';
assert.ok(matchesHomoLudens(normalizeForSecretCheck(homoBom)));
assert.ok(
  matchesHomoLudens(normalizeForSecretCheck(homoAcento)),
  'normalização remove acentos'
);
assert.ok(!matchesHomoLudens(normalizeForSecretCheck(homoFraco)));
assert.ok(
  !matchesHomoLudens(normalizeForSecretCheck('Só citei Huizinga, sem a tese.')),
  '1/3 não basta'
);

// —— Artesão (import + Nearest + sprite) ——
const artesaoBom = `
Importei o PNG pelo FileSystem (arrastar e soltar).
No Sprite2D configurei Filter Nearest — o pixel ficou nítido, sem blur.
`;
const artesaoSemNearest = `
Importei no FileSystem e liguei no Sprite2D, mas não falei do filtro.
`;
const artesaoFraco = 'Mudei uma cor no Paint.';
assert.ok(matchesArtesaoDoPixel(normalizeForSecretCheck(artesaoBom)));
assert.ok(
  !matchesArtesaoDoPixel(normalizeForSecretCheck(artesaoSemNearest)),
  'import + sprite sem Nearest não bastam'
);
assert.ok(!matchesArtesaoDoPixel(normalizeForSecretCheck(artesaoFraco)));

// —— Identidade Lúdica (cultura BR + personalização) ——
const identidadeBom = `
Personalizei o herói inspirado no Saci — recolorei o gorro.
`;
const identidadeFauna = `
Alterei o sprite com motivo de tucano (fauna brasileira) para dar identidade.
`;
const identidadeSemCultura = `
Personalizei e editei o PNG, mas sem âncora cultural.
`;
const identidadeFraco = 'Escolhi o Pink_Monster sem mudar nada.';
assert.ok(matchesIdentidadeLudica(normalizeForSecretCheck(identidadeBom)), 'folclore + personalizei');
assert.ok(matchesIdentidadeLudica(normalizeForSecretCheck(identidadeFauna)), 'fauna + alterei');
assert.ok(
  !matchesIdentidadeLudica(normalizeForSecretCheck(identidadeSemCultura)),
  'personalização sem cultura BR não basta'
);
assert.ok(!matchesIdentidadeLudica(normalizeForSecretCheck(identidadeFraco)));

// —— Corpus combinado ——
const quaseTudo = `
Homo Ludens (Huizinga): a cultura surge como jogo.
Importei Owlet_Monster no FileSystem, liguei no Sprite2D e usei Nearest (pixel nítido, sem blur).
Personalizei o herói inspirado no Curupira — recolorei o cabelo.
`;
assert.deepEqual(idsOf(quaseTudo), [...AULA3_IDS].sort(), 'texto natural desbloqueia as 3');
assert.deepEqual(idsOf(homoFraco), [], 'off-topic → zero');
assert.deepEqual(
  idsOf(quaseTudo, ['segredo_homo_ludens']),
  ['segredo_artesao_do_pixel', 'segredo_identidade_ludica'],
  'idempotente: não re-award'
);

// Isolamento por lessonId
assert.deepEqual(
  evaluateSecretAchievements('aula2', quaseTudo).map((e) => e.id),
  [],
  'texto aula3 não dispara regras aula2'
);
assert.deepEqual(
  evaluateSecretAchievements('aula1', quaseTudo).map((e) => e.id),
  [],
  'texto aula3 não dispara regras aula1'
);

// Catálogo
for (const id of AULA3_IDS) {
  const entry = getAchievementById(id);
  assert.ok(entry, id);
  assert.equal(entry.meta?.family, 'aula3', `${id} family`);
  assert.equal(entry.meta?.volatile, true, `${id} volatile`);
  assert.equal(entry.hidden, true, `${id} hidden`);
}

console.log('OK — smoke secretas Aula 03 voláteis');
