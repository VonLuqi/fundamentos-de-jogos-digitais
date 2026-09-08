/**
 * Smoke — artes WebP das relíquias (catalog.json + helpers).
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

assert(
  fs.existsSync(path.join(root, 'assets/achievements/segredo_juramento_do_circulo.webp')),
  'WebP de teste do Juramento deve existir'
);
assert(
  fs.existsSync(path.join(root, 'assets/achievements/catalog.json')),
  'catalog.json das artes deve existir'
);

const catalog = JSON.parse(read('assets/achievements/catalog.json'));
assert(Array.isArray(catalog), 'catalog.json é um array');
assert(
  catalog.some((e) => String(e?.file || '').includes('segredo_juramento_do_circulo')),
  'catalog inclui Juramento'
);
assert(
  catalog.some((e) => String(e?.file || '').includes('segredo_alquimista_da_fisica')),
  'catalog inclui Alquimista'
);

const uiUrl = pathToFileURL(path.join(root, 'js/achievements-ui.js')).href;

function createElement(tag) {
  const classList = {
    _list: [],
    add(...tokens) {
      tokens.forEach((t) => {
        if (t && !this._list.includes(t)) this._list.push(t);
      });
    },
    contains(token) {
      return this._list.includes(token);
    },
    toString() {
      return this._list.join(' ');
    },
  };
  const el = {
    tagName: String(tag).toUpperCase(),
    classList,
    setAttribute() {},
    textContent: '',
    src: '',
    alt: '',
    decoding: '',
    draggable: false,
    onerror: null,
    get className() {
      return classList.toString();
    },
    set className(value) {
      classList._list = String(value || '').split(/\s+/).filter(Boolean);
    },
  };
  return el;
}

globalThis.window = {
  location: { pathname: '/pages/conquistas.html' },
  matchMedia: () => ({ matches: false }),
};
globalThis.document = { createElement };
globalThis.fetch = async (url) => {
  const href = String(url);
  if (href.includes('assets/achievements/catalog.json')) {
    return {
      ok: true,
      async json() {
        return JSON.parse(read('assets/achievements/catalog.json'));
      },
    };
  }
  throw new Error(`fetch inesperado no smoke: ${href}`);
};

const {
  ACHIEVEMENT_ART_IDS,
  achievementArtUrl,
  createAchievementArtNode,
  ensureAchievementArtCatalogLoaded,
} = await import(uiUrl);

await ensureAchievementArtCatalogLoaded();

assert(ACHIEVEMENT_ART_IDS.has('segredo_juramento_do_circulo'), 'manifest inclui Juramento');
assert(ACHIEVEMENT_ART_IDS.has('segredo_alquimista_da_fisica'), 'manifest inclui Alquimista');
assert(
  !ACHIEVEMENT_ART_IDS.has('aula1_concluida'),
  'manifest não inclui ids sem arte ainda'
);

const juramentoUrl = achievementArtUrl('segredo_juramento_do_circulo');
assert(
  juramentoUrl === '../assets/achievements/segredo_juramento_do_circulo.webp',
  `URL Juramento esperada (got ${juramentoUrl})`
);
assert(achievementArtUrl('aula1_concluida') === null, 'sem arte → null');

const imgNode = createAchievementArtNode(
  { id: 'segredo_juramento_do_circulo', icon: '🔮' },
  { className: 'achievement-slot__art', grayscale: true }
);
assert(imgNode.tagName === 'IMG', 'Juramento → <img>');
assert(imgNode.classList.contains('has-art'), 'img tem has-art');
assert(imgNode.classList.contains('is-bw'), 'grayscale → is-bw na arte');
assert(
  String(imgNode.src).endsWith('/assets/achievements/segredo_juramento_do_circulo.webp'),
  'img.src aponta para o WebP'
);

const emojiNode = createAchievementArtNode(
  { id: 'aula1_concluida', icon: '🏁' },
  { className: 'achievement-slot__art' }
);
assert(emojiNode.tagName === 'SPAN', 'sem arte → <span>');
assert(emojiNode.textContent === '🏁', 'emoji do catálogo');
assert(emojiNode.classList.contains('has-emoji'), 'span tem has-emoji');

const uiSrc = read('js/achievements-ui.js');
assert(uiSrc.includes('catalog.json'), 'UI carrega catalog.json');
assert(uiSrc.includes('ensureAchievementArtCatalogLoaded'), 'UI tem ensure do catálogo');
assert(uiSrc.includes('appendRelicFaceContent'), 'face usa appendRelicFaceContent');
assert(
  /appendRelicFaceContent[\s\S]*parent\.append\(name, art\)/.test(uiSrc),
  'ordem face: nome → arte'
);
assert(!uiSrc.includes('mysteryMark'), 'modal/álbum sem ? tipográfico via mysteryMark');
assert(
  !uiSrc.includes("className: 'achievement-slot__icon'")
    && !uiSrc.includes("className: 'achievement-card__icon'"),
  'classes de arte usam __art (não __icon)'
);
assert(
  /achievement-card__desc/.test(uiSrc) === false
    || !/createElement\('p'\)[\s\S]{0,80}achievement-card__desc/.test(uiSrc),
  'cards não montam descrição no face'
);
assert(uiSrc.includes('createAchievementArtNode'), 'álbum/cards usam helper de arte');
assert(read('js/conquistas.js').includes('fillAchievementArtHost'), 'modal conquistas usa arte');
assert(read('js/companheiro.js').includes('fillAchievementArtHost'), 'modal Espelho usa arte');
assert(read('js/aula1.js').includes("className: 'discovery-card__item-art'"), 'discovery usa __item-art');
assert(read('js/aula1.js').includes('ensureAchievementArtCatalogLoaded'), 'discovery aguarda catálogo');
assert(read('css/aula.css').includes('.discovery-card__item-art'), 'CSS discovery tem caixa de arte');
assert(read('css/aula.css').includes('object-fit: contain'), 'discovery art usa contain');

const modalCss = read('css/conquistas.css');
assert(/\.relic-modal__art\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1/.test(modalCss), 'modal arte quadrada grande');
assert(modalCss.includes('object-fit: contain'), 'modal art usa contain');

const conquistasHtml = read('pages/conquistas.html');
const companheiroHtml = read('pages/companheiro.html');
for (const [label, html] of [['conquistas', conquistasHtml], ['companheiro', companheiroHtml]]) {
  const titleIdx = html.indexOf('id="relic-modal-title"');
  const artIdx = html.indexOf('id="relic-modal-art"');
  const rarityIdx = html.indexOf('id="relic-modal-rarity"');
  const descIdx = html.indexOf('id="relic-modal-desc"');
  assert(titleIdx > 0 && artIdx > titleIdx, `${label}: modal título antes da arte`);
  assert(artIdx < rarityIdx && rarityIdx < descIdx, `${label}: modal arte → raridade → desc`);
  assert(
    /id="relic-modal-art"[^>]*>\s*</.test(html),
    `${label}: art host sem ? estático`
  );
}

const albumCss = read('css/conquistas.css');
assert(albumCss.includes('.achievement-slot__art'), 'CSS álbum tem __art');
assert(albumCss.includes('object-fit: contain'), 'arte álbum usa contain');
assert(!albumCss.includes('.achievement-slot__icon'), 'CSS álbum sem __icon legado');
assert(!albumCss.includes('.achievement-slot__mystery'), 'CSS álbum sem __mystery tipográfico');

const cardCss = read('css/dashboard.css');
assert(cardCss.includes('.achievement-card__art'), 'CSS hub tem __art');
assert(
  /achievement-card__desc,\s*\n\.achievement-card__icon/.test(cardCss)
    || cardCss.includes('.achievement-card__desc'),
  'desc/icon legado escondidos no hub'
);

if (errors.length > 0) {
  console.error('achievement-art-smoke FAILED:');
  errors.forEach((err) => console.error(` - ${err}`));
  process.exit(1);
}

console.log('achievement-art-smoke OK: catalog.json, layout nome→arte→badge, P&B.');
