/**
 * Smoke — QA estática da Aula 07 (papéis + dupla/solo + coleta + diário).
 * Não liga o gate `published` nem gera código redeem (isso é operação do Mestre).
 *
 * Uso: node tests/aula7-qa-smoke.mjs
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
const aula7Html = read('pages/aula7.html');
assert.ok(
  /Papéis|PAPÉIS|Workflow|VERSIONAMENTO/i.test(aula7Html),
  'página com título curricular papéis / workflow'
);
assert.ok(!aula7Html.includes('Forja em andamento'), 'sem stub Forja em andamento');
assert.ok(!aula7Html.includes('CONTEÚDO OCULTO'), 'sem Conteúdo oculto');
assert.ok(aula7Html.includes('discovery-overlay'), 'discovery overlay presente');
assert.ok(aula7Html.includes('id="lesson-journal"'), 'diário da oficina');
assert.ok(aula7Html.includes('id="lesson-duo-panel"'), 'widget de dupla');
assert.ok(!aula7Html.includes('id="config-notes"'), 'sem anotações legadas');
assert.ok(!aula7Html.includes('id="gdd-text"'), 'sem síntese legada');
assert.ok(aula7Html.includes('aula07-equipe-labirinto'), 'link material oficina');
assert.ok(aula7Html.includes('Módulo 2') || aula7Html.includes('Aula 07'), 'marca Aula 07 / M2');
assert.ok(aula7Html.includes('../css/aula.css'), 'reusa aula.css');
assert.ok(aula7Html.includes('Pistas secretas'), 'pistas na Oficina');
assert.ok(!aula7Html.includes('segredo_cinco_oficios'), 'HTML sem id cinco ofícios');
assert.ok(!aula7Html.includes('segredo_cercado_do_escopo'), 'HTML sem id cercado');
assert.ok(!aula7Html.includes('segredo_pasta_sagrada'), 'HTML sem id pasta');
assert.ok(!/equipes de 3|produtor itinerante|lista oficial/i.test(aula7Html), 'sem trios oficiais');

const aula7Js = read('js/aula7.js');
assert.ok(aula7Js.includes("LESSON_ID = 'aula7'"), 'lessonId aula7');
assert.ok(aula7Js.includes('lessonJournalFinalize'), 'finalize via diário');
assert.ok(aula7Js.includes('lessonJournalSave'), 'autosave diário');
assert.ok(aula7Js.includes('lessonDuoList'), 'lista dupla');
assert.ok(aula7Js.includes('enqueueDiscovery') || aula7Js.includes('lesson-discovery'), 'discovery wired');
assert.ok(!aula7Js.includes('createNote'), 'aula7 não grava nota no grimório');

// —— Secretas (envio / diário) ——
// —— Conclusão pública + XP redeem ——
const publica = getAchievementById('aula7_concluida');
assert.ok(publica, 'aula7_concluida no catálogo');
assert.equal(publica.name, 'Cartógrafo da Dupla');
assert.equal(publica.hidden, false);
assert.equal(publica.rarity, 'stone');
assert.equal(publica.xp, 0, 'XP da conclusão vem do redeem da aula, não do card');

// —— Catálogo / gates / redeem ——
const progress = readProgressSurface(root);
// —— Trilha ——
const apiJs = read('js/api.js');
assert.ok(apiJs.includes("id: 'aula7'"), 'MODULES inclui aula7');
assert.ok(apiJs.includes("id: 'modulo2'"), 'MODULES inclui modulo2');
assert.ok(
  apiJs.includes('Papéis na Indústria, Workflow e Versionamento Visual'),
  'MODULES título curricular'
);
assert.ok(
  apiJs.includes('Individual ou dupla · arte da moeda × coleta · diário compartilhado'),
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

// —— Material ——
assert.ok(exists('assets/docs/aulas/aula07-equipe-labirinto/README.md'), 'README oficina');
assert.ok(exists('assets/docs/aulas/aula07-equipe-labirinto/quadro-atribuicao.md'), 'quadro');
assert.ok(exists('assets/docs/aulas/aula07-equipe-labirinto/estrutura-pastas.txt'), 'estrutura-pastas');
assert.ok(exists('assets/docs/aulas/aula07-equipe-labirinto/moeda-exemplo.gd'), 'script-espelho moeda');
assert.ok(!exists('assets/docs/aulas/aula07-equipe-labirinto/player-exemplo.gd'), 'sem player-exemplo (reusa Aula 02)');
const readme = read('assets/docs/aulas/aula07-equipe-labirinto/README.md');
assert.ok(/Scope Creep|fora do escopo/i.test(readme), 'README cita Scope Creep / fora do escopo');
assert.ok(/LabirintoDeMoedas|player\.tscn|moeda\.tscn/i.test(readme), 'README com nomes canônicos');
assert.ok(/loja.*Aula 06|integrar a loja/i.test(readme), 'README marca loja como fora');
assert.ok(/individual ou dupla|Arte da moeda|coleta/i.test(readme), 'README alinhado à dupla/coleta');
assert.ok(!/lista oficial do Mestre|produtor do dia/i.test(readme), 'README sem formação antiga de trio');
assert.ok(/body_entered|coletar_moeda|Area2D/i.test(readme), 'README com passo a passo da coleta');
assert.ok(readme.includes('```gdscript') && /func coletar_moeda|func _on_body_entered/i.test(readme), 'README tem código para copiar no passo a passo');
assert.ok(/não apague|já tem|já existe|reusa/i.test(readme), 'README reusa player.gd existente');
assert.ok(readme.includes('moeda-exemplo.gd') && !readme.includes('player-exemplo.gd'), 'README espelho só da moeda');
const moedaGd = read('assets/docs/aulas/aula07-equipe-labirinto/moeda-exemplo.gd');
assert.ok(/extends Area2D/.test(moedaGd) && /body_entered|queue_free/.test(moedaGd), 'moeda.gd coleta mínima');
assert.ok(aula7Html.includes('moeda-exemplo.gd') && !aula7Html.includes('player-exemplo.gd'), 'página linka só moeda-exemplo');
assert.ok(aula7Html.includes('id="moeda-bloco-player"') && aula7Html.includes('id="moeda-bloco-coleta"'), 'blocos copiáveis player + moeda');
assert.ok(aula7Html.includes('lesson-copy-code'), 'botões Copiar código na oficina');
assert.ok(aula7Html.includes('coletar_moeda') && aula7Html.includes('_on_body_entered'), 'código da coleta na página');
assert.ok(aula7Js.includes('initCopyCodeBlocks'), 'aula7.js copia blocos de código');

// —— Slides ——
assert.ok(exists('assets/docs/aulas/aula07_papeis_workflow_slides.pptx'), 'PPTX presente');
assert.ok(exists('assets/docs/aulas/aula07_papeis_workflow_slides.pdf'), 'PDF presente');
assert.ok(exists('scripts/build-aula07-slides.py'), 'script de build dos slides');
assert.ok(aula7Js.includes('aula07_papeis_workflow_slides.pptx'), 'JS aponta PPTX');
assert.ok(aula7Js.includes('aula07_papeis_workflow_slides.pdf'), 'JS aponta PDF');
assert.ok(aula7Js.includes('initSlidesViewer'), 'viewer de slides wired');
assert.ok(aula7Html.includes('tab-slides'), 'aba Slides');
assert.ok(aula7Html.includes('download-pptx') && aula7Html.includes('download-pdf'), 'downloads de slides');
const slidesPy = read('scripts/build-aula07-slides.py');
assert.ok(/CARTÓGRAFO DA DUPLA|Cartógrafo da Dupla|individual ou dupla/i.test(slidesPy), 'slides copy dupla');
assert.ok(!/produtor itinerante|CARTÓGRAFO DA EQUIPE|lista oficial do Mestre/i.test(slidesPy), 'slides sem formação antiga');
assert.ok(/só 1 ou 2|sem trio|individual ou dupla/i.test(slidesPy), 'slides deixa claro 1 ou 2');

// —— Playbook ——
assert.ok(exists('docs/playbook-liberar-aula7.md'), 'playbook de liberação');
const playbook = read('docs/playbook-liberar-aula7.md');
assert.ok(playbook.includes('aula7'), 'playbook cita aula7');
assert.ok(/setLessonGate|published:\s*true|Liberar/i.test(playbook), 'playbook cobre gate');
assert.ok(/EQUIPE2026|gerar código|Altar/i.test(playbook), 'playbook cobre redeem');
assert.ok(/2 encontros|Encontro 1|Encontro 2|200 min/i.test(playbook), 'playbook tem roteiro 2 encontros');
assert.ok(/Scope Creep|Drive|\.godot/i.test(playbook), 'playbook tem dicas de sala');
assert.ok(/Cartógrafo da Dupla/i.test(playbook), 'playbook nome da pública');
assert.ok(!/produtor itinerante|lista oficial de equipes/i.test(playbook), 'playbook sem formação antiga de trio');

// —— Ementa / prática na página ——
assert.ok(/programação|Programação/i.test(aula7Html) && /Game Design|Produção|Arte/i.test(aula7Html), 'ementa papéis');
assert.ok(/Scope Creep|scope creep/i.test(aula7Html), 'ementa Scope Creep');
assert.ok(/workflow|Workflow/i.test(aula7Html), 'ementa workflow');
assert.ok(/Labirinto de Moedas|LabirintoDeMoedas/i.test(aula7Html), 'prática Labirinto');
assert.ok(/LibreSprite|projeto local|sem pasta sync/i.test(aula7Html), 'ementa LibreSprite / projeto local');
assert.ok(/Hytale/i.test(aula7Html) && /Riot/i.test(aula7Html), 'teoria cita caso Hytale × Riot');
assert.ok(aula7Html.includes('hytale-scope.jpg') && aula7Html.includes('riot-games-logo.png'), 'teoria exibe imagens do caso');
assert.ok(aula7Html.includes('lesson-table') && aula7Html.includes('lesson-md'), 'blocos ofícios/pastas em MD/HTML');
assert.ok(!/<pre class="lesson-pre"[^>]*>\s*\| Ofício/i.test(aula7Html), 'quadro de ofícios não é pre ASCII largo');
assert.ok(/cenas\/player\.tscn|player\.tscn/i.test(aula7Html), 'página cita player.tscn');
assert.ok(/diário|Diário/i.test(aula7Html), 'página cita diário');
assert.ok(/fora do escopo|FORA DO ESCOPO|Scope Creep/i.test(aula7Html), 'oficina pede cercado');
assert.ok(/loja da Aula 06/i.test(aula7Html), 'oficina trata loja como fora');
assert.ok(/coleta|body_entered|Area2D/i.test(aula7Html), 'oficina pede coleta mínima');
assert.ok(/CharacterBody2D|Area2D|Node2D/i.test(readme), 'README com raízes de cena');
assert.ok(/LibreSprite|projeto local|sem pasta sync/i.test(readme), 'README LibreSprite / sem sync');

const pkg = read('package.json');
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
  read('tests/souls-activities-filters-smoke.mjs').includes("'aula7'"),
  'souls-activities lista aula7'
);

// —— Aceite global ——
// —— Ponte docs ——
const conteudoM2 = read('docs/conteudo-modulo2-gdscript-do-zero.md');
assert.ok(
  /Aula 07|Papéis.*Workflow|Labirinto de Moedas/i.test(conteudoM2),
  'conteudo-modulo2 cobre Aula 07 / Labirinto'
);
assert.ok(
  !/\*\*07\*\*.*\(a definir na ementa\)/i.test(conteudoM2),
  'conteudo-modulo2 não deixa Aula 07 TBD'
);
assert.ok(/individual ou dupla|Cartógrafo da Dupla/i.test(conteudoM2), 'conteudo-modulo2 reforma');
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
assert.ok(exists('docs/plano-aula7-papeis-workflow-versionamento.md'), 'plano Aula 07');
const plano = read('docs/plano-aula7-papeis-workflow-versionamento.md');
assert.ok(/2 encontros|200 min/i.test(plano), 'plano com ritmo 2 encontros');
assert.ok(/Cartógrafo da Dupla|lesson_duos|diário/i.test(plano), 'plano reforma dupla/diário');

// —— Backend PHP: segredos, catálogo e gate (AchievementsEvaluator / GameCatalog) ——
const phpEvaluatorSrc = read('backend/src/Services/Progress/AchievementsEvaluator.php').replace(/\r\n/g, '\n');
const phpCatalogSrc = read('backend/src/Core/GameCatalog.php').replace(/\r\n/g, '\n');
const phpAula7Secrets = (phpEvaluatorSrc.match(/case 'aula7': \{[\s\S]*?\n            \}\n/) || [''])[0];
for (const id of [
  'segredo_cercado_do_escopo',
  'segredo_cinco_oficios',
  'segredo_pasta_sagrada',
]) {
  assert.ok(phpAula7Secrets.includes(id), `AchievementsEvaluator.php aula7 lista ${id}`);
  const entry = getAchievementById(id);
  assert.equal(entry?.hidden, true, `${id} hidden no álbum`);
  assert.equal(entry?.meta?.family, 'aula7');
}
assert.ok(phpCatalogSrc.includes('aula{$i}_concluida'), 'GameCatalog.php gera aulaN_concluida');
assert.ok(phpCatalogSrc.includes("'lessonTitle' => 'Aula 07 — Papéis na Indústria, Workflow e Versionamento Visual'"), 'LESSON_CATALOG.aula7 título curricular');
assert.ok(
  /'aula7' => \[\s*'lessonId' => 'aula7',\s*'lessonTitle' => '[^']*',\s*'xp' => 30,/.test(phpCatalogSrc),
  'LESSON_CATALOG.aula7 xp 30'
);
assert.ok(
  /'aula7' => \['published' => false\]/.test(phpCatalogSrc),
  'LESSON_GATES.aula7 published:false por default'
);

console.log('OK aula7-qa-smoke');
