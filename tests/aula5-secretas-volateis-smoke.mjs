/**
 * Smoke — secretas Aula 05 voláteis (ClassInd+IARC / faixa-alvo L|10 / atenuante×agravante)
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
import { composeLessonRecord } from '../js/lesson-paragraph.js';
import {
  buildNotesFromWizard,
  buildSummaryFromWizard,
} from '../js/aula5/iarc-wizard.js';

function idsOf(text, unlocked = []) {
  return evaluateSecretAchievements('aula5', text, unlocked).map((entry) => entry.id).sort();
}

const AULA5_CONTENT_IDS = [
  'segredo_oraculo_do_classind',
  'segredo_selo_do_livre',
  'segredo_balanca_da_faixa',
];

assert.deepEqual(listLessonSecretIds('aula5').sort(), [...AULA5_CONTENT_IDS].sort());
for (const id of AULA5_CONTENT_IDS) {
  assert.ok(allLessonSecretIds().includes(id), `allLessonSecretIds inclui ${id}`);
}
assert.ok(!listLessonSecretIds('aula5').includes('segredo_juri_do_telao'), 'Júri do Telão fora das voláteis');
assert.equal(getAchievementById('segredo_juri_do_telao'), null, 'Júri do Telão removido do catálogo');

// —— Oráculo (ClassInd E IARC/consórcio) ——
const oraculoSoClassind = 'No ClassInd os eixos clássicos são violência, sexo e drogas.';
const oraculoSoIarc = 'O IARC gera selos gratuitos para as lojas digitais.';
const oraculoAmbos = 'No ClassInd brasileiro o IARC devolve selos para as lojas digitais.';
const oraculoFrase = 'Estudei a classificação indicativa e o consórcio das lojas.';
const oraculoFraco = 'Gostei de votar no telão.';
assert.ok(!matchesOraculoDoClassind(normalizeForSecretCheck(oraculoSoClassind)), 'ClassInd sozinho não basta');
assert.ok(!matchesOraculoDoClassind(normalizeForSecretCheck(oraculoSoIarc)), 'IARC sozinho não basta');
assert.ok(matchesOraculoDoClassind(normalizeForSecretCheck(oraculoAmbos)));
assert.ok(matchesOraculoDoClassind(normalizeForSecretCheck(oraculoFrase)), 'classificação indicativa + consórcio');
assert.ok(!matchesOraculoDoClassind(normalizeForSecretCheck(oraculoFraco)));
assert.ok(
  !matchesOraculoDoClassind(normalizeForSecretCheck('Falei só de classificação sem o restante.')),
  '“classificação” isolada não basta'
);

// —— Selo (faixa-alvo Livre/L ou 10; Livre solto não conta) ——
const livreBom = 'Após a higienização, a faixa-alvo ficou Livre.';
const livreL = 'Patch note: faixa-alvo L (sem sangue, inimigos slime).';
const livreDez = 'Higienizamos para mirar faixa-alvo 10.';
const livreNegado = 'Não miramos Livre; a faixa continua alta.';
const livreLFraco = 'A letra L aparece no meu nome e no layout.';
assert.ok(matchesSeloDoLivre(normalizeForSecretCheck(livreBom)));
assert.ok(matchesSeloDoLivre(normalizeForSecretCheck(livreL)), 'L com contexto de faixa-alvo');
assert.ok(matchesSeloDoLivre(normalizeForSecretCheck(livreDez)), '10 é entrega plena');
assert.ok(!matchesSeloDoLivre(normalizeForSecretCheck(livreNegado)), '“Livre” negado sem faixa-alvo não conta');
assert.ok(
  !matchesSeloDoLivre(normalizeForSecretCheck(livreLFraco)),
  'L solto sem contexto de faixa não conta'
);
assert.ok(!matchesSeloDoLivre(normalizeForSecretCheck(oraculoFraco)));

// —— Balança (atenuante E agravante, ou par fantasia×realismo) ——
const balancaAtenua = 'Usamos atenuante de fantasia: gore virou partículas de luz.';
const balancaAgrava = 'O agravante de realismo manteve a faixa alta.';
const balancaAmbos = 'Atenuante de não-humano; o original agravava com gore.';
const balancaPar = 'Trocamos realismo por fantasia nos inimigos.';
const balancaSoFantasia = 'Ficou bem fantasioso.';
const balancaFraco = 'Mudamos as cores da UI.';
assert.ok(!matchesBalancaDaFaixa(normalizeForSecretCheck(balancaAtenua)), 'só atenuante não basta');
assert.ok(!matchesBalancaDaFaixa(normalizeForSecretCheck(balancaAgrava)), 'só agravante não basta');
assert.ok(matchesBalancaDaFaixa(normalizeForSecretCheck(balancaAmbos)));
assert.ok(matchesBalancaDaFaixa(normalizeForSecretCheck(balancaPar)), 'par fantasia×realismo');
assert.ok(
  !matchesBalancaDaFaixa(normalizeForSecretCheck(balancaSoFantasia)),
  'fantasia sozinha sem realismo/termo não basta'
);
assert.ok(!matchesBalancaDaFaixa(normalizeForSecretCheck(balancaFraco)));

// —— Corpus combinado ——
const quaseTudo = `
No ClassInd e no IARC, a higienização miramos faixa-alvo Livre.
O atenuante de não-humano baixou a faixa; o original agravava com gore.
`;
assert.deepEqual(idsOf(quaseTudo), [...AULA5_CONTENT_IDS].sort(), 'texto natural desbloqueia as 3 de conteúdo');
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

// —— Wizard não injeta Oráculo/Balança; Selo vem da faixa-alvo declarada ——
const pitch = {
  title: 'Necrópole Viral',
  originalRating: '18',
  coreLoop: 'eliminar ameaça',
  axes: { violencia: 'Gore realista', sexo: '—', drogas: 'Substâncias realistas' },
};
const cannedL = {
  pitch,
  visual: 'robôs e faíscas',
  narrative: 'invasão de autômatos',
  reward: 'bateria mágica',
  enemies: 'drones',
  coreLoop: pitch.coreLoop,
  argumentsText: 'trocamos sangue por faíscas e inimigos por sucata',
  targetRating: 'L',
};
const canned10 = { ...cannedL, targetRating: '10' };
assert.deepEqual(
  idsOf(composeLessonRecord(buildSummaryFromWizard(cannedL), buildNotesFromWizard(cannedL))),
  ['segredo_selo_do_livre'],
  'finalize padrão Livre → só Selo (sem ClassInd/IARC injetados)'
);
assert.deepEqual(
  idsOf(composeLessonRecord(buildSummaryFromWizard(canned10), buildNotesFromWizard(canned10))),
  ['segredo_selo_do_livre'],
  'finalize padrão 10 → só Selo'
);
assert.ok(
  !/ClassInd|IARC/i.test(buildSummaryFromWizard(cannedL)),
  'summary gerado não injeta ClassInd/IARC'
);
assert.ok(
  !/realista/i.test(buildNotesFromWizard(cannedL)),
  'notes não vazam eixos originais com realista'
);

// Catálogo (conteúdo volátil)
for (const id of AULA5_CONTENT_IDS) {
  const entry = getAchievementById(id);
  assert.ok(entry, id);
  assert.equal(entry.meta?.family, 'aula5', `${id} family`);
  assert.equal(entry.meta?.volatile, true, `${id} volatile`);
  assert.equal(entry.hidden, true, `${id} hidden`);
}

console.log('OK — smoke secretas Aula 05 voláteis');
