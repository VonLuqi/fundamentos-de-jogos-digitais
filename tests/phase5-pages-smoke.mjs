/**
 * Smoke check — páginas Aulas/Conquistas e hrefs do shell (Fase 5).
 * Uso: node tests/phase5-pages-smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Arquivo ausente: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFiles = [
  'pages/aulas.html',
  'pages/conquistas.html',
  'pages/companheiro.html',
  'js/aulas.js',
  'js/conquistas.js',
  'js/companheiro.js',
  'js/friends-ui.js',
  'js/lessons-ui.js',
  'js/achievements-ui.js',
  'css/aulas.css',
  'css/conquistas.css',
  'css/companheiros.css',
  'assets/achievements/README.md',
];

requiredFiles.forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const shellPages = [
  'pages/dashboard.html',
  'pages/aulas.html',
  'pages/conquistas.html',
  'pages/companheiro.html',
  'pages/aula1.html',
  'pages/aula2.html',
  'pages/aula3.html',
  'pages/aula4.html',
  'pages/aula5.html',
];

shellPages.forEach((rel) => {
  const html = read(rel);
  assert(
    html.includes('href="./aulas.html"') || html.includes("href='./aulas.html'"),
    `${rel}: item Aulas deve apontar para ./aulas.html`
  );
  assert(
    html.includes('href="./conquistas.html"') || html.includes("href='./conquistas.html'"),
    `${rel}: item Conquistas deve apontar para ./conquistas.html`
  );
  assert(
    !html.includes('dashboard.html#lessons-list'),
    `${rel}: não deve usar #lessons-list para Aulas`
  );
  assert(
    !html.includes('dashboard.html#achievements-grid'),
    `${rel}: não deve usar #achievements-grid para Conquistas`
  );
});

const aulasHtml = read('pages/aulas.html');
assert(aulasHtml.includes('data-route="aulas"'), 'aulas.html precisa de data-route="aulas"');
assert(aulasHtml.includes('Trilha'), 'aulas.html deve mencionar Trilha');

const conquistasHtml = read('pages/conquistas.html');
assert(conquistasHtml.includes('data-route="conquistas"'), 'conquistas.html precisa de data-route="conquistas"');
assert(conquistasHtml.includes('relic-modal'), 'conquistas.html precisa do modal de relíquia');
assert(
  conquistasHtml.includes('aria-describedby'),
  'conquistas.html: modal precisa de aria-describedby'
);

const apiJs = read('js/api.js');
assert(apiJs.includes('aulas:'), 'ROUTES.aulas deve existir em api.js');
assert(apiJs.includes('conquistas:'), 'ROUTES.conquistas deve existir em api.js');
assert(apiJs.includes("id: 'aula2'"), 'MODULES deve incluir aula2');
assert(apiJs.includes("id: 'aula3'"), 'MODULES deve incluir aula3');
assert(apiJs.includes("id: 'aula4'"), 'MODULES deve incluir aula4');
assert(apiJs.includes("id: 'aula5'"), 'MODULES deve incluir aula5');
assert(
  apiJs.includes('O Glossário do Desenvolvedor e o Player na Tela'),
  'MODULES.aula2 deve usar o título curricular novo'
);
assert(
  !apiJs.includes('Loops e Ritmo'),
  'MODULES não deve mais usar o título legado Loops e Ritmo'
);
assert(
  apiJs.includes('Core Loop, Grokking, Assets'),
  'MODULES.aula2 deve usar o subtitle do glossário/Player'
);
assert(
  apiJs.includes('Homo Ludens, Identidade e Expressão Cultural'),
  'MODULES.aula3 deve usar o título curricular novo'
);
assert(
  apiJs.includes('Cultura como jogo · Pixel art, importação e herói brasileiro'),
  'MODULES.aula3 deve usar o subtitle Homo Ludens / pixel art'
);
assert(
  apiJs.includes('A Linha do Tempo das Plataformas e as Restrições Técnicas'),
  'MODULES.aula4 deve usar o título curricular novo'
);
assert(
  apiJs.includes('Histórico de hardware · Viewport retrô e stretch clássico'),
  'MODULES.aula4 deve usar o subtitle de plataformas / viewport'
);
assert(
  apiJs.includes('Classificação Indicativa (ClassInd), IARC e Design Saudável'),
  'MODULES.aula5 deve usar o título curricular novo'
);
assert(
  apiJs.includes('Faixas etárias · ClassInd-dle · Adequação de público'),
  'MODULES.aula5 deve usar o subtitle ClassInd / dle'
);
assert(
  !apiJs.includes('Conteúdo em preparação'),
  'MODULES não deve mais usar o stub Conteúdo em preparação'
);
assert(
  !apiJs.includes('Em breve — aguardando liberação do Mestre'),
  'MODULES não deve usar o subtitle stub Em breve no catálogo'
);

const progressJs = read('api/progress.js');
assert(progressJs.includes('published'), 'progress.js deve definir gate published');
assert(progressJs.includes('aula2:'), 'LESSON_CATALOG deve ter stub aula2');
assert(progressJs.includes('aula3:'), 'LESSON_CATALOG deve ter stub aula3');
assert(progressJs.includes('aula4:'), 'LESSON_CATALOG deve ter stub aula4');
assert(progressJs.includes('aula5:'), 'LESSON_CATALOG deve ter stub aula5');
assert(
  progressJs.includes('O Glossário do Desenvolvedor e o Player na Tela'),
  'LESSON_CATALOG.aula2 deve usar o título curricular novo'
);
assert(
  !progressJs.includes('Aula 02 — Loops e Ritmo'),
  'LESSON_CATALOG não deve mais usar o título legado Loops e Ritmo'
);
assert(
  progressJs.includes('Aula 03 — Homo Ludens, Identidade e Expressão Cultural'),
  'LESSON_CATALOG.aula3 deve usar o título curricular novo'
);
assert(
  !progressJs.includes('Aula 03 — Em preparação'),
  'LESSON_CATALOG não deve mais usar o stub Em preparação da aula3'
);
assert(
  progressJs.includes('Aula 04 — A Linha do Tempo das Plataformas e as Restrições Técnicas'),
  'LESSON_CATALOG.aula4 deve usar o título curricular novo'
);
assert(
  progressJs.includes('Aula 05 — Classificação Indicativa (ClassInd), IARC e Design Saudável'),
  'LESSON_CATALOG.aula5 deve usar o título curricular novo'
);
assert(
  progressJs.includes("id: 'aula2_concluida'"),
  'ACHIEVEMENT_RULES deve incluir aula2_concluida'
);
assert(
  progressJs.includes("id: 'aula3_concluida'"),
  'ACHIEVEMENT_RULES deve incluir aula3_concluida'
);
assert(
  progressJs.includes("id: 'aula4_concluida'"),
  'ACHIEVEMENT_RULES deve incluir aula4_concluida'
);
assert(
  progressJs.includes("id: 'aula5_concluida'"),
  'ACHIEVEMENT_RULES deve incluir aula5_concluida'
);
assert(
  /aula2:\s*\{\s*published:\s*false/.test(progressJs.replace(/\s+/g, ' ')),
  'LESSON_GATES.aula2 deve permanecer published: false por default'
);
assert(
  /aula3:\s*\{\s*published:\s*false/.test(progressJs.replace(/\s+/g, ' ')),
  'LESSON_GATES.aula3 deve permanecer published: false por default'
);
assert(
  /aula4:\s*\{\s*published:\s*false/.test(progressJs.replace(/\s+/g, ' ')),
  'LESSON_GATES.aula4 deve permanecer published: false por default'
);
assert(
  /aula5:\s*\{\s*published:\s*false/.test(progressJs.replace(/\s+/g, ' ')),
  'LESSON_GATES.aula5 deve permanecer published: false por default'
);

const storeJs = read('api/_lib/store.js');
assert(
  /aula4:\s*'aula3'/.test(storeJs.replace(/\s+/g, ' ')),
  'LESSON_PREREQUISITES deve mapear aula4 → aula3'
);
assert(
  /aula5:\s*'aula4'/.test(storeJs.replace(/\s+/g, ' ')),
  'LESSON_PREREQUISITES deve mapear aula5 → aula4'
);
assert(
  storeJs.includes("id: 'aula4_concluida'"),
  'store ACHIEVEMENT_RULES deve incluir aula4_concluida'
);
assert(
  storeJs.includes("id: 'aula5_concluida'"),
  'store ACHIEVEMENT_RULES deve incluir aula5_concluida'
);
assert(
  storeJs.includes('CLASSIND2026'),
  'store REDEEM_CODES deve incluir mock CLASSIND2026'
);

const aula2Html = read('pages/aula2.html');
assert(
  aula2Html.includes('O Glossário do Desenvolvedor') || aula2Html.includes('GLOSSÁRIO DO DESENVOLVEDOR'),
  'aula2.html deve usar o título curricular novo'
);
assert(!aula2Html.includes('game-canvas'), 'aula2.html não deve mais incluir o canvas do Tambor');
assert(!aula2Html.includes('Tambor do Estige'), 'aula2.html não deve mais mencionar Tambor do Estige');
assert(aula2Html.includes('discovery-overlay'), 'aula2.html precisa do discovery overlay');
assert(aula2Html.includes('id="config-notes"'), 'aula2.html precisa do campo de anotações');
assert(aula2Html.includes('id="gdd-text"'), 'aula2.html precisa do campo de síntese');
assert(aula2Html.includes('tab-slides'), 'aula2.html precisa da aba Slides');
assert(
  fs.existsSync(path.join(root, 'assets/docs/aulas/aula02_glossario_player_slides.pptx')),
  'PPTX da aula2 deve existir em assets/docs/aulas/'
);
assert(
  fs.existsSync(path.join(root, 'assets/docs/aulas/aula02_glossario_player_slides.pdf')),
  'PDF da aula2 deve existir em assets/docs/aulas/'
);
assert(
  read('js/aula2.js').includes("aula02_glossario_player_slides.pptx"),
  'aula2.js deve apontar PPTX_FILE para o deck novo'
);

const aula3Html = read('pages/aula3.html');
assert(
  aula3Html.includes('HOMO LUDENS') || aula3Html.includes('Homo Ludens'),
  'aula3.html deve usar o título curricular Homo Ludens'
);
assert(!aula3Html.includes('Forja em andamento'), 'aula3.html não deve mais usar o stub Forja em andamento');
assert(!aula3Html.includes('CONTEÚDO OCULTO'), 'aula3.html não deve mais usar Conteúdo oculto');
assert(aula3Html.includes('discovery-overlay'), 'aula3.html precisa do discovery overlay');
assert(aula3Html.includes('id="config-notes"'), 'aula3.html precisa do campo de anotações');
assert(aula3Html.includes('id="gdd-text"'), 'aula3.html precisa do campo de síntese');
assert(aula3Html.includes('tab-slides'), 'aula3.html precisa da aba Slides');
assert(aula3Html.includes('Nearest'), 'aula3.html deve mencionar filtro Nearest');
assert(
  aula3Html.includes('aula03-pixel-hero'),
  'aula3.html deve apontar o material Tiny Hero em aula03-pixel-hero'
);
assert(
  fs.existsSync(path.join(root, 'assets/docs/aulas/aula03-pixel-hero/README.md')),
  'README da oficina aula3 deve existir'
);
assert(
  fs.existsSync(path.join(
    root,
    'assets/docs/aulas/aula03-pixel-hero/craftpix-net-622999-free-pixel-art-tiny-hero-sprites.zip'
  )),
  'ZIP Tiny Hero da aula3 deve existir'
);
assert(
  fs.existsSync(path.join(root, 'assets/docs/aulas/aula03-pixel-hero/LICENCA.md')),
  'Nota de licença da aula3 deve existir'
);
assert(
  aula3Html.includes('../css/aula.css'),
  'aula3.html deve reusar css/aula.css (sem CSS one-off)'
);
assert(
  !fs.existsSync(path.join(root, 'css/aula3.css')),
  'não deve existir css/aula3.css one-off'
);
assert(
  /font-size:\s*16px/.test(read('css/aula.css')),
  'aula.css deve usar font-size 16px nos textareas no mobile'
);
assert(
  read('css/aula.css').includes('prefers-reduced-motion'),
  'aula.css deve respeitar prefers-reduced-motion no discovery'
);
assert(
  read('js/lesson-discovery.js').includes('is-reduced-motion'),
  'lesson-discovery.js deve espelhar reduced-motion no body'
);
assert(read('js/aula3.js').includes('initTabs') || read('js/aula3.js').includes('data-tab'), 'aula3.js deve inicializar abas');
assert(
  fs.existsSync(path.join(root, 'assets/docs/aulas/aula03_homo_ludens_slides.pptx')),
  'PPTX da aula3 deve existir em assets/docs/aulas/'
);
assert(
  fs.existsSync(path.join(root, 'assets/docs/aulas/aula03_homo_ludens_slides.pdf')),
  'PDF da aula3 deve existir em assets/docs/aulas/'
);
assert(
  read('js/aula3.js').includes('aula03_homo_ludens_slides.pptx'),
  'aula3.js deve apontar PPTX_FILE para o deck novo'
);
assert(
  read('js/aula3.js').includes('aula03_homo_ludens_slides.pdf'),
  'aula3.js deve apontar PDF_FILE para o deck novo'
);
assert(
  read('js/aula3.js').includes("lessonId: 'aula3'") || read('js/aula3.js').includes("const LESSON_ID = 'aula3'"),
  'aula3.js deve enviar com lessonId aula3'
);
assert(
  read('js/aula3.js').includes('lesson-discovery'),
  'aula3.js deve usar lesson-discovery compartilhado'
);
assert(
  read('js/aula3.js').includes('initSlidesViewer') || read('js/aula3.js').includes('download-pptx'),
  'aula3.js deve inicializar o viewer de slides'
);
assert(
  read('js/aula3.js').includes('Homo Ludens') || read('js/aula3.js').includes('Nearest'),
  'aula3.js deve ter template de anotações da oficina'
);

const aula4Html = read('pages/aula4.html');
assert(
  aula4Html.includes('RESTRIÇÕES TÉCNICAS') || aula4Html.includes('Plataformas'),
  'aula4.html deve usar o título curricular de plataformas / restrições'
);
assert(aula4Html.includes('discovery-overlay'), 'aula4.html precisa do discovery overlay');
assert(aula4Html.includes('id="config-notes"'), 'aula4.html precisa do campo de anotações');
assert(aula4Html.includes('id="gdd-text"'), 'aula4.html precisa do campo de síntese');
assert(aula4Html.includes('tab-slides'), 'aula4.html precisa da aba Slides');
assert(aula4Html.includes('viewport'), 'aula4.html deve mencionar stretch viewport');
assert(aula4Html.includes('320×180') || aula4Html.includes('320x180'), 'aula4.html deve citar resolução 320×180');
assert(aula4Html.includes('aula04-retro-viewport'), 'aula4.html deve apontar o material aula04-retro-viewport');
assert(aula4Html.includes('Módulo 1 · Aula 04'), 'aula4.html precisa do footer Módulo 1 · Aula 04');
assert(
  fs.existsSync(path.join(root, 'assets/docs/aulas/aula04-retro-viewport/README.md')),
  'README da oficina aula4 deve existir'
);
assert(
  aula4Html.includes('../css/aula.css'),
  'aula4.html deve reusar css/aula.css (sem CSS one-off)'
);
assert(
  !fs.existsSync(path.join(root, 'css/aula4.css')),
  'não deve existir css/aula4.css one-off'
);
assert(
  read('js/aula4.js').includes('initTabs') || read('js/aula4.js').includes('data-tab'),
  'aula4.js deve inicializar abas'
);
assert(
  read('js/aula4.js').includes("const LESSON_ID = 'aula4'"),
  'aula4.js deve usar lessonId aula4'
);
assert(
  read('js/aula4.js').includes('aula04_plataformas_restricoes_slides.pptx'),
  'aula4.js deve apontar PPTX_FILE para o deck da aula4'
);
assert(
  read('js/aula4.js').includes('Viewport Width') || read('js/aula4.js').includes('320×180'),
  'aula4.js deve ter template de anotações da oficina'
);
assert(
  read('js/aula4.js').includes('lesson-discovery'),
  'aula4.js deve usar lesson-discovery compartilhado'
);
assert(
  read('js/aula4.js').includes('initSlidesViewer') || read('js/aula4.js').includes('download-pptx'),
  'aula4.js deve inicializar o viewer de slides'
);
assert(
  read('js/aula4.js').includes('saveLessonParagraph'),
  'aula4.js deve enviar anotações via saveLessonParagraph'
);
assert(
  read('js/aula4.js').includes('enqueueDiscovery'),
  'aula4.js deve enfileirar discovery no envio'
);
assert(
  read('js/aula4.js').includes('initAdminExample'),
  'aula4.js deve inicializar o exemplo admin'
);
assert(
  !read('js/aula4.js').includes('createNote'),
  'aula4.js não deve gravar nota no grimório'
);
assert(
  fs.existsSync(path.join(root, 'assets/docs/aulas/aula04_plataformas_restricoes_slides.pptx')),
  'PPTX da aula4 deve existir em assets/docs/aulas/'
);
assert(
  fs.existsSync(path.join(root, 'assets/docs/aulas/aula04_plataformas_restricoes_slides.pdf')),
  'PDF da aula4 deve existir em assets/docs/aulas/'
);
assert(
  read('js/aula4.js').includes('aula04_plataformas_restricoes_slides.pdf'),
  'aula4.js deve apontar PDF_FILE para o deck da aula4'
);

const aula5Html = read('pages/aula5.html');
assert(
  aula5Html.includes('ClassInd') || aula5Html.includes('IARC'),
  'aula5.html deve usar o título curricular ClassInd / IARC'
);
assert(aula5Html.includes('discovery-overlay'), 'aula5.html precisa do discovery overlay');
assert(!aula5Html.includes('id="config-notes"'), 'aula5.html sem textarea de anotações (wizard finaliza direto)');
assert(!aula5Html.includes('id="gdd-text"'), 'aula5.html sem textarea de síntese');
assert(aula5Html.includes('iarc-wizard-root'), 'aula5.html monta wizard IARC');
assert(
  aula5Html.includes('../css/aula.css'),
  'aula5.html deve reusar css/aula.css'
);
assert(
  read('js/aula5.js').includes("const LESSON_ID = 'aula5'"),
  'aula5.js deve usar lessonId aula5'
);
assert(
  read('js/aula5.js').includes('saveLessonParagraph') && read('js/aula5.js').includes('onFinalize'),
  'aula5.js finaliza via wizard → saveLessonParagraph'
);
assert(
  read('js/aula5.js').includes('lesson-discovery') || read('js/aula5.js').includes('enqueueDiscovery'),
  'aula5.js deve usar lesson-discovery compartilhado'
);
assert(
  !read('js/aula5.js').includes('createNote'),
  'aula5.js não deve gravar nota no grimório'
);

const appShell = read('js/app-shell.js');
assert(
  !appShell.includes('bindDashboardSectionNav'),
  'app-shell não deve mais depender de scroll por seção do dashboard'
);
assert(appShell.includes("route === 'aulas'"), 'mapRouteToNavItem deve tratar aulas');
assert(appShell.includes("route === 'conquistas'"), 'mapRouteToNavItem deve tratar conquistas');
assert(
  appShell.includes("route === 'companheiro'") || appShell.includes("|| route === 'companheiro'"),
  'mapRouteToNavItem deve mapear companheiro → dashboard'
);

const companheiroHtml = read('pages/companheiro.html');
assert(companheiroHtml.includes('data-route="companheiro"'), 'companheiro.html precisa de data-route="companheiro"');
assert(companheiroHtml.includes('Espelho'), 'companheiro.html deve mencionar Espelho');
assert(companheiroHtml.includes('relic-modal'), 'companheiro.html precisa do modal de relíquia');
assert(companheiroHtml.includes('mirror-album-grid'), 'companheiro.html precisa do grid do álbum');

const achievementsUi = read('js/achievements-ui.js');
assert(achievementsUi.includes('visitorView'), 'achievements-ui deve suportar visitorView');

const apiJsRoutes = read('js/api.js');
assert(apiJsRoutes.includes('companheiro:'), 'ROUTES.companheiro deve existir em api.js');
assert(apiJsRoutes.includes('fetchFriendProfile'), 'api.js deve exportar fetchFriendProfile');

const dashboardHtml = read('pages/dashboard.html');
assert(dashboardHtml.includes('achievements-preview'), 'dashboard precisa da prévia de conquistas');
assert(dashboardHtml.includes('lessons-preview'), 'dashboard precisa da prévia de aulas');
assert(dashboardHtml.includes('Abrir álbum'), 'dashboard precisa do CTA Abrir álbum');
assert(dashboardHtml.includes('Ver trilha'), 'dashboard precisa do CTA Ver trilha');

const indexHtml = read('index.html');
assert(
  !/href=["']pages\/aula1\.html["']/.test(indexHtml),
  'Home não deve ser seletor direto de aulas'
);

if (errors.length > 0) {
  console.error('Fase 5 smoke FAILED:');
  errors.forEach((err) => console.error(` - ${err}`));
  process.exit(1);
}

console.log('Fase 5 smoke OK: páginas, rotas e hrefs do shell alinhados.');
