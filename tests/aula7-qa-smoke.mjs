/**
 * Smoke — QA estática da Aula 07 (papéis + workflow + Labirinto kickoff).
 * Não liga o gate `published` nem gera código redeem (isso é operação do Mestre).
 *
 * Uso: node tests/aula7-qa-smoke.mjs
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
  return evaluateSecretAchievements('aula7', text).map((e) => e.id).sort();
}

// —— Página ——
const aula7Html = read('pages/aula7.html');
assert.ok(
  /Papéis|PAPÉIS|Workflow|VERSIONAMENTO/i.test(aula7Html),
  'página com título curricular papéis / workflow'
);
assert.ok(!aula7Html.includes('Forja em andamento'), 'sem stub Forja em andamento');
assert.ok(!aula7Html.includes('CONTEÚDO OCULTO'), 'sem Conteúdo oculto');
assert.ok(aula7Html.includes('discovery-overlay'), 'discovery overlay presente');
assert.ok(aula7Html.includes('id="config-notes"'), 'anotações da oficina');
assert.ok(aula7Html.includes('id="gdd-text"'), 'síntese');
assert.ok(aula7Html.includes('aula07-equipe-labirinto'), 'link material oficina');
assert.ok(aula7Html.includes('Módulo 2') || aula7Html.includes('Aula 07'), 'marca Aula 07 / M2');
assert.ok(aula7Html.includes('../css/aula.css'), 'reusa aula.css');
assert.ok(aula7Html.includes('Pistas secretas'), 'pistas na Oficina');
assert.ok(!aula7Html.includes('segredo_cinco_oficios'), 'HTML sem id cinco ofícios');
assert.ok(!aula7Html.includes('segredo_cercado_do_escopo'), 'HTML sem id cercado');
assert.ok(!aula7Html.includes('segredo_pasta_sagrada'), 'HTML sem id pasta');

const aula7Js = read('js/aula7.js');
assert.ok(aula7Js.includes("LESSON_ID = 'aula7'"), 'lessonId aula7');
assert.ok(aula7Js.includes('lesson-paragraph.js'), 'usa lesson-paragraph');
assert.ok(aula7Js.includes('composeLessonRecord'), 'compose no envio');
assert.ok(aula7Js.includes('saveLessonParagraph'), 'salva parágrafo');
assert.ok(aula7Js.includes('enqueueDiscovery') || aula7Js.includes('lesson-discovery'), 'discovery wired');
assert.ok(!aula7Js.includes('createNote'), 'aula7 não grava nota no grimório');

// —— Secretas (envio) ——
assert.deepEqual(idsOf('Gostei da aula.'), [], 'sem keywords → 0 secretas');
assert.deepEqual(
  idsOf('Na equipe: programação no player e artista no cenário; produção guarda o cronograma.'),
  ['segredo_cinco_oficios'],
  '≥2 ofícios → Cinco Ofícios'
);
assert.deepEqual(
  idsOf('Evitamos Scope Creep: a loja não entra agora.'),
  ['segredo_cercado_do_escopo'],
  'Scope Creep → Cercado'
);
assert.deepEqual(
  idsOf('Três itens fora do escopo: combate, multiplayer e bosses.'),
  ['segredo_cercado_do_escopo'],
  'fora do escopo → Cercado'
);
assert.deepEqual(
  idsOf('Criamos pastas cenas/ no LabirintoDeMoedas com player.tscn e pasta compartilhada no Drive.'),
  ['segredo_pasta_sagrada'],
  'pastas + tscn + sync → Pasta Sagrada'
);
assert.deepEqual(
  idsOf('Temos uma pasta no projeto.'),
  [],
  'só “pasta” não destrava Pasta Sagrada'
);

for (const id of [
  'segredo_cinco_oficios',
  'segredo_cercado_do_escopo',
  'segredo_pasta_sagrada',
]) {
  assert.ok(allLessonSecretIds().includes(id), `motor lista ${id}`);
  const entry = getAchievementById(id);
  assert.equal(entry?.hidden, true, `${id} hidden no álbum`);
  assert.equal(entry?.meta?.family, 'aula7');
  assert.equal(entry?.meta?.volatile, true, `${id} volatile`);
}

// —— Conclusão pública + XP redeem ——
const publica = getAchievementById('aula7_concluida');
assert.ok(publica, 'aula7_concluida no catálogo');
assert.equal(publica.name, 'Cartógrafo da Equipe');
assert.equal(publica.hidden, false);
assert.equal(publica.rarity, 'stone');
assert.equal(publica.xp, 0, 'XP da conclusão vem do redeem da aula, não do card');

// —— Catálogo / gates / redeem ——
const progress = readProgressSurface(root);
assert.ok(progress.includes("id: 'aula7_concluida'"), 'regra ACHIEVEMENT_RULES aula7_concluida');
assert.ok(
  progress.includes('Aula 07 — Papéis na Indústria, Workflow e Versionamento Visual'),
  'LESSON_CATALOG título curricular'
);
assert.ok(
  /aula7:\s*\{[\s\S]*?xp:\s*30/.test(progress),
  'LESSON_CATALOG.aula7 xp 30'
);
assert.ok(
  /aula7:\s*\{\s*published:\s*false/.test(progress.replace(/\s+/g, ' ')),
  'gate default published:false'
);

const storeJs = read('api/_lib/store.js');
assert.ok(
  /aula7:\s*'aula6'/.test(storeJs.replace(/\s+/g, ' ')),
  'pré-requisito aula7 → aula6'
);
assert.ok(storeJs.includes('EQUIPE2026'), 'mock EQUIPE2026');
assert.ok(
  /EQUIPE2026:[\s\S]*?achievement:\s*'aula7_concluida'/.test(storeJs),
  'mock EQUIPE2026 aponta aula7_concluida'
);
assert.ok(
  storeJs.includes("id: 'aula7_concluida'"),
  'store ACHIEVEMENT_RULES inclui aula7_concluida'
);

// —— Trilha ——
const apiJs = read('js/api.js');
assert.ok(apiJs.includes("id: 'aula7'"), 'MODULES inclui aula7');
assert.ok(apiJs.includes("id: 'modulo2'"), 'MODULES inclui modulo2');
assert.ok(
  apiJs.includes('Papéis na Indústria, Workflow e Versionamento Visual'),
  'MODULES título curricular'
);
assert.ok(
  apiJs.includes('Equipes · Labirinto de Moedas 2D · pastas Godot e pasta compartilhada'),
  'MODULES subtitle'
);

const lessonsUi = read('js/lessons-ui.js');
assert.ok(lessonsUi.includes('LESSONS') || lessonsUi.includes('MODULES'), 'Trilha consome LESSONS/MODULES');
assert.ok(lessonsUi.includes('coming-soon') || lessonsUi.includes('Em breve'), 'copy Em breve para gate false');

// —— Álbum ——
const secretsInCatalog = ACHIEVEMENTS.filter((a) => a.meta?.family === 'aula7' && a.hidden);
assert.equal(secretsInCatalog.length, 3, '3 secretas aula7 no catálogo do álbum');
assert.ok(exists('assets/achievements/aula7_concluida.webp'), 'arte pública stub');
assert.ok(exists('assets/achievements/segredo_cinco_oficios.webp'), 'arte ofícios stub');
assert.ok(exists('assets/achievements/segredo_cercado_do_escopo.webp'), 'arte cercado stub');
assert.ok(exists('assets/achievements/segredo_pasta_sagrada.webp'), 'arte pasta stub');

const artCatalog = JSON.parse(read('assets/achievements/catalog.json'));
assert.ok(
  artCatalog.some((e) => String(e.file).includes('aula7_concluida')),
  'arte aula7 no catalog.json'
);

// —— Material (Task 2) ——
assert.ok(exists('assets/docs/aulas/aula07-equipe-labirinto/README.md'), 'README oficina');
assert.ok(exists('assets/docs/aulas/aula07-equipe-labirinto/quadro-atribuicao.md'), 'quadro');
assert.ok(exists('assets/docs/aulas/aula07-equipe-labirinto/estrutura-pastas.txt'), 'estrutura-pastas');
const readme = read('assets/docs/aulas/aula07-equipe-labirinto/README.md');
assert.ok(/Scope Creep|fora do escopo/i.test(readme), 'README cita Scope Creep / fora do escopo');
assert.ok(/LabirintoDeMoedas|player\.tscn|cenario\.tscn/i.test(readme), 'README com nomes canônicos');
assert.ok(/loja.*Aula 06|integrar a loja/i.test(readme), 'README marca loja como fora');

// —— Slides (Task 5) ——
assert.ok(exists('assets/docs/aulas/aula07_papeis_workflow_slides.pptx'), 'PPTX presente');
assert.ok(exists('assets/docs/aulas/aula07_papeis_workflow_slides.pdf'), 'PDF presente');
assert.ok(exists('scripts/build-aula07-slides.py'), 'script de build dos slides');
assert.ok(aula7Js.includes('aula07_papeis_workflow_slides.pptx'), 'JS aponta PPTX');
assert.ok(aula7Js.includes('aula07_papeis_workflow_slides.pdf'), 'JS aponta PDF');
assert.ok(aula7Js.includes('initSlidesViewer'), 'viewer de slides wired');
assert.ok(aula7Html.includes('tab-slides'), 'aba Slides');
assert.ok(aula7Html.includes('download-pptx') && aula7Html.includes('download-pdf'), 'downloads de slides');

// —— Playbook (Task 6) ——
assert.ok(exists('docs/playbook-liberar-aula7.md'), 'playbook de liberação');
const playbook = read('docs/playbook-liberar-aula7.md');
assert.ok(playbook.includes('aula7'), 'playbook cita aula7');
assert.ok(/setLessonGate|published:\s*true|Liberar/i.test(playbook), 'playbook cobre gate');
assert.ok(/EQUIPE2026|gerar código|Altar/i.test(playbook), 'playbook cobre redeem');
assert.ok(/120|0–20|Fundamentos/i.test(playbook), 'playbook tem roteiro 120 min');
assert.ok(/Scope Creep|Drive|\.godot/i.test(playbook), 'playbook tem dicas de sala');

// —— Ementa na página ——
assert.ok(/programação|Programação/i.test(aula7Html) && /Game Design|Produção/i.test(aula7Html), 'ementa papéis');
assert.ok(/Scope Creep|scope creep/i.test(aula7Html), 'ementa Scope Creep');
assert.ok(/workflow|Workflow/i.test(aula7Html), 'ementa workflow');
assert.ok(/Labirinto de Moedas|LabirintoDeMoedas/i.test(aula7Html), 'prática Labirinto');
assert.ok(/pasta compartilhada|versionamento/i.test(aula7Html), 'ementa versionamento visual');

// —— Prática canônica + artefato ——
assert.ok(/cenas\/player\.tscn|player\.tscn/i.test(aula7Html), 'página cita player.tscn');
assert.ok(/quadro|Quadro de atribuição|produtor do dia/i.test(aula7Html), 'página cita quadro / produtor');
assert.ok(/fora do escopo|FORA DO ESCOPO/i.test(aula7Html), 'oficina pede cercado');
assert.ok(
  /NÃO fazer|não|loja da Aula 06|Labirinto jogável completo/i.test(aula7Html),
  'oficina trata labirinto completo / loja como fora'
);
assert.ok(
  !/implemente o labirinto jogável|complete o labirinto hoje|integre a loja agora/i.test(aula7Html),
  'oficina não pede labirinto completo / loja como tarefa de hoje'
);
assert.ok(/CharacterBody2D|Area2D|Node2D/i.test(readme), 'README com raízes de cena');
assert.ok(/pasta compartilhada|ZIP|backup/i.test(readme), 'README sync / backup');

const pkg = read('package.json');
for (const smoke of [
  'tests/aula7-qa-smoke.mjs',
  'tests/aula7-secretas-volateis-smoke.mjs',
  'tests/lesson-paragraph-smoke.mjs',
  'tests/phase5-pages-smoke.mjs',
  'tests/menu-arcoiris-almas-smoke.mjs',
  'tests/ops-task2-perf-security-smoke.mjs',
]) {
  assert.ok(pkg.includes(smoke), `package.json check agrega ${smoke}`);
}
assert.ok(pkg.includes('js/aula7.js'), 'package.json node --check inclui aula7.js');
assert.ok(
  read('tests/lesson-paragraph-smoke.mjs').includes('js/aula7.js'),
  'lesson-paragraph-smoke lista aula7'
);
assert.ok(
  read('tests/phase5-pages-smoke.mjs').includes('pages/aula7.html'),
  'phase5-pages-smoke lista aula7'
);
assert.ok(
  read('tests/menu-arcoiris-almas-smoke.mjs').includes('pages/aula7.html'),
  'menu-arcoiris lista aula7'
);
assert.ok(
  read('tests/ops-task2-perf-security-smoke.mjs').includes('aula7'),
  'ops-task2 cobre prereq aula7'
);
assert.ok(
  read('tests/souls-activities-filters-smoke.mjs').includes("'aula7'"),
  'souls-activities lista aula7'
);

// —— Aceite global: gate/redeem/pública ——
assert.ok(progress.includes("id: 'aula7_concluida'"), 'pública wired no backend');
assert.ok(storeJs.includes('EQUIPE2026'), 'mock redeem presente');
assert.ok(/aula7:\s*\{\s*published:\s*false/.test(progress.replace(/\s+/g, ' ')), 'gate default fechado');

// —— Ponte docs (Task 8) ——
const conteudoM2 = read('docs/conteudo-modulo2-gdscript-do-zero.md');
assert.ok(
  /Aula 07|Papéis.*Workflow|Labirinto de Moedas/i.test(conteudoM2),
  'conteudo-modulo2 cobre Aula 07 / Labirinto'
);
assert.ok(
  !/\*\*07\*\*.*\(a definir na ementa\)/i.test(conteudoM2),
  'conteudo-modulo2 não deixa Aula 07 TBD'
);
const planoAula6 = read('docs/plano-aula6-mercado-loja-etica.md');
assert.ok(
  /Ponte — Aula 07/.test(planoAula6) && planoAula6.includes('plano-aula7-papeis-workflow-versionamento.md'),
  'plano-aula6 tem Ponte — Aula 07 com link'
);
assert.ok(
  !/Ponte — Aula 07 \(placeholder\)/.test(planoAula6),
  'plano-aula6 não mantém placeholder da Aula 07'
);
const conteudoM1 = read('docs/conteudo-modulo1-fundacoes-cultura-interface.md');
assert.ok(
  /Aula 07|Papéis.*Workflow|Labirinto/i.test(conteudoM1),
  'conteudo-modulo1 ponte menciona Aula 07'
);
assert.ok(
  !/Aulas 07–10 \(ementa a definir\)/i.test(conteudoM1),
  'conteudo-modulo1 não agrupa 07–10 como TBD sem Aula 07'
);
const planoAula5 = read('docs/plano-aula5-classind-iarc.md');
assert.ok(
  planoAula5.includes('plano-aula7-papeis-workflow-versionamento.md'),
  'plano-aula5 linka plano Aula 07'
);
assert.ok(exists('docs/conteudo-modulo2-gdscript-do-zero.md'), 'conteúdo Módulo 2');

console.log('OK aula7-qa-smoke');
