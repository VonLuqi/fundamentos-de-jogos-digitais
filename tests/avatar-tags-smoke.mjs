/**
 * Smoke — tags de filtro do modal de avatar (catalog + UI + lógica AND + subtags).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const PRIMARY_TAGS = [
  'mitologia',
  'memes',
  'jogos',
  'anime',
  'animais',
  'cultura-pop',
];

const stubPath = path.join(root, 'assets/avatars/catalog.stub.json');
assert(fs.existsSync(stubPath), 'catalog.stub.json deve existir');

const catalog = JSON.parse(read('assets/avatars/catalog.stub.json'));
assert(Array.isArray(catalog), 'catalog.stub.json deve ser um array');
const webpFiles = fs.readdirSync(path.join(root, 'assets/avatars'))
  .filter((name) => /\.webp$/i.test(name))
  .sort((a, b) => a.localeCompare(b, 'en'));
assert(catalog.length >= 63, `catalog deve ter ao menos 63 entradas (tem ${catalog.length})`);
assert(catalog.length === webpFiles.length, `catalog (${catalog.length}) deve bater com webp ativos (${webpFiles.length})`);

const apiUrl = pathToFileURL(path.join(root, 'js/api.js')).href;
const {
  getAvatarTagDefinitions,
  getAvatarPrimaryTagDefinitions,
  getAvatarSubTagDefinitions,
  getAvatarParentTagId,
  getAvatarFilterTagDefinitions,
  isAvatarFilterAllTag,
} = await import(apiUrl);

const primaryDefs = getAvatarPrimaryTagDefinitions();
const subDefs = getAvatarSubTagDefinitions();
const VALID_TAGS = new Set([
  ...primaryDefs.map((tag) => tag.id),
  ...subDefs.map((tag) => tag.id),
]);
const PARENT_BY_SUB = new Map(subDefs.map((tag) => [tag.id, tag.parent]));

assert(
  primaryDefs.map((tag) => tag.id).join(',') === PRIMARY_TAGS.join(','),
  `primarias api divergem (${primaryDefs.map((tag) => tag.id).join(',')})`
);
assert(
  getAvatarTagDefinitions().map((tag) => tag.id).join(',') === PRIMARY_TAGS.join(','),
  'getAvatarTagDefinitions expoe as primarias'
);
assert(subDefs.length >= 8, 'deve haver subtags curadas');
assert(isAvatarFilterAllTag('todos'), 'todos e pseudo-tag de UI');
assert(getAvatarFilterTagDefinitions()[0]?.id === 'todos', 'chips comecam com Todos');
assert(
  getAvatarFilterTagDefinitions().every((tag) => tag.id === 'todos' || tag.kind === 'primary'),
  'faixa principal so com Todos + primarias'
);

const files = new Set();
const tagCounts = Object.fromEntries([...VALID_TAGS].map((tag) => [tag, 0]));

for (const entry of catalog) {
  const file = String(entry?.file || '');
  assert(file.endsWith('.webp'), `arquivo invalido: ${file || '(vazio)'}`);
  assert(!files.has(file), `arquivo duplicado no stub: ${file}`);
  files.add(file);

  assert(fs.existsSync(path.join(root, 'assets/avatars', file)), `webp ausente: ${file}`);
  assert(typeof entry.label === 'string' && entry.label.trim().length > 0, `label ausente: ${file}`);
  assert(Array.isArray(entry.searchTerms), `searchTerms deve ser array: ${file}`);
  assert(Array.isArray(entry.tags), `tags deve ser array: ${file}`);
  assert(entry.tags.length > 0, `tags vazias: ${file}`);

  for (const tag of entry.tags) {
    assert(VALID_TAGS.has(tag), `tag invalida "${tag}" em ${file}`);
    tagCounts[tag] += 1;

    const parent = PARENT_BY_SUB.get(tag);
    if (parent) {
      assert(
        entry.tags.includes(parent),
        `subtag ${tag} em ${file} exige pai ${parent}`
      );
      assert(getAvatarParentTagId(tag) === parent, `getAvatarParentTagId(${tag})`);
    }
  }
}

for (const tag of PRIMARY_TAGS) {
  assert(tagCounts[tag] > 0, `tag primaria sem avatares: ${tag}`);
}
for (const sub of subDefs) {
  assert(tagCounts[sub.id] >= 2, `subtag ${sub.id} deve ter >= 2 avatares (tem ${tagCounts[sub.id] || 0})`);
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function filterAvatars(avatars, { query = '', activeTagId = 'todos' } = {}) {
  const normalizedQuery = normalizeSearchText(query);
  const filterByTag = activeTagId !== 'todos';

  return avatars.filter((avatar) => {
    const searchableText = normalizeSearchText([
      avatar.label,
      ...(avatar.searchTerms || []),
    ].join(' '));
    const matchesQuery = normalizedQuery.length === 0 || searchableText.includes(normalizedQuery);
    const matchesTag = !filterByTag || (avatar.tags || []).includes(activeTagId);
    return matchesQuery && matchesTag;
  });
}

const mitologia = filterAvatars(catalog, { activeTagId: 'mitologia' });
assert(mitologia.length === tagCounts.mitologia, 'filtro mitologia deve bater a contagem do stub');

const mitologiaKra = filterAvatars(catalog, { activeTagId: 'mitologia', query: 'kra' });
const mitologiaKraNames = mitologiaKra.map((entry) => entry.label).sort();
assert(
  mitologiaKraNames.includes('Kratos') && mitologiaKraNames.includes('Kratos Madruga'),
  `mitologia + kra deve achar Kratos/Kratos Madruga (achou: ${mitologiaKraNames.join(', ') || 'nenhum'})`
);

const mortalKombat = filterAvatars(catalog, { activeTagId: 'mortal-kombat' });
assert(mortalKombat.length === tagCounts['mortal-kombat'], 'filtro subtag mortal-kombat');
assert(
  mortalKombat.every((entry) => entry.tags.includes('mortal-kombat') && entry.tags.includes('jogos')),
  'mortal-kombat sempre com pai jogos'
);

const mkSco = filterAvatars(catalog, { activeTagId: 'mortal-kombat', query: 'scorp' });
assert(mkSco.length === 1 && mkSco[0].label === 'Scorpion', 'subtag + busca AND');

const todos = filterAvatars(catalog, { activeTagId: 'todos', query: '' });
assert(todos.length === catalog.length, 'Todos + busca vazia deve mostrar a galeria inteira');

const dashboard = read('js/dashboard.js');
assert(!dashboard.includes('Biblioteca de Avatares'), 'copy Biblioteca removida');
assert(!dashboard.includes('Selecione um avatar da galeria'), 'subtitulo instrutivo removido');
assert(!dashboard.includes('disponíveis na biblioteca'), 'contador ocioso removido');
assert(dashboard.includes("aria-label', 'Filtrar por categoria'"), 'grupo de tags com aria-label');
assert(dashboard.includes('matchesQuery && matchesTag'), 'filtro AND tag+busca presente');
assert(dashboard.includes('avatar-picker__tags'), 'markup de chips presente');
assert(dashboard.includes('avatar-picker__tag--more'), 'chip + no final da faixa');
assert(dashboard.includes('avatar-picker__more-modal'), 'modal de tags especificas');
assert(dashboard.includes('openMoreModal'), 'abertura do modal de subtags');
assert(dashboard.includes('Abrir tags específicas'), 'aria-label do +');
assert(!dashboard.includes('avatar-picker__tag-toggle'), 'sem + por tag primaria');
assert(!dashboard.includes('toggleExpand'), 'sem acordeao por tag');
assert(dashboard.includes('dataset.tags'), 'data-tags nos cards');

const css = read('css/dashboard.css');
assert(css.includes('.avatar-picker__tag'), 'estilo dos chips presente');
assert(css.includes('.avatar-picker__tag--more'), 'estilo do + final presente');
assert(css.includes('.avatar-picker__more-modal'), 'estilo do modal de subtags');
assert(!css.includes('.avatar-picker__tag-toggle'), 'CSS do + por tag removido');
assert(css.includes('.scroll-modal--avatar .avatar-picker__chrome'), 'chrome fixo do modal avatar');
assert(css.includes('.scroll-modal--avatar .avatar-picker__scroll'), 'scroll so na grade');
assert(css.includes('.scroll-modal--avatar .avatar-picker__footer'), 'footer fixo com acoes');

if (errors.length) {
  console.error('avatar-tags-smoke FALHOU:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const primaryCounts = Object.fromEntries(PRIMARY_TAGS.map((tag) => [tag, tagCounts[tag]]));
const subCounts = Object.fromEntries(subDefs.map((tag) => [tag.id, tagCounts[tag.id]]));
console.log(`avatar-tags-smoke OK (${catalog.length} avatares)`);
console.log(`primarias=${JSON.stringify(primaryCounts)}`);
console.log(`subtags=${JSON.stringify(subCounts)}`);
