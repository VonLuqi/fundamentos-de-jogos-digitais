/**
 * Smoke — matriz das conquistas secretas no Espelho
 * (texto ← observador, estilo ← espelhado).
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

const uiUrl = pathToFileURL(path.join(root, 'js/achievements-ui.js')).href;
const {
  getAlbumSlotModel,
  getAchievementCollectionStats,
  resolveMirrorSecretAxes,
} = await import(uiUrl);

const SECRET = {
  id: 'segredo_alquimista_da_fisica',
  name: 'Alquimista da Física',
  icon: '⚗️',
  hidden: true,
  rarity: 'gold',
  difficulty: 'hard',
  desc: 'desc secreta',
};

const COMMON = {
  id: 'aula1_concluida',
  name: 'Primeira Travessia',
  icon: '🏁',
  hidden: false,
  rarity: 'stone',
  difficulty: 'easy',
  desc: 'desc comum',
};

function user(achievements, role = 'student') {
  return { role, achievements };
}

const cases = [
  {
    label: 'obs ✗ / esp ✓ → ? + estilo',
    viewer: user([]),
    friend: user([SECRET.id]),
    expect: {
      kind: 'mystery',
      revealText: false,
      applySecretStyle: true,
      rarity: 'gold',
      showRarityBadge: true,
    },
  },
  {
    label: 'obs ✓ / esp ✓ → texto + estilo',
    viewer: user([SECRET.id]),
    friend: user([SECRET.id]),
    expect: {
      kind: 'unlocked',
      revealText: true,
      applySecretStyle: true,
      rarity: 'gold',
      showRarityBadge: true,
    },
  },
  {
    label: 'obs ✓ / esp ✗ → texto + bloqueado',
    viewer: user([SECRET.id]),
    friend: user([]),
    expect: {
      kind: 'locked',
      revealText: true,
      applySecretStyle: false,
      rarity: 'unknown',
      showRarityBadge: false,
    },
  },
  {
    label: 'obs ✗ / esp ✗ → ? + bloqueado',
    viewer: user([]),
    friend: user([]),
    expect: {
      kind: 'mystery',
      revealText: false,
      applySecretStyle: false,
      rarity: 'unknown',
      showRarityBadge: false,
    },
  },
];

for (const entry of cases) {
  const axes = resolveMirrorSecretAxes(SECRET, {
    friendUser: entry.friend,
    viewerUser: entry.viewer,
  });
  assert(axes.isSecret === true, `${entry.label}: isSecret`);
  assert(axes.revealText === entry.expect.revealText, `${entry.label}: revealText`);
  assert(axes.applySecretStyle === entry.expect.applySecretStyle, `${entry.label}: applySecretStyle`);

  const model = getAlbumSlotModel(entry.friend, SECRET, {
    visitorView: true,
    viewerUser: entry.viewer,
  });
  assert(model.kind === entry.expect.kind, `${entry.label}: kind=${model.kind}`);
  assert(model.rarity === entry.expect.rarity, `${entry.label}: rarity=${model.rarity}`);
  assert(model.showRarityBadge === entry.expect.showRarityBadge, `${entry.label}: badge`);
}

// Não secreta no Espelho: unlock do amigo manda
const lockedCommon = getAlbumSlotModel(user([]), COMMON, {
  visitorView: true,
  viewerUser: user([COMMON.id]),
});
assert(lockedCommon.kind === 'locked', 'comum: espelhado sem → locked');
assert(lockedCommon.revealText === true, 'comum locked ainda mostra nome');

const unlockedCommon = getAlbumSlotModel(user([COMMON.id]), COMMON, {
  visitorView: true,
  viewerUser: user([]),
});
assert(unlockedCommon.kind === 'unlocked', 'comum: espelhado com → unlocked');

// Única (Soberano) no Espelho — eixos iguais às demais secretas
const UNIQUE = {
  id: 'soberano_do_submundo',
  name: 'Soberano do Submundo',
  icon: '👑',
  hidden: true,
  rarity: 'unique',
  difficulty: 'legendary',
  desc: 'desc unica',
};
const uniqueModel = getAlbumSlotModel(user([UNIQUE.id]), UNIQUE, {
  visitorView: true,
  viewerUser: user([UNIQUE.id]),
});
assert(uniqueModel.kind === 'unlocked', 'Única: obs+esp → unlocked');
assert(uniqueModel.rarity === 'unique', 'Única: rarity unique no estilo');
assert(uniqueModel.showRarityBadge === true, 'Única: badge');

const uniqueMystery = getAlbumSlotModel(user([UNIQUE.id]), UNIQUE, {
  visitorView: true,
  viewerUser: user([]),
});
assert(uniqueMystery.kind === 'mystery', 'Única: obs sem texto → mystery');
assert(uniqueMystery.applySecretStyle === true, 'Única: estilo do espelhado');
assert(uniqueMystery.rarity === 'unique', 'Única mystery styled mantém rarity');

assert(
  read('css/conquistas.css').includes("is-mystery--styled[data-rarity='unique']"),
  'CSS mystery unique no Espelho'
);
const stats = getAchievementCollectionStats(
  user([COMMON.id, SECRET.id, 'segredo_juramento_do_circulo']),
  { visitorView: true }
);
assert(stats.unlocked >= 2, 'contador Espelho inclui secretas desbloqueadas');
assert(
  stats.unlocked === 3
    || stats.total >= stats.unlocked,
  'contador Espelho coerente (unlocked ≤ total)'
);
// COMMON + 2 secrets that exist in catalog
const onlySecrets = getAchievementCollectionStats(
  user(['segredo_alquimista_da_fisica', 'segredo_cartografo_do_inspector', 'segredo_juramento_do_circulo']),
  { visitorView: true }
);
assert(onlySecrets.unlocked === 3, `Q3-B: 3 secretas → X=3 (got ${onlySecrets.unlocked})`);

// Álbum próprio inalterado: hidden sem unlock → mystery unknown
const ownMystery = getAlbumSlotModel(user([]), SECRET, { visitorView: false });
assert(ownMystery.kind === 'mystery', 'álbum próprio: hidden locked → mystery');
assert(ownMystery.rarity === 'unknown', 'álbum próprio: mystery → rarity unknown');

const ownUnlocked = getAlbumSlotModel(user([SECRET.id]), SECRET, { visitorView: false });
assert(ownUnlocked.kind === 'unlocked', 'álbum próprio: hidden unlocked → unlocked');

// Fonte: wire + CSS
const achievementsUi = read('js/achievements-ui.js');
assert(achievementsUi.includes('is-secret-known'), 'render marca is-secret-known');
assert(achievementsUi.includes('viewerUser'), 'renderAlbumMode recebe viewerUser');

const conquistasCss = read('css/conquistas.css');
assert(conquistasCss.includes('is-secret-known'), 'CSS cobre is-secret-known');
assert(conquistasCss.includes("data-rarity='unknown'"), 'CSS cobre rarity unknown');

const companheiroJs = read('js/companheiro.js');
assert(companheiroJs.includes('viewerUser'), 'Espelho passa viewerUser');
assert(companheiroJs.includes('dataset.secret'), 'modal seta data-secret');

const readme = read('README.md');
assert(
  /texto.*observador|observador.*texto/i.test(readme) || /eixos independentes/i.test(readme) || /estilo.*espelhado/i.test(readme),
  'README documenta a matriz texto/estilo do Espelho'
);

if (errors.length > 0) {
  console.error('mirror-secret-axes-smoke FAILED:');
  errors.forEach((err) => console.error(` - ${err}`));
  process.exit(1);
}

console.log('mirror-secret-axes-smoke OK: matriz 4 estados + Q3-B + álbum próprio.');
