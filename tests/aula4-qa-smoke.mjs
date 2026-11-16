/**
 * Smoke — Task 9 QA estática da Aula 04 (plataformas + viewport retrô).
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
const aula4Html = read('pages/aula4.html');
assert.ok(
  aula4Html.includes('RESTRIÇÕES TÉCNICAS')
    || aula4Html.includes('Plataformas')
    || aula4Html.includes('plataformas'),
  'página com título curricular'
);
assert.ok(!aula4Html.includes('Forja em andamento'), 'sem stub Forja em andamento');
assert.ok(!aula4Html.includes('CONTEÚDO OCULTO'), 'sem Conteúdo oculto');
assert.ok(aula4Html.includes('discovery-overlay'), 'discovery overlay presente');
assert.ok(aula4Html.includes('id="gdd-example"'), 'exemplo admin no DOM');
assert.ok(aula4Html.includes('hidden'), 'exemplo nasce hidden');
assert.ok(
  aula4Html.includes('aula04-retro-viewport/README.md'),
  'link do README da oficina'
);
assert.ok(aula4Html.includes('tab-slides'), 'aba Slides');
assert.ok(aula4Html.includes('download-pptx') && aula4Html.includes('download-pdf'), 'downloads de slides');
assert.ok(aula4Html.includes('viewport'), 'página menciona stretch viewport');
assert.ok(
  aula4Html.includes('320×180') || aula4Html.includes('320x180'),
  'página cita resolução 320×180'
);
assert.ok(aula4Html.includes('Módulo 1 · Aula 04'), 'footer Módulo 1 · Aula 04');

// —— Slides ——
assert.ok(exists('assets/docs/aulas/aula04_plataformas_restricoes_slides.pptx'), 'PPTX presente');
assert.ok(exists('assets/docs/aulas/aula04_plataformas_restricoes_slides.pdf'), 'PDF presente');
const aula4Js = read('js/aula4.js');
assert.ok(aula4Js.includes('aula04_plataformas_restricoes_slides.pptx'), 'JS aponta PPTX');
assert.ok(aula4Js.includes('aula04_plataformas_restricoes_slides.pdf'), 'JS aponta PDF');
assert.ok(aula4Js.includes('initSlidesViewer'), 'viewer de slides wired');
assert.ok(aula4Js.includes("LESSON_ID = 'aula4'"), 'lessonId aula4');
assert.ok(aula4Js.includes('enqueueDiscovery'), 'discovery no envio');
assert.ok(aula4Js.includes('initAdminExample'), 'exemplo admin wired');

// —— Atividades no grimório (via lesson_paragraphs, sem user_notes) ——
assert.ok(!aula4Js.includes('createNote'), 'aula4 não grava nota no grimório');
assert.ok(!aula4Js.includes('updateNote'), 'aula4 não atualiza nota no grimório');
assert.ok(!aula4Js.includes('upsertLessonActivityNote'), 'sem dual-write');
assert.ok(
  aula4Js.includes('Viewport Width') || aula4Js.includes('320×180'),
  'template pede Viewport / resolução'
);
assert.ok(aula4Html.includes('Grimório Pessoal'), 'copy menciona grimório');
assert.ok(/não compartilhada com colegas/i.test(aula4Html), 'copy deixa privacidade explícita');

const progressApi = readProgressSurface(root);
assert.ok(progressApi.includes("case 'listMyLessonParagraphs'"), 'API lista paragraphs do aluno');

const grimorioJs = read('js/grimorio.js');
assert.ok(grimorioJs.includes('listMyLessonParagraphs'), 'grimório carrega paragraphs');
assert.ok(grimorioJs.includes('toActivityNotes'), 'grimório mapeia notas de atividade');

// —— Material oficina ——
assert.ok(exists('assets/docs/aulas/aula04-retro-viewport/README.md'), 'README oficina');
const readme = read('assets/docs/aulas/aula04-retro-viewport/README.md');
assert.ok(/viewport/i.test(readme), 'README viewport');
assert.ok(/stretch/i.test(readme), 'README stretch');
assert.ok(/checklist/i.test(readme), 'README checklist');
assert.ok(/320.?180|480.?270/i.test(readme), 'README resoluções canônicas');

// —— Discovery compartilhado ——
const discovery = read('js/lesson-discovery.js');
assert.ok(discovery.includes('enqueueDiscovery'), 'helper discovery');
assert.ok(discovery.includes('prefers-reduced-motion'), 'reduced-motion no helper');
assert.ok(read('js/aula1.js').includes('lesson-discovery.js'), 'aula1 consome helper');
assert.ok(read('js/aula2.js').includes('lesson-discovery.js'), 'aula2 consome helper');
assert.ok(read('js/aula3.js').includes('lesson-discovery.js'), 'aula3 consome helper');
assert.ok(aula4Js.includes('lesson-discovery.js'), 'aula4 consome helper');

// —— Secretas (envio) ——
// —— Conclusão pública + XP redeem (contrato backend) ——
const publica = getAchievementById('aula4_concluida');
assert.ok(publica, 'aula4_concluida no catálogo');
assert.equal(publica.name, 'Guardião da Resolução');
assert.equal(publica.hidden, false);
assert.equal(publica.rarity, 'stone');
assert.equal(publica.xp, 0, 'XP da conclusão vem do redeem da aula, não do card');

const progress = readProgressSurface(root);
assert.ok(progress.includes("case 'generateCode'"), 'generateCode disponível');
assert.ok(progress.includes("case 'setLessonGate'"), 'setLessonGate disponível');
assert.ok(progress.includes("case 'redeem'"), 'redeem disponível');

// —— Trilha ——
const apiJs = read('js/api.js');
assert.ok(
  apiJs.includes('A Linha do Tempo das Plataformas e as Restrições Técnicas'),
  'MODULES título novo'
);
assert.ok(!apiJs.includes('Conteúdo em preparação'), 'MODULES sem stub');

// —— Álbum: secretas no catálogo ——
const secretsInCatalog = ACHIEVEMENTS.filter((a) => a.meta?.family === 'aula4' && a.hidden);
assert.equal(secretsInCatalog.length, 3, '3 secretas aula4 no catálogo do álbum');
assert.ok(exists('assets/achievements/aula4_concluida.webp'), 'arte pública stub');
assert.ok(exists('assets/achievements/catalog.json'), 'catalog de artes');
const artCatalog = JSON.parse(read('assets/achievements/catalog.json'));
assert.ok(
  artCatalog.some((e) => String(e.file).includes('aula4_concluida')),
  'arte aula4 no catalog.json'
);

// —— Playbook ——
assert.ok(exists('docs/playbook-liberar-aula4.md'), 'playbook de liberação');
assert.ok(
  read('docs/playbook-liberar-aula4.md').includes('aula4'),
  'playbook cita aula4'
);

// —— CSS compartilhado ——
assert.ok(aula4Html.includes('../css/aula.css'), 'reusa aula.css');
assert.ok(!exists('css/aula4.css'), 'sem CSS one-off');

console.log('OK — smoke QA Aula 04 (Task 9 estática)');
// —— Backend PHP: segredos, catálogo e gate (AchievementsEvaluator / GameCatalog) ——
const phpEvaluatorSrc = read('backend/src/Services/Progress/AchievementsEvaluator.php').replace(/\r\n/g, '\n');
const phpCatalogSrc = read('backend/src/Core/GameCatalog.php').replace(/\r\n/g, '\n');
const phpAula4Secrets = (phpEvaluatorSrc.match(/case 'aula4': \{[\s\S]*?\n            \}\n/) || [''])[0];
for (const id of [
  'segredo_arqueologo_de_hardware',
  'segredo_artesao_da_viewport',
  'segredo_criatividade_sob_limite',
]) {
  assert.ok(phpAula4Secrets.includes(id), `AchievementsEvaluator.php aula4 lista ${id}`);
  const entry = getAchievementById(id);
  assert.equal(entry?.hidden, true, `${id} hidden no álbum`);
  assert.equal(entry?.meta?.family, 'aula4');
}
assert.ok(phpCatalogSrc.includes('aula{$i}_concluida'), 'GameCatalog.php gera aulaN_concluida');
assert.ok(phpCatalogSrc.includes("'lessonTitle' => 'Aula 04 — A Linha do Tempo das Plataformas e as Restrições Técnicas'"), 'LESSON_CATALOG.aula4 título curricular');
assert.ok(
  /'aula4' => \[\s*'lessonId' => 'aula4',\s*'lessonTitle' => '[^']*',\s*'xp' => 30,/.test(phpCatalogSrc),
  'LESSON_CATALOG.aula4 xp 30'
);
assert.ok(
  /'aula4' => \['published' => false\]/.test(phpCatalogSrc),
  'LESSON_GATES.aula4 published:false por default'
);

console.log('Playbook Mestre: liberar gate published + gerar código no Painel/Trilha quando a turma começar.');
