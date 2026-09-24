/**
 * Smoke — QA estática da Aula 05 (catálogo / gates / redeem / conquistas).
 * Não liga o gate `published` nem gera código redeem (isso é operação do Mestre).
 * Slides / material baixável ficam na Task 8.
 *
 * Uso: node tests/aula5-qa-smoke.mjs
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
import { readProgressSurface } from './_helpers/progress-surface.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function idsOf(text) {
  return evaluateSecretAchievements('aula5', text).map((e) => e.id).sort();
}

// —— Página ——
const aula5Html = read('pages/aula5.html');
assert.ok(
  aula5Html.includes('ClassInd') || aula5Html.includes('CLASSIND') || aula5Html.includes('IARC'),
  'página com título curricular ClassInd/IARC'
);
assert.ok(!aula5Html.includes('Forja em andamento'), 'sem stub Forja em andamento');
assert.ok(!aula5Html.includes('CONTEÚDO OCULTO'), 'sem Conteúdo oculto');
assert.ok(aula5Html.includes('discovery-overlay'), 'discovery overlay presente');
assert.ok(!aula5Html.includes('id="config-notes"'), 'sem textarea de anotações');
assert.ok(!aula5Html.includes('id="gdd-text"'), 'sem textarea de síntese');
assert.ok(!/Material da atividade/i.test(aula5Html), 'sem bloco Material da atividade');
assert.ok(aula5Html.includes('iarc-wizard-root'), 'wizard IARC na Oficina');
assert.ok(aula5Html.includes('cta-classind-dle') || aula5Html.includes('classind-dle.html'), 'CTA ClassInd-dle');
assert.ok(aula5Html.includes('Módulo 1 · Aula 05') || aula5Html.includes('Aula 05'), 'footer / marca Aula 05');
assert.ok(aula5Html.includes('../css/aula.css'), 'reusa aula.css');

const aula5Js = read('js/aula5.js');
assert.ok(aula5Js.includes("LESSON_ID = 'aula5'"), 'lessonId aula5');
assert.ok(aula5Js.includes('lesson-paragraph.js'), 'usa lesson-paragraph');
assert.ok(aula5Js.includes('composeLessonRecord'), 'compose no envio');
assert.ok(aula5Js.includes('saveLessonParagraph'), 'salva parágrafo via Finalizar aula');
assert.ok(aula5Js.includes('onFinalize'), 'wizard finaliza direto (sem anotações)');
assert.ok(aula5Js.includes('enqueueDiscovery') || aula5Js.includes('lesson-discovery'), 'discovery wired');
assert.ok(!aula5Js.includes('createNote'), 'aula5 não grava nota no grimório');

// —— Secretas (envio) ——
assert.deepEqual(idsOf('Gostei da aula.'), [], 'sem keywords → 0 secretas');
assert.deepEqual(
  idsOf('No ClassInd os eixos clássicos são violência, sexo e drogas.'),
  [],
  'ClassInd sozinho não destrava Oráculo'
);
assert.deepEqual(
  idsOf('No ClassInd brasileiro o IARC devolve selos para as lojas digitais.'),
  ['segredo_oraculo_do_classind'],
  'ClassInd + IARC → Oráculo'
);
assert.deepEqual(
  idsOf('Após a higienização, a faixa-alvo ficou Livre.'),
  ['segredo_selo_do_livre'],
  'faixa-alvo Livre → Selo'
);
assert.deepEqual(
  idsOf('Higienizamos para mirar faixa-alvo 10.'),
  ['segredo_selo_do_livre'],
  'faixa-alvo 10 → Selo'
);
assert.deepEqual(
  idsOf('Usamos atenuante de fantasia nos inimigos.'),
  [],
  'só atenuante não destrava Balança'
);
assert.deepEqual(
  idsOf('Atenuante de não-humano; o original agravava com gore.'),
  ['segredo_balanca_da_faixa'],
  'atenuante + agravante → Balança'
);

for (const id of [
  'segredo_oraculo_do_classind',
  'segredo_selo_do_livre',
  'segredo_balanca_da_faixa',
]) {
  assert.ok(allLessonSecretIds().includes(id), `motor lista ${id}`);
}
for (const id of [
  'segredo_oraculo_do_classind',
  'segredo_selo_do_livre',
  'segredo_balanca_da_faixa',
]) {
  const entry = getAchievementById(id);
  assert.equal(entry?.hidden, true, `${id} hidden no álbum`);
  assert.equal(entry?.meta?.family, 'aula5');
}

// —— Conclusão pública + XP redeem (contrato backend) ——
const publica = getAchievementById('aula5_concluida');
assert.ok(publica, 'aula5_concluida no catálogo');
assert.equal(publica.name, 'Guardião da Faixa');
assert.equal(publica.hidden, false);
assert.equal(publica.rarity, 'stone');
assert.equal(publica.xp, 0, 'XP da conclusão vem do redeem da aula, não do card');

// —— Catálogo / gates / redeem ——
const progress = readProgressSurface(root);
assert.ok(progress.includes("id: 'aula5_concluida'"), 'regra ACHIEVEMENT_RULES aula5_concluida');
assert.ok(
  progress.includes('Aula 05 — Classificação Indicativa (ClassInd), IARC e Design Saudável'),
  'LESSON_CATALOG título curricular'
);
assert.ok(
  /aula5:\s*\{[\s\S]*?xp:\s*30/.test(progress),
  'LESSON_CATALOG.aula5 xp 30'
);
assert.ok(
  /aula5:\s*\{\s*published:\s*false/.test(progress.replace(/\s+/g, ' ')),
  'gate default published:false (Mestre libera na hora da turma)'
);
assert.ok(progress.includes("action === 'generateCode'"), 'generateCode disponível');
assert.ok(progress.includes("action === 'setLessonGate'"), 'setLessonGate disponível');
assert.ok(progress.includes("action === 'redeem'"), 'redeem disponível');

const storeJs = read('api/_lib/store.js');
assert.ok(
  /aula5:\s*'aula4'/.test(storeJs.replace(/\s+/g, ' ')),
  'pré-requisito aula5 → aula4'
);
assert.ok(storeJs.includes('CLASSIND2026'), 'mock de código CLASSIND2026 no store');
assert.ok(
  /CLASSIND2026:[\s\S]*?achievement:\s*'aula5_concluida'/.test(storeJs),
  'mock CLASSIND2026 aponta aula5_concluida'
);
assert.ok(
  storeJs.includes("id: 'aula5_concluida'"),
  'store ACHIEVEMENT_RULES inclui aula5_concluida'
);

// —— Trilha ——
const apiJs = read('js/api.js');
assert.ok(
  apiJs.includes('Classificação Indicativa (ClassInd), IARC e Design Saudável'),
  'MODULES título curricular'
);
assert.ok(apiJs.includes("id: 'aula5'"), 'MODULES inclui aula5');
assert.ok(apiJs.includes("id: 'prova-modulo1'"), 'MODULES inclui Provação');
assert.ok(apiJs.includes("kind: 'assessment'"), 'Provação é assessment (fora de LESSONS)');
assert.ok(
  /filter\(\(lesson\)\s*=>\s*lesson\.kind\s*!==\s*'assessment'\)/.test(apiJs)
    || apiJs.includes("kind !== 'assessment'"),
  'LESSONS exclui assessments',
);
assert.ok(
  apiJs.includes('Faixas etárias · ClassInd-dle · Adequação de público'),
  'MODULES subtitle'
);
assert.ok(!apiJs.includes('Conteúdo em preparação'), 'MODULES sem stub');

const lessonsUi = read('js/lessons-ui.js');
const aulasJs = read('js/aulas.js');
assert.ok(lessonsUi.includes('from \'./api.js\'') || lessonsUi.includes('from "./api.js"'), 'Trilha importa catálogo');
assert.ok(lessonsUi.includes('LESSONS') || lessonsUi.includes('MODULES'), 'Trilha consome LESSONS/MODULES');
assert.ok(lessonsUi.includes('isAssessmentLesson') || lessonsUi.includes("kind === 'assessment'"), 'trilha trata assessment');
assert.ok(aulasJs.includes('provaGetExamStatus') || aulasJs.includes('assessmentStates'), 'aulas carrega status da prova');
assert.ok(lessonsUi.includes('coming-soon') || lessonsUi.includes('Em breve'), 'copy Em breve para gate false');

// —— Álbum: secretas no catálogo ——
const secretsInCatalog = ACHIEVEMENTS.filter((a) => a.meta?.family === 'aula5' && a.hidden);
assert.equal(secretsInCatalog.length, 3, '3 secretas aula5 no catálogo do álbum');
assert.ok(exists('assets/achievements/aula5_concluida.webp'), 'arte pública stub');
assert.ok(!exists('assets/achievements/segredo_juri_do_telao.webp'), 'arte júri removida');
assert.ok(exists('assets/achievements/segredo_oraculo_do_classind.webp'), 'arte oráculo stub');
assert.ok(exists('assets/achievements/segredo_selo_do_livre.webp'), 'arte selo stub');
assert.ok(exists('assets/achievements/segredo_balanca_da_faixa.webp'), 'arte balança stub');
assert.ok(!getAchievementById('segredo_juri_do_telao'), 'Júri do Telão fora do catálogo');

const artCatalog = JSON.parse(read('assets/achievements/catalog.json'));
assert.ok(
  artCatalog.some((e) => String(e.file).includes('aula5_concluida')),
  'arte aula5 no catalog.json'
);

// —— Material / slides (Task 8) ——
assert.ok(exists('assets/docs/aulas/aula05-classind/README.md'), 'README oficina');
const readme = read('assets/docs/aulas/aula05-classind/README.md');
assert.ok(/ClassInd/i.test(readme), 'README ClassInd');
assert.ok(/IARC/i.test(readme), 'README IARC');
assert.ok(/Patch Note|patch note/i.test(readme), 'README Patch Note');
assert.ok(/classind-dle|ClassInd-dle/i.test(readme), 'README como entrar no dle');
assert.ok(exists('assets/docs/aulas/aula05-classind/faixas-classind.md'), 'tabela de faixas');
assert.ok(
  /Livre|\bL\b|10|16|18/.test(read('assets/docs/aulas/aula05-classind/faixas-classind.md')),
  'tabela cita faixas'
);
assert.ok(exists('assets/docs/aulas/aula05_classind_iarc_slides.pptx'), 'PPTX presente');
assert.ok(exists('assets/docs/aulas/aula05_classind_iarc_slides.pdf'), 'PDF presente');
assert.ok(exists('scripts/build-aula05-slides.py'), 'script de build dos slides');
assert.ok(aula5Js.includes('aula05_classind_iarc_slides.pptx'), 'JS aponta PPTX');
assert.ok(aula5Js.includes('aula05_classind_iarc_slides.pdf'), 'JS aponta PDF');
assert.ok(aula5Js.includes('initSlidesViewer'), 'viewer de slides wired');
assert.ok(aula5Html.includes('tab-slides'), 'aba Slides');
assert.ok(aula5Html.includes('download-pptx') && aula5Html.includes('download-pdf'), 'downloads de slides');
assert.ok(exists('assets/classind-dle/covers/INVENTARIO.md'), 'inventário de capas');
assert.ok(
  /diagrama-das-faixas|entregue/i.test(read('assets/classind-dle/covers/INVENTARIO.md')),
  'inventário marca diagrama de faixas entregue'
);
assert.ok(
  read('scripts/build-aula05-slides.py').includes('add_cover')
    && read('scripts/build-aula05-slides.py').includes('PIL'),
  'slides embutem capas (WebP→PNG via Pillow)'
);

// —— Playbook do Mestre (Task 9) ——
assert.ok(exists('docs/playbook-liberar-aula5.md'), 'playbook de liberação');
const playbook = read('docs/playbook-liberar-aula5.md');
assert.ok(playbook.includes('aula5'), 'playbook cita aula5');
assert.ok(/published:\s*true|Liberar/i.test(playbook), 'playbook cobre liberar gate');
assert.ok(/gerar código|código de oferenda|generateCode/i.test(playbook), 'playbook cobre gerar código');
assert.ok(/0–20|0-20|Fundamentos/i.test(playbook), 'playbook tem roteiro live');
assert.ok(/ClassInd-dle|Higher\/Lower/i.test(playbook), 'playbook cobre bloco dle');
assert.ok(/Patch Note|Adequação|wizard/i.test(playbook), 'playbook cobre adequação reversa');
assert.ok(/Finalizar aula|sem anota/i.test(playbook), 'playbook: entrega via Finalizar aula');
assert.ok(/admin não vota|Mestre não vota|eligible/i.test(playbook), 'playbook: admin sem voto');
assert.ok(/Acertos|scoreCorrect|placar de acertos/i.test(playbook), 'playbook: placar de acertos');
assert.ok(/Encerrar sala|closeRoom/i.test(playbook), 'playbook: encerrar sala');
assert.ok(/Altar|redeem|Guardião da Faixa/i.test(playbook), 'playbook cobre fechamento/Altar');
assert.ok(/QA pós-liberação|pós-liberação/i.test(playbook), 'playbook tem QA pós-liberação');

// —— Pistas sem spoiler de ids ——
assert.ok(aula5Html.includes('Pistas secretas'), 'pistas na Oficina');
assert.ok(!aula5Html.includes('segredo_oraculo_do_classind'), 'HTML sem id de secreta');
assert.ok(!aula5Html.includes('segredo_selo_do_livre'), 'HTML sem id selo');
assert.ok(!aula5Html.includes('segredo_balanca_da_faixa'), 'HTML sem id balança');

// —— Critérios de aceite (Task 10 · estático) ——
assert.ok(/ClassInd/i.test(aula5Html) && /IARC/i.test(aula5Html), 'ementa: ClassInd + IARC na página');
assert.ok(
  /ClassInd-dle|classind-dle/i.test(aula5Html) && /higieniz|Patch Note|wizard/i.test(aula5Html),
  'ementa: prática dle + higienização'
);
assert.ok(/sem Godot/i.test(aula5Html), 'copy deixa explícito: sem Godot');
assert.ok(!/Camera2D|AnimatedSprite/i.test(aula5Html), 'página sem Camera2D/AnimatedSprite');
assert.ok(!/Camera2D|AnimatedSprite|\.tscn|Project Settings/i.test(aula5Js), 'JS aula5 sem oficina Godot');
assert.ok(aula5Js.includes('initIarcWizard'), 'Parte 2 wizard wired');
assert.ok(exists('js/classind-dle/realtime.js'), 'client Realtime presente');
const realtimeSrc = read('js/classind-dle/realtime.js');
assert.ok(realtimeSrc.includes('postgres_changes'), 'Realtime: postgres_changes');
assert.ok(
  realtimeSrc.includes('FALLBACK_POLL_MS') || /poll|4000|setInterval/i.test(realtimeSrc),
  'fallback poll presente no client'
);
assert.ok(exists('tests/classind-api-smoke.mjs'), 'smoke API classind');
assert.ok(exists('tests/classind-dle-pages-smoke.mjs'), 'smoke pages dle');
assert.ok(exists('tests/aula5-iarc-smoke.mjs'), 'smoke wizard IARC');
assert.ok(exists('tests/aula5-secretas-volateis-smoke.mjs'), 'smoke secretas');

const pkg = read('package.json');
for (const smoke of [
  'tests/aula5-qa-smoke.mjs',
  'tests/aula5-secretas-volateis-smoke.mjs',
  'tests/aula5-iarc-smoke.mjs',
  'tests/classind-api-smoke.mjs',
  'tests/classind-dle-pages-smoke.mjs',
  'tests/classind-schema-smoke.mjs',
  'tests/lesson-paragraph-smoke.mjs',
  'tests/phase5-pages-smoke.mjs',
]) {
  assert.ok(pkg.includes(smoke), `package.json check agrega ${smoke}`);
}
assert.ok(
  read('tests/lesson-paragraph-smoke.mjs').includes('js/aula5.js'),
  'lesson-paragraph-smoke lista aula5'
);
assert.ok(
  read('tests/phase5-pages-smoke.mjs').includes('pages/aula5.html'),
  'phase5-pages-smoke lista aula5'
);
assert.ok(
  /Chrome|celular|dois dispositivos|2 alunos|tallies|Reveal só admin/i.test(playbook),
  'playbook documenta QA manual multi-dispositivo'
);

// —— Ponte Aula 04 → 05 (Task 11) ——
const ponteAula4 = read('docs/plano-aula4-plataformas-restricoes.md');
assert.ok(
  /Ponte — Aula 05/.test(ponteAula4),
  'plano-aula4 tem seção Ponte — Aula 05'
);
assert.ok(
  /ClassInd|IARC|Design Saudável/i.test(ponteAula4),
  'ponte aponta ementa ClassInd/IARC'
);
assert.ok(
  ponteAula4.includes('plano-aula5-classind-iarc.md'),
  'ponte linka plano-aula5'
);
assert.ok(
  !/Ponte — Aula 05[\s\S]{0,800}?\*\*Câmera follow\*\*/.test(ponteAula4),
  'ponte Aula 05 não lista Câmera follow como tema oficial'
);
assert.ok(
  !/Próximo currículo: \*\*Aula 05\*\* \(câmera/i.test(ponteAula4),
  'status do plano-aula4 não promete câmera como Aula 05'
);
const readmeAula4 = read('assets/docs/aulas/aula04-retro-viewport/README.md');
assert.ok(
  /Módulo 2\+|ClassInd/i.test(readmeAula4),
  'README aula04 não empurra câmera como próxima aula oficial'
);

console.log('OK aula5-qa-smoke');
