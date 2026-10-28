/**
 * Personas das unidades nas prateleiras / órbita (paridade “Memaw, idade 89”).
 * Almas e servos misturam a turma. O resto junta um nome da turma a um epíteto do tipo.
 * O Imperador é um clone da conta logada: todos se chamam “Imperador” + o username.
 * Idade determinística por índice.
 */

/** Fallback quando a API da turma ainda não hidratou (offline / smoke). */
const FALLBACK_GIVEN = Object.freeze([
  'Ana', 'Bruno', 'Clara', 'Diego', 'Elena', 'Felipe', 'Giulia', 'Hugo',
  'Iris', 'João', 'Kai', 'Lara', 'Miguel', 'Nina', 'Otávio', 'Paula',
  'Rafa', 'Sofia', 'Theo', 'Vera', 'Yago', 'Zara',
]);

const FALLBACK_FAMILY = Object.freeze([
  'Silva', 'Souza', 'Costa', 'Santos', 'Oliveira', 'Lima', 'Rocha', 'Nunes',
  'Acheron', 'Styx', 'Nyx', 'Lethe', 'Minos', 'Caronte',
]);

const FALLBACK_HANDLES = Object.freeze([
  'nyx', 'styx', 'foice', 'obolo', 'cerbero', 'mnemosyne', 'erebo', 'tartaro',
  'alma', 'umbra', 'charon', 'hades', 'persefone', 'thanatos',
]);

/** Epítetos curtos (≤9) para caber com um nome da turma no teto de 22. */
const UNIT_EPITHETS = Object.freeze({
  cerberian_hound: Object.freeze(['Cérbero', 'Tricéfalo', 'Goela', 'Matilha', 'Farejo']),
  tartarus_judge: Object.freeze(['Juiz', 'Minos', 'Éaco', 'Veredito', 'Sentença']),
  phlegethon_forge: Object.freeze(['Forja', 'Bigorna', 'Brasa', 'Tenaz']),
  obsidian_throne: Object.freeze(['Trono', 'Cetro', 'Obsidiana', 'Basalto']),
  mnemosyne_temple: Object.freeze(['Templo', 'Memória', 'Moira', 'Hino']),
  styx_tower: Object.freeze(['Torre', 'Vigia', 'Estige', 'Pináculo']),
  star_barge: Object.freeze(['Barca', 'Quilha', 'Galeão', 'Óbolo']),
  tartarus_lab: Object.freeze(['Cadinho', 'Soro', 'Alambique', 'Forno']),
  erebus_portal: Object.freeze(['Portal', 'Limiar', 'Érebo', 'Fenda']),
  chronos_loom: Object.freeze(['Tear', 'Fio', 'Cronos', 'Urdidura']),
  void_condenser: Object.freeze(['Vazio', 'Câmara', 'Núcleo', 'Extrato']),
  moirai_prism: Object.freeze(['Prisma', 'Moira', 'Cristal', 'Faceta']),
  fate_forge: Object.freeze(['Destino', 'Forja', 'Bigorna', 'Acaso']),
  fractal_engine: Object.freeze(['Motor', 'Fractal', 'Eixo', 'Malha']),
  oracle_console: Object.freeze(['Oráculo', 'Console', 'Bronze', 'Código']),
  chthonic_idleverse: Object.freeze(['Verso', 'Esfera', 'Ctônio', 'Acheron']),
  cortex_baker: Object.freeze(['Padeiro', 'Forno', 'Córtex', 'Sonho']),
});

const PLAIN_NAME_IDS = new Set(['wandering_shade', 'charon_servants']);

/** @type {{ given: string[], family: string[], handles: string[] }} */
let _pool = {
  given: [...FALLBACK_GIVEN],
  family: [...FALLBACK_FAMILY],
  handles: [...FALLBACK_HANDLES],
};

/** Username (ou prenome) da conta logada — todos os Imperadores usam este token. */
let _selfToken = '';

function hashSeed(text) {
  const s = String(text || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(list, seed, salt = 0) {
  if (!list?.length) return '';
  return list[(seed + salt) % list.length];
}

/** Teto visual do tip NPC — evita handles tipo thierry_07emilyvitoria estourarem o card. */
export const UNIT_NAME_MAX_LEN = 22;

function shortenToken(token, max = 12) {
  const t = String(token || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

function titleHandle(handle) {
  const raw = String(handle || '').replace(/^@+/, '').trim();
  if (!raw) return '';
  const cleaned = raw.replace(/[_\-.]+/g, ' ');
  const titled = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => shortenToken(part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(), 10))
    .join(' ');
  return titled;
}

function clampDisplayName(name) {
  const raw = String(name || '').trim().replace(/\s+/g, ' ');
  if (raw.length <= UNIT_NAME_MAX_LEN) return raw;
  return `${raw.slice(0, UNIT_NAME_MAX_LEN - 1).trimEnd()}…`;
}

function tokenizeFullName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}'-]/gu, ''))
    .filter((p) => p.length >= 2);
  if (!parts.length) return { given: [], family: [] };
  if (parts.length === 1) return { given: [parts[0]], family: [] };
  return {
    given: parts.slice(0, -1),
    family: [parts[parts.length - 1]],
  };
}

/**
 * Alimenta o pool com colegas (+ jogador). Pode chamar de novo após fetch.
 * Com ≥3 alunos, troca o fallback pela turma (nomes reais da sala).
 * @param {Array<{ fullName?: string, name?: string, username?: string }|string>} people
 * @param {{ replace?: boolean, self?: { fullName?: string, name?: string, username?: string } }} [opts]
 */
export function seedUnitNamePool(people = [], opts = {}) {
  const rows = Array.isArray(people) ? people.filter(Boolean) : [];
  const replace = opts.replace === true || rows.length >= 3;

  const given = new Set(replace ? [] : FALLBACK_GIVEN);
  const family = new Set(replace ? [] : FALLBACK_FAMILY);
  const handles = new Set(replace ? [] : FALLBACK_HANDLES);

  for (const row of rows) {
    if (typeof row === 'string') {
      const t = tokenizeFullName(row);
      t.given.forEach((g) => given.add(g));
      t.family.forEach((f) => family.add(f));
      continue;
    }
    const full = row.fullName || row.name || '';
    const t = tokenizeFullName(full);
    t.given.forEach((g) => given.add(g));
    t.family.forEach((f) => family.add(f));
    const user = String(row.username || '').replace(/^@+/, '').trim();
    if (user.length >= 2) handles.add(user);
  }

  // Se a turma veio magra, não deixa o pool vazio.
  if (given.size === 0) FALLBACK_GIVEN.forEach((g) => given.add(g));
  if (family.size === 0) FALLBACK_FAMILY.forEach((f) => family.add(f));
  if (handles.size === 0) FALLBACK_HANDLES.forEach((h) => handles.add(h));

  _pool = {
    given: [...given],
    family: [...family],
    handles: [...handles],
  };
  _selfToken = selfDisplayToken(opts.self);
  return {
    given: _pool.given.length,
    family: _pool.family.length,
    handles: _pool.handles.length,
    replaced: replace,
  };
}

/** Só testes / debug. */
export function resetUnitNamePool() {
  _pool = {
    given: [...FALLBACK_GIVEN],
    family: [...FALLBACK_FAMILY],
    handles: [...FALLBACK_HANDLES],
  };
  _selfToken = '';
}

export function getUnitNamePoolSize() {
  return _pool.given.length + _pool.family.length + _pool.handles.length;
}

/**
 * Mistura Cookie-style: cruza prenomes, sobrenomes e handles da turma.
 * @param {number} seed
 */
export function mixUnitDisplayName(seed) {
  const s = seed >>> 0;
  const mode = s % 5;
  const g1 = shortenToken(pick(_pool.given, s, 3), 12);
  const g2 = shortenToken(pick(_pool.given, s, 11), 12);
  const f1 = shortenToken(pick(_pool.family, s, 7), 12);
  const f2 = shortenToken(pick(_pool.family, s, 19), 12);
  const h1 = pick(_pool.handles, s, 5);
  const h2 = shortenToken(pick(_pool.handles, s, 17), 10);
  const titled = titleHandle(h1);

  let name;
  switch (mode) {
    case 0:
      name = f1 ? `${g1} ${f1}` : g1;
      break;
    case 1:
      name = titled && f2 ? `${titled} ${f2}` : (titled || `${g1} ${f1}`);
      break;
    case 2:
      name = h2 ? `${g1}_${h2}` : `${g1}_${g2}`.toLowerCase();
      break;
    case 3:
      name = g2 && g1 !== g2 ? `${g1} ${g2}` : `${g1} ${f1 || titled}`;
      break;
    default:
      name = titled && g2 ? `${g2} ${titled}` : (titled || `${g1} ${f2 || f1}`);
      break;
  }
  return clampDisplayName(name);
}

/** Um único token da turma — prenome, ou a primeira palavra de um handle. */
function oneStudentToken(seed) {
  const s = seed >>> 0;
  const given = pick(_pool.given, s, 3);
  if (given) return shortenToken(given, 12);
  const titled = titleHandle(pick(_pool.handles, s, 5));
  const first = titled.split(' ').filter(Boolean)[0] || '';
  return shortenToken(first, 12) || 'Alma';
}

function mixThemedDisplayName(seed, epithets) {
  const s = seed >>> 0;
  const token = oneStudentToken(s);
  const epithet = pick(epithets, s, 13);
  const name = (s % 2 === 0) ? `${token} ${epithet}` : `${epithet} ${token}`;
  return clampDisplayName(name);
}

function selfDisplayToken(person) {
  if (!person || typeof person !== 'object') return '';
  const user = String(person.username || '').replace(/^@+/, '').trim();
  if (user.length >= 2) return shortenToken(user, 12);
  const full = person.fullName || person.name || '';
  const given = tokenizeFullName(full).given[0] || '';
  return given ? shortenToken(given, 12) : '';
}

function emperorDisplayName() {
  const token = _selfToken
    || shortenToken(_pool.handles[0] || _pool.given[0] || 'Alma', 12);
  return clampDisplayName(`Imperador ${token}`);
}

/**
 * Persona estável por unidade (mesmo índice → mesmo nome/idade na sessão).
 * @param {string} generatorId
 * @param {number} index
 * @param {{ rarity?: string }} [opts]
 * @returns {{ name: string, age: number, seed: number }}
 */
export function describeUnitPersona(generatorId, index = 0, opts = {}) {
  const rarity = opts.rarity || 'normal';
  const seed = hashSeed(`${generatorId}|${index}|${rarity}`);
  // Idade “de Submundo”: 19–109 (eco Cookie grandma).
  const age = 19 + (seed % 91);
  const epithets = UNIT_EPITHETS[generatorId];
  let name;
  if (generatorId === 'the_emperor') name = emperorDisplayName();
  else if (PLAIN_NAME_IDS.has(generatorId) || !epithets) name = mixUnitDisplayName(seed);
  else name = mixThemedDisplayName(seed, epithets);
  return {
    name,
    age,
    seed,
  };
}
