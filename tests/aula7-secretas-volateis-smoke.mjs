/**
 * Smoke — secretas Aula 07 voláteis (ofícios · Scope Creep · pasta/versionamento)
 */

import assert from 'node:assert/strict';
import {
  allLessonSecretIds,
  evaluateSecretAchievements,
  listLessonSecretIds,
  matchesCercadoDoEscopo,
  matchesCincoOficios,
  matchesPastaSagrada,
  normalizeForSecretCheck,
} from '../api/_lib/lesson-secret-achievements.js';
import { getAchievementById } from '../js/game-catalog.js';

function idsOf(text, unlocked = []) {
  return evaluateSecretAchievements('aula7', text, unlocked).map((entry) => entry.id).sort();
}

const AULA7_IDS = [
  'segredo_cinco_oficios',
  'segredo_cercado_do_escopo',
  'segredo_pasta_sagrada',
];

assert.deepEqual(listLessonSecretIds('aula7').sort(), [...AULA7_IDS].sort());
for (const id of AULA7_IDS) {
  assert.ok(allLessonSecretIds().includes(id), `allLessonSecretIds inclui ${id}`);
}

// —— Cinco Ofícios (≥2 papéis) ——
const oficiosBom = 'Na dupla: programação da coleta no player e arte da moeda no sprite.';
const oficiosSoUm = 'Eu fiquei só com o papel de artista.';
const oficiosFraco = 'Gostei de trabalhar em grupo.';
assert.ok(matchesCincoOficios(normalizeForSecretCheck(oficiosBom)));
assert.ok(
  !matchesCincoOficios(normalizeForSecretCheck(oficiosSoUm)),
  'um só ofício não basta'
);
assert.ok(!matchesCincoOficios(normalizeForSecretCheck(oficiosFraco)));

// —— Cercado (Scope Creep OU corte/fora do escopo) ——
const cercadoCreep = 'Evitamos Scope Creep: a loja da Aula 06 não entra agora.';
const cercadoCorte = 'Três itens fora do escopo: combate, multiplayer e bosses.';
const cercadoFraco = 'Queremos fazer muita coisa no Labirinto.';
assert.ok(matchesCercadoDoEscopo(normalizeForSecretCheck(cercadoCreep)));
assert.ok(matchesCercadoDoEscopo(normalizeForSecretCheck(cercadoCorte)), 'fora do escopo');
assert.ok(!matchesCercadoDoEscopo(normalizeForSecretCheck(cercadoFraco)));

// —— Pasta Sagrada (≥2 entre pastas · .tscn · sync) ——
const pastaBom = `
Criamos pastas cenas/sprites no LabirintoDeMoedas com player.tscn e moeda.tscn.
Projeto local (sem pasta sync); nomes canônicos nas .tscn. Sprite veio do LibreSprite.
`;
const pastaSoPasta = 'Temos uma pasta no projeto.';
const pastaFraco = 'Salvei o arquivo no computador.';
assert.ok(matchesPastaSagrada(normalizeForSecretCheck(pastaBom)));
assert.ok(
  !matchesPastaSagrada(normalizeForSecretCheck(pastaSoPasta)),
  'só “pasta” (1/3) não basta'
);
assert.ok(!matchesPastaSagrada(normalizeForSecretCheck(pastaFraco)));

// —— Corpus combinado (diário) ——
const quaseTudo = `
Dupla: programação da coleta (player) e arte da moeda (sprite); produção cuida do sync.
Cortamos Scope Creep — loja, combate e multiplayer ficam fora do escopo.
Projeto local LabirintoDeMoedas com cenas/moeda.tscn (sem pasta sync); sprite do LibreSprite.
`;
assert.deepEqual(idsOf(quaseTudo), [...AULA7_IDS].sort(), 'texto natural desbloqueia as 3');
assert.deepEqual(idsOf(oficiosFraco), [], 'off-topic → zero');
assert.deepEqual(
  idsOf(quaseTudo, ['segredo_cinco_oficios']),
  ['segredo_cercado_do_escopo', 'segredo_pasta_sagrada'],
  'idempotente: não re-award'
);

// Isolamento por lessonId
assert.deepEqual(
  evaluateSecretAchievements('aula6', quaseTudo).map((e) => e.id),
  [],
  'texto aula7 não dispara regras aula6'
);
assert.deepEqual(
  evaluateSecretAchievements('aula5', quaseTudo).map((e) => e.id),
  [],
  'texto aula7 não dispara regras aula5'
);

// Catálogo
for (const id of AULA7_IDS) {
  const entry = getAchievementById(id);
  assert.ok(entry, id);
  assert.equal(entry.meta?.family, 'aula7', `${id} family`);
  assert.equal(entry.meta?.volatile, true, `${id} volatile`);
  assert.equal(entry.hidden, true, `${id} hidden`);
}

const publica = getAchievementById('aula7_concluida');
assert.ok(publica, 'aula7_concluida no catálogo');
assert.equal(publica.name, 'Cartógrafo da Dupla');
assert.equal(publica.hidden, false);
assert.equal(publica.rarity, 'stone');

console.log('OK aula7-secretas-volateis-smoke');
