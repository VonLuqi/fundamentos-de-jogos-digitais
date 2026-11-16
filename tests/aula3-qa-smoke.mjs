/**
 * Smoke — Task 9 QA estática da Aula 03 (Homo Ludens + pixel cultural).
 * Não liga o gate `published` nem gera código redeem (isso é operação do Mestre).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACHIEVEMENTS, getAchievementById } from '../js/game-catalog.js';
import { readProgressSurface } from './_helpers/progress-surface.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

// —— Página ——
const aula3Html = read('pages/aula3.html');
assert.ok(
  aula3Html.includes('HOMO LUDENS') || aula3Html.includes('Homo Ludens'),
  'página com título curricular'
);
assert.ok(!aula3Html.includes('Forja em andamento'), 'sem stub Forja em andamento');
assert.ok(!aula3Html.includes('CONTEÚDO OCULTO'), 'sem Conteúdo oculto');
assert.ok(aula3Html.includes('discovery-overlay'), 'discovery overlay presente');
assert.ok(aula3Html.includes('id="gdd-example"'), 'exemplo admin no DOM');
assert.ok(aula3Html.includes('hidden'), 'exemplo nasce hidden');
assert.ok(
  aula3Html.includes('aula03-pixel-hero/craftpix-net-622999-free-pixel-art-tiny-hero-sprites.zip'),
  'link do ZIP Tiny Hero'
);
assert.ok(
  aula3Html.includes('aula03-pixel-hero/README.md'),
  'link do README da oficina'
);
assert.ok(aula3Html.includes('tab-slides'), 'aba Slides');
assert.ok(aula3Html.includes('download-pptx') && aula3Html.includes('download-pdf'), 'downloads de slides');
assert.ok(aula3Html.includes('Nearest'), 'página menciona Nearest');
assert.ok(aula3Html.includes('Módulo 1 · Aula 03'), 'footer Módulo 1 · Aula 03');

// —— Slides ——
assert.ok(exists('assets/docs/aulas/aula03_homo_ludens_slides.pptx'), 'PPTX presente');
assert.ok(exists('assets/docs/aulas/aula03_homo_ludens_slides.pdf'), 'PDF presente');
const aula3Js = read('js/aula3.js');
assert.ok(aula3Js.includes('aula03_homo_ludens_slides.pptx'), 'JS aponta PPTX');
assert.ok(aula3Js.includes('aula03_homo_ludens_slides.pdf'), 'JS aponta PDF');
assert.ok(aula3Js.includes('initSlidesViewer'), 'viewer de slides wired');
assert.ok(aula3Js.includes("LESSON_ID = 'aula3'"), 'lessonId aula3');
assert.ok(aula3Js.includes('enqueueDiscovery'), 'discovery no envio');
assert.ok(aula3Js.includes('initAdminExample'), 'exemplo admin wired');

// —— Atividades no grimório (via lesson_paragraphs, sem user_notes) ——
assert.ok(!aula3Js.includes('createNote'), 'aula3 não grava nota no grimório');
assert.ok(!aula3Js.includes('updateNote'), 'aula3 não atualiza nota no grimório');
assert.ok(!aula3Js.includes('upsertLessonActivityNote'), 'sem dual-write');
assert.ok(aula3Js.includes('Homo Ludens'), 'template pede Homo Ludens');
assert.ok(aula3Js.includes('Nearest'), 'template pede Nearest');
assert.ok(aula3Html.includes('Grimório Pessoal'), 'copy menciona grimório');
assert.ok(/não compartilhada com colegas/i.test(aula3Html), 'copy deixa privacidade explícita');

const progressApi = readProgressSurface(root);
assert.ok(progressApi.includes("case 'listMyLessonParagraphs'"), 'API lista paragraphs do aluno');

const grimorioJs = read('js/grimorio.js');
assert.ok(grimorioJs.includes('listMyLessonParagraphs'), 'grimório carrega paragraphs');
assert.ok(grimorioJs.includes('toActivityNotes'), 'grimório mapeia notas de atividade');

// —— Material oficina ——
assert.ok(exists('assets/docs/aulas/aula03-pixel-hero/README.md'), 'README oficina');
assert.ok(
  exists('assets/docs/aulas/aula03-pixel-hero/craftpix-net-622999-free-pixel-art-tiny-hero-sprites.zip'),
  'ZIP Tiny Hero'
);
assert.ok(exists('assets/docs/aulas/aula03-pixel-hero/LICENCA.md'), 'nota de licença');
const readme = read('assets/docs/aulas/aula03-pixel-hero/README.md');
assert.ok(readme.includes('Nearest'), 'README Nearest');
assert.ok(readme.includes('FileSystem') || /arrastar/i.test(readme), 'README importação');
assert.ok(/checklist/i.test(readme), 'README checklist');
assert.ok(/folclore|fauna|urbano/i.test(readme), 'README personalização cultural');

// —— Discovery compartilhado ——
const discovery = read('js/lesson-discovery.js');
assert.ok(discovery.includes('enqueueDiscovery'), 'helper discovery');
assert.ok(discovery.includes('prefers-reduced-motion'), 'reduced-motion no helper');
assert.ok(read('js/aula1.js').includes('lesson-discovery.js'), 'aula1 consome helper');
assert.ok(read('js/aula2.js').includes('lesson-discovery.js'), 'aula2 consome helper');
assert.ok(aula3Js.includes('lesson-discovery.js'), 'aula3 consome helper');

// —— Secretas (envio) ——
// —— Conclusão pública + XP redeem (contrato backend) ——
const publica = getAchievementById('aula3_concluida');
assert.ok(publica, 'aula3_concluida no catálogo');
assert.equal(publica.name, 'Máscara do Homo Ludens');
assert.equal(publica.hidden, false);
assert.equal(publica.rarity, 'stone');
assert.equal(publica.xp, 0, 'XP da conclusão vem do redeem da aula, não do card');

const progress = readProgressSurface(root);
assert.ok(progress.includes("case 'generateCode'"), 'generateCode disponível');
assert.ok(progress.includes("case 'setLessonGate'"), 'setLessonGate disponível');
assert.ok(progress.includes("case 'redeem'"), 'redeem disponível');

// —— Trilha ——
const apiJs = read('js/api.js');
assert.ok(apiJs.includes('Homo Ludens, Identidade e Expressão Cultural'), 'MODULES título novo');
assert.ok(!apiJs.includes('Conteúdo em preparação'), 'MODULES sem stub');

// —— Álbum: secretas no catálogo ——
const secretsInCatalog = ACHIEVEMENTS.filter((a) => a.meta?.family === 'aula3' && a.hidden);
assert.equal(secretsInCatalog.length, 3, '3 secretas aula3 no catálogo do álbum');
assert.ok(exists('assets/achievements/aula3_concluida.webp'), 'arte pública stub');
assert.ok(exists('assets/achievements/catalog.json'), 'catalog de artes');
const artCatalog = JSON.parse(read('assets/achievements/catalog.json'));
assert.ok(
  artCatalog.some((e) => String(e.file).includes('aula3_concluida')),
  'arte aula3 no catalog.json'
);

// —— Playbook ——
assert.ok(exists('docs/playbook-liberar-aula3.md'), 'playbook de liberação');
assert.ok(
  read('docs/playbook-liberar-aula3.md').includes('aula3'),
  'playbook cita aula3'
);

console.log('OK — smoke QA Aula 03 (Task 9 estática)');
// —— Backend PHP: segredos, catálogo e gate (AchievementsEvaluator / GameCatalog) ——
const phpEvaluatorSrc = read('backend/src/Services/Progress/AchievementsEvaluator.php').replace(/\r\n/g, '\n');
const phpCatalogSrc = read('backend/src/Core/GameCatalog.php').replace(/\r\n/g, '\n');
const phpAula3Secrets = (phpEvaluatorSrc.match(/case 'aula3': \{[\s\S]*?\n            \}\n/) || [''])[0];
for (const id of [
  'segredo_artesao_do_pixel',
  'segredo_homo_ludens',
  'segredo_identidade_ludica',
]) {
  assert.ok(phpAula3Secrets.includes(id), `AchievementsEvaluator.php aula3 lista ${id}`);
  const entry = getAchievementById(id);
  assert.equal(entry?.hidden, true, `${id} hidden no álbum`);
  assert.equal(entry?.meta?.family, 'aula3');
}
assert.ok(phpCatalogSrc.includes('aula{$i}_concluida'), 'GameCatalog.php gera aulaN_concluida');
assert.ok(phpCatalogSrc.includes("'lessonTitle' => 'Aula 03 — Homo Ludens, Identidade e Expressão Cultural'"), 'LESSON_CATALOG.aula3 título curricular');
assert.ok(
  /'aula3' => \[\s*'lessonId' => 'aula3',\s*'lessonTitle' => '[^']*',\s*'xp' => 30,/.test(phpCatalogSrc),
  'LESSON_CATALOG.aula3 xp 30'
);
assert.ok(
  /'aula3' => \['published' => false\]/.test(phpCatalogSrc),
  'LESSON_GATES.aula3 published:false por default'
);

console.log('Playbook Mestre: liberar gate published + gerar código no Painel/Trilha quando a turma começar.');
