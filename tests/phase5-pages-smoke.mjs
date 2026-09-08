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

const progressJs = read('api/progress.js');
assert(progressJs.includes('published'), 'progress.js deve definir gate published');
assert(progressJs.includes('aula2:'), 'LESSON_CATALOG deve ter stub aula2');

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
