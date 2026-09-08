/**
 * Smoke Fase 4 — Companheiros / Espelho (arquivos, a11y e rotas).
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

[
  'pages/companheiro.html',
  'pages/dashboard.html',
  'js/friends-ui.js',
  'js/companheiro.js',
  'css/companheiros.css',
  'db/migrate-2026-09-08-friendships.sql',
].forEach((rel) => {
  assert(fs.existsSync(path.join(root, rel)), `Arquivo ausente: ${rel}`);
});

const dashboard = read('pages/dashboard.html');
assert(dashboard.includes('companions-panel'), 'dashboard precisa da seção Companheiros');
assert(dashboard.includes('bond-confirm'), 'dashboard precisa do diálogo Romper vínculo');
assert(dashboard.includes('aria-labelledby="bond-confirm-title"'), 'bond-confirm precisa de aria-labelledby');
assert(dashboard.includes('aria-describedby="bond-confirm-desc"'), 'bond-confirm precisa de aria-describedby');
assert(dashboard.includes('companheiros.css'), 'dashboard deve carregar companheiros.css');

const friendsUi = read('js/friends-ui.js');
assert(friendsUi.includes('confirmBreakBond'), 'friends-ui deve usar diálogo de confirmação');
assert(friendsUi.includes('aria-label'), 'friends-ui deve definir aria-labels nas ações');
assert(friendsUi.includes('aria-activedescendant'), 'autocomplete deve usar aria-activedescendant');
assert(friendsUi.includes('ArrowDown'), 'autocomplete deve navegar com teclado');

const mirror = read('pages/companheiro.html');
assert(mirror.includes('data-route="companheiro"'), 'Espelho precisa de data-route=companheiro');
assert(mirror.includes('relic-modal'), 'Espelho reutiliza modal de raridade');
assert(mirror.includes('mirror-album-grid'), 'Espelho precisa do álbum');

const companheiroJs = read('js/companheiro.js');
assert(companheiroJs.includes('visitorView'), 'companheiro.js usa visitorView no álbum');
assert(companheiroJs.includes('viewerUser'), 'companheiro.js passa viewerUser ao álbum');
assert(companheiroJs.includes('getAlbumSlotModel'), 'companheiro.js usa getAlbumSlotModel no modal');
assert(companheiroJs.includes('fetchFriendProfile'), 'companheiro.js busca perfil via API');

const achievementsUi = read('js/achievements-ui.js');
assert(achievementsUi.includes('visitorView'), 'achievements-ui deve expor visitorView');
assert(achievementsUi.includes('resolveMirrorSecretAxes'), 'achievements-ui deve expor eixos do Espelho');
assert(achievementsUi.includes('getAlbumSlotModel'), 'achievements-ui deve expor getAlbumSlotModel');

const apiJs = read('js/api.js');
assert(apiJs.includes('listFriends'), 'api.js exporta listFriends');
assert(apiJs.includes('fetchFriendProfile'), 'api.js exporta fetchFriendProfile');
assert(apiJs.includes('companheiro:'), 'ROUTES.companheiro existe');

const progressJs = read('api/progress.js');
assert(progressJs.includes("action === 'friendsList'"), 'progress.js tem friendsList');
assert(progressJs.includes("action === 'friendProfile'"), 'progress.js tem friendProfile');
assert(progressJs.includes('FRIEND_LIMIT'), 'progress.js define limite de companheiros');

const appShell = read('js/app-shell.js');
assert(
  appShell.includes("route === 'companheiro'") || appShell.includes("|| route === 'companheiro'"),
  'app-shell mapeia companheiro → Painel'
);

const readme = read('README.md');
assert(/Companheiros|companheiro/i.test(readme), 'README deve documentar Companheiros / Espelho');
assert(readme.includes('friendships') || readme.includes('migrate-2026-09-08-friendships'), 'README deve citar migração de friendships');
assert(
  readme.includes('plano-correcao-espelho-conquistas-secretas')
    || /texto.*observador|eixos independentes/i.test(readme),
  'README deve documentar a matriz das secretas no Espelho'
);

const amigosPlan = read('docs/plano-sistema-amigos.md');
assert(
  amigosPlan.includes('Addendum — secretas') || amigosPlan.includes('matriz texto'),
  'plano-sistema-amigos deve ter addendum das secretas'
);

if (errors.length > 0) {
  console.error('friends-phase4-smoke FAILED:');
  errors.forEach((err) => console.error(` - ${err}`));
  process.exit(1);
}

console.log('friends-phase4-smoke OK: a11y, Espelho, API e docs alinhados.');
