/**
 * Smoke — secretas Aula 05 voláteis (ClassInd / Livre / atenuante×agravante)
 */

import assert from 'node:assert/strict';
import {
  allLessonSecretIds,
  evaluateSecretAchievements,
  listLessonSecretIds,
  matchesBalancaDaFaixa,
  matchesOraculoDoClassind,
  matchesSeloDoLivre,
  normalizeForSecretCheck,
} from '../api/_lib/lesson-secret-achievements.js';
import { getAchievementById } from '../js/game-catalog.js';

function idsOf(text, unlocked = []) {
  return evaluateSecretAchievements('aula5', text, unlocked).map((entry) => entry.id).sort();
}

const AULA5_IDS = [
  'segredo_oraculo_do_classind',
  'segredo_selo_do_livre',
  'segredo_balanca_da_faixa',
];

assert.deepEqual(listLessonSecretIds('aula5').sort(), [...AULA5_IDS].sort());
for (const id of AULA5_IDS) {
  assert.ok(allLessonSecretIds().includes(id), `allLessonSecretIds inclui ${id}`);
}

// —— Oráculo (ClassInd / IARC / classificação indicativa) ——
const oraculoClassind = 'No ClassInd os eixos clássicos são violência, sexo e drogas.';
const oraculoIarc = 'O IARC gera selos gratuitos para as lojas digitais.';
const oraculoFrase = 'Estudei a classificação indicativa brasileira com atenção.';
const oraculoFraco = 'Gostei de votar no telão.';
assert.ok(matchesOraculoDoClassind(normalizeForSecretCheck(oraculoClassind)));
assert.ok(matchesOraculoDoClassind(normalizeForSecretCheck(oraculoIarc)));
assert.ok(
  matchesOraculoDoClassind(normalizeForSecretCheck(oraculoFrase)),
  'normalização remove acentos'
);
assert.ok(!matchesOraculoDoClassind(normalizeForSecretCheck(oraculoFraco)));
assert.ok(
  !matchesOraculoDoClassind(normalizeForSecretCheck('Falei só de classificação sem o restante.')),
  '“classificação” isolada não basta'
);

// —— Selo do Livre (Livre ou L contextual) ——
const livreBom = 'Após a higienização, a faixa-alvo ficou Livre.';
const livreL = 'Patch note: faixa-alvo L (sem sangue, inimigos slime).';
const livreLFraco = 'A letra L aparece no meu nome e no layout.';
assert.ok(matchesSeloDoLivre(normalizeForSecretCheck(livreBom)));
assert.ok(matchesSeloDoLivre(normalizeForSecretCheck(livreL)), 'L com contexto de faixa');
assert.ok(
  !matchesSeloDoLivre(normalizeForSecretCheck(livreLFraco)),
  'L solto sem contexto de faixa não conta'
);
assert.ok(!matchesSeloDoLivre(normalizeForSecretCheck(oraculoFraco)));

// —— Balança (atenuante | agravante | fantasia×realismo) ——
const balancaAtenua = 'Usamos atenuante de fantasia: gore virou partículas de luz.';
const balancaAgrava = 'O agravante de realismo manteve a faixa alta.';
const balancaPar = 'Trocamos realismo por fantasia nos inimigos.';
const balancaSoFantasia = 'Ficou bem fantasioso.';
const balancaFraco = 'Mudamos as cores da UI.';
assert.ok(matchesBalancaDaFaixa(normalizeForSecretCheck(balancaAtenua)));
assert.ok(matchesBalancaDaFaixa(normalizeForSecretCheck(balancaAgrava)));
assert.ok(matchesBalancaDaFaixa(normalizeForSecretCheck(balancaPar)), 'par fantasia×realismo');
assert.ok(
  !matchesBalancaDaFaixa(normalizeForSecretCheck(balancaSoFantasia)),
  'fantasia sozinha sem realismo/termo não basta'
);
assert.ok(!matchesBalancaDaFaixa(normalizeForSecretCheck(balancaFraco)));

// —— Corpus combinado ——
const quaseTudo = `
No ClassInd e no IARC, a higienização miramos faixa-alvo Livre.
O atenuante de não-humano baixou a faixa sem perder o loop.
`;
assert.deepEqual(idsOf(quaseTudo), [...AULA5_IDS].sort(), 'texto natural desbloqueia as 3');
assert.deepEqual(idsOf(oraculoFraco), [], 'off-topic → zero');
assert.deepEqual(
  idsOf(quaseTudo, ['segredo_oraculo_do_classind']),
  ['segredo_balanca_da_faixa', 'segredo_selo_do_livre'],
  'idempotente: não re-award'
);

// Isolamento por lessonId
assert.deepEqual(
  evaluateSecretAchievements('aula4', quaseTudo).map((e) => e.id),
  [],
  'texto aula5 não dispara regras aula4'
);
assert.deepEqual(
  evaluateSecretAchievements('aula3', quaseTudo).map((e) => e.id),
  [],
  'texto aula5 não dispara regras aula3'
);

// Catálogo
for (const id of AULA5_IDS) {
  const entry = getAchievementById(id);
  assert.ok(entry, id);
  assert.equal(entry.meta?.family, 'aula5', `${id} family`);
  assert.equal(entry.meta?.volatile, true, `${id} volatile`);
  assert.equal(entry.hidden, true, `${id} hidden`);
}

console.log('OK — smoke secretas Aula 05 voláteis');
