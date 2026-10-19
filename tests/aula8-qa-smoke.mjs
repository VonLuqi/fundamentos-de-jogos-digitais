/**
 * Smoke — QA estática da Aula 08 (Quantic Foundry + dupla/solo + trilhas + diário).
 * Uso: node tests/aula8-qa-smoke.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACHIEVEMENTS, getAchievementById } from '../js/game-catalog.js';
import { evaluateSecretAchievements } from '../api/_lib/lesson-secret-achievements.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function idsOf(text) {
  return evaluateSecretAchievements('aula8', text).map((e) => e.id).sort();
}

const aula8Html = read('pages/aula8.html');
assert.ok(/Quantic Foundry|QUANTIC FOUNDRY|Perfis/i.test(aula8Html), 'marca Quantic / Perfis');
assert.ok(!aula8Html.includes('Forja em andamento'), 'sem stub Forja');
assert.ok(aula8Html.includes('discovery-overlay'), 'discovery overlay');
assert.ok(aula8Html.includes('id="lesson-journal"'), 'diário');
assert.ok(aula8Html.includes('id="lesson-duo-panel"'), 'widget de dupla');
assert.ok(aula8Html.includes('aula08-perfil-quantic'), 'link material');
assert.ok(aula8Html.includes('../css/aula.css'), 'reusa aula.css');
assert.ok(aula8Html.includes('Pistas secretas'), 'pistas na Oficina');
assert.ok(!aula8Html.includes('segredo_modelo_quantic'), 'HTML sem id secreta');
assert.ok(/individual ou dupla|trabalhar sozinho/i.test(aula8Html), 'solo/dupla');
assert.ok(/Design do perfil|Programação das mecânicas/i.test(aula8Html), 'ofícios aula8');
assert.ok(/Conquista|Ação|obstáculo|moeda brilhante/i.test(aula8Html), 'trilhas Godot');
assert.ok(aula8Html.includes('id="aula8-bloco-conquista"') && aula8Html.includes('id="aula8-bloco-acao"'), 'blocos copiáveis');
assert.ok(aula8Html.includes('id="aula8-bloco-camera"') && /Camera2D|make_current/i.test(aula8Html), 'bloco câmera E1');
assert.ok(aula8Html.includes('lesson-copy-code'), 'botões Copiar código');
assert.ok(aula8Html.includes('duo-role-design'), 'botão ofício design');

const aula8Js = read('js/aula8.js');
assert.ok(aula8Js.includes("LESSON_ID = 'aula8'"), 'lessonId aula8');
assert.ok(aula8Js.includes('initCopyCodeBlocks'), 'copia blocos');
assert.ok(aula8Js.includes('lessonJournalFinalize'), 'finalize');
assert.ok(aula8Js.includes('aula08_quantic_foundry_slides.pptx'), 'JS aponta PPTX');
assert.ok(aula8Js.includes('aula08_quantic_foundry_slides.pdf'), 'JS aponta PDF');
assert.ok(aula8Js.includes("pickRole('design')"), 'role design');
assert.ok(!aula8Js.includes("pickRole('arte')"), 'sem role arte da aula7');

assert.ok(exists('assets/docs/aulas/aula08-perfil-quantic/README.md'), 'README');
assert.ok(exists('assets/docs/aulas/aula08-perfil-quantic/quadro-atribuicao.md'), 'quadro');
assert.ok(exists('assets/docs/aulas/aula08-perfil-quantic/folha-fase1.md'), 'folha Fase 1 md');
assert.ok(exists('assets/docs/aulas/aula08-perfil-quantic/folha-fase1.pdf'), 'folha Fase 1 pdf');
assert.ok(exists('scripts/build-aula08-folha-fase1-pdf.py'), 'script build folha pdf');
assert.ok(exists('assets/docs/aulas/aula08-perfil-quantic/estrutura-pastas.txt'), 'estrutura');
assert.ok(exists('assets/docs/aulas/aula08-perfil-quantic/camera-player-exemplo.gd'), 'script câmera');
assert.ok(exists('assets/docs/aulas/aula08-perfil-quantic/moeda-brilhante-exemplo.gd'), 'script conquista');
assert.ok(exists('assets/docs/aulas/aula08-perfil-quantic/obstaculo-exemplo.gd'), 'script ação');
assert.ok(aula8Html.includes('folha-fase1.pdf') && /folha Fase 1|plataformas/i.test(aula8Html), 'Oficina cita PDF da folha');
const folha = read('assets/docs/aulas/aula08-perfil-quantic/folha-fase1.md');
assert.ok(/plataforma|moeda/i.test(folha) && /LEGENDA|MAPA DA FASE 1/i.test(folha), 'folha tem mapa + legenda');
assert.ok(exists('assets/docs/aulas/aula08_quantic_foundry_slides.pptx'), 'PPTX');
assert.ok(exists('assets/docs/aulas/aula08_quantic_foundry_slides.pdf'), 'PDF');
assert.ok(exists('scripts/build-aula08-slides.py'), 'build slides');
assert.ok(exists('docs/playbook-liberar-aula8.md'), 'playbook');
assert.ok(exists('docs/plano-aula8-perfis-quantic-foundry.md'), 'plano');

const shared = read('api/_lib/progress/shared.js');
assert.ok(/aula8:\s*\{[\s\S]*?xp:\s*30/.test(shared), 'LESSON_CATALOG.aula8 xp 30');
assert.ok(/aula8:\s*\{\s*published:\s*false/.test(shared.replace(/\s+/g, ' ')), 'gate fechado');
assert.ok(shared.includes("id: 'aula8_concluida'"), 'ACHIEVEMENT_RULES aula8');

const storeJs = read('api/_lib/store.js');
assert.ok(/PERFIL2026:[\s\S]*?achievement:\s*'aula8_concluida'/.test(storeJs), 'mock PERFIL2026');

const apiJs = read('js/api.js');
assert.ok(apiJs.includes("id: 'aula8'"), 'MODULES inclui aula8');

const publica = getAchievementById('aula8_concluida');
assert.ok(publica, 'aula8_concluida no catálogo');
assert.equal(publica.name, 'Cartógrafo do Perfil');
assert.equal(publica.xp, 0);

const secrets = ACHIEVEMENTS.filter((a) => a.meta?.family === 'aula8' && a.hidden);
assert.equal(secrets.length, 3, '3 secretas aula8');

assert.ok(exists('assets/achievements/aula8_concluida.webp'), 'arte pública');
const artCatalog = JSON.parse(read('assets/achievements/catalog.json'));
assert.ok(
  artCatalog.some((e) => String(e.file).includes('aula8_concluida')),
  'arte aula8 no catalog.json'
);

const playbook = read('docs/playbook-liberar-aula8.md');
assert.ok(/2 encontros|Encontro 1|Encontro 2/i.test(playbook), 'roteiro 2 encontros');
assert.ok(/PERFIL2026|Altar|published/i.test(playbook), 'redeem/gate');
assert.ok(/Cartógrafo do Perfil/i.test(playbook), 'nome pública');

assert.ok(/Quantic Foundry/i.test(aula8Html) && /LabirintoDeMoedas/i.test(aula8Html), 'teoria + projeto');
assert.ok(idsOf('texto fraco').length === 0, 'texto fraco não dispara');

const pkg = read('package.json');
assert.ok(pkg.includes('js/aula8.js'), 'package.json node --check aula8.js');
assert.ok(pkg.includes('tests/aula8-qa-smoke.mjs'), 'check inclui aula8-qa');

console.log('OK aula8-qa-smoke');
