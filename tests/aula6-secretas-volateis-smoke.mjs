/**
 * Smoke — secretas Aula 06 voláteis (mercado/IP · loja sem azar · tempo/ética)
 */

import assert from 'node:assert/strict';
import {
  allLessonSecretIds,
  evaluateSecretAchievements,
  listLessonSecretIds,
  matchesBalcaoSemAzar,
  matchesMercadorDoStyx,
  matchesTempoRespeitado,
  normalizeForSecretCheck,
} from '../api/_lib/lesson-secret-achievements.js';
import { getAchievementById } from '../js/game-catalog.js';

function idsOf(text, unlocked = []) {
  return evaluateSecretAchievements('aula6', text, unlocked).map((entry) => entry.id).sort();
}

const AULA6_IDS = [
  'segredo_mercador_do_styx',
  'segredo_balcao_sem_azar',
  'segredo_tempo_respeitado',
];

assert.deepEqual(listLessonSecretIds('aula6').sort(), [...AULA6_IDS].sort());
for (const id of AULA6_IDS) {
  assert.ok(allLessonSecretIds().includes(id), `allLessonSecretIds inclui ${id}`);
}

// —— Mercador (mercado+geo OU IP×serviço) ——
const mercadorMercado = 'O mercado brasileiro de jogos mobile cresce junto ao internacional.';
const mercadorIp = 'Original IP é autoral; prestação de serviços é outsourcing e gamificação.';
const mercadorSoMercado = 'Falei só de mercado, sem geografia.';
const mercadorFraco = 'Gostei de clicar nos botões.';
assert.ok(matchesMercadorDoStyx(normalizeForSecretCheck(mercadorMercado)));
assert.ok(matchesMercadorDoStyx(normalizeForSecretCheck(mercadorIp)), 'IP × serviços');
assert.ok(
  !matchesMercadorDoStyx(normalizeForSecretCheck(mercadorSoMercado)),
  'mercado sem geo/IP não basta'
);
assert.ok(!matchesMercadorDoStyx(normalizeForSecretCheck(mercadorFraco)));

// —— Balcão (≥3 sinais: loja · preço · cosmético · moeda · UI · anti-loot) ——
const balcaoBom = `
Monteí a loja com PanelContainer e Button.
Comprei cosmético (chapéu) com moedas da fase a preço fixo, sem loot box.
`;
const balcaoFraco = 'Tem um botão na tela.';
const balcaoQuase = 'Fiz a loja e comprei com moedas.';
assert.ok(matchesBalcaoSemAzar(normalizeForSecretCheck(balcaoBom)));
assert.ok(!matchesBalcaoSemAzar(normalizeForSecretCheck(balcaoFraco)));
assert.ok(
  !matchesBalcaoSemAzar(normalizeForSecretCheck(balcaoQuase)),
  'loja + moedas (2/6) não bastam'
);

// —— Tempo respeitado (ética + tempo OU ClassInd/azar) ——
const tempoBom = 'Monetização ética respeita o tempo do jogador.';
const tempoClassind = 'Ética de design: loot box eleva ClassInd a 18+ por jogo de azar.';
const tempoSoEtica = 'Quero ser ético no projeto.';
const tempoFraco = 'Ficou legal no Play.';
assert.ok(matchesTempoRespeitado(normalizeForSecretCheck(tempoBom)));
assert.ok(matchesTempoRespeitado(normalizeForSecretCheck(tempoClassind)), 'ética + ClassInd/azar');
assert.ok(
  !matchesTempoRespeitado(normalizeForSecretCheck(tempoSoEtica)),
  'ética sozinha não basta'
);
assert.ok(!matchesTempoRespeitado(normalizeForSecretCheck(tempoFraco)));

// —— Corpus combinado ——
const quaseTudo = `
No mercado brasileiro e internacional, Original IP difere de prestação de serviços (outsourcing).
Na Godot fiz a loja com Button e PanelContainer: cosméticos a preço fixo com moedas da fase, sem loot box.
Monetização ética respeita o tempo do jogador — ClassInd pode ir a 18+ com mecânica de azar.
`;
assert.deepEqual(idsOf(quaseTudo), [...AULA6_IDS].sort(), 'texto natural desbloqueia as 3');
assert.deepEqual(idsOf(mercadorFraco), [], 'off-topic → zero');
assert.deepEqual(
  idsOf(quaseTudo, ['segredo_mercador_do_styx']),
  ['segredo_balcao_sem_azar', 'segredo_tempo_respeitado'],
  'idempotente: não re-award'
);

// Isolamento por lessonId
assert.deepEqual(
  evaluateSecretAchievements('aula5', quaseTudo).map((e) => e.id),
  [],
  'texto aula6 não dispara regras aula5'
);
assert.deepEqual(
  evaluateSecretAchievements('aula4', quaseTudo).map((e) => e.id),
  [],
  'texto aula6 não dispara regras aula4'
);

// Catálogo
for (const id of AULA6_IDS) {
  const entry = getAchievementById(id);
  assert.ok(entry, id);
  assert.equal(entry.meta?.family, 'aula6', `${id} family`);
  assert.equal(entry.meta?.volatile, true, `${id} volatile`);
  assert.equal(entry.hidden, true, `${id} hidden`);
}

const publica = getAchievementById('aula6_concluida');
assert.ok(publica, 'aula6_concluida no catálogo');
assert.equal(publica.name, 'Guardião da Loja Ética');
assert.equal(publica.hidden, false);
assert.equal(publica.rarity, 'stone');

console.log('OK aula6-secretas-volateis-smoke');
