/**
 * Smoke — Task 9 QA estática da Aula 02 (glossário + Player).
 * Não liga o gate `published` nem gera código redeem (isso é operação do Mestre).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allLessonSecretIds,
  evaluateSecretAchievements,
} from '../api/_lib/lesson-secret-achievements.js';
import { ACHIEVEMENTS, getAchievementById } from '../js/game-catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function idsOf(text) {
  return evaluateSecretAchievements('aula2', text).map((e) => e.id).sort();
}

// —— Página pública vs legado ——
const aula2Html = read('pages/aula2.html');
assert.ok(
  aula2Html.includes('GLOSSÁRIO DO DESENVOLVEDOR') || aula2Html.includes('Glossário do Desenvolvedor'),
  'página com título curricular'
);
assert.ok(!aula2Html.includes('Tambor do Estige'), 'rota pública sem Tambor');
assert.ok(!aula2Html.includes('game-canvas'), 'rota pública sem canvas do Tambor');
assert.ok(aula2Html.includes('discovery-overlay'), 'discovery overlay presente');
assert.ok(aula2Html.includes('id="gdd-example"'), 'exemplo admin no DOM');
assert.ok(aula2Html.includes('hidden'), 'exemplo nasce hidden');
assert.ok(
  aula2Html.includes('aula02-player/Material-Player-Aula02.docx'),
  'link do material da oficina (Word)'
);
assert.ok(exists('assets/docs/aulas/aula02-player/Material-Player-Aula02.docx'), 'DOCX do material presente');
assert.ok(aula2Html.includes('tab-slides'), 'aba Slides');
assert.ok(aula2Html.includes('download-pptx') && aula2Html.includes('download-pdf'), 'downloads de slides');

assert.ok(exists('assets/docs/aulas/aula02-legado-tambor/aula2.html'), 'legado HTML arquivado');
assert.ok(exists('assets/docs/aulas/aula02-legado-tambor/aula2.js'), 'legado JS arquivado');
assert.ok(
  read('assets/docs/aulas/aula02-legado-tambor/aula2.html').includes('Tambor do Estige'),
  'arquivo legado ainda contém Tambor'
);

// —— Slides ——
assert.ok(exists('assets/docs/aulas/aula02_glossario_player_slides.pptx'), 'PPTX presente');
assert.ok(exists('assets/docs/aulas/aula02_glossario_player_slides.pdf'), 'PDF presente');
const aula2Js = read('js/aula2.js');
assert.ok(aula2Js.includes('aula02_glossario_player_slides.pptx'), 'JS aponta PPTX');
assert.ok(aula2Js.includes('aula02_glossario_player_slides.pdf'), 'JS aponta PDF');
assert.ok(aula2Js.includes('initSlidesViewer'), 'viewer de slides wired');
assert.ok(aula2Js.includes("LESSON_ID = 'aula2'"), 'lessonId aula2');
assert.ok(aula2Js.includes('enqueueDiscovery'), 'discovery no envio');
assert.ok(aula2Js.includes('initAdminExample'), 'exemplo admin wired');
assert.ok(!aula2Js.includes('game-canvas'), 'JS sem Tambor');

// —— Atividades no grimório (via lesson_paragraphs, sem user_notes) ——
assert.ok(!aula2Js.includes('createNote'), 'aula2 não grava nota no grimório');
assert.ok(!aula2Js.includes('updateNote'), 'aula2 não atualiza nota no grimório');
assert.ok(!aula2Js.includes('upsertLessonActivityNote'), 'sem dual-write');
assert.ok(aula2Js.includes('Core Loop (com suas palavras)'), 'template pede Core Loop próprio');
assert.ok(aula2Js.includes('Grokking (com suas palavras)'), 'template pede Grokking próprio');
assert.ok(aula2Js.includes('Assets (com suas palavras)'), 'template pede Assets próprio');
assert.ok(aula2Html.includes('Grimório Pessoal'), 'copy menciona grimório');
assert.ok(/não compartilhada com colegas/i.test(aula2Html), 'copy deixa privacidade explícita');
assert.ok(aula2Html.includes('Core Loop'), 'HTML pede Core Loop');
assert.ok(/Grokking/i.test(aula2Html), 'HTML pede Grokking');
assert.ok(/Assets/i.test(aula2Html), 'HTML pede Assets');

const progressApi = read('api/progress.js');
assert.ok(progressApi.includes("action === 'listMyLessonParagraphs'"), 'API lista paragraphs do aluno');

const grimorioJs = read('js/grimorio.js');
assert.ok(grimorioJs.includes('listMyLessonParagraphs'), 'grimório carrega paragraphs');
assert.ok(grimorioJs.includes('toActivityNotes'), 'grimório mapeia notas de atividade');
assert.ok(grimorioJs.includes("key: 'atividades'"), 'coleção Atividades');
assert.ok(grimorioJs.includes('isLegacyActivityUserNote'), 'filtra notas legado dual-write');

const activityNotes = read('js/grimorio-activity-notes.js');
assert.ok(activityNotes.includes("ACTIVITY_NOTE_ID_PREFIX = 'activity:'"), 'ids virtuais activity:');
assert.ok(activityNotes.includes('isActivityNote'), 'flag isActivityNote');

const readingJs = read('js/grimorio-reading.js');
assert.ok(readingJs.includes('preloaded'), 'leitura aceita nota de atividade pré-carregada');
assert.ok(readingJs.includes('isActivityNote'), 'painel trata atividade');

assert.ok(read('js/api.js').includes('listMyLessonParagraphs'), 'client API listMyLessonParagraphs');

// —— README oficina ——
const readme = read('assets/docs/aulas/aula02-player/README.md');
assert.ok(readme.includes('CharacterBody2D'), 'README hierarquia');
assert.ok(readme.includes('ir_cima'), 'README Input Map');
assert.ok(readme.includes('move_and_slide'), 'README player.gd');
assert.ok(/checklist/i.test(readme), 'README checklist');

// —— Discovery compartilhado ——
const discovery = read('js/lesson-discovery.js');
assert.ok(discovery.includes('enqueueDiscovery'), 'helper discovery');
assert.ok(discovery.includes('prefers-reduced-motion'), 'reduced-motion no helper');
assert.ok(read('js/aula1.js').includes('lesson-discovery.js'), 'aula1 consome helper');
assert.ok(aula2Js.includes('lesson-discovery.js'), 'aula2 consome helper');

// —— Secretas (envio) ——
assert.deepEqual(idsOf('Gostei da aula.'), [], 'sem keywords → 0 secretas');
assert.deepEqual(
  idsOf(`
    Core Loop andar coletar avançar.
    Grokking memória muscular.
    Assets sprites no FileSystem.
  `),
  ['segredo_lexico_do_desenvolvedor'],
  'glossário → Léxico'
);
assert.deepEqual(
  idsOf(`
    Cena Player: CharacterBody2D, Sprite2D, CollisionShape2D — receita de bolo.
  `),
  ['segredo_arquiteto_de_cenas'],
  'hierarquia → Arquiteto'
);
assert.deepEqual(
  idsOf('Input Map: ir_cima ir_baixo ir_esquerda ir_direita'),
  ['segredo_cartografo_do_input'],
  'Input Map → Cartógrafo'
);

for (const id of [
  'segredo_lexico_do_desenvolvedor',
  'segredo_arquiteto_de_cenas',
  'segredo_cartografo_do_input',
]) {
  assert.ok(allLessonSecretIds().includes(id), `motor lista ${id}`);
  const entry = getAchievementById(id);
  assert.equal(entry?.hidden, true, `${id} hidden no álbum`);
  assert.equal(entry?.meta?.family, 'aula2');
}

// —— Conclusão pública + XP redeem (contrato backend) ——
const publica = getAchievementById('aula2_concluida');
assert.ok(publica, 'aula2_concluida no catálogo');
assert.equal(publica.hidden, false);
assert.equal(publica.rarity, 'stone');
assert.equal(publica.xp, 0, 'XP da conclusão vem do redeem da aula, não do card');

const progress = read('api/progress.js');
assert.ok(progress.includes("id: 'aula2_concluida'"), 'regra ACHIEVEMENT_RULES');
assert.ok(
  /aula2:\s*\{[\s\S]*?xp:\s*30/.test(progress),
  'LESSON_CATALOG.aula2 xp 30'
);
assert.ok(
  /aula2:\s*\{\s*published:\s*false/.test(progress.replace(/\s+/g, ' ')),
  'gate default published:false (Mestre libera na hora da turma)'
);
assert.ok(progress.includes("action === 'generateCode'"), 'generateCode disponível');
assert.ok(progress.includes("action === 'setLessonGate'"), 'setLessonGate disponível');
assert.ok(progress.includes("action === 'redeem'"), 'redeem disponível');

// —— Trilha ——
const apiJs = read('js/api.js');
assert.ok(apiJs.includes('O Glossário do Desenvolvedor e o Player na Tela'), 'MODULES título novo');
assert.ok(!apiJs.includes('Loops e Ritmo'), 'MODULES sem título legado');

// —— Álbum: secretas no catálogo ——
const secretsInCatalog = ACHIEVEMENTS.filter((a) => a.meta?.family === 'aula2' && a.hidden);
assert.equal(secretsInCatalog.length, 3, '3 secretas aula2 no catálogo do álbum');
assert.ok(exists('assets/achievements/aula2_concluida.webp'), 'arte pública stub');
assert.ok(exists('assets/achievements/catalog.json'), 'catalog de artes');
const artCatalog = JSON.parse(read('assets/achievements/catalog.json'));
assert.ok(
  artCatalog.some((e) => String(e.file).includes('aula2_concluida')),
  'arte aula2 no catalog.json'
);

console.log('OK — smoke QA Aula 02 (Task 9 estática)');
console.log('Playbook Mestre: liberar gate published + gerar código no Painel/Trilha quando a turma começar.');
