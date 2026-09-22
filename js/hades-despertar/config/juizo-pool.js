/**
 * Pool do Juízo do Tartarus (Task 17).
 * Fonte: data/despertar-juizo-pool.stub.json — só entries com rating entram no sorteio.
 */

import stub from '../../../data/despertar-juizo-pool.stub.json' with { type: 'json' };

/** Mínimo de cartas ready para habilitar o CTA. */
export const JUIZO_MIN_READY = 30;

export const JUIZO_POOL_SHORT_COPY = 'O Juízo ainda cataloga as almas.';
export const JUIZO_CTA_LABEL = 'Abrir o Juízo';

export const JUIZO_RATING_ORDER = Object.freeze(
  Array.isArray(stub.ratingOrder) ? stub.ratingOrder.map(String) : ['L', '10', '12', '14', '16', '18'],
);

const RATING_SET = new Set(JUIZO_RATING_ORDER);

const CLASSIND_COVER_BASE = '/assets/classind-dle/covers';
const DESPERTAR_COVER_BASE = '/assets/despertar-juizo/covers';

/**
 * Capas já publicadas no ClassInd-dle (compartilhadas pelo filename).
 * Demais covers caem em assets/despertar-juizo/covers/.
 */
export const CLASSIND_SHARED_COVERS = Object.freeze(new Set([
  'animal-crossing-new-horizons.webp',
  'blasphemous.webp',
  'call-of-duty-black-ops.webp',
  'celeste.webp',
  'crimson-desert.webp',
  'cuphead.webp',
  'doom-eternal.webp',
  'five-nights-at-freddys.webp',
  'god-of-war-2005.webp',
  'god-of-war-2.webp',
  'god-of-war-3.webp',
  'god-of-war-ragnarok.webp',
  'gta-6.webp',
  'gta-san-andreas.webp',
  'hollow-knight.webp',
  'hotline-miami.webp',
  'marvel-rivals.webp',
  'mortal-kombat-11.webp',
  'resident-evil-village.webp',
  'silent-hill-2-2024.webp',
  'street-fighter-6.webp',
  'supermarket-simulator.webp',
  'the-simpsons-hit-and-run.webp',
  'the-sims-4.webp',
  'undertale.webp',
  'vampire-survivors.webp',
  'wuthering-waves.webp',
]));

export function isValidJuizoRating(rating) {
  return rating != null && rating !== '' && RATING_SET.has(String(rating));
}

export function isReadyJuizoGame(game) {
  return Boolean(
    game
    && typeof game === 'object'
    && game.id
    && game.title
    && isValidJuizoRating(game.rating),
  );
}

export function resolveJuizoCoverUrl(cover) {
  const file = String(cover || '').trim();
  if (!file) return `${DESPERTAR_COVER_BASE}/placeholder.webp`;
  if (CLASSIND_SHARED_COVERS.has(file)) return `${CLASSIND_COVER_BASE}/${file}`;
  return `${DESPERTAR_COVER_BASE}/${file}`;
}

function normalizeGame(raw) {
  return {
    id: String(raw.id),
    title: String(raw.title || ''),
    rating: String(raw.rating),
    blurb: typeof raw.blurb === 'string' ? raw.blurb : '',
    cover: typeof raw.cover === 'string' ? raw.cover : `${raw.id}.webp`,
    descriptors: Array.isArray(raw.descriptors) ? raw.descriptors.map(String) : [],
    source: raw.source ? String(raw.source) : 'stub',
  };
}

const allGames = Array.isArray(stub.games) ? stub.games : [];

/** Catálogo completo do stub (inclui rating null — só para o Mestre). */
export const JUIZO_STUB_GAMES = Object.freeze(allGames.map((g) => Object.freeze({ ...g })));

/** Pool jogável: rating preenchido e válido. */
export const JUIZO_READY_POOL = Object.freeze(
  allGames.filter(isReadyJuizoGame).map((g) => Object.freeze(normalizeGame(g))),
);

export const JUIZO_READY_BY_ID = Object.freeze(
  Object.fromEntries(JUIZO_READY_POOL.map((g) => [g.id, g])),
);

export function getJuizoReadyCount() {
  return JUIZO_READY_POOL.length;
}

export function isJuizoPoolReady(min = JUIZO_MIN_READY) {
  return getJuizoReadyCount() >= min;
}

/** Card público — sem rating por padrão (desafiante). Campeão recebe rating em publicPairFromRun. */
export function toPublicJuizoCard(game) {
  if (!game) return null;
  return {
    id: game.id,
    title: game.title,
    blurb: game.blurb || '',
    cover: game.cover,
    coverUrl: resolveJuizoCoverUrl(game.cover),
    descriptors: [...(game.descriptors || [])],
  };
}

export function getJuizoCtaState() {
  const ready = isJuizoPoolReady();
  return {
    ready,
    count: getJuizoReadyCount(),
    min: JUIZO_MIN_READY,
    label: JUIZO_CTA_LABEL,
    hint: ready ? '' : JUIZO_POOL_SHORT_COPY,
  };
}
