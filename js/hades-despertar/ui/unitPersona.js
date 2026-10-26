/**
 * Personas das unidades nas prateleiras / órbita (paridade “Memaw, idade 89”).
 * Nome = mistura estável de nomes e usernames da turma; idade determinística por índice.
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

/** @type {{ given: string[], family: string[], handles: string[] }} */
let _pool = {
  given: [...FALLBACK_GIVEN],
  family: [...FALLBACK_FAMILY],
  handles: [...FALLBACK_HANDLES],
};

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
 * @param {{ replace?: boolean }} [opts] — replace força só a lista passada
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
  return {
    name: mixUnitDisplayName(seed),
    age,
    seed,
  };
}
