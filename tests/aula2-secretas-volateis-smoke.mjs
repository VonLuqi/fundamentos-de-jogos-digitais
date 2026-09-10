/**
 * Smoke — secretas Aula 02 voláteis (glossário + cena Player + Input Map)
 */

import assert from 'node:assert/strict';
import {
  allLessonSecretIds,
  evaluateSecretAchievements,
  listLessonSecretIds,
  matchesArquitetoDeCenas,
  matchesCartografoDoInput,
  matchesLexicoDoDesenvolvedor,
  normalizeForSecretCheck,
} from '../api/_lib/lesson-secret-achievements.js';
import { getAchievementById } from '../js/game-catalog.js';

function idsOf(text, unlocked = []) {
  return evaluateSecretAchievements('aula2', text, unlocked).map((entry) => entry.id).sort();
}

const AULA2_IDS = [
  'segredo_lexico_do_desenvolvedor',
  'segredo_arquiteto_de_cenas',
  'segredo_cartografo_do_input',
];

assert.deepEqual(listLessonSecretIds('aula2').sort(), [...AULA2_IDS].sort());
for (const id of AULA2_IDS) {
  assert.ok(allLessonSecretIds().includes(id), `allLessonSecretIds inclui ${id}`);
}

// —— Léxico (3/3) ——
const lexicoBom = `
O Core Loop é andar → coletar → avançar.
Grokking é quando chega a memória muscular.
Assets são imagens e sons no FileSystem.
`;
const lexicoAcento = `
Core Loop claro. Grókking via memória muscular.
Assets (sprites) alimentam o jogo.
`;
const lexicoFraco = 'Gostei da aula e do visual do Hades.';
assert.ok(matchesLexicoDoDesenvolvedor(normalizeForSecretCheck(lexicoBom)));
assert.ok(
  matchesLexicoDoDesenvolvedor(normalizeForSecretCheck(lexicoAcento)),
  'normalização remove acentos'
);
assert.ok(!matchesLexicoDoDesenvolvedor(normalizeForSecretCheck(lexicoFraco)));
assert.ok(
  !matchesLexicoDoDesenvolvedor(normalizeForSecretCheck('Só falei de Core Loop e Assets, sem o terceiro termo.')),
  '2/3 não basta'
);

// —— Arquiteto (3 nós + receita/cena) ——
const arquitetoBom = `
A cena do Player: CharacterBody2D na raiz, Sprite2D e CollisionShape2D como filhos.
É a receita de bolo reutilizável.
`;
const arquitetoSemReceita = `
CharacterBody2D, Sprite2D e CollisionShape2D sem falar da estrutura.
`;
const arquitetoFraco = 'Monteí um nó qualquer na Godot.';
assert.ok(matchesArquitetoDeCenas(normalizeForSecretCheck(arquitetoBom)));
assert.ok(
  !matchesArquitetoDeCenas(normalizeForSecretCheck(arquitetoSemReceita)),
  'nós sem sinal de cena/receita/hierarquia não bastam'
);
assert.ok(!matchesArquitetoDeCenas(normalizeForSecretCheck(arquitetoFraco)));

// —— Cartógrafo Input ——
const inputAcoes = `
Input Map: ir_cima, ir_baixo, ir_esquerda e ir_direita.
`;
const inputSoft = `
Mapeei cima, baixo, esquerda e direita no WASD.
`;
const inputFraco = 'Apertei algumas teclas no teclado.';
assert.ok(matchesCartografoDoInput(normalizeForSecretCheck(inputAcoes)), '4 ações ir_*');
assert.ok(matchesCartografoDoInput(normalizeForSecretCheck(inputSoft)), '4 direções + WASD');
assert.ok(!matchesCartografoDoInput(normalizeForSecretCheck(inputFraco)));
assert.ok(
  !matchesCartografoDoInput(normalizeForSecretCheck('só ir_cima e ir_baixo')),
  '2 ações não bastam'
);

// —— Corpus combinado ——
const quaseTudo = `
Glossário: Core Loop (andar coletar avançar), Grokking (memória muscular) e Assets (sprites).
Hierarquia da cena: CharacterBody2D + Sprite2D + CollisionShape2D — receita do Player.
Input Map com ir_cima, ir_baixo, ir_esquerda, ir_direita (WASD).
`;
assert.deepEqual(idsOf(quaseTudo), [...AULA2_IDS].sort(), 'texto natural desbloqueia as 3');
assert.deepEqual(idsOf(lexicoFraco), [], 'off-topic → zero');
assert.deepEqual(
  idsOf(quaseTudo, ['segredo_lexico_do_desenvolvedor']),
  ['segredo_arquiteto_de_cenas', 'segredo_cartografo_do_input'],
  'idempotente: não re-award'
);

// Isolamento por lessonId
assert.deepEqual(
  evaluateSecretAchievements('aula1', quaseTudo).map((e) => e.id),
  [],
  'texto aula2 não dispara regras aula1'
);
assert.deepEqual(evaluateSecretAchievements('aula3', quaseTudo), [], 'aula sem regras → vazio');

// Catálogo
for (const id of AULA2_IDS) {
  const entry = getAchievementById(id);
  assert.ok(entry, id);
  assert.equal(entry.meta?.family, 'aula2', `${id} family`);
  assert.equal(entry.meta?.volatile, true, `${id} volatile`);
  assert.equal(entry.hidden, true, `${id} hidden`);
}

console.log('OK — smoke secretas Aula 02 voláteis');
