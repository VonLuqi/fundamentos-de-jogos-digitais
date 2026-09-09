/**
 * Smoke — Fase 5: secretas Aula 01 voláteis (aliases + M de N)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAchievementById } from '../js/game-catalog.js';
import {
  countUniqueExperimentMarkers,
  evaluateSecretAchievements,
  matchesAlquimistaDaFisica,
  matchesCartografoDoInspector,
  matchesJuramentoDoCirculo,
  normalizeForSecretCheck,
} from '../api/_lib/lesson-secret-achievements.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function idsOf(text, unlocked = []) {
  return evaluateSecretAchievements('aula1', text, unlocked).map((entry) => entry.id).sort();
}

const HARD_RITUAL = 'neste mundo, a bola';

// —— Cartógrafo ——
assert.equal(countUniqueExperimentMarkers(normalizeForSecretCheck('teste 1 teste 2 teste 3')), 3);
assert.equal(countUniqueExperimentMarkers(normalizeForSecretCheck('Teste#1 exp. 2 experimento 3')), 3);
assert.equal(countUniqueExperimentMarkers(normalizeForSecretCheck('teste 1 teste 1 teste 2')), 2);
assert.ok(matchesCartografoDoInspector(normalizeForSecretCheck('test 1\ntest 2\ntest 3')));
assert.ok(!matchesCartografoDoInspector(normalizeForSecretCheck('só dois: teste 1 e teste 2')));

// —— Alquimista ——
const alquimistaBom = `
A massa maior aumenta a inércia. Gravity/gravidade puxa para baixo.
O atrito (fricção) freia o deslizamento e a elasticidade muda o quique.
`;
const alquimistaFraco = 'A bola é divertida e colorida na aula.';
assert.ok(matchesAlquimistaDaFisica(normalizeForSecretCheck(alquimistaBom)));
assert.ok(!matchesAlquimistaDaFisica(normalizeForSecretCheck(alquimistaFraco)));
assert.ok(
  matchesAlquimistaDaFisica(normalizeForSecretCheck(
    'mass, gravity e friction bastam se houver motion/velocidade; bounce fica de fora do nucleo'
  )),
  'M de N: 3/4 core + movimento'
);

// —— Juramento (sem frase ritual obrigatória) ——
const juramentoSintese = `
A força de movimento e o impulso de pulo definem o arco.
Massa e gravidade da cena pesam na trajetória.
Fricção e elasticidade fecham o comportamento no chão.
`;
const juramentoSoft = `
Massa, gravidade, fricção e elasticidade aparecem no Inspector.
Em resumo, o conjunto responde.
`;
const soRitual = `Hoje só escrevi: ${HARD_RITUAL}. Sem variáveis.`;
const offTopic = 'Gostei da aula e do visual do Hades.';

assert.ok(matchesJuramentoDoCirculo(normalizeForSecretCheck(juramentoSintese)), '5–6 eixos sem ritual');
assert.ok(matchesJuramentoDoCirculo(normalizeForSecretCheck(juramentoSoft)), '4 eixos + fechamento');
assert.ok(!matchesJuramentoDoCirculo(normalizeForSecretCheck(soRitual)), 'ritual sozinho não basta');
assert.ok(!matchesJuramentoDoCirculo(normalizeForSecretCheck(offTopic)), 'off-topic rejeitado');

// Corpus combinado — quase certo / errado
const quaseTudo = `
Experimento 1: mudei a massa.
Experimento 2: subi a gravidade.
Experimento 3: baixei a fricção.
A elasticidade e a inércia aparecem no quique.
Força de movimento e impulso de pulo fecham a síntese.
`;
assert.deepEqual(
  idsOf(quaseTudo),
  [
    'segredo_alquimista_da_fisica',
    'segredo_cartografo_do_inspector',
    'segredo_juramento_do_circulo',
  ],
  'texto natural desbloqueia as 3'
);

assert.deepEqual(idsOf(offTopic), [], 'vazio conceitual → zero secretas');
assert.deepEqual(
  idsOf(quaseTudo, ['segredo_cartografo_do_inspector']),
  ['segredo_alquimista_da_fisica', 'segredo_juramento_do_circulo'],
  'idempotente: não re-award'
);

// Descs amaciadas no catálogo
for (const id of [
  'segredo_cartografo_do_inspector',
  'segredo_alquimista_da_fisica',
  'segredo_juramento_do_circulo',
]) {
  const entry = getAchievementById(id);
  assert.ok(entry, id);
  assert.ok(!String(entry.desc).toLowerCase().includes(HARD_RITUAL), `${id} desc sem hard ritual`);
  assert.ok(entry.meta?.volatile === true, `${id} meta.volatile`);
}

const progress = fs.readFileSync(path.join(root, 'api/progress.js'), 'utf8');
assert.ok(progress.includes('lesson-secret-achievements'), 'progress importa motor');
assert.ok(progress.includes('evaluateSecretAchievements'), 'reavalia no save');
assert.ok(progress.includes("action === 'saveLessonParagraph'"), 'hook save');
assert.ok(!progress.includes("'neste mundo, a bola'"), 'progress sem hard ritual literal');

console.log('OK — smoke secretas Aula 01 voláteis (Fase 5)');
