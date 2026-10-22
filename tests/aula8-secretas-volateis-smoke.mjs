/**
 * Smoke — secretas Aula 08 voláteis (Quantic · perfil→mecânica · trilha)
 */

import assert from 'node:assert/strict';
import {
  allLessonSecretIds,
  evaluateSecretAchievements,
  listLessonSecretIds,
  matchesModeloQuantic,
  matchesPerfilMecanica,
  matchesTrilhaLabirinto,
  normalizeForSecretCheck,
} from '../api/_lib/lesson-secret-achievements.js';
import { getAchievementById } from '../js/game-catalog.js';

function idsOf(text, unlocked = []) {
  return evaluateSecretAchievements('aula8', text, unlocked).map((entry) => entry.id).sort();
}

const AULA8_IDS = [
  'segredo_modelo_quantic',
  'segredo_perfil_mecanica',
  'segredo_trilha_labirinto',
];

assert.deepEqual(listLessonSecretIds('aula8').sort(), [...AULA8_IDS].sort());
for (const id of AULA8_IDS) {
  assert.ok(allLessonSecretIds().includes(id), `allLessonSecretIds inclui ${id}`);
}

const quanticBom = 'Usamos o modelo Quantic Foundry: motivação Desafio e Descoberta.';
const quanticNome = 'A motivação Destruição explica a plataforma móvel.';
const quanticFraco = 'Gostei do labirinto.';
assert.ok(matchesModeloQuantic(normalizeForSecretCheck(quanticBom)));
assert.ok(matchesModeloQuantic(normalizeForSecretCheck(quanticNome)));
assert.ok(!matchesModeloQuantic(normalizeForSecretCheck(quanticFraco)));

const perfilBom = 'O perfil-alvo de conquista pediu uma mecânica de área secreta.';
const perfilSoPerfil = 'Escolhemos um perfil.';
assert.ok(matchesPerfilMecanica(normalizeForSecretCheck(perfilBom)));
assert.ok(!matchesPerfilMecanica(normalizeForSecretCheck(perfilSoPerfil)));

const trilhaConquista = 'Trilha Conquista: área secreta com moeda brilhante.';
const trilhaAcao = 'Trilha Ação: plataforma móvel com timing.';
const trilhaFraco = 'Mexemos no cenário.';
assert.ok(matchesTrilhaLabirinto(normalizeForSecretCheck(trilhaConquista)));
assert.ok(matchesTrilhaLabirinto(normalizeForSecretCheck(trilhaAcao)));
assert.ok(!matchesTrilhaLabirinto(normalizeForSecretCheck(trilhaFraco)));

const quaseTudo = `
Dupla: Design do perfil e Programação das mecânicas.
Modelo Quantic Foundry — motivação Descoberta / Achievement.
Perfil-alvo guiou a mecânica: área secreta + moeda brilhante (trilha Conquista).
Cortamos loja, combate e multiplayer.
`;
assert.deepEqual(idsOf(quaseTudo), [...AULA8_IDS].sort(), 'texto natural desbloqueia as 3');
assert.deepEqual(idsOf(quanticFraco), [], 'off-topic → zero');
assert.deepEqual(
  idsOf(quaseTudo, ['segredo_modelo_quantic']),
  ['segredo_perfil_mecanica', 'segredo_trilha_labirinto'],
  'idempotente'
);

const soQuantic = 'Quantic Foundry: motivação Desafio no perfil e mecânica de plataforma móvel.';
assert.deepEqual(
  evaluateSecretAchievements('aula7', soQuantic).map((e) => e.id),
  [],
  'texto só Quantic/trilha não dispara regras aula7'
);
assert.ok(
  evaluateSecretAchievements('aula8', soQuantic).map((e) => e.id).length >= 2,
  'texto Quantic dispara secretas aula8'
);

for (const id of AULA8_IDS) {
  const entry = getAchievementById(id);
  assert.ok(entry, id);
  assert.equal(entry.meta?.family, 'aula8', `${id} family`);
  assert.equal(entry.meta?.volatile, true, `${id} volatile`);
  assert.equal(entry.hidden, true, `${id} hidden`);
}

const publica = getAchievementById('aula8_concluida');
assert.ok(publica, 'aula8_concluida no catálogo');
assert.equal(publica.hidden, false);

console.log('OK aula8-secretas-volateis-smoke');
