/**
 * Smoke — secretas Aula 04 voláteis (plataformas + viewport + criatividade sob limite)
 */

import assert from 'node:assert/strict';
import {
  allLessonSecretIds,
  evaluateSecretAchievements,
  listLessonSecretIds,
  matchesArqueologoDeHardware,
  matchesArtesaoDaViewport,
  matchesCriatividadeSobLimite,
  normalizeForSecretCheck,
} from '../api/_lib/lesson-secret-achievements.js';
import { getAchievementById } from '../js/game-catalog.js';

function idsOf(text, unlocked = []) {
  return evaluateSecretAchievements('aula4', text, unlocked).map((entry) => entry.id).sort();
}

const AULA4_IDS = [
  'segredo_arqueologo_de_hardware',
  'segredo_artesao_da_viewport',
  'segredo_criatividade_sob_limite',
];

assert.deepEqual(listLessonSecretIds('aula4').sort(), [...AULA4_IDS].sort());
for (const id of AULA4_IDS) {
  assert.ok(allLessonSecretIds().includes(id), `allLessonSecretIds inclui ${id}`);
}

// —— Arqueólogo (≥2/3) ——
const arqueologoBom = `
Na linha do tempo das plataformas, o NES tinha restrição de 8 sprites por scanline e paleta curta.
`;
const arqueologoAcento = `
Consoles portáteis como o Game Boy (160×144) mostram como a resolução histórica força o design.
`;
const arqueologoFraco = 'Gostei de configurar a janela.';
assert.ok(matchesArqueologoDeHardware(normalizeForSecretCheck(arqueologoBom)));
assert.ok(
  matchesArqueologoDeHardware(normalizeForSecretCheck(arqueologoAcento)),
  'normalização remove acentos / ×'
);
assert.ok(!matchesArqueologoDeHardware(normalizeForSecretCheck(arqueologoFraco)));
assert.ok(
  !matchesArqueologoDeHardware(normalizeForSecretCheck('Só falei de plataforma, sem geração nem restrição.')),
  '1/3 não basta'
);

// —— Artesão da Viewport (tamanho + mode viewport + aspect keep) ——
const artesaoBom = `
Configurei Viewport Width/Height em 320×180.
Stretch Mode = viewport e Aspect = keep (proporção preservada).
`;
const artesaoSemAspect = `
Viewport 480×270 e Stretch Mode viewport, mas não citei o aspect.
`;
const artesaoFraco = 'Mudei o tamanho da janela no Windows.';
assert.ok(matchesArtesaoDaViewport(normalizeForSecretCheck(artesaoBom)));
assert.ok(
  !matchesArtesaoDaViewport(normalizeForSecretCheck(artesaoSemAspect)),
  'viewport + mode sem aspect keep não bastam'
);
assert.ok(!matchesArtesaoDaViewport(normalizeForSecretCheck(artesaoFraco)));

// —— Criatividade sob Limite (restrição + solução) ——
const criatividadeBom = `
A restrição de hardware força criatividade: tiles reutilizados e truques de design.
`;
const criatividadeSoLimite = `
Havia muita limitação de memória no console antigo, mas parei aí.
`;
const criatividadeFraco = 'Ficou bonito no Play.';
assert.ok(matchesCriatividadeSobLimite(normalizeForSecretCheck(criatividadeBom)));
assert.ok(
  !matchesCriatividadeSobLimite(normalizeForSecretCheck(criatividadeSoLimite)),
  'restrição sem sinal de solução/criatividade não basta'
);
assert.ok(!matchesCriatividadeSobLimite(normalizeForSecretCheck(criatividadeFraco)));

// —— Corpus combinado ——
const quaseTudo = `
Do Atari ao SNES, cada plataforma impôs restrição de resolução e paleta.
Configurei Viewport Width 320×180, Stretch Mode viewport e Aspect keep.
Essa limitação de hardware força criatividade visual e mecânica (tiles, flicker).
`;
assert.deepEqual(idsOf(quaseTudo), [...AULA4_IDS].sort(), 'texto natural desbloqueia as 3');
assert.deepEqual(idsOf(arqueologoFraco), [], 'off-topic → zero');
assert.deepEqual(
  idsOf(quaseTudo, ['segredo_arqueologo_de_hardware']),
  ['segredo_artesao_da_viewport', 'segredo_criatividade_sob_limite'],
  'idempotente: não re-award'
);

// Isolamento por lessonId
assert.deepEqual(
  evaluateSecretAchievements('aula3', quaseTudo).map((e) => e.id),
  [],
  'texto aula4 não dispara regras aula3'
);
assert.deepEqual(
  evaluateSecretAchievements('aula2', quaseTudo).map((e) => e.id),
  [],
  'texto aula4 não dispara regras aula2'
);
assert.deepEqual(
  evaluateSecretAchievements('aula1', quaseTudo).map((e) => e.id),
  [],
  'texto aula4 não dispara regras aula1'
);

// Catálogo
for (const id of AULA4_IDS) {
  const entry = getAchievementById(id);
  assert.ok(entry, id);
  assert.equal(entry.meta?.family, 'aula4', `${id} family`);
  assert.equal(entry.meta?.volatile, true, `${id} volatile`);
  assert.equal(entry.hidden, true, `${id} hidden`);
}

console.log('OK — smoke secretas Aula 04 voláteis');
