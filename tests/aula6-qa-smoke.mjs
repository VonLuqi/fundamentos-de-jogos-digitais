/**
 * Smoke — QA estática da Aula 06 (mercado + loja ética).
 * Não liga o gate `published` nem gera código redeem (isso é operação do Mestre).
 * Slides / playbook ficam nas Tasks 5–6.
 *
 * Uso: node tests/aula6-qa-smoke.mjs
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
  return evaluateSecretAchievements('aula6', text).map((e) => e.id).sort();
}

// —— Página ——
const aula6Html = read('pages/aula6.html');
assert.ok(
  aula6Html.includes('Monetização Ética')
    || aula6Html.includes('MONETIZAÇÃO ÉTICA')
    || aula6Html.includes('Mercado'),
  'página com título curricular mercado / monetização'
);
assert.ok(!aula6Html.includes('Forja em andamento'), 'sem stub Forja em andamento');
assert.ok(!aula6Html.includes('CONTEÚDO OCULTO'), 'sem Conteúdo oculto');
assert.ok(aula6Html.includes('discovery-overlay'), 'discovery overlay presente');
assert.ok(aula6Html.includes('id="config-notes"'), 'anotações da oficina');
assert.ok(aula6Html.includes('id="gdd-text"'), 'síntese');
assert.ok(aula6Html.includes('aula06-loja-etica'), 'link material oficina');
assert.ok(aula6Html.includes('PanelContainer') || aula6Html.includes('Button'), 'oficina cita nós UI');
assert.ok(aula6Html.includes('Módulo 2') || aula6Html.includes('Aula 06'), 'marca Aula 06 / M2');
assert.ok(aula6Html.includes('../css/aula.css'), 'reusa aula.css');
assert.ok(aula6Html.includes('Pistas secretas'), 'pistas na Oficina');
assert.ok(!aula6Html.includes('segredo_mercador_do_styx'), 'HTML sem id mercador');
assert.ok(!aula6Html.includes('segredo_balcao_sem_azar'), 'HTML sem id balcão');
assert.ok(!aula6Html.includes('segredo_tempo_respeitado'), 'HTML sem id tempo');

const aula6Js = read('js/aula6.js');
assert.ok(aula6Js.includes("LESSON_ID = 'aula6'"), 'lessonId aula6');
assert.ok(aula6Js.includes('lesson-paragraph.js'), 'usa lesson-paragraph');
assert.ok(aula6Js.includes('composeLessonRecord'), 'compose no envio');
assert.ok(aula6Js.includes('saveLessonParagraph'), 'salva parágrafo');
assert.ok(aula6Js.includes('enqueueDiscovery') || aula6Js.includes('lesson-discovery'), 'discovery wired');
assert.ok(!aula6Js.includes('createNote'), 'aula6 não grava nota no grimório');

// —— Secretas (envio) ——
assert.deepEqual(idsOf('Gostei da aula.'), [], 'sem keywords → 0 secretas');
assert.deepEqual(
  idsOf('O mercado brasileiro de jogos mobile cresce junto ao internacional.'),
  ['segredo_mercador_do_styx'],
  'mercado BR + internacional → Mercador'
);
assert.deepEqual(
  idsOf('Original IP é autoral; prestação de serviços é outsourcing.'),
  ['segredo_mercador_do_styx'],
  'IP × serviços → Mercador'
);
assert.deepEqual(
  idsOf('Falei só de mercado, sem geografia.'),
  [],
  'mercado sozinho não destrava Mercador'
);
assert.deepEqual(
  idsOf('Montei a loja com Button: cosmético a preço fixo com moedas, sem loot box.'),
  ['segredo_balcao_sem_azar'],
  'loja prática → Balcão'
);
assert.deepEqual(
  idsOf('Monetização ética respeita o tempo do jogador.'),
  ['segredo_tempo_respeitado'],
  'ética + tempo → Tempo Respeitado'
);
assert.deepEqual(
  idsOf('Ética: loot box eleva ClassInd a 18+ por jogo de azar.'),
  ['segredo_tempo_respeitado'],
  'ética + ClassInd/azar → Tempo Respeitado'
);

for (const id of [
  'segredo_mercador_do_styx',
  'segredo_balcao_sem_azar',
  'segredo_tempo_respeitado',
]) {
  assert.ok(allLessonSecretIds().includes(id), `motor lista ${id}`);
  const entry = getAchievementById(id);
  assert.equal(entry?.hidden, true, `${id} hidden no álbum`);
  assert.equal(entry?.meta?.family, 'aula6');
  assert.equal(entry?.meta?.volatile, true, `${id} volatile`);
}

// —— Conclusão pública + XP redeem ——
const publica = getAchievementById('aula6_concluida');
assert.ok(publica, 'aula6_concluida no catálogo');
assert.equal(publica.name, 'Guardião da Loja Ética');
assert.equal(publica.hidden, false);
assert.equal(publica.rarity, 'stone');
assert.equal(publica.xp, 0, 'XP da conclusão vem do redeem da aula, não do card');

// —— Catálogo / gates / redeem ——
const progress = readProgressSurface(root);
assert.ok(progress.includes("id: 'aula6_concluida'"), 'regra ACHIEVEMENT_RULES aula6_concluida');
assert.ok(
  progress.includes('Aula 06 — Mercado de Jogos, Propriedade Intelectual e Monetização Ética'),
  'LESSON_CATALOG título curricular'
);
assert.ok(
  /aula6:\s*\{[\s\S]*?xp:\s*30/.test(progress),
  'LESSON_CATALOG.aula6 xp 30'
);
assert.ok(
  /aula6:\s*\{\s*published:\s*false/.test(progress.replace(/\s+/g, ' ')),
  'gate default published:false'
);

const storeJs = read('api/_lib/store.js');
assert.ok(
  /aula6:\s*'aula5'/.test(storeJs.replace(/\s+/g, ' ')),
  'pré-requisito aula6 → aula5'
);
assert.ok(storeJs.includes('LOJAETICA2026'), 'mock LOJAETICA2026');
assert.ok(
  /LOJAETICA2026:[\s\S]*?achievement:\s*'aula6_concluida'/.test(storeJs),
  'mock LOJAETICA2026 aponta aula6_concluida'
);
assert.ok(
  storeJs.includes("id: 'aula6_concluida'"),
  'store ACHIEVEMENT_RULES inclui aula6_concluida'
);

// —— Trilha ——
const apiJs = read('js/api.js');
assert.ok(apiJs.includes("id: 'aula6'"), 'MODULES inclui aula6');
assert.ok(apiJs.includes("id: 'modulo2'"), 'MODULES inclui modulo2');
assert.ok(
  apiJs.includes('Mercado de Jogos, Propriedade Intelectual e Monetização Ética'),
  'MODULES título curricular'
);
assert.ok(
  apiJs.includes('Mercado BR/internacional · Loja cosmética com moedas ganhas jogando'),
  'MODULES subtitle'
);

const lessonsUi = read('js/lessons-ui.js');
assert.ok(lessonsUi.includes('LESSONS') || lessonsUi.includes('MODULES'), 'Trilha consome LESSONS/MODULES');
assert.ok(lessonsUi.includes('coming-soon') || lessonsUi.includes('Em breve'), 'copy Em breve para gate false');

// —— Álbum ——
const secretsInCatalog = ACHIEVEMENTS.filter((a) => a.meta?.family === 'aula6' && a.hidden);
assert.equal(secretsInCatalog.length, 3, '3 secretas aula6 no catálogo do álbum');
assert.ok(exists('assets/achievements/aula6_concluida.webp'), 'arte pública stub');
assert.ok(exists('assets/achievements/segredo_mercador_do_styx.webp'), 'arte mercador stub');
assert.ok(exists('assets/achievements/segredo_balcao_sem_azar.webp'), 'arte balcão stub');
assert.ok(exists('assets/achievements/segredo_tempo_respeitado.webp'), 'arte tempo stub');

const artCatalog = JSON.parse(read('assets/achievements/catalog.json'));
assert.ok(
  artCatalog.some((e) => String(e.file).includes('aula6_concluida')),
  'arte aula6 no catalog.json'
);

// —— Material (Task 2) ——
assert.ok(exists('assets/docs/aulas/aula06-loja-etica/README.md'), 'README oficina');
assert.ok(exists('assets/docs/aulas/aula06-loja-etica/loja-exemplo.gd'), 'script-espelho');
const readme = read('assets/docs/aulas/aula06-loja-etica/README.md');
assert.ok(/loot box|IAP|sem sorte/i.test(readme), 'README proíbe loot/IAP');
assert.ok(/PanelContainer|BtnComprarChapeu/i.test(readme), 'README com nomes canônicos');

// —— Slides (Task 5) ——
assert.ok(exists('assets/docs/aulas/aula06_mercado_loja_etica_slides.pptx'), 'PPTX presente');
assert.ok(exists('assets/docs/aulas/aula06_mercado_loja_etica_slides.pdf'), 'PDF presente');
assert.ok(exists('scripts/build-aula06-slides.py'), 'script de build dos slides');
assert.ok(
  read('scripts/build-aula06-slides.py').includes('hierarquia-loja-godot.png'),
  'build dos slides inclui foto da Scene'
);
assert.ok(
  read('scripts/build-aula06-slides.py').includes('_on_btn_ganhar_moedas_pressed'),
  'build dos slides inclui código Bloco 3'
);
assert.ok(
  read('scripts/build-aula06-slides.py').includes('_on_btn_comprar_chapeu_pressed'),
  'build dos slides inclui código Bloco 4'
);
assert.ok(aula6Js.includes('aula06_mercado_loja_etica_slides.pptx'), 'JS aponta PPTX');
assert.ok(aula6Js.includes('aula06_mercado_loja_etica_slides.pdf'), 'JS aponta PDF');
assert.ok(aula6Js.includes('initSlidesViewer'), 'viewer de slides wired');
assert.ok(aula6Html.includes('tab-slides'), 'aba Slides');
assert.ok(aula6Html.includes('download-pptx') && aula6Html.includes('download-pdf'), 'downloads de slides');

// —— Playbook (Task 6) ——
assert.ok(exists('docs/playbook-liberar-aula6.md'), 'playbook de liberação');
const playbook = read('docs/playbook-liberar-aula6.md');
assert.ok(playbook.includes('aula6'), 'playbook cita aula6');
assert.ok(/setLessonGate|published:\s*true|Liberar/i.test(playbook), 'playbook cobre gate');
assert.ok(/LOJAETICA2026|gerar código|Altar/i.test(playbook), 'playbook cobre redeem');
assert.ok(/120|0–20|Fundamentos/i.test(playbook), 'playbook tem roteiro 120 min');
assert.ok(/F6|Play This Scene/i.test(playbook), 'playbook tem dicas F6');

// —— Ementa na página ——
assert.ok(/mercado/i.test(aula6Html) && /Original IP|propriedade intelectual/i.test(aula6Html), 'ementa mercado/IP');
assert.ok(/loot box|Loot Boxes/i.test(aula6Html) && /ClassInd|18\+/i.test(aula6Html), 'ementa loot ↔ ClassInd');
assert.ok(/moedas ganhas|moedas coletadas/i.test(aula6Html), 'prática com moedas in-game');
assert.ok(
  /prestação de serviços|Original IP/i.test(aula6Html),
  'ementa IP vs serviços'
);
assert.ok(
  /monetização ética|Monetização ética/i.test(aula6Html),
  'ementa monetização ética'
);

// —— Prática canônica + artefato (Task 7) ——
assert.ok(
  /PanelContainer|MarginContainer|GanharMoedas|Chapeu|Moedas/i.test(aula6Html),
  'página cita a árvore real da Godot'
);
assert.ok(/ui\/loja\.tscn|loja\.gd/i.test(aula6Html), 'página cita cena/script da loja');
assert.ok(aula6Html.includes('hierarquia-loja-godot.png'), 'página inclui captura da Scene');
assert.ok(aula6Html.includes('id="loja-bloco3"') && aula6Html.includes('id="loja-bloco4"'), 'blocos copiáveis 3 e 4');
assert.ok(aula6Html.includes('lesson-copy-code'), 'botões Copiar código na oficina');
assert.ok(aula6Html.includes('$PanelContainer/MarginContainer/VBoxContainer/Moedas'), 'bloco 3 usa caminhos da foto');
assert.ok(aula6Html.includes('_on_btn_ganhar_moedas_pressed'), 'sinal de GanharMoedas no plural');
assert.ok(aula6Js.includes('initCopyCodeBlocks'), 'aula6.js copia blocos de código');
assert.ok(exists('assets/docs/aulas/aula06-loja-etica/hierarquia-loja-godot.png'), 'PNG da hierarquia no material');
assert.ok(/preço fixo|precos fixos|PRECO_/i.test(aula6Html) || /5 · 12 · 20|5.*12.*20/.test(aula6Html), 'preços fixos na oficina');
assert.ok(
  /Proibido|NÃO fazer|sem loot|sem.*randi|sem azar/i.test(aula6Html),
  'oficina trata loot/RNG como proibido (não como feature)'
);
assert.ok(
  !/implemente uma loot box|crie uma loot box|faça um loot box/i.test(aula6Html),
  'oficina não pede loot box como tarefa'
);
const readmeTask7 = read('assets/docs/aulas/aula06-loja-etica/README.md');
assert.ok(/BtnComprarChapeu|LabelMoedas|PainelFundo/.test(readmeTask7), 'README com nomes canônicos');
assert.ok(/Proibido|sem loot|sem sorte|sem randi/i.test(readmeTask7), 'README anti-azar');
assert.ok(/saldo inicial|Moedas: 10|\+5|GANHO_FASE/i.test(readmeTask7), 'README economia in-game');

const pkg = read('package.json');
for (const smoke of [
  'tests/aula6-qa-smoke.mjs',
  'tests/aula6-secretas-volateis-smoke.mjs',
  'tests/lesson-paragraph-smoke.mjs',
  'tests/phase5-pages-smoke.mjs',
  'tests/menu-arcoiris-almas-smoke.mjs',
  'tests/ops-task2-perf-security-smoke.mjs',
]) {
  assert.ok(pkg.includes(smoke), `package.json check agrega ${smoke}`);
}
assert.ok(pkg.includes('js/aula6.js'), 'package.json node --check inclui aula6.js');
assert.ok(
  read('tests/lesson-paragraph-smoke.mjs').includes('js/aula6.js'),
  'lesson-paragraph-smoke lista aula6'
);
assert.ok(
  read('tests/phase5-pages-smoke.mjs').includes('pages/aula6.html'),
  'phase5-pages-smoke lista aula6'
);
assert.ok(
  read('tests/menu-arcoiris-almas-smoke.mjs').includes('pages/aula6.html'),
  'menu-arcoiris lista aula6'
);
assert.ok(
  read('tests/ops-task2-perf-security-smoke.mjs').includes("aula6"),
  'ops-task2 cobre prereq aula6'
);

// —— Aceite global: gate/redeem/pública (Task 3–4) ——
assert.ok(progress.includes("id: 'aula6_concluida'"), 'pública wired no backend');
assert.ok(storeJs.includes('LOJAETICA2026'), 'mock redeem presente');
assert.ok(/aula6:\s*\{\s*published:\s*false/.test(progress.replace(/\s+/g, ' ')), 'gate default fechado');

// —— Ponte docs (Task 8) ——
const conteudoM1 = read('docs/conteudo-modulo1-fundacoes-cultura-interface.md');
assert.ok(
  /Aula 06|loja ética|Monetização Ética/i.test(conteudoM1),
  'conteudo-modulo1 ponte aponta Aula 06 / loja ética'
);
assert.ok(
  !/Módulo 2\+ \(câmera, AnimatedSprite/i.test(conteudoM1),
  'conteudo-modulo1 não promete câmera como abertura do M2'
);
const planoAula5 = read('docs/plano-aula5-classind-iarc.md');
assert.ok(
  /Ponte — Aula 06/.test(planoAula5) && planoAula5.includes('plano-aula6-mercado-loja-etica.md'),
  'plano-aula5 tem Ponte — Aula 06 com link'
);
assert.ok(
  /Fora da Aula 06:[\s\S]*Camera2D/.test(planoAula5),
  'plano-aula5 marca câmera como fora da Aula 06'
);
assert.ok(exists('docs/conteudo-modulo2-gdscript-do-zero.md'), 'esboço conteúdo Módulo 2');

console.log('OK aula6-qa-smoke');
